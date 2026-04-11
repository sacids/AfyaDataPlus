import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getLabel } from '../../../lib/form/utils';
import { useFormStore } from '../../../store/useFormStore';

const SelectMultiple = ({ element, globalValue: initialGlobalValue }) => {
  const updateField = useFormStore(state => state.updateField);
  const language = useFormStore(state => state.language);
  const fieldError = useFormStore(state => state.errors[element.name]);
  const schemaLanguage = useFormStore(state => state.schema.form_defn.languages);
  const getFilteredOptions = useFormStore(state => state.getFilteredOptions);

  const theme = useTheme();
  const styles = getStyles(theme);

  // Filtering
  const dependencyKeys = useMemo(() => {
    if (!element.choice_filter) return [];
    const matches = element.choice_filter.match(/\${(.*?)}/g) || [];
    return matches.map(m => m.replace(/[${}]/g, ''));
  }, [element.choice_filter]);

  const dependencyValuesString = useFormStore(
    useCallback((state) =>
      dependencyKeys.map(key => state.formData[key] || '').join('|'),
      [dependencyKeys]
    )
  );

  const availableOptions = useMemo(() => {
    return getFilteredOptions(element);
  }, [element, dependencyValuesString, getFilteredOptions]);

  // Local state - starts with the initial global value
  const [localSelected, setLocalSelected] = useState(() => {
    const val = initialGlobalValue || "";
    return new Set(val ? val.split(" ").filter(Boolean) : []);
  });

  // Track the last committed value to avoid unnecessary resets
  const lastCommittedRef = useRef(initialGlobalValue || "");

  const timeoutRef = useRef(null);

  const commitToStore = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const newValue = Array.from(localSelected).sort().join(" ");

    if (newValue !== lastCommittedRef.current) {
      updateField(element.name, newValue);
      lastCommittedRef.current = newValue;
    }
  }, [localSelected, element.name, updateField]);

  const handleToggle = useCallback((optionName) => {
    setLocalSelected((prev) => {
      const newSet = new Set(prev);
      newSet.has(optionName) ? newSet.delete(optionName) : newSet.add(optionName);
      return newSet;
    });

    // Debounce the store update
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(commitToStore, 180);
  }, [commitToStore]);

  // Final commit when leaving the field
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        commitToStore();
      }
    };
  }, [commitToStore]);

  // Optional: Sync if global value changes externally (e.g. from another field or reset)
  useEffect(() => {
    const currentGlobal = initialGlobalValue || "";
    if (currentGlobal !== lastCommittedRef.current) {
      const newSet = new Set(currentGlobal ? currentGlobal.split(" ").filter(Boolean) : []);
      setLocalSelected(newSet);
      lastCommittedRef.current = currentGlobal;
    }
  }, [initialGlobalValue]);

  if (availableOptions.length === 0) return null;

  const label = getLabel(element, 'label', language, schemaLanguage);
  const hint = getLabel(element, 'hint', language, schemaLanguage);

  return (
    <View>
      {label && (
        <View style={styles.labelContainer}>
          {element.required && <Text style={styles.required}>*</Text>}
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
      {hint && <Text style={styles.hint}>{hint}</Text>}

      <View style={[styles.inputBase, styles.selectMultiple, fieldError ? styles.inputError : null]}>
        {availableOptions.map((option) => {
          const isSelected = localSelected.has(option.name);

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
                {getLabel(option, 'label', language, schemaLanguage)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {fieldError && <Text style={styles.errorText}>{fieldError}</Text>}
    </View>
  );
};

export default React.memo(SelectMultiple);