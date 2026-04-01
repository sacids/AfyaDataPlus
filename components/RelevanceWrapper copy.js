
import { memo, useCallback, useMemo } from 'react';
import { useFormStore } from '../store/useFormStore';



// Elements
import { View } from 'react-native';
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
  const isRelevant = useFormStore(state => state.isRelevant);
  const formData = useFormStore(state => state.formData);

  // 1. Identify specific dependencies for this field's visibility
  const relDependencies = useMemo(() => {
    if (!field.relevant || field.relevant === 'null') return [];
    const matches = field.relevant.match(/\${(.*?)}/g) || [];
    return matches.map(m => m.replace(/[${}]/g, ''));
  }, [field.relevant]);

  // 2. Only subscribe to those specific values
  const dependencyValues = useFormStore(
    useCallback(
      (state) => relDependencies.map(dep => state.formData[dep] || '').join('|'),
      [relDependencies]
    )
  );

  // 3. Only run ODK evaluation if dependencies changed
  const shouldShow = useMemo(() => {
    if (!field.relevant || field.relevant === 'null') return true;
    return isRelevant(field);
  }, [field, dependencyValues, isRelevant]);

  if (!shouldShow || field.type === 'calculate') return null;

  const Component = elementComponents[field.type];
  if (!Component) return null;


  return (

    <View
      style={{
        display: shouldShow ? 'flex' : 'none',
        height: shouldShow ? 'auto' : 0,
        overflow: 'hidden'
      }}
      pointerEvents={shouldShow ? 'auto' : 'none'}
    >
      <Component element={field} globalValue={formData[field.name]} />
    </View>
  )

  //return <Component element={field} globalValue={formData[field.name]} />;
};

export default memo(RelevanceWrapper);