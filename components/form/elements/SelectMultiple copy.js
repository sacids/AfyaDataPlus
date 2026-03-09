import { MaterialIcons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getLabel } from '../../../lib/form/utils';
import { buildConstraint, evaluateExpression } from '../../../lib/form/validation';
import { useFormStore } from '../../../store/FormStore';

const SelectMultiple = ({ element, value }) => {
  const { updateFormData, errors, language, schema, formData } = useFormStore();
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


  const available_options = element.options.filter((option) => {


    let passChoiceFilter = true
    let passConstraint = true
    let tmp_formData = {}


    //if (!element.constraint) return true

    if (element.choice_filter) {
      tmp_formData = { ...formData };
      tmp_formData[element.name] = option.name;
      const constraint = buildConstraint(option, element.choice_filter);

      //console.log('choice filter 2', option, constraint, passChoiceFilter)

      passChoiceFilter = evaluateExpression(constraint, tmp_formData, element.name) !== false;
      //console.log('choice filter 2', option.name, constraint, passChoiceFilter)
    }

    if (element.constraint) {
      tmp_formData = { ...formData };
      tmp_formData[element.name] = option.name;
      passConstraint = evaluateExpression(element.constraint, tmp_formData, element.name) !== false;
    }

    return passChoiceFilter && passConstraint
  });


  return (
    <View style={styles.container}>
      {
        label ? (<View style={styles.labelContainer}>
          {(element.required) && <Text style={styles.required}>*</Text>}
          <Text style={styles.label}>{label}</Text>
        </View>) : null
      }
      {
        hint && (<Text style={styles.hint}>{hint}</Text>)
      }

      <View
        style={[
          styles.inputBase,
          styles.selectMultiple,
          errors[element.name] ? styles.inputError : null,
        ]}
      >
        {available_options.map((option) => (
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

export default SelectMultiple;