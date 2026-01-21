import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FormDataView from '../../../components/form/FormDataView';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { select } from '../../../utils/database';

export default function FormDataDetailScreen() {
  const { id } = useLocalSearchParams();
  const [formData, setFormData] = useState(null);
  const [formDefn, setFormDefn] = useState(null);


  const theme = useTheme();
  const styles = getStyles(theme);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fetchData = async () => {
      const results = await select('form_data', 'id = ?', [id]);
      const res2 = await select('form_defn', 'form_id = ?', [results[0].form]);
      setFormData(results[0]);
      setFormDefn(JSON.parse(res2[0].form_defn));
    };
    fetchData();
  }, [id]);

  if (!formData && !formDefn) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  //console.log(formDefn)

  return (
    <View style={[styles.pageContainer, { paddingBottom: insets.bottom }]}>
      <FormDataView schema={formDefn} formData={formData} />
    </View>
  );
}

const lstyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  json: {
    fontSize: 14,
    fontFamily: 'monospace',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 4,
  },
});