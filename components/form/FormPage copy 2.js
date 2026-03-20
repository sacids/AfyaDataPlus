import { useEffect, useMemo, useRef } from 'react';
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
  const {
    validateAndNavigate,
    formDirection,
  } = useFormStore();


  const schema = useFormStore(state => state.schema);
  const formData = useFormStore(state => state.formData);
  const language = useFormStore(state => state.language);
  const schemaLanguage = useFormStore(state => state.schema?.language);

  const page = schema?.pages?.[pageIndex];
  const isLastPage = schema ? pageIndex === schema.pages.length : false;

  const colors = useTheme();
  const styles = getStyles(colors);

  const label = getLabel(page, 'label', language, schemaLanguage)
  const hint = getLabel(page, 'hint', language, schemaLanguage)

  // Track render count for debugging
  const renderCount = useRef(0);
  const formDataRef = useRef(formData);

  // Log render count (remove in production)
  useEffect(() => {
    renderCount.current += 1;
    //console.log(`📊 FormPage ${pageIndex} render count:`, renderCount.current);

    // Reset if it gets too high (safety valve)
    if (renderCount.current > 50) {
      console.error('⚠️ Too many renders, forcing reset');
      renderCount.current = 0;
    }
  });

  // Step 2: Determine visible fields with memoization
  const hasVisibleFields = useMemo(() => {
    if (!page) return false;

    try {
      return page.fields.some((fieldGroup) =>
        Object.values(fieldGroup || {}).some((field) => {
          if (!field) return false;
          if (field.type === 'calculate') return false;
          try {
            return field.relevant ? evaluateField('relevant', field, formDataRef.current || {}) : true;
          } catch (e) {
            console.warn('Error evaluating relevance for', field.name, e);
            return true;
          }
        })
      );
    } catch (error) {
      console.error('Error determining visible fields:', error);
      return true;
    }
  }, [page]);


  // Step 3: Handle empty pages (with proper dependencies)
  useEffect(() => {
    if (!page || hasVisibleFields) return;

    console.log('🚀 No visible fields, navigating away from page:', pageIndex);

    const goToNextVisiblePage = () => {
      const step = formDirection === 'prev' ? -1 : 1;
      let nextPageIndex = pageIndex + step;

      while (
        nextPageIndex >= 0 &&
        nextPageIndex < (schema?.pages?.length || 0)
      ) {
        const nextPage = schema.pages[nextPageIndex];
        if (!nextPage) {
          nextPageIndex += step;
          continue;
        }

        try {
          const visible = nextPage.fields.some((fieldGroup) =>
            Object.values(fieldGroup || {}).some((field) => {
              if (!field) return false;
              if (field.type === 'calculate') return false;
              try {
                return field.relevant ? evaluateField('relevant', field, formDataRef.current || {}) : true;
              } catch (e) {
                return true;
              }
            })
          );

          if (visible) {
            validateAndNavigate(formDirection);
            break;
          }
        } catch (e) {
          console.warn('Error checking page visibility:', e);
        }

        nextPageIndex += step;
      }
    };

    // Use timeout to break potential loops
    const timeout = setTimeout(goToNextVisiblePage, 0);
    return () => clearTimeout(timeout);

  }, [hasVisibleFields, pageIndex]);


  if (isLastPage) {
    return (
      <View style={styles.pageContainer}>
        <SavePage />
      </View>
    );
  }

  if (!page) {
    return (
      <View style={styles.pageContainer}>
        <Text style={styles.errorText}>Invalid page</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 40}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent]}
        // Add this to prevent scroll events from causing re-renders
        scrollEventThrottle={16}
      >
        {hasVisibleFields && (
          <>
            {label && <Text style={styles.pageTitle}>{label}</Text>}
            {hint && <Text style={styles.hint}>{hint}</Text>}
          </>
        )}
        <View>
          {page.fields.flatMap((fieldGroup, groupIndex) =>
            Object.entries(fieldGroup || {}).map(([colName, field]) => {
              if (!field) return null;
              if (field.type === 'calculate') return null;


              const Component = elementComponents[field.type];
              if (!Component) {
                return (
                  <Text
                    key={`unsupported-${groupIndex}-${colName}`}
                    style={styles.errorText}
                  >
                    Unsupported element: {field.type}
                  </Text>
                );
              }

              try {
                const isRelevant = field.relevant
                  ? evaluateField('relevant', field, formData || {})
                  : true;

                if (!isRelevant) return null;

                return (
                  <Component
                    key={field.name || `field-${groupIndex}-${colName}`}
                    element={field}
                  />
                );
              } catch (error) {
                console.error('Error rendering field:', field.name, error);
                return (
                  <Text key={`error-${field.name}`} style={styles.errorText}>
                    Error loading {field.name}
                  </Text>
                );
              }
            })
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default FormPage;