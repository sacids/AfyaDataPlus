import { useEffect, useRef } from 'react';
import Animated from 'react-native-reanimated';
import { getStyles } from '../../constants/styles';
import { useTheme } from '../../context/ThemeContext';
import { useFormStore } from '../../store/FormStore';
import FormPage from './FormPage';
import NavigationButtons from './NavigationButtons';

const FormBuilder = ({ schema, formData, formUUID, parentUUID = null }) => {

  const setSchema = useFormStore(state => state.setSchema);
  const currentPage = useFormStore(state => state.currentPage);

  const colors = useTheme();
  const styles = getStyles(colors);
  const lastSchemaId = useRef(null);


  useEffect(() => {
    // Use a unique property (like an ID or Name) to check if we really need to reset
    if (schema && schema.id !== lastSchemaId.current) {
      setSchema(schema, formData, formUUID, parentUUID);
      lastSchemaId.current = schema.id;
    }
  }, [schema]); // This now only triggers if the reference changes


  return (
    <Animated.View style={styles.pageContainer}>
      <FormPage pageIndex={currentPage} />
      <NavigationButtons />
    </Animated.View>
  );
};


export default FormBuilder;