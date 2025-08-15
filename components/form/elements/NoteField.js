import { Text, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getLabel } from '../../../lib/form/utils';
import {
  replaceVariables
} from '../../../lib/form/validation';
import { useFormStore } from '../../../store/FormStore';
const NoteField = ({ element, value }) => {
  const { language, formData, schema } = useFormStore();
  const theme = useTheme();
  const styles = getStyles(theme);

  const el_label = getLabel(element, 'label', language, schema.language)
  const el_hint = getLabel(element, 'hint', language, schema.language)

  //console.log("Note element", element.label, value);'

  let label = replaceVariables(el_label, formData);
  let hint = replaceVariables(el_hint, formData)

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
};

export default NoteField;