import React, { memo, useEffect, useState, useRef } from 'react';
import { Text, TextInput, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getLabel } from '../../../lib/form/utils';
import { useFormStore } from '../../../store/FormStore';

const NumberInputField = ({ element }) => {
  // 1. SELECTORS: Isolate state to prevent global re-render crashes
  const updateFormData = useFormStore(state => state.updateFormData);
  const globalValue = useFormStore(state => state.formData[element.name]);
  const fieldError = useFormStore(state => 
    (state.errors && state.errors[element.name]) ? state.errors[element.name] : null
  );
  const language = useFormStore(state => state.language);
  const schemaLanguage = useFormStore(state => state.schema?.language);

  const theme = useTheme();
  const styles = getStyles(theme);

  // 2. LOCAL STATE & REFS
  const [localValue, setLocalValue] = useState(globalValue || '');
  const debounceTimer = useRef(null);

  // Keep local state in sync if global store is updated externally (e.g. Logic/Reset)
  useEffect(() => {
    if (globalValue !== localValue) {
      setLocalValue(globalValue || '');
    }
  }, [globalValue]);

  // 3. SYNC FUNCTION
  const syncWithStore = (value) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    // Don't update if nothing changed to save CPU cycles
    if (value !== globalValue) {
      updateFormData(element.name, value);
    }
  };

  const handleChangeText = (text) => {
    // Basic numeric validation: allow only digits, dots, and commas
    const cleanedText = text.replace(/[^0-9.,-]/g, '');
    setLocalValue(cleanedText);

    // 4. DEBOUNCE: Update global store after 800ms of no typing
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    debounceTimer.current = setTimeout(() => {
      syncWithStore(cleanedText);
    }, 800);
  };

  const handleBlur = () => {
    // 5. IMMEDIATE SYNC: Safety net for the "Final Field" problem
    syncWithStore(localValue);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const label = getLabel(element, 'label', language, schemaLanguage);
  const hint = getLabel(element, 'hint', language, schemaLanguage);

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelContainer}>
          {element.required && <Text style={styles.required}>*</Text>}
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
      
      {hint && <Text style={styles.hint}>{hint}</Text>}

      <TextInput
        inputMode="numeric"
        keyboardType="numeric" // Use numeric keyboard for better UX
        style={[
          styles.inputBase,
          styles.textInput,
          fieldError ? styles.inputError : null,
        ]}
        value={localValue}
        onChangeText={handleChangeText}
        onBlur={handleBlur}
        placeholder=""
        placeholderTextColor="#999"
      />

      {fieldError && (
        <Text style={styles.errorText}>{fieldError}</Text>
      )}
    </View>
  );
};

export default memo(NumberInputField);