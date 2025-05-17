import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { useFormStore } from '../../../store/FormStore';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
const TextInputField = ({ element, value }) => {
  const { updateFormData, errors, language } = useFormStore();
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{element['label' + language]}</Text>
      <TextInput
        style={[
          styles.inputBase,
          styles.textInput,
          errors[element.name] ? styles.inputError : null,
        ]}
        value={value}
        onChangeText={(text) => updateFormData(element.name, text)}
        placeholder={element['label' + language]}
        placeholderTextColor="#999"
      />
      {errors[element.name] && (
        <Text style={styles.errorText}>{errors[element.name]}</Text>
      )}
    </View>
  );
};

export default TextInputField;