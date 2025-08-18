import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Picker } from '@react-native-picker/picker';
import { Text, TouchableOpacity, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getLabel } from '../../../lib/form/utils';
import { useFormStore } from '../../../store/FormStore';

const SelectOne = ({ element, value }) => {
  const { updateFormData, errors, language, schema } = useFormStore();
  const theme = useTheme();
  const styles = getStyles(theme);

  // Ensure value is a string or null
  const selectedValue = typeof value === 'string' ? value : null;

  const handleSelect = (optionValue) => {
    // If the same option is selected, allow deselecting (set to null)
    const newValue = selectedValue === optionValue ? null : optionValue;
    updateFormData(element.name, newValue);
  };

  const label = getLabel(element, 'label', language, schema.language);
  const hint = getLabel(element, 'hint', language, schema.language);

  // Normalize appearance string (handle null/undefined and split by commas)
  const appearances = (element.appearance || '').toString().split(',').map(a => a.trim().toLowerCase());

  // Check for slider appearance (either 'slider' or 'slide')
  const isSlider = appearances.some(a => a === 'slider' || a === 'slide');

  // Check for picker appearance (either 'picker' or 'dropdown')
  const isPicker = appearances.some(a => a === 'picker' || a === 'dropdown' || a === 'minimal');

  // Render slider appearance
  if (isSlider) {
    const options = element.options;
    const minValue = 0;
    const maxValue = options.length - 1;
    const currentIndex = selectedValue ? options.findIndex(opt => opt.name === selectedValue) : 0;

    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.hint}>{hint}</Text>
        <Slider
          style={styles.slider}
          minimumValue={minValue}
          maximumValue={maxValue}
          step={1}
          value={currentIndex}
          onValueChange={(value) => {
            const selectedOption = options[Math.round(value)];
            handleSelect(selectedOption.name);
          }}
          minimumTrackTintColor={styles.button.backgroundColor}
          maximumTrackTintColor={styles.inputBase.borderColor}
          thumbTintColor={styles.button.backgroundColor}
        />
        <Text style={styles.label}>
          {selectedValue ? getLabel(element.options.find(opt => opt.name === selectedValue), 'label', language, schema.language) : ''}
        </Text>
        {errors[element.name] && (
          <Text style={styles.errorText}>{errors[element.name]}</Text>
        )}
      </View>
    );
  }

  // Render picker appearance
  if (isPicker) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.hint}>{hint}</Text>
        <View style={[
          styles.inputBase,
          styles.pickerContainer,
          errors[element.name] ? styles.inputError : null,
        ]}>
          <Picker
            selectedValue={selectedValue}
            onValueChange={handleSelect}
            style={styles.picker}
            mode="dropdown"
          >
            <Picker.Item label="Select an option..." value={null} />
            {element.options.map((option) => (
              <Picker.Item
                key={option.name}
                label={getLabel(option, 'label', language, schema.language)}
                value={option.name}
              />
            ))}
          </Picker>
        </View>
        {errors[element.name] && (
          <Text style={styles.errorText}>{errors[element.name]}</Text>
        )}
      </View>
    );
  }

  // Default radio button appearance
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.hint}>{hint}</Text>
      <View
        style={[
          styles.inputBase,
          styles.selectOne,
          errors[element.name] ? styles.inputError : null,
        ]}
      >
        {element.options.map((option) => (
          <TouchableOpacity
            key={option.name}
            style={styles.checkboxContainer}
            onPress={() => handleSelect(option.name)}
          >
            <MaterialIcons
              name={
                selectedValue === option.name
                  ? 'radio-button-checked'
                  : 'radio-button-unchecked'
              }
              size={24}
              color={
                selectedValue === option.name
                  ? styles.button.backgroundColor
                  : styles.inputBase.borderColor
              }
            />
            <Text style={styles.checkboxLabel}>
              {getLabel(option, 'label', language, schema.language)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors[element.name] && (
        <Text style={styles.errorText}>{errors[element.name]}</Text>
      )}
    </View>
  );
};

export default SelectOne;