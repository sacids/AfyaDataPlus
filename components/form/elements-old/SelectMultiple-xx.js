// SelectMultiple.js - Add proper debouncing
import { MaterialIcons } from '@expo/vector-icons';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import {
  deserializeMultiSelect,
  getAvailableChoices,
  toggleMultiSelect
} from '../../../lib/form/engine';
import { getLabel } from '../../../lib/form/utils';
import { useFormStore } from '../../../store/FormStore-xx';
import { Debug } from '../../../utils/debug';

const SelectMultiple = ({ element }) => {
  const updateFormData = useFormStore(state => state.updateFormData);
  const globalValue = useFormStore(state => state.formData[element.name]);
  const fieldError = useFormStore(state => state.errors?.[element.name] || null);
  const formData = useFormStore(state => state.formData);
  const language = useFormStore(state => state.language);
  const schemaLanguage = useFormStore(state => state.schema?.language);
  const schema = useFormStore(state => state.schema);

  const theme = useTheme();
  const styles = getStyles(theme);

  const debounceTimer = useRef(null);
  const mounted = useRef(true);
  const isUpdating = useRef(false);
  const lastUpdateTime = useRef(0);

  // Local state for immediate UI feedback
  const [localSelected, setLocalSelected] = useState(() => {
    try {
      return deserializeMultiSelect(globalValue);
    } catch (e) {
      return [];
    }
  });

  // Batch updates with debouncing
  const batchUpdate = useCallback((newValue) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      if (mounted.current && !isUpdating.current) {
        isUpdating.current = true;
        const now = Date.now();
        Debug.log('SelectMultiple', `Batch update for ${element.name}`, {
          length: newValue.length,
          timeSinceLast: now - lastUpdateTime.current
        });
        updateFormData(element.name, newValue);
        lastUpdateTime.current = now;
        setTimeout(() => {
          isUpdating.current = false;
        }, 50);
      }
      debounceTimer.current = null;
    }, 150); // 150ms debounce for better UX
  }, [element.name, updateFormData]);

  // Sync local state with global (debounced to prevent loops)
  useEffect(() => {
    if (isUpdating.current) return;

    try {
      const newValue = deserializeMultiSelect(globalValue);
      if (JSON.stringify(localSelected) !== JSON.stringify(newValue)) {
        setLocalSelected(newValue);
      }
    } catch (e) {
      Debug.error('SelectMultiple', e);
    }
  }, [globalValue]);

  const handleToggle = useCallback((optionName) => {
    if (!optionName || isUpdating.current) return;

    try {
      const nextValues = toggleMultiSelect(localSelected, optionName);
      // Update UI instantly
      setLocalSelected(nextValues);
      // Batch the store update
      batchUpdate(nextValues);
    } catch (error) {
      Debug.error('SelectMultiple', error);
    }
  }, [localSelected, batchUpdate]);

  // Memoize available options
  const availableOptions = useMemo(() => {
    try {
      return getAvailableChoices(element, formData || {});
    } catch (e) {
      Debug.error('SelectMultiple', e);
      return [];
    }
  }, [element, formData]);

  const label = useMemo(() => {
    try {
      return getLabel(element, 'label', language, schemaLanguage) || element.name;
    } catch (e) {
      return element.name;
    }
  }, [element, language, schemaLanguage]);

  const hint = useMemo(() => {
    try {
      return getLabel(element, 'hint', language, schemaLanguage);
    } catch (e) {
      return null;
    }
  }, [element, language, schemaLanguage]);

  // Cleanup
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Render nothing if no options
  if (!availableOptions || availableOptions.length === 0) {
    return (
      <View style={styles.container}>
        {label && (
          <View style={styles.labelContainer}>
            {element.required && <Text style={styles.required}>*</Text>}
            <Text style={styles.label}>{label}</Text>
          </View>
        )}
        <View style={styles.inputBase}>
          <Text style={styles.placeholderText}>No options available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelContainer}>
          {element.required && <Text style={styles.required}>*</Text>}
          <Text style={styles.label}>{label}</Text>
        </View>
      )}

      {hint && <Text style={styles.hint}>{hint}</Text>}

      <View style={[
        styles.inputBase,
        fieldError ? styles.inputError : null
      ]}>
        {availableOptions.map((option) => {
          if (!option) return null;
          const isSelected = localSelected?.includes(option.name) || false;

          return (
            <TouchableOpacity
              key={option.name}
              style={styles.checkboxContainer}
              onPress={() => handleToggle(option.name)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={isSelected ? 'check-box' : 'check-box-outline-blank'}
                size={24}
                color={isSelected ? theme.colors.primary : styles.inputBase.borderColor}
              />
              <Text style={styles.checkboxLabel}>
                {getLabel(option, 'label', language, schemaLanguage) || option.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {fieldError && <Text style={styles.errorText}>{fieldError}</Text>}
    </View>
  );
};

export default memo(SelectMultiple);