import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getLabel } from '../../../lib/form/utils';
import { useFormStore } from '../../../store/useFormStore';



// 1. Memoized Pressable Item
// eslint-disable-next-line react/display-name
const SelectOptionItem = React.memo(({ option, isSelected, onToggle, theme, styles, language, schemaLanguage }) => {
  return (
    <Pressable
      // HitSlop increases touch area without changing layout
      hitSlop={10}
      style={({ pressed }) => [
        styles.checkboxContainer,
        { opacity: pressed ? 0.7 : 1.0 } // Manual light animation
      ]}
      onPress={() => onToggle(option.name)}
    >
      <MaterialCommunityIcons
        name={isSelected ? 'checkbox-marked-outline' : 'checkbox-blank-outline'}
        size={24}
        color={isSelected ? theme.colors.primary : styles.inputBase.borderColor}
      />

      <Text style={styles.checkboxLabel}>
        {getLabel(option, 'label', language, schemaLanguage)}
      </Text>
    </Pressable>
  );
});

const SelectMultiple = ({ element, globalValue }) => {
  const updateField = useFormStore(state => state.updateField);
  const language = useFormStore(state => state.language);
  const fieldError = useFormStore(state => state.errors[element.name]);
  const schemaLanguage = useFormStore(state => state.schema.form_defn.languages);
  const getFilteredOptions = useFormStore(state => state.getFilteredOptions);

  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

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
    ),
    (oldVal, newVal) => oldVal === newVal // CRITICAL: Only re-render if the string actually changes
  );

  const availableOptions = useMemo(() => {

    return getFilteredOptions(element);
  }, [element, dependencyValuesString, getFilteredOptions]);

  //const availableOptions = element.options

  // 1. LOCAL STATE: The source of truth for the UI
  const [localSelected, setLocalSelected] = useState(new Set(
    Array.isArray(globalValue) ? globalValue : []
  ));

  // 2. REFS: For tracking changes without re-renders
  const lastCommittedValue = useRef(JSON.stringify(Array.from(localSelected)));
  const timerRef = useRef(null);

  // Sync local state if globalValue changes EXTERNALLY (e.g. form reset)
  useEffect(() => {
    const globalStr = JSON.stringify(globalValue || []);
    if (globalStr !== lastCommittedValue.current) {
      setLocalSelected(new Set(Array.isArray(globalValue) ? globalValue : []));
      lastCommittedValue.current = globalStr;
    }
  }, [globalValue]);

  // 3. THE SYNC LOGIC: Debounced update to the global store
  const syncToStore = useCallback((currentSet) => {
    const arrayValue = Array.from(currentSet);
    const newValueStr = JSON.stringify(arrayValue);

    if (newValueStr !== lastCommittedValue.current) {
      lastCommittedValue.current = newValueStr;
      updateField(element.name, arrayValue);
    }
  }, [element.name, updateField]);

  const handleToggle = useCallback((optionName) => {
    // A. Update UI immediately
    setLocalSelected((prev) => {
      const next = new Set(prev);
      if (next.has(optionName)) next.delete(optionName);
      else next.add(optionName);

      // B. Clear existing timer and start a new one (Debounce)
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        syncToStore(next);
      }, 750); // 250ms is usually the sweet spot for rapid taps

      return next;
    });
  }, [syncToStore]);

  // Cleanup on unmount: Ensure last changes are saved
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        // Optional: Force a final sync here if needed
      }
    };
  }, []);

  if (availableOptions.length === 0) return null;

  const label = getLabel(element, 'label', language, schemaLanguage);
  const hint = getLabel(element, 'hint', language, schemaLanguage);

  return (
    <>
      {label && (
        <View style={styles.labelContainer}>
          {element.required && <Text style={styles.required}>*</Text>}
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
      {hint && <Text style={styles.hint}>{hint}</Text>}

      <View style={[styles.inputBase, styles.selectMultiple, fieldError ? styles.inputError : null]}>
        {availableOptions.map((option) => (
          <SelectOptionItem
            key={option.name}
            option={option}
            isSelected={localSelected.has(option.name)}
            onToggle={handleToggle}
            theme={theme}
            styles={styles}
            language={language}
            schemaLanguage={schemaLanguage}
          />
        ))}
      </View>

      {fieldError && <Text style={styles.errorText}>{fieldError}</Text>}
    </>
  );
};

export default React.memo(SelectMultiple);