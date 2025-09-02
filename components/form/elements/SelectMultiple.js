import { MaterialIcons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getLabel } from '../../../lib/form/utils';
import { useFormStore } from '../../../store/FormStore';

const SelectMultiple = ({ element, value }) => {
  const { updateFormData, errors, language, schema } = useFormStore();
  const theme = useTheme();
  const styles = getStyles(theme);

  const label = getLabel(element, 'label', language, schema.language)
  const hint = getLabel(element, 'hint', language, schema.language)

  // Ensure value is an array; default to empty array if undefined
  const selectedValues = Array.isArray(value) ? value : [];

  const toggleOption = (optionValue) => {
    const newValues = selectedValues.includes(optionValue)
      ? selectedValues.filter((val) => val !== optionValue)
      : [...selectedValues, optionValue];
    updateFormData(element.name, newValues);
  };

  return (
    <View style={styles.container}>
      
      <View style={styles.labelContainer}>
        {(element.required || element.constraint) && <Text style={styles.required}>*</Text>}
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.hint}>{hint}</Text>

      <View
        style={[
          styles.inputBase,
          styles.selectMultiple,
          errors[element.name] ? styles.inputError : null,
        ]}
      >
        {element.options.map((option) => (
          <TouchableOpacity
            key={option.name}
            style={styles.checkboxContainer}
            onPress={() => toggleOption(option.name)}
          >
            <MaterialIcons
              name={
                selectedValues.includes(option.name)
                  ? 'check-box'
                  : 'check-box-outline-blank'
              }
              size={24}
              color={
                selectedValues.includes(option.name)
                  ? theme.colors.primary
                  : styles.inputBase.borderColor
              }
            />
            <Text style={styles.checkboxLabel}>{option['label' + language] || option['label::Default']}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors[element.name] && (
        <Text style={styles.errorText}>{errors[element.name]}</Text>
      )}
    </View>
  );
};

export default SelectMultiple;