import { Text, TextInput, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getLabel } from '../../../lib/form/utils';
import { useFormStore } from '../../../store/FormStore-xx';

import { memo, useEffect, useState } from 'react';


const DecimalInput = ({ element }) => {

  const updateFormData = useFormStore(state => state.updateFormData);
  const globalValue = useFormStore(state => state.formData[element.name]);
  const error = useFormStore(state => state.errors ? state.errors[element.name] : null);
  const language = useFormStore(state => state.language);
  const schemaLanguage = useFormStore(state => state.schema.language);


  const theme = useTheme();
  const styles = getStyles(theme);
  const label = getLabel(element, 'label', language, schemaLanguage)
  const hint = getLabel(element, 'hint', language, schemaLanguage)
  const [localValue, setLocalValue] = useState(globalValue || '');


  useEffect(() => {
    if (globalValue !== localValue) {
      setLocalValue(globalValue || '');
    }
  }, [globalValue]);

  const handleBlur = () => {
    if (localValue !== globalValue) {
      updateFormData(element.name, localValue);
    }
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
      <TextInput
        inputMode='decimal'
        style={[
          styles.inputBase,
          styles.textInput,
          error ? styles.inputError : null,
        ]}
        value={localValue}
        onChangeText={(text) => setLocalValue(text)}
        onBlur={handleBlur}
        placeholder={element['label' + language]}
        placeholderTextColor="#999"
      />
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

export default memo(DecimalInput);