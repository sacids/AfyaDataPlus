import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Picker } from '@react-native-picker/picker';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getAvailableChoices } from '../../../lib/form/engine';
import { getLabel } from '../../../lib/form/utils';
import { useFormStore } from '../../../store/FormStore-xx';

const SelectOne = ({ element }) => {
  // 1. STAGING SELECTORS
  const updateFormData = useFormStore(state => state.updateFormData);
  const globalValue = useFormStore(state => state.formData[element.name]);
  const fieldError = useFormStore(state => state.errors?.[element.name] || null);
  const formData = useFormStore(state => state.formData);
  const language = useFormStore(state => state.language);
  const schemaLanguage = useFormStore(state => state.schema?.language);
  const schema = useFormStore(state => state.schema);

  const theme = useTheme();
  const styles = getStyles(theme);

  const mounted = useRef(true);
  const isUpdating = useRef(false);

  // 2. LOCAL STATE
  const [localValue, setLocalValue] = useState(() => {
    try {
      return typeof globalValue === 'string' ? globalValue : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    if (isUpdating.current) return;

    try {
      const newValue = typeof globalValue === 'string' ? globalValue : null;
      if (localValue !== newValue) {
        setLocalValue(newValue);
      }
    } catch (e) {
      console.error('Error syncing local value:', e);
    }
  }, [globalValue]);

  const availableOptions = useMemo(() => {
    try {
      return getAvailableChoices(element, formData || {});
    } catch (e) {
      console.error('Error getting available choices:', e);
      return [];
    }
  }, [element, formData, schema]);

  const handleSelect = useCallback((optionValue) => {
    if (isUpdating.current) return;

    try {
      const newValue = localValue === optionValue ? null : optionValue;
      setLocalValue(newValue);
      isUpdating.current = true;

      requestAnimationFrame(() => {
        if (mounted.current) {
          updateFormData(element.name, newValue);
          setTimeout(() => {
            isUpdating.current = false;
          }, 50);
        }
      });
    } catch (error) {
      console.error('Error in handleSelect:', error);
      isUpdating.current = false;
    }
  }, [localValue, element.name, updateFormData]);

  const label = useMemo(() => {
    try {
      return getLabel(element, 'label', language, schemaLanguage);
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

  const appearances = useMemo(() => {
    try {
      return (element.appearance || '').toString().split(',').map(a => a.trim().toLowerCase());
    } catch (e) {
      return [];
    }
  }, [element.appearance]);

  const isSlider = appearances.includes('slider') || appearances.includes('slide');
  const isPicker = appearances.includes('picker') || appearances.includes('dropdown') || appearances.includes('minimal');

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Memoize render functions
  const renderLabel = useCallback(() => label && (
    <View style={styles.labelContainer}>
      {element.required && <Text style={styles.required}>*</Text>}
      <Text style={styles.label}>{label}</Text>
    </View>
  ), [label, element.required, styles]);

  const renderHint = useCallback(() => hint && <Text style={styles.hint}>{hint}</Text>, [hint, styles]);
  const renderError = useCallback(() => fieldError && <Text style={styles.errorText}>{fieldError}</Text>, [fieldError, styles]);

  // Slider Appearance
  if (isSlider && availableOptions.length > 0) {
    const options = availableOptions;
    const currentIndex = localValue ? options.findIndex(opt => opt.name === localValue) : 0;
    const selectedOption = options[Math.round(currentIndex)];

    return (
      <View style={styles.container}>
        {renderLabel()}
        {renderHint()}
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={options.length - 1}
          step={1}
          value={currentIndex}
          onValueChange={(idx) => {
            const roundedIdx = Math.round(idx);
            if (roundedIdx >= 0 && roundedIdx < options.length) {
              const selectedOption = options[roundedIdx];
              if (selectedOption) handleSelect(selectedOption.name);
            }
          }}
          minimumTrackTintColor={theme.colors.primary}
          thumbTintColor={theme.colors.primary}
        />
        {selectedOption && (
          <Text style={styles.label}>
            {getLabel(selectedOption, 'label', language, schemaLanguage)}
          </Text>
        )}
        {renderError()}
      </View>
    );
  }

  // Picker Appearance
  if (isPicker && availableOptions.length > 0) {
    return (
      <View style={styles.container}>
        {renderLabel()}
        {renderHint()}
        <View style={[styles.inputBase, styles.pickerContainer, fieldError ? styles.inputError : null]}>
          <Picker
            selectedValue={localValue}
            onValueChange={handleSelect}
            style={styles.picker}
            mode="dropdown"
          >
            <Picker.Item label="Select an option..." value={null} />
            {availableOptions.map((option) => (
              <Picker.Item
                key={option.name}
                label={getLabel(option, 'label', language, schemaLanguage) || option.name}
                value={option.name}
              />
            ))}
          </Picker>
        </View>
        {renderError()}
      </View>
    );
  }

  // Default Radio Buttons
  return (
    <View style={styles.container}>
      {renderLabel()}
      {renderHint()}
      <View style={[styles.inputBase, fieldError ? styles.inputError : null]}>
        {availableOptions.map((option) => (
          <TouchableOpacity
            key={option.name}
            style={styles.checkboxContainer}
            onPress={() => handleSelect(option.name)}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name={localValue === option.name ? 'radio-button-checked' : 'radio-button-unchecked'}
              size={24}
              color={localValue === option.name ? theme.colors.primary : styles.inputBase?.borderColor || '#ccc'}
            />
            <Text style={styles.checkboxLabel}>
              {getLabel(option, 'label', language, schemaLanguage) || option.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {renderError()}
    </View>
  );
};

// Custom comparator to prevent unnecessary re-renders
export default memo(SelectOne, (prevProps, nextProps) => {
  return prevProps.element === nextProps.element;
});