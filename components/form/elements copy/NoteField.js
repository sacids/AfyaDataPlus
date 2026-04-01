import { memo, useMemo } from 'react';
import { Text, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getLabel } from '../../../lib/form/utils';
import { useFormStore } from '../../../store/useFormStore';

const NoteField = ({ element }) => {


  const formData = useFormStore(state => state.formData);
  const language = useFormStore(state => state.language);

  const theme = useTheme();
  const styles = getStyles(theme);

  const label = useMemo(() => {
    const rawLabel = getLabel(element, 'label', language);
    return interpolateText(rawLabel);
  }, [element, language, formData]);

  const hint = useMemo(() => {
    const rawHint = getLabel(element, 'hint', language);
    return interpolateText(rawHint);
  }, [element, language, formData]);

  // Helper to replace ${var} with values from the store
  const interpolateText = (text) => {
    if (!text) return null;
    return text.replace(/\${(\w+)}/g, (_, varName) => {
      return formData[varName] !== undefined ? formData[varName] : `[${varName}]`;
    });
  };

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
    </View>
  );
};

export default memo(NoteField);