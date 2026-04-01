import { useEffect, useMemo, useRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { getStyles } from '../constants/styles';
import { useTheme } from '../context/ThemeContext';
import { evaluateODKExpression } from '../lib/form/odkEngine';
import { getLabel } from '../lib/form/utils';
import { useFormStore } from '../store/useFormStore';
import BarcodeField from './form/elements/BarcodeField';
import DatePickerField from './form/elements/DatePicker';
import DecimalInput from './form/elements/DecimalInput';
import GeoPoint from './form/elements/GeoPointField';
import imagePickerField from './form/elements/ImagePickerField';
import NoteField from './form/elements/NoteField';
import NumberInputField from './form/elements/NumberInput';
import SelectMultipleField from './form/elements/SelectMultiple';
import SelectMultipleFromFileField from './form/elements/SelectMultipleFromFile';
import SelectOneField from './form/elements/SelectOne';
import TextInputField from './form/elements/TextInput';
import SavePage from './form/SavePage';


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

  console.log('rerendering page')
  const currentPage = useFormStore(state => state.currentPage);
  const language = useFormStore(state => state.language);
  const schema = useFormStore(state => state.schema);
  const isRelevant = useFormStore(state => state.isRelevant);
  const schemaLanguage = useFormStore(state => state.schema?.form_defn?.languages);
  const batchUpdateFields = useFormStore(state => state.batchUpdateFields);

  const formData = useFormStore(state => state.formData);
  const setFormData = useFormStore(state => state.setFormData);

  const isLastPage = schema ? pageIndex === schema.form_defn.pages.length : false;

  //console.log('form page', JSON.stringify(schema, null, 3))
  const page = schema.form_defn?.pages[currentPage];

  const colors = useTheme();
  const styles = getStyles(colors);

  const label = getLabel(page, 'label', language, schemaLanguage)
  const hint = getLabel(page, 'hint', language, schemaLanguage)






  // Track calculation dependencies to avoid loops
  const lastCalculatedValues = useRef({});
  const isCalculating = useRef(false);

  // Identify calculate fields on current page only
  const calculateFields = useMemo(() => {
    if (!page?.fields) return [];

    const fields = [];
    page.fields.forEach((fieldGroup) => {
      Object.values(fieldGroup).forEach((field) => {
        if (field.type === 'calculate' && field.calculation) {
          fields.push(field);
        }
      });
    });
    return fields;
  }, [page]);

  // Extract dependencies from calculation expressions
  const getDependencies = useMemo(() => {
    const depsMap = new Map();

    calculateFields.forEach(field => {
      const dependencies = [];
      const varRegex = /\${(\w+)}/g;
      let match;
      while ((match = varRegex.exec(field.calculation)) !== null) {
        dependencies.push(match[1]);
      }
      depsMap.set(field.name, dependencies);
    });

    return depsMap;
  }, [calculateFields]);

  // Track which dependencies changed to trigger specific calculations
  const previousFormData = useRef(formData);

  // Check if any relevant dependencies changed
  const shouldRecalculate = useMemo(() => {
    if (!calculateFields.length) return false;

    // Check if any calculate field's dependencies changed
    for (const [fieldName, dependencies] of getDependencies) {
      for (const dep of dependencies) {
        if (previousFormData.current[dep] !== formData[dep]) {
          return true;
        }
      }
    }
    return false;
  }, [formData, calculateFields, getDependencies]);

  // Update previousFormData after calculations
  useEffect(() => {
    if (!shouldRecalculate) {
      previousFormData.current = formData;
    }
  }, [formData, shouldRecalculate]);

  // Calculate only when dependencies change
  useEffect(() => {
    if (!calculateFields.length || isCalculating.current || !shouldRecalculate) {
      return;
    }

    isCalculating.current = true;

    try {
      const updates = {};
      let hasUpdates = false;

      // Calculate each field on current page
      calculateFields.forEach(field => {
        try {
          const calculatedValue = evaluateODKExpression(field.calculation, formData);
          const currentValue = formData[field.name];

          // Only update if value changed
          if (calculatedValue !== currentValue) {
            updates[field.name] = calculatedValue;
            hasUpdates = true;
          }
        } catch (error) {
          console.error(`Error calculating ${field.name}:`, error);
        }
      });

      // Batch update all calculated fields at once
      if (hasUpdates) {
        batchUpdateFields(updates);
      }
    } finally {
      // Small delay to prevent rapid recalculations
      setTimeout(() => {
        isCalculating.current = false;
      }, 50);
    }
  }, [formData, calculateFields, getDependencies, shouldRecalculate, batchUpdateFields]);

  // Memoized visible fields
  const visibleFields = useMemo(() => {
    try {
      if (!page?.fields) return [];

      return page.fields.flatMap((fieldGroup) =>
        Object.entries(fieldGroup)
          .map(([_, field]) => field)
          .filter(field => {
            if (field.type === 'calculate') return false;
            try {
              return isRelevant(field);
            } catch (error) {
              console.error(`Relevance error for ${field.name}:`, error);
              return false;
            }
          })
      );
    } catch (error) {
      console.error('Error computing visible fields:', error);
      return [];
    }
  }, [page, formData]);




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

    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 60}
    >
      <ScrollView contentContainerStyle={[styles.scrollContent]}>


        {label && <Text style={styles.pageTitle}>{label}</Text>}
        {hint && <Text style={styles.hint}>{hint}</Text>}

        <View>

          {visibleFields.map((field) => {
            const Component = elementComponents[field.type];
            return Component ? <Component key={field.name} element={field} /> : null;
          })}
          {/* 
          {page.fields.flatMap((fieldGroup, groupIndex) =>
            Object.entries(fieldGroup).map(([colName, field]) => {

              if (field.type === 'calculate') {
                return null
              };

              if (!isRelevant(field)) return null;

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


              return <Component key={field.name} element={field} />;
            }))} */}
        </View>
      </ScrollView>
    </KeyboardAvoidingView >
  );
};

export default FormPage;
