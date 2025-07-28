import React from 'react';
import { Text, View } from 'react-native';
import {
  replaceVariables
} from '../../../lib/form/validation';
import { useFormStore } from '../../../store/FormStore';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
const NoteField = ({ element, value }) => {
  const { language, formData } = useFormStore();
  const theme = useTheme();
  const styles = getStyles(theme);

  //console.log("Note element", element.label, value);
  let label = replaceVariables(element['label' + language], formData);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

export default NoteField;