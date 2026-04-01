import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import FormPage from '../../../components/FormPage';
import NavigationButtons from '../../../components/NavigationButtons';
import { useFormStore } from '../../../store/useFormStore';
import { select } from '../../../utils/database';

export default function NewForm() {
  const { fdefn_id, fdata_id, parent_uuid } = useLocalSearchParams();
  const initForm = useFormStore(state => state.initForm);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function load() {
      // Fetch Schema
      const schemaData = await select('form_defn', 'id = ?', [fdefn_id]);
      const schema = JSON.parse(schemaData[0].form_defn);

      // Fetch existing data if editing
      let existingData = null;
      let existingUUID = null;
      if (fdata_id) {
        const dataRecord = await select('form_data', 'id = ?', [fdata_id]);
        existingData = JSON.parse(dataRecord[0].form_data);
        existingUUID = dataRecord[0].uuid;
      }

      initForm(schema, existingData, existingUUID, parent_uuid);
      setReady(true);
    }
    load();
  }, [fdefn_id, fdata_id]);

  if (!ready) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={{ flex: 1 }}>
      <FormPage />
      <NavigationButtons />
    </View>
  );
}