import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Picker } from '@react-native-picker/picker';
import { Text, TouchableOpacity, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getLabel } from '../../../lib/form/utils';
import { evaluateExpression } from '../../../lib/form/validation';
import { useFormStore } from '../../../store/FormStore';


const SelectOne = ({ element, value }) => {
  const { updateFormData, formData, errors, language, schema } = useFormStore();
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

  const appearances = (element.appearance || '').toString().split(',').map(a => a.trim().toLowerCase());
  const isSlider = appearances.some(a => a === 'slider' || a === 'slide');
  const isPicker = appearances.some(a => a === 'picker' || a === 'dropdown' || a === 'minimal');


  const available_options = element.options.filter((option) => {
    if (!element.constraint) return true
    const tmp_formData = { ...formData };
    tmp_formData[element.name] = option.name;

    return evaluateExpression(element.constraint, tmp_formData, element.name) !== false;
  });

  // Render slider appearance
  if (isSlider) {
    const options = available_options;
    const minValue = 0;
    const maxValue = options.length - 1;
    const currentIndex = selectedValue ? options.findIndex(opt => opt.name === selectedValue) : 0;

    return (
      <View style={styles.container}>

        <View style={styles.labelContainer}>
          {(element.required) && <Text style={styles.required}>*</Text>}
          <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={styles.hint}>{hint}</Text>

        <Slider
          style={styles.slider}
          minimumValue={minValue}
          maximumValue={maxValue}
          step={1}
          value={currentIndex}
          onValueChange={(value) => {
            const selectedOption = options[Math.round(value)] || {};
            if (!selectedOption.name) {
              console.warn(`No option selected for ${element.name} at index ${value}`);
              return;
            }
            handleSelect(selectedOption.name);
          }}
          minimumTrackTintColor={theme.colors.primary}
          maximumTrackTintColor={styles.inputBase.borderColor}
          thumbTintColor={theme.colors.primary}
        />
        <Text style={styles.label}>
          {selectedValue ? getLabel(available_options.find(opt => opt.name === selectedValue), 'label', language, schema.language) : ''}
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
        {
          label && (<View style={styles.labelContainer}>
            {(element.required) && <Text style={styles.required}>*</Text>}
            <Text style={styles.label}>{label}</Text>
          </View>)
        }
        {
          hint && (<Text style={styles.hint}>{hint}</Text>)
        }

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
            <Picker.Item
              label="Select an option..."
              value={null}
              style={{
                fontSize: 14,
                color: theme.colors.textSecondary, // Subtle color for placeholder
                paddingVertical: 0,
                margin: 0,
              }}
            />
            {available_options.map((option) => (
              <Picker.Item
                key={option.name}
                label={getLabel(option, 'label', language, schema.language)}
                value={option.name}

                style={{
                  fontSize: 14,
                  margin: 0,
                  color: theme.colors.textSecondary, // Subtle color for placeholder
                  paddingVertical: 0,
                }}
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

      <View style={styles.labelContainer}>
        {element.constraint && <Text style={styles.required}>*</Text>}
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.hint}>{hint}</Text>

      <View
        style={[
          styles.inputBase,
          styles.selectOne,
          errors[element.name] ? styles.inputError : null,
        ]}
      >
        {available_options.map((option) => (
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
                  ? theme.colors.primary
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