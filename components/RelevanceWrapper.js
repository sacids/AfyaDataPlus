import { memo, useCallback, useMemo } from 'react';
import { useFormStore } from '../store/useFormStore';

// Elements
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

const RelevanceWrapper = ({ field }) => {


  // 1. EXTRACT DEPENDENCIES
  // Since the field definition never changes, this regex runs once.
  const relDependencies = useMemo(() => {
    const expression = field.relevant || field.relevance;
    if (!expression || expression === 'null') return [];
    const matches = expression.match(/\${(.*?)}/g) || [];
    return matches.map(m => m.replace(/[${}]/g, ''));
  }, [field.relevant, field.relevance]);

  // 2. SCOPED DATA SUBSCRIPTION
  const dependencyValues = useFormStore(
    useCallback((state) => relDependencies.map(dep => state.formData[dep] || '').join('|'), [relDependencies]),
    (old, next) => old === next // This stops the wrapper from pulsing on every click
  );

  // 3. INDIVIDUAL VALUE SUBSCRIPTION
  // Subscribe specifically to this field's value to pass to the Component
  const globalValue = useFormStore(state => {
    const value = state.formData[field.name];

    // ODK logic: if value is null, undefined, or an empty string, use default
    if (value === undefined || value === null || value === '') {
      return field.default !== undefined ? field.default : value;
    }
    return value;
  });

  const isRelevant = useFormStore(state => state.isRelevant);


  // 4. CALCULATE VISIBILITY
  const shouldShow = useMemo(() => {
    const expression = field.relevant || field.relevance;
    if (!expression || expression === 'null') return true;
    try {
      return isRelevant(field);
    } catch (e) {
      console.warn('Relevance eval failed', field.name, e);
      return false;
    }
  }, [field.name, dependencyValues]);

  if (field.type === 'calculate') return null;
  const Component = elementComponents[field.type];
  if (!Component) return null;

  if (!shouldShow) {
    return null;
  }

  return (
    <Component
      element={field}
      globalValue={globalValue}
    />
  );
};

// 5. THE MEMO GUARD
// Since the field definition never changes, we tell React to never 
// re-render this wrapper unless the 'field' object reference changes.
export default memo(RelevanceWrapper, (prev, next) => {
  return prev.field.name === next.field.name;
});