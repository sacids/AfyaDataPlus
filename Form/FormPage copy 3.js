import { useEffect, memo, useMemo, useRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { getStyles } from '../../constants/styles';
import { useTheme } from '../../context/ThemeContext';
import { getLabel } from '../../lib/form/utils';
import { evaluateField } from '../../lib/form/validation';
import { useFormStore } from '../../store/FormStore';
import BarcodeField from './elements/BarcodeField';
import DatePickerField from './elements/DatePicker';
import DecimalInput from './elements/DecimalInput';
import GeoPoint from './elements/GeoPointField';
import imagePickerField from './elements/ImagePickerField';
import NoteField from './elements/NoteField';
import NumberInputField from './elements/NumberInput';
import SelectMultipleField from './elements/SelectMultiple';
import SelectMultipleFromFileField from './elements/SelectMultipleFromFile';
import SelectOneField from './elements/SelectOne';
import TextInputField from './elements/TextInput';
import SavePage from './SavePage';

const elementComponents = {
  text: TextInputField,
  decimal: DecimalInput,
  select_one: SelectOneField,
  select_multiple: SelectMultipleField,
  select_multiple_from_file: SelectMultipleFromFileField,
  number: NumberInputField,
  integer: NumberInputField,
  date: DatePickerField,
  note: NoteField,
  geopoint: GeoPoint,
  image: imagePickerField,
  barcode: BarcodeField,
};

const FormPage = ({ pageIndex }) => {
  const validateAndNavigate = useFormStore(state => state.validateAndNavigate);
  const formDirection = useFormStore(state => state.formDirection);
  const schema = useFormStore(state => state.schema);
  const formData = useFormStore(state => state.formData);
  const language = useFormStore(state => state.language);
  const schemaLanguage = useFormStore(state => state.schema?.language);

  const colors = useTheme();
  const styles = getStyles(colors);

  const page = schema?.pages?.[pageIndex];
  const isLastPage = schema ? pageIndex === schema.pages.length : false;

  // 1. EVALUATE VISIBILITY (Re-run only when formData or page changes)
  const visibleFields = useMemo(() => {
    if (!page) return [];
    
    const visible = [];
    page.fields.forEach((fieldGroup) => {
      Object.values(fieldGroup || {}).forEach((field) => {
        if (!field || field.type === 'calculate') return;
        
        try {
          const isRelevant = field.relevant 
            ? evaluateField('relevant', field, formData || {}) 
            : true;
          
          if (isRelevant) visible.push(field);
        } catch (e) {
          visible.push(field); // Default to visible on error
        }
      });
    });
    return visible;
  }, [page, formData]);

  const hasVisibleFields = visibleFields.length > 0;

  // 2. AUTO-SKIP EMPTY PAGES
  useEffect(() => {
    if (!isLastPage && page && !hasVisibleFields) {
      console.log(`⏭️ Page ${pageIndex} is empty, skipping...`);
      // Use a small delay to ensure the store is ready for a transition
      const timeout = setTimeout(() => {
        validateAndNavigate(formDirection || 'next');
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [hasVisibleFields, pageIndex, isLastPage]);

  // 3. RENDER CONTENT
  if (isLastPage) return <SavePage />;
  if (!page) return <View style={styles.pageContainer}><Text>Invalid Page</Text></View>;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled" // Important for inputs
      >
        {hasVisibleFields && (
          <View style={{ marginBottom: 20 }}>
            {getLabel(page, 'label', language, schemaLanguage) && (
              <Text style={styles.pageTitle}>{getLabel(page, 'label', language, schemaLanguage)}</Text>
            )}
            {getLabel(page, 'hint', language, schemaLanguage) && (
              <Text style={styles.hint}>{getLabel(page, 'hint', language, schemaLanguage)}</Text>
            )}
          </View>
        )}

        {visibleFields.map((field) => {
          const Component = elementComponents[field.type];
          if (!Component) return <Text key={field.name}>Unsupported: {field.type}</Text>;

          return (
            <Component
              key={field.name}
              element={field}
              // No 'value' prop here! The component gets it from store.
            />
          );
        })}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default memo(FormPage);