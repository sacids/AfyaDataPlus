import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import FormBuilder from '../../../components/form/FormBuilder';
import { parseSchema } from '../../../lib/form/schemaParser';
import { select } from '../../../utils/database';

import { useFormStore } from '../../../store/FormStore';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';



const New = () => {
  const { id } = useLocalSearchParams();
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const { language, setLanguage } = useFormStore();
  const insets = useSafeAreaInsets();


  const theme = useTheme();
  const styles = getStyles(theme);

  const saveAsDraft = () => {
    // Save the form as a draft
    console.log('Saving form as draft');
  };


  const handleOutsidePress = () => {
    if (menuVisible) {
      setMenuVisible(false);
    }
  };


  useEffect(() => {
    async function loadForm() {
      try {
        const FormDefn = await select('form_defn', 'id = ?', id);
        //console.log('META', JSON.stringify(FormDefn[0].meta, null, 2));
        const parsedSchema = parseSchema(FormDefn[0]);
        //console.log('parsedSchema', JSON.stringify(parsedSchema.meta.default_language, null, 2));
        setSchema(parsedSchema);
        if (parsedSchema.meta.default_language) {
          setLanguage('::' + parsedSchema.meta.default_language);
        } else {
          setLanguage('::Default');
        }

      } catch (error) {
        //console.error('Error loading form:', error);
        Alert.alert('Error', 'Failed to load form: ' + error.message);
      } finally {
        setLoading(false);
      }
    }

    loadForm();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.pageContainer, { marginBottom: insets.bottom, }]}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  if (!schema) {
    return (
      <View style={[styles.pageContainer, { paddingBottom: insets.bottom, }]}>
        <Text style={styles.errorText}>Error: Form schema not loaded</Text>
      </View>
    );
  }

  return (
    <View style={[styles.pageContainer, { paddingBottom: insets.bottom, paddingTop: insets.top }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 5 }}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialCommunityIcons name={'arrow-left'} size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>{schema.title}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={() => setMenuVisible(!menuVisible)}>
            <MaterialCommunityIcons name="dots-vertical" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {menuVisible && (
        <TouchableWithoutFeedback onPress={handleOutsidePress}>
          <View style={lstyles.overlay}>
            <View style={[lstyles.menu, { backgroundColor: theme.colors.background },]}>
              <View
                style={{
                  ...StyleSheet.absoluteFillObject,
                  backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  borderRadius: 6,
                }}
              />
              <TouchableOpacity onPress={() => saveAsDraft()}><Text style={[styles.label, { paddingVertical: 8, fontSize: 14 }]}>Save Draft</Text></TouchableOpacity>
              <Text style={[styles.label, { paddingVertical: 8, fontSize: 14 }]}>Change Language</Text>
              {schema.language.map((lang, idx) => (
                <TouchableOpacity key={idx} onPress={() => { setLanguage('::' + lang); setMenuVisible(false) }}>
                  <Text style={[styles.label, { paddingVertical: 4, paddingLeft: 5, fontSize: 12 }]}>- {lang}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableWithoutFeedback>
      )}

      <FormBuilder
        schema={schema}
        config={{ useSwipe: true, useButtons: true }}
      />
    </View>
  );
};

export default New;


const lstyles = StyleSheet.create({

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 100,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },

  menu: {
    marginTop: 80, // slightly more than header height
    marginRight: 15,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    width: 190,
    elevation: 5,
    zIndex: 101,
  },


});