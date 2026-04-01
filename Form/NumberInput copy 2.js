import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getLabel } from '../../../lib/form/utils';
import { useFormStore } from '../../../store/useFormStore';

const NumberInputField = ({ element }) => {
  // 1. STORE SELECTORS - Use shallow equality to prevent unnecessary re-renders
  const formData = useFormStore(state => state.formData);
  const updateField = useFormStore(state => state.updateField);
  const language = useFormStore(state => state.language);
  const fieldError = useFormStore(state => state.errors[element.name]);
  const schemaLanguage = useFormStore(state => state.schema?.form_defn?.languages);
  
  const globalValue = formData[element.name];

  const theme = useTheme();
  const styles = getStyles(theme);

  // 2. LOCAL STATE
  const [localValue, setLocalValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  
  // Refs for debouncing and tracking
  const debounceTimer = useRef(null);
  const isMounted = useRef(true);
  const lastSyncedValue = useRef(globalValue);

  // Set initial value when component mounts or global value changes externally
  useEffect(() => {
    if (isMounted.current) {
      const newValue = globalValue !== undefined && globalValue !== null ? String(globalValue) : '';
      setLocalValue(newValue);
      lastSyncedValue.current = newValue;
    }
  }, [globalValue]);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Safe sync with store - only if value actually changed
  const syncWithStore = useCallback((value) => {
    if (!isMounted.current) return;
    
    // Don't sync if value hasn't changed
    if (value === lastSyncedValue.current) return;
    
    lastSyncedValue.current = value;
    
    try {
      // Convert to number or keep as string based on field type
      let processedValue = value;
      if (element.type === 'integer') {
        const num = parseInt(value, 10);
        processedValue = isNaN(num) ? null : num;
      } else if (element.type === 'number' || element.type === 'decimal') {
        const num = parseFloat(value);
        processedValue = isNaN(num) ? null : num;
      }
      
      updateField(element.name, processedValue);
    } catch (error) {
      console.error(`Error syncing number field ${element.name}:`, error);
    }
  }, [element.name, element.type, updateField]);

  // Debounced update
  const scheduleSync = useCallback((value) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      syncWithStore(value);
    }, 500); // Reduced from 800ms for better responsiveness
  }, [syncWithStore]);

  // Handle text changes with proper validation
  const handleChangeText = useCallback((text) => {
    if (!isMounted.current) return;
    
    // Validate input based on field type
    let cleanedText = text;
    
    if (element.type === 'integer') {
      // Only allow digits and optional minus sign at start
      cleanedText = text.replace(/[^-0-9]/g, '');
      // Prevent multiple minus signs
      if (cleanedText.split('-').length > 2) {
        cleanedText = cleanedText.replace(/-/g, '');
      }
      // Only allow minus at start
      if (cleanedText.indexOf('-') > 0) {
        cleanedText = cleanedText.replace(/-/g, '');
      }
    } else if (element.type === 'number' || element.type === 'decimal') {
      // Allow digits, decimal point, and optional minus sign
      cleanedText = text.replace(/[^-0-9.]/g, '');
      // Prevent multiple decimal points
      const parts = cleanedText.split('.');
      if (parts.length > 2) {
        cleanedText = parts[0] + '.' + parts.slice(1).join('');
      }
      // Only allow minus at start
      if (cleanedText.indexOf('-') > 0) {
        cleanedText = cleanedText.replace(/-/g, '');
      }
    }
    
    setLocalValue(cleanedText);
    scheduleSync(cleanedText);
  }, [element.type, scheduleSync]);

  // Immediate sync on blur
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    
    // Clear any pending debounce
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    
    // Sync immediately on blur
    syncWithStore(localValue);
  }, [localValue, syncWithStore]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const label = getLabel(element, 'label', language, schemaLanguage);
  const hint = getLabel(element, 'hint', language, schemaLanguage);

  // Don't render if not relevant (though parent should handle this)
  if (!element) return null;

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelContainer}>
          {element.required === 'yes' && <Text style={styles.required}>*</Text>}
          <Text style={styles.label}>{label}</Text>
        </View>
      )}

      {hint && <Text style={styles.hint}>{hint}</Text>}

      <TextInput
        inputMode={element.type === 'integer' ? 'numeric' : 'decimal'}
        keyboardType={element.type === 'integer' ? 'number-pad' : 'decimal-pad'}
        style={[
          styles.inputBase,
          styles.textInput,
          fieldError ? styles.inputError : null,
          isFocused && styles.inputFocused,
        ]}
        value={localValue}
        onChangeText={handleChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={element.placeholder || ''}
        placeholderTextColor="#999"
        editable={!element.read_only}
        selectTextOnFocus
      />

      {fieldError && (
        <Text style={styles.errorText}>{fieldError}</Text>
      )}
    </View>
  );
};

// Custom comparison for memo to prevent unnecessary re-renders
const areEqual = (prevProps, nextProps) => {
  return prevProps.element.name === nextProps.element.name;
};

export default memo(NumberInputField, areEqual);