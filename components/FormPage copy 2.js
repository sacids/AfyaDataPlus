import React, { useEffect, useMemo, useRef, useCallback } from 'react';
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

// ✅ Add display name to memoized component wrapper
const MemoizedComponent = React.memo(({ Component, field }) => (
  <Component key={field.name} element={field} />
));

MemoizedComponent.displayName = 'MemoizedComponent';

// ✅ Main component with display name
const FormPage = React.memo(({ pageIndex }) => {
  // ✅ Select only what you need, not the entire formData
  const language = useFormStore(state => state.language);
  const schema = useFormStore(state => state.schema);
  const isRelevant = useFormStore(state => state.isRelevant);
  const schemaLanguage = useFormStore(state => state.schema?.form_defn?.languages);
  const batchUpdateFields = useFormStore(state => state.batchUpdateFields);
  
  // ✅ Get currentPage from store but use pageIndex prop to determine if this page is active
  const currentPage = useFormStore(state => state.currentPage);
  
  // ✅ Only get formData when we actually need it for calculations
  const formDataRef = useRef(useFormStore.getState().formData);
  
  // Subscribe to formData changes for calculations only
  useEffect(() => {
    const unsubscribe = useFormStore.subscribe(
      (state) => state.formData,
      (formData) => {
        formDataRef.current = formData;
      }
    );
    return unsubscribe;
  }, []);

  const colors = useTheme();
  const styles = getStyles(colors);

  // ✅ Check if this page is currently active
  const isActivePage = currentPage === pageIndex;
  const isLastPage = schema ? pageIndex === schema.form_defn.pages.length : false;

  // ✅ Only get page data if this is the active page
  const page = useMemo(() => {
    if (!isActivePage || !schema?.form_defn?.pages) return null;
    return schema.form_defn.pages[pageIndex];
  }, [isActivePage, schema, pageIndex]);

  const label = useMemo(() => {
    if (!page) return null;
    return getLabel(page, 'label', language, schemaLanguage);
  }, [page, language, schemaLanguage]);

  const hint = useMemo(() => {
    if (!page) return null;
    return getLabel(page, 'hint', language, schemaLanguage);
  }, [page, language, schemaLanguage]);

  // ✅ Track calculation dependencies - only on active page
  const calculateFields = useMemo(() => {
    if (!page?.fields || !isActivePage) return [];
    
    const fields = [];
    page.fields.forEach((fieldGroup) => {
      Object.values(fieldGroup).forEach((field) => {
        if (field.type === 'calculate' && field.calculation) {
          fields.push(field);
        }
      });
    });
    return fields;
  }, [page, isActivePage]);

  // ✅ Extract dependencies from calculation expressions
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

  // ✅ Track last calculated values and dependencies
  const lastCalculatedValues = useRef({});
  const lastDependenciesState = useRef(new Map());
  const calculationTimeout = useRef(null);

  // ✅ Check if dependencies have changed
  const checkDependenciesChanged = useCallback(() => {
    const currentFormData = formDataRef.current;
    let hasChanges = false;
    
    for (const [fieldName, dependencies] of getDependencies) {
      const lastState = lastDependenciesState.current.get(fieldName);
      const currentState = dependencies.map(dep => currentFormData[dep]);
      
      if (!lastState || lastState.some((val, idx) => val !== currentState[idx])) {
        hasChanges = true;
        lastDependenciesState.current.set(fieldName, currentState);
      }
    }
    
    return hasChanges;
  }, [getDependencies]);

  // ✅ Optimized calculation effect - only runs when active and dependencies change
  useEffect(() => {
    if (!isActivePage || calculateFields.length === 0) return;
    
    // Clear any pending calculation
    if (calculationTimeout.current) {
      clearTimeout(calculationTimeout.current);
    }
    
    // Check if dependencies have changed
    const dependenciesChanged = checkDependenciesChanged();
    if (!dependenciesChanged) return;
    
    // Debounce calculations to prevent rapid successive updates
    calculationTimeout.current = setTimeout(() => {
      try {
        const updates = {};
        let hasUpdates = false;
        const currentFormData = formDataRef.current;
        
        calculateFields.forEach(field => {
          try {
            // Skip if dependencies haven't changed for this specific field
            const dependencies = getDependencies.get(field.name) || [];
            const lastValues = lastCalculatedValues.current[field.name];
            const currentValues = dependencies.map(dep => currentFormData[dep]);
            
            // Check if this specific field's dependencies changed
            if (lastValues && lastValues.every((val, idx) => val === currentValues[idx])) {
              return;
            }
            
            const calculatedValue = evaluateODKExpression(field.calculation, currentFormData);
            const currentValue = currentFormData[field.name];
            
            if (calculatedValue !== currentValue) {
              updates[field.name] = calculatedValue;
              hasUpdates = true;
              // Store last calculated values for this field
              lastCalculatedValues.current[field.name] = currentValues;
            }
          } catch (error) {
            console.error(`Error calculating ${field.name}:`, error);
          }
        });
        
        // Batch update all calculated fields at once
        if (hasUpdates) {
          batchUpdateFields(updates);
        }
      } catch (error) {
        console.error('Calculation batch error:', error);
      }
    }, 100); // 100ms debounce
  }, [isActivePage, calculateFields, getDependencies, checkDependenciesChanged, batchUpdateFields]);

  // ✅ Memoized visible fields - only recalculates when relevant dependencies change
  const visibleFields = useMemo(() => {
    if (!isActivePage || !page?.fields) return [];
    
    try {
      const fields = [];
      const currentFormData = formDataRef.current;
      
      page.fields.forEach((fieldGroup) => {
        Object.entries(fieldGroup).forEach(([_, field]) => {
          if (field.type === 'calculate') return;
          
          try {
            // Create a mini store accessor for relevance check
            const isFieldRelevant = (() => {
              if (!field.relevant) return true;
              return evaluateODKExpression(field.relevant, currentFormData);
            })();
            
            if (isFieldRelevant) {
              fields.push(field);
            }
          } catch (error) {
            console.error(`Relevance error for ${field.name}:`, error);
          }
        });
      });
      
      return fields;
    } catch (error) {
      console.error('Error computing visible fields:', error);
      return [];
    }
  }, [isActivePage, page]);

  // ✅ Early return for inactive page
  if (!isActivePage) {
    return null;
  }

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

  // ✅ Optimized render with proper keys
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 60}
      key={`page-${pageIndex}`}
    >
      <ScrollView 
        contentContainerStyle={[styles.scrollContent]}
        removeClippedSubviews={true}
        showsVerticalScrollIndicator={false}
      >
        {label && (
          <Text style={styles.pageTitle} numberOfLines={2}>
            {label}
          </Text>
        )}
        {hint && (
          <Text style={styles.hint} numberOfLines={3}>
            {hint}
          </Text>
        )}

        <View style={styles.fieldsContainer}>
          {visibleFields.map((field) => {
            const Component = elementComponents[field.type];
            if (!Component) {
              console.warn(`Unsupported element type: ${field.type} for field ${field.name}`);
              return null;
            }
            
            // Use memoized component wrapper
            return (
              <MemoizedComponent 
                key={field.name} 
                Component={Component} 
                field={field} 
              />
            );
          })}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
});

// ✅ Add display name to the memoized component
FormPage.displayName = 'FormPage';

// ✅ Custom comparison function
const compareProps = (prevProps, nextProps) => {
  return prevProps.pageIndex === nextProps.pageIndex;
};

// ✅ Apply memo with display name
export default React.memo(FormPage, compareProps);