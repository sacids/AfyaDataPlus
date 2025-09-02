import { Text, TextInput, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getLabel } from '../../../lib/form/utils';
import { useFormStore } from '../../../store/FormStore';

const TextInputField = ({ element, value }) => {
  const { updateFormData, errors, language, schema } = useFormStore();
  const theme = useTheme();
  const styles = getStyles(theme);


  const label = getLabel(element, 'label', language, schema.language)
  const hint = getLabel(element, 'hint', language, schema.language)

  //console.log("TExt input", element.required, element.name, value)
  return (
    <View style={styles.container}>

      <View style={styles.labelContainer}>
        {(element.required || element.constraint) && <Text style={styles.required}>*</Text>}
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.hint}>{hint}</Text>

      <TextInput
        style={[
          styles.inputBase,
          styles.textInput,
          errors[element.name] ? styles.inputError : null,
        ]}
        value={value}
        onChangeText={(text) => updateFormData(element.name, text)}
        placeholder=""
        placeholderTextColor="#999"
      />
      {errors[element.name] && (
        <Text style={styles.errorText}>{errors[element.name]}</Text>
      )}
    </View>
  );
};

export default TextInputField;