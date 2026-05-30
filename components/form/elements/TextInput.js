import { memo, useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getLabel } from '../../../lib/form/utils';
import { useFormStore } from '../../../store/useFormStore';

const TextInputField = ({ element, globalValue }) => {

  // 1. SELECTORS: Isolate this component from other form changes
  const language = useFormStore(state => state.language);
  const schemaLanguage = useFormStore(state => state.schema.form_defn.languages);

  // STORE SELECTORS
  const updateField = useFormStore(state => state.updateField);
  const fieldError = useFormStore(state => state.errors[element.name]);

  const theme = useTheme();
  const styles = getStyles(theme);

  // 2. LOCAL STATE: For immediate typing response
  const [localValue, setLocalValue] = useState(globalValue || '');
  const debounceTimer = useRef(null);

  // Determine appearance flags
  const isNumeric = element.appearance?.includes('numbers');
  const isMultiline = element.appearance?.includes('multiline');

  // Sync local state if global data changes (e.g., external calculation or reset)
  useEffect(() => {
    if (globalValue !== localValue) {
      setLocalValue(globalValue || '');
    }
  }, [globalValue]);

  // 3. SYNC FUNCTION: The "Final Source of Truth" update
  const syncWithStore = (value) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    updateField(element.name, value);
  };

  const handleChangeText = (text) => {
    // If it's a number field, optionally enforce numeric characters only at the UI level
    let processedText = text;
    if (isNumeric) {
      // Replaces anything that isn't a digit, a comma, or a period
      processedText = text.replace(/[^0-9.,-]/g, '');
    }

    setLocalValue(processedText); // Instant UI update

    // 4. DEBOUNCE: Update global store after 800ms of no typing
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      syncWithStore(processedText);
    }, 800); 
  };

  const handleBlur = () => {
    // 5. IMMEDIATE SYNC: If user leaves field, sync now!
    syncWithStore(localValue);
  };

  // Cleanup timer on unmount
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
        style={[
          styles.inputBase,
          styles.textInput,
          fieldError ? styles.inputError : null,
        ]}
        value={localValue}
        onChangeText={handleChangeText}
        onBlur={handleBlur} // The safety net for the "last field"
        placeholder=""
        placeholderTextColor="#999"
        
        // --- NUMERIC CONFIGURATION CONTROLS ---
        keyboardType={isNumeric ? 'decimal-pad' : 'default'}
        multiline={isNumeric ? false : isMultiline} // Ensure number inputs are single line
        returnKeyType={isNumeric ? 'done' : 'default'}
      />

      {fieldError && (
        <Text style={styles.errorText}>{fieldError}</Text>
      )}
    </View>
  );
};

export default memo(TextInputField);