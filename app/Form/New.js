import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import FormBuilder from '../../components/form/FormBuilder';
import { parseSchema } from '../../lib/form/schemaParser';
import { select } from '../../utils/database';


import { getStyles } from '../../constants/styles';
import { useTheme } from '../../context/ThemeContext';



const New = () => {
  const { id } = useLocalSearchParams();
  console.log('id', id);
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);

  const theme = useTheme();
  const styles = getStyles(theme);



  useEffect(() => {
    async function loadForm() {
      try {
        const FormDefn = await select('form_defn', 'id = ?', id);
        console.log('FormDefn', JSON.stringify(FormDefn, null, 2));
        const parsedSchema = parseSchema(FormDefn[0]);
        //console.log('parsedSchema', JSON.stringify(parsedSchema, null, 2));
        setSchema(parsedSchema);
      } catch (error) {
        console.error('Error loading form:', error);
        Alert.alert('Error', 'Failed to load form: ' + error.message);
      } finally {
        setLoading(false);
      }
    }

    loadForm();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.pageContainer}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  if (!schema) {
    return (
      <View style={styles.pageContainer}>
        <Text style={styles.errorText}>Error: Form schema not loaded</Text>
      </View>
    );
  }

  return (
    <View style={styles.pageContainer}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingTop: 40, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialCommunityIcons name={'arrow-left'} size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>{schema.title}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={() => alert('Filter not implemented')}>
            <MaterialCommunityIcons name="dots-vertical" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>
      <FormBuilder
        schema={schema}
        config={{ useSwipe: true, useButtons: true }}
      />
    </View>
  );
};

export default New;