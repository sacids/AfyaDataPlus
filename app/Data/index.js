import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { select } from '../../utils/database';


export default function FormDataDetailScreen() {
  const { id } = useLocalSearchParams();
  const [formData, setFormData] = useState(null);
  console.log('id', id);

  useEffect(() => {
    const fetchData = async () => {
      const results = await select('form_data', 'id = ?', [id]);
      setFormData(results[0]);
    };
    fetchData();
  }, [id]);

  if (!formData) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const parsedFormData = JSON.parse(formData.form_data || '{}');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>{formData.title}</Text>
        <Text style={styles.label}>Created By: {formData.created_by_name}</Text>
        <Text style={styles.label}>
          Created On: {new Date(formData.created_on).toLocaleDateString()}
        </Text>
        <Text style={styles.label}>Status: {formData.status}</Text>
        <Text style={styles.label}>
          Last Modified: {new Date(formData.status_date).toLocaleDateString()}
        </Text>
        <Text style={styles.label}>Form: {formData.form}</Text>
        <Text style={styles.label}>Form Data:</Text>
        <Text style={styles.json}>
          {JSON.stringify(parsedFormData, null, 2)}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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