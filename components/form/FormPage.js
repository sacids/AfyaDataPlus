import { useEffect, useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { getStyles } from '../../constants/styles';
import { useTheme } from '../../context/ThemeContext';
import { calculateField, evaluateRelevant } from '../../lib/form/validation';
import { useFormStore } from '../../store/FormStore';
import DatePickerField from './elements/DatePicker';
import DecimalInput from './elements/DecimalInput';
import GeoPoint from './elements/GeoPointField';
import imagePickerField from './elements/ImagePickerField';
import NoteField from './elements/NoteField';
import NumberInputField from './elements/NumberInput';
import SelectMultipleField from './elements/SelectMultiple';
import SelectOneField from './elements/SelectOne';
import TextInputField from './elements/TextInput';
import SavePage from './SavePage';


const elementComponents = {
  text: TextInputField,
  decimal: DecimalInput,
  select_one: SelectOneField,
  select_multiple: SelectMultipleField,
  number: NumberInputField,
  integer: NumberInputField,
  date: DatePickerField,
  note: NoteField,
  geopoint: GeoPoint,
  image: imagePickerField,
};

const FormPage = ({ pageIndex }) => {
  const {
    schema,
    formData,
    language,
    updateFormData,
    validateAndNavigate,
    formDirection,
  } = useFormStore();

  console.log('language formpage', language)

  const page = schema?.pages?.[pageIndex];
  const isLastPage = schema ? pageIndex === schema.pages.length : false;

  const colors = useTheme();
  const styles = getStyles(colors);

  // Step 1: Calculate fields
  useEffect(() => {
    if (!page) return;
    page.fields.forEach((fieldGroup) => {
      Object.values(fieldGroup).forEach((field) => {
        if (field.type === 'calculate' && field.calculate) {
          try {
            const calculatedValue = calculateField(field, formData);
            if (calculatedValue !== formData[field.name]) {
              updateFormData(field.name, calculatedValue);
            }
          } catch (error) {
            console.error(`Error calculating ${field.name}:`, error);
          }
        }
      });
    });
  }, [page, formData, updateFormData]);

  // Step 2: Determine visible fields (always call useMemo, never conditionally)
  const hasVisibleFields = useMemo(() => {
    if (!page) return false;

    return page.fields.some((fieldGroup) =>
      Object.values(fieldGroup).some((field) => {
        if (field.type === 'calculate') return false;
        return field.relevant ? evaluateRelevant(field, formData) : true;
      })
    );
  }, [page, formData]);

  // Step 3: If no visible fields, automatically skip forward/backward
  useEffect(() => {
    if (!page || hasVisibleFields) return;

    const goToNextVisiblePage = () => {
      const step = formDirection === 'prev' ? -1 : 1;
      let nextPageIndex = pageIndex + step;

      while (
        nextPageIndex >= 0 &&
        nextPageIndex < schema.pages.length
      ) {
        const nextPage = schema.pages[nextPageIndex];
        const visible = nextPage.fields.some((fieldGroup) =>
          Object.values(fieldGroup).some((field) => {
            if (field.type === 'calculate') return false;
            return field.relevant ? evaluateRelevant(field, formData) : true;
          })
        );
        if (visible) {
          validateAndNavigate(formDirection); // Triggers the store to change page
          break;
        }
        nextPageIndex += step;
      }
    };

    goToNextVisiblePage();
  }, [hasVisibleFields, page, schema, formDirection, pageIndex, formData, validateAndNavigate]);


  if (isLastPage) {
    return (
      <View style={styles.pageContainer}>
        <SavePage />
      </View>
    );
  }

  // If invalid schema or page
  if (!page) {
    return (
      <View style={styles.pageContainer}>
        <Text style={styles.errorText}>Invalid page</Text>
      </View>
    );
  }


  return (
    <ScrollView
      style={styles.pageContainer}
      contentContainerStyle={styles.scrollContent}
    >
      {hasVisibleFields && (
        <Text style={styles.pageTitle}>
          {page['label' + language] || 'No Title'}
        </Text>
      )}
      <View>
        {page.fields.flatMap((fieldGroup, groupIndex) =>
          Object.entries(fieldGroup).map(([colName, field]) => {
            if (field.type === 'calculate') return null;

            //console.log(JSON.stringify(field, null,3))

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

            const isRelevant = field.relevant
              ? evaluateRelevant(field, formData)
              : true;

            if (!isRelevant) return null;

            return (
              <Component
                key={field.name}
                element={field}
                value={formData[field.name] || null}
              />
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

export default FormPage;
