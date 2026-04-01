// FormBuilder.js
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { getStyles } from '../../constants/styles';
import { useTheme } from '../../context/ThemeContext';
import { useFormStore } from '../../store/FormStore-xx';
import { Debug } from '../../utils/debug';
import FormPage from './FormPage-xx';
import NavigationButtons from './NavigationButtons';

const FormBuilder = ({ schema, formData, formUUID, parentUUID = null }) => {
  const setSchema = useFormStore(state => state.setSchema);
  const currentPage = useFormStore(state => state.currentPage);
  const currentSchema = useFormStore(state => state.schema); // Get current schema from store
  const colors = useTheme();
  const styles = getStyles(colors);
  const lastSchemaId = useRef(null);
  const isMounted = useRef(true);
  const hasSetSchema = useRef(false); // Track if we've already set schema

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    // CRITICAL: Only set schema if it hasn't been set yet OR if schema is different
    // and we're not currently in the middle of loading
    if (!schema) return;

    const storeSchemaId = currentSchema?.id;
    const newSchemaId = schema.id;

    // Don't set if already set in store and IDs match
    if (storeSchemaId === newSchemaId && hasSetSchema.current) {
      Debug.log('FormBuilder', 'Schema already set, skipping');
      return;
    }

    // Don't set if we're just recreating the same schema
    if (lastSchemaId.current === newSchemaId && hasSetSchema.current) {
      Debug.log('FormBuilder', 'Same schema, skipping');
      return;
    }

    Debug.log('FormBuilder', 'Setting schema', {
      oldId: lastSchemaId.current,
      newId: newSchemaId,
      hasFormData: !!formData
    });

    // Only set schema if we have formData OR it's a new form without data
    if (formData || !formUUID) {
      setSchema(schema, formData, formUUID, parentUUID);
      lastSchemaId.current = newSchemaId;
      hasSetSchema.current = true;
    }
  }, [schema, formData, formUUID, parentUUID, setSchema, currentSchema]);

  return (
    <View style={styles.pageContainer}>
      <FormPage pageIndex={currentPage} />
      <NavigationButtons />
    </View>
  );
};

export default FormBuilder;