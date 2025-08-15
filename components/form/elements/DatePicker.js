import { Text, TextInput, View } from 'react-native';
import { useFormStore } from '../../../store/FormStore';

import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getLabel } from '../../../lib/form/utils';

const DatePickerField = ({ element, value }) => {
  const { updateFormData, errors, language, schema } = useFormStore();
  const theme = useTheme();
  const styles = getStyles(theme);
  const label = getLabel(element, 'label', language, schema.language)
  const hint = getLabel(element, 'hint', language, schema.language)

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.hint}> {hint}</Text>
      <TextInput
        style={[
          styles.inputBase,
          styles.textInput,
          errors[element.name] ? styles.inputError : null,
        ]}
        value={value}
        onChangeText={(text) => updateFormData(element.name, text)}
        placeholder={element.label}
        placeholderTextColor="#999"
      />
      {errors[element.name] && (
        <Text style={styles.errorText}>{errors[element.name]}</Text>
      )}
    </View>
  );
};

export default DatePickerField;