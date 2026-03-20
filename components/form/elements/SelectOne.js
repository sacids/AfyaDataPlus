import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Picker } from '@react-native-picker/picker';
import { memo, useEffect, useState } from 'react'; // Added memo
import { Text, TouchableOpacity, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getAvailableChoices } from '../../../lib/form/engine';
import { getLabel } from '../../../lib/form/utils';
import { useFormStore } from '../../../store/FormStore';

const SelectOne = ({ element }) => {
  // 1. STAGING SELECTORS: Only grab what is needed for THIS field
  const updateFormData = useFormStore(state => state.updateFormData);
  const globalValue = useFormStore(state => state.formData[element.name]);
  const fieldError = useFormStore(state =>
    (state.errors && state.errors[element.name]) ? state.errors[element.name] : null
  );

  // We still need formData for choices logic, but let's keep it stable
  const formData = useFormStore(state => state.formData);
  const language = useFormStore(state => state.language);
  const schemaLanguage = useFormStore(state => state.schema?.language);

  const theme = useTheme();
  const styles = getStyles(theme);

  // 2. LOCAL STATE: Sync with globalValue to keep UI snappy
  const [localValue, setLocalValue] = useState(globalValue);

  useEffect(() => {
    setLocalValue(globalValue);
  }, [globalValue]);

  // Ensure value is a string or null
  const selectedValue = typeof localValue === 'string' ? localValue : null;
  const available_options = getAvailableChoices(element, formData);

  const handleSelect = (optionValue) => {
    // If the same option is selected, allow deselecting (set to null)
    const newValue = selectedValue === optionValue ? null : optionValue;

    setLocalValue(newValue); // Instant UI feedback

    // 3. DEFERRED UPDATE: Let animations/pickers finish before heavy logic runs
    requestAnimationFrame(() => {
      updateFormData(element.name, newValue);
    });
  };

  const label = getLabel(element, 'label', language, schemaLanguage);
  const hint = getLabel(element, 'hint', language, schemaLanguage);

  const appearances = (element.appearance || '').toString().split(',').map(a => a.trim().toLowerCase());
  const isSlider = appearances.includes('slider') || appearances.includes('slide');
  const isPicker = appearances.includes('picker') || appearances.includes('dropdown') || appearances.includes('minimal');

  // --- RENDER HELPERS ---
  const renderLabel = () => label && (
    <View style={styles.labelContainer}>
      {element.required && <Text style={styles.required}>*</Text>}
      <Text style={styles.label}>{label}</Text>
    </View>
  );

  const renderHint = () => hint && <Text style={styles.hint}>{hint}</Text>;

  const renderError = () => fieldError && <Text style={styles.errorText}>{fieldError}</Text>;

  // 1. Slider Appearance
  if (isSlider) {
    const options = available_options;
    const currentIndex = selectedValue ? options.findIndex(opt => opt.name === selectedValue) : 0;

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
            const selectedOption = options[Math.round(idx)];
            if (selectedOption) handleSelect(selectedOption.name);
          }}
          minimumTrackTintColor={theme.colors.primary}
          thumbTintColor={theme.colors.primary}
        />
        <Text style={styles.label}>
          {selectedValue ? getLabel(options.find(opt => opt.name === selectedValue), 'label', language, schemaLanguage) : ''}
        </Text>
        {renderError()}
      </View>
    );
  }

  // 2. Picker Appearance
  if (isPicker) {
    return (
      <View style={styles.container}>
        {renderLabel()}
        {renderHint()}
        <View style={[styles.inputBase, styles.pickerContainer, fieldError ? styles.inputError : null]}>
          <Picker
            selectedValue={selectedValue}
            onValueChange={handleSelect}
            style={styles.picker}
            mode="dropdown"
          >
            <Picker.Item label="Select an option..." value={null} />
            {available_options.map((option) => (
              <Picker.Item
                key={option.name}
                label={getLabel(option, 'label', language, schemaLanguage)}
                value={option.name}
              />
            ))}
          </Picker>
        </View>
        {renderError()}
      </View>
    );
  }

  // 3. Default Radio Buttons
  return (
    <View style={styles.container}>
      {renderLabel()}
      {renderHint()}
      <View style={[styles.inputBase, fieldError ? styles.inputError : null]}>
        {available_options.map((option) => (
          <TouchableOpacity
            key={option.name}
            style={styles.checkboxContainer}
            onPress={() => handleSelect(option.name)}
          >
            <MaterialIcons
              name={selectedValue === option.name ? 'radio-button-checked' : 'radio-button-unchecked'}
              size={24}
              color={selectedValue === option.name ? theme.colors.primary : styles.inputBase?.borderColor || '#ccc'}
            />
            <Text style={styles.checkboxLabel}>
              {getLabel(option, 'label', language, schemaLanguage)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {renderError()}
    </View>
  );
};

export default memo(SelectOne);