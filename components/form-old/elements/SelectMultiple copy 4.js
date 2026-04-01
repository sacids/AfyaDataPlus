import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import {
  deserializeMultiSelect,
  getAvailableChoices,
  toggleMultiSelect
} from '../../../lib/form/engine';
import { getLabel } from '../../../lib/form/utils';
import { useFormStore } from '../../../store/FormStore';



const SelectMultiple = ({ element, value }) => {
  const { updateFormData, errors, language, schema } = useFormStore();

  const formData = useFormStore(state => state.formData);

  
  const theme = useTheme();
  const styles = getStyles(theme);

  // Add local state to track if component crashed
  const [hasError, setHasError] = useState(false);



  // Check for critical props
  useEffect(() => {
    if (!element) {
      console.error('🔴 SelectMultiple: element is undefined');
      setHasError(true);
      return;
    }

    if (!element.options) {
      console.error('🔴 SelectMultiple: element.options is undefined for', element.name);
      setHasError(true);
      return;
    }
  }, [element]);



  const label = useMemo(() =>
    getLabel(element, 'label', language, schema?.language),
    [element, language, schema?.language]
  );

  const hint = useMemo(() =>
    getLabel(element, 'hint', language, schema?.language),
    [element, language, schema?.language]
  );


  const selectedValues = useMemo(() =>
    deserializeMultiSelect(value),
    [value]
  );
  //console.log('🔵 Deserialized values:', selectedValues, 'from:', value);


  // Memoize available options - this is the expensive part
  const availableOptions = useMemo(() => {
    try {
      return getAvailableChoices(element, formData || {});
    } catch (e) {
      console.error('Error getting available choices:', e);
      return element?.options || [];
    }
  }, [element, formData]); // Only recompute when element or formData changes
  //console.log('🔵 Available options:', availableOptions.length, 'for:', element.name);

  const toggleOption = useCallback((optionValue) => {
    try {
      // Calculate new values without re-rendering during the operation
      //console.log('🔵 Toggling option:', optionValue, 'current:', selectedValues);
      const newValues = toggleMultiSelect(selectedValues, optionValue);

      // Batch the update - this is the only place formData changes
      updateFormData(element.name, newValues);
      //console.log('🔵 New values:', newValues);
    } catch (e) {
      console.error('Error toggling option:', e);
      Alert.alert('Error', 'Failed to select option');
    }
  }, [element.name, selectedValues, updateFormData]);


  // Quick validation
  if (!element || !element.options) {
    return null;
  }

  return (
    <View style={styles.container}>
      {label ? (
        <View style={styles.labelContainer}>
          {element.required && <Text style={styles.required}>*</Text>}
          <Text style={styles.label}>{label}</Text>
        </View>
      ) : null}

      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      <View
        style={[
          styles.inputBase,
          errors?.[element.name] ? styles.inputError : null,
        ]}
      >
        {availableOptions.length === 0 ? (
          <Text style={{ padding: 10, color: '#999' }}>No options available</Text>
        ) : (
          availableOptions.map((option) => {
            // Safety check for option
            if (!option) return null;

            const optionLabel = getLabel(option, 'label', language, schema?.language) || option.name;
            const isSelected = selectedValues.includes(option.name);

            return (
              <TouchableOpacity
                key={option.name || Math.random().toString()}
                style={styles.checkboxContainer}
                onPress={() => toggleOption(option.name)}
              >
                <MaterialIcons
                  name={isSelected ? 'check-box' : 'check-box-outline-blank'}
                  size={24}
                  color={isSelected ? theme.colors.primary : styles.inputBase.borderColor}
                />
                <Text style={styles.checkboxLabel}>{optionLabel}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {errors?.[element.name] && (
        <Text style={styles.errorText}>{errors[element.name]}</Text>
      )}
    </View>
  );

};

export default React.memo(SelectMultiple, (prevProps, nextProps) => {
  // Only re-render if element changed or value changed
  return prevProps.element === nextProps.element &&
    prevProps.value === nextProps.value;
});

//export default SelectMultiple;