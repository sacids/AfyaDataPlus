import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getLabel } from '../../../lib/form/utils';
import { useFormStore } from '../../../store/useFormStore';

const SelectMultiple = ({ element, globalValue }) => {
  const updateField = useFormStore(state => state.updateField);
  const language = useFormStore(state => state.language);
  const fieldError = useFormStore(state => state.errors[element.name]);
  const schemaLanguage = useFormStore(state => state.schema.form_defn.languages);
  const getFilteredOptions = useFormStore(state => state.getFilteredOptions);
  
  const theme = useTheme();
  const styles = getStyles(theme);
  
  // Get dependency keys for filtering
  const dependencyKeys = useMemo(() => {
    if (!element.choice_filter) return [];
    const matches = element.choice_filter.match(/\${(.*?)}/g) || [];
    return matches.map(m => m.replace(/[${}]/g, ''));
  }, [element.choice_filter]);
  
  // Subscribe to dependency values
  const dependencyValuesString = useFormStore(
    useCallback(
      (state) => dependencyKeys.map(key => state.formData[key] || '').join('|'),
      [dependencyKeys]
    )
  );
  
  // Get filtered options
  const availableOptions = useMemo(() => {
    return getFilteredOptions(element);
  }, [element, dependencyValuesString, getFilteredOptions]);
  
  // Current value from store
  const currentValue = globalValue || "";
  const selectedArray = useMemo(() => 
    currentValue ? currentValue.split(" ").filter(v => v !== "") : [],
    [currentValue]
  );
  
  // Immediate update - no debouncing
  const handleToggle = useCallback((optionName) => {
    let newSelected;
    if (selectedArray.includes(optionName)) {
      newSelected = selectedArray.filter(item => item !== optionName);
    } else {
      newSelected = [...selectedArray, optionName];
    }
    
    const newValue = newSelected.join(" ");
    updateField(element.name, newValue);
  }, [selectedArray, element.name, updateField]);
  
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
        {availableOptions.map((option) => (
          <TouchableOpacity
            key={option.name}
            style={styles.checkboxContainer}
            onPress={() => handleToggle(option.name)}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name={selectedArray.includes(option.name) ? 'check-box' : 'check-box-outline-blank'}
              size={24}
              color={selectedArray.includes(option.name) ? theme.colors.primary : styles.inputBase.borderColor}
            />
            <Text style={styles.checkboxLabel}>
              {getLabel(option, 'label', language, schemaLanguage)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {fieldError && <Text style={styles.errorText}>{fieldError}</Text>}
    </View>
  );
};

export default React.memo(SelectMultiple);