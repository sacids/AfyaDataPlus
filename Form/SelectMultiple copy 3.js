import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
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
  const { updateFormData, errors, language, schema, formData } = useFormStore();
  const theme = useTheme();
  const styles = getStyles(theme);

  // Add local state to track if component crashed
  const [hasError, setHasError] = useState(false);

  // Debug logging
  console.log('🔵 SelectMultiple rendering:', {
    elementName: element?.name,
    elementType: element?.type,
    valueType: typeof value,
    value: value,
    hasOptions: !!element?.options,
    optionsCount: element?.options?.length,
    hasFormData: !!formData,
    language: language
  });

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

  // If component has error, show fallback
  if (hasError) {
    return (
      <View style={[styles.container, { backgroundColor: '#ffebee', padding: 10 }]}>
        <Text style={{ color: 'red' }}>Error in SelectMultiple: {element?.name}</Text>
        <Text style={{ color: '#666' }}>Please check console for details</Text>
      </View>
    );
  }

  // Ensure element exists
  if (!element) {
    console.error('🔴 SelectMultiple: element is null');
    return null;
  }

  try {
    const label = getLabel(element, 'label', language, schema?.language);
    const hint = getLabel(element, 'hint', language, schema?.language);

    // Safely deserialize value
    let selectedValues = [];
    try {
      selectedValues = deserializeMultiSelect(value);
      console.log('🔵 Deserialized values:', selectedValues, 'from:', value);
    } catch (e) {
      console.error('🔴 Error deserializing value:', e, 'value:', value);
      selectedValues = [];
    }

    // Safely get available options
    let available_options = [];


    try {
      available_options = getAvailableChoices(element, formData || {});
      //available_options = choices(element, formData || {});
      console.log('🔵 Available options:', available_options.length, 'for:', element.name);
    } catch (e) {
      console.error('🔴 Error getting available choices:', e, 'element:', element.name);
      available_options = element.options || [];
    }

    const toggleOption = (optionValue) => {
      try {
        console.log('🔵 Toggling option:', optionValue, 'current:', selectedValues);
        const newValues = toggleMultiSelect(selectedValues, optionValue);
        console.log('🔵 New values:', newValues);
        updateFormData(element.name, newValues);
      } catch (e) {
        console.error('🔴 Error toggling option:', e);
        Alert.alert('Error', 'Failed to select option');
      }
    };

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
          {available_options.length === 0 ? (
            <Text style={{ padding: 10, color: '#999' }}>No options available</Text>
          ) : (
            available_options.map((option) => {
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
  } catch (error) {
    console.error('🔴 CRITICAL ERROR in SelectMultiple render:', error);
    console.error('Component state:', { element, value, language, hasFormData: !!formData });

    return (
      <View style={[styles.container, { backgroundColor: '#ffebee', padding: 10 }]}>
        <Text style={{ color: 'red', fontWeight: 'bold' }}>
          Error in {element?.name || 'SelectMultiple'}:
        </Text>
        <Text style={{ color: '#666' }}>{error.toString()}</Text>
      </View>
    );
  }
};

export default SelectMultiple;