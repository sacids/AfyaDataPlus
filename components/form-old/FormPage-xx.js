// FormPage.js - Optimized version
import { memo, useEffect, useMemo, useRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { getStyles } from '../../constants/styles';
import { useTheme } from '../../context/ThemeContext';
import { getLabel } from '../../lib/form/utils';
import { evaluateField } from '../../lib/form/validation';
import { useFormStore } from '../../store/FormStore-xx';
import { Debug } from '../../utils/debug';
import BarcodeField from './elements/BarcodeField';
import DatePickerField from './elements/DatePicker';
import DecimalInput from './elements/DecimalInput';
import GeoPoint from './elements/GeoPointField';
import imagePickerField from './elements/ImagePickerField';
import NoteField from './elements/NoteField';
import NumberInputField from './elements/NumberInput';
import SelectMultipleField from './elements/SelectMultiple-xx';
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

  // Track previous values to prevent unnecessary recalculations
  const prevFormDataRef = useRef({});
  const updateCountRef = useRef(0);

  // CRITICAL: Use a ref to store visible fields and only recalculate when relevant fields change
  const visibleFieldsCache = useRef(new Map());
  const lastRelevanceMap = useRef({});

  // Only recalculate visible fields when formData changes for fields that affect relevance
  const visibleFields = useMemo(() => {
    if (!page) return [];

    updateCountRef.current++;

    // Get current relevance map from store
    const relevanceMap = useFormStore.getState().relevanceMap;

    // If relevance map hasn't changed significantly, use cached result
    const relevanceChanged = Object.keys(relevanceMap).some(key =>
      lastRelevanceMap.current[key] !== relevanceMap[key]
    );

    if (!relevanceChanged && visibleFieldsCache.current.has(pageIndex)) {
      Debug.log('FormPage', `Using cached visible fields (update #${updateCountRef.current})`);
      return visibleFieldsCache.current.get(pageIndex);
    }

    Debug.log('FormPage', `Recalculating visible fields (update #${updateCountRef.current})`);

    const visible = [];
    page.fields.forEach((fieldGroup) => {
      Object.values(fieldGroup || {}).forEach((field) => {
        if (!field || field.type === 'calculate') return;

        try {
          // Use cached relevance if available
          const isRelevant = relevanceMap[field.name] !== undefined
            ? relevanceMap[field.name]
            : (field.relevant ? evaluateField('relevant', field, formData || {}) : true);

          if (isRelevant) visible.push(field);
        } catch (e) {
          Debug.error('FormPage', e, { field: field.name });
          visible.push(field);
        }
      });
    });

    // Cache the result
    visibleFieldsCache.current.set(pageIndex, visible);
    lastRelevanceMap.current = { ...relevanceMap };

    return visible;
  }, [page, formData, pageIndex]); // formData is still a dependency but we use cache

  // Limit cache size
  useEffect(() => {
    if (visibleFieldsCache.current.size > 5) {
      const firstKey = visibleFieldsCache.current.keys().next().value;
      visibleFieldsCache.current.delete(firstKey);
    }
  }, [visibleFields]);

  const hasVisibleFields = visibleFields.length > 0;

  // Auto-skip empty pages with debouncing
  const autoSkipTimeout = useRef(null);
  useEffect(() => {
    if (!isLastPage && page && !hasVisibleFields) {
      if (autoSkipTimeout.current) {
        clearTimeout(autoSkipTimeout.current);
      }
      autoSkipTimeout.current = setTimeout(() => {
        Debug.log('FormPage', `⏭️ Page ${pageIndex} is empty, skipping...`);
        validateAndNavigate(formDirection || 'next');
      }, 100);
      return () => {
        if (autoSkipTimeout.current) {
          clearTimeout(autoSkipTimeout.current);
        }
      };
    }
  }, [hasVisibleFields, pageIndex, isLastPage, page, formDirection, validateAndNavigate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSkipTimeout.current) {
        clearTimeout(autoSkipTimeout.current);
      }
      // Clear cache for this page
      visibleFieldsCache.current.delete(pageIndex);
    };
  }, [pageIndex]);

  // Render content
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
        keyboardShouldPersistTaps="handled"
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
            />
          );
        })}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default memo(FormPage);