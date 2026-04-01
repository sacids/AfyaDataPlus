import { MaterialIcons } from '@expo/vector-icons';
import { memo, useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import {
  deserializeMultiSelect,
  getAvailableChoices,
  toggleMultiSelect
} from '../../../lib/form/engine';
import { getLabel } from '../../../lib/form/utils';
import { useFormStore } from '../../../store/FormStore';

const SelectMultiple = ({ element }) => {
  // 1. GRANULAR SELECTORS
  const updateFormData = useFormStore(state => state.updateFormData);
  const globalValue = useFormStore(state => state.formData[element.name]);
  const fieldError = useFormStore(state =>
    (state.errors && state.errors[element.name]) ? state.errors[element.name] : null
  );

  // Necessary for logic-based choices (getAvailableChoices)
  const formData = useFormStore(state => state.formData);
  const language = useFormStore(state => state.language);
  const schemaLanguage = useFormStore(state => state.schema?.language);

  const theme = useTheme();
  const styles = getStyles(theme);

  const debounceTimer = useRef(null);

  // 2. LOCAL STATE (Immediate UI Feedback)
  // Deserialize the global string/array into a working array locally
  const [localSelected, setLocalSelected] = useState(() => deserializeMultiSelect(globalValue));

  // Sync local state if global data changes (e.g. form reset or external logic)
  useEffect(() => {
    setLocalSelected(deserializeMultiSelect(globalValue));
  }, [globalValue]);

  const availableOptions = getAvailableChoices(element, formData || {});

  const handleToggle = (optionName) => {
    // Calculate new selection set locally
    const nextValues = toggleMultiSelect(localSelected, optionName);

    // Update UI instantly
    setLocalSelected(nextValues);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      updateFormData(element.name, nextValues);
    }, 300);

    // 3. DEFERRED GLOBAL UPDATE
    // This allows the checkbox animation to remain smooth even if the store is heavy
    // requestAnimationFrame(() => {
    //   updateFormData(element.name, nextValues);
    // });
  };

  const label = getLabel(element, 'label', language, schemaLanguage);
  const hint = getLabel(element, 'hint', language, schemaLanguage);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

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
        {availableOptions.length === 0 ? (
          <Text style={styles.placeholderText}>No options available</Text>
        ) : (
          availableOptions.map((option) => {
            if (!option) return null;
            const isSelected = localSelected.includes(option.name);

            return (
              <TouchableOpacity
                key={option.name}
                style={styles.checkboxContainer}
                onPress={() => handleToggle(option.name)}
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
          })
        )}
      </View>

      {fieldError && <Text style={styles.errorText}>{fieldError}</Text>}
    </View>
  );
};

// 4. MEMOIZATION
// No longer needs a custom comparator because we removed 'value' from props.
// It will only re-render if the 'element' object reference changes.
export default memo(SelectMultiple);