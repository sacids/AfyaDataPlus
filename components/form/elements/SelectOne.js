import { MaterialIcons } from '@expo/vector-icons';
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

  //console.log('element ', language, JSON.stringify(element, null, 4))
  const label = getLabel(element, 'label', language, schema.language)
  const hint = getLabel(element, 'hint', language, schema.language)

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.hint}> {hint}</Text>
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
                  ? styles.button.backgroundColor // Match primaryColor
                  : styles.inputBase.borderColor
              }
            />
            <Text style={styles.checkboxLabel}>{getLabel(option, 'label', language, schema.language)}</Text>
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