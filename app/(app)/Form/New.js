import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import FormBuilder from '../../../components/form/FormBuilder';
import { parseSchema } from '../../../lib/form/schemaParser';
import { insert, select } from '../../../utils/database';

import { useFormStore } from '../../../store/FormStore';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { evaluateCustomFunctions, replaceVariables } from '../../../lib/form/validation';
import { useAuthStore } from '../../../store/authStore';



const New = () => {
  const { fdefn_id, fdata_id } = useLocalSearchParams();
  // const [schema, setSchema] = useState(null);
  // const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const { language, setLanguage, schema, setSchema, formData, setFormData, formUUID, setFormUUID } = useFormStore();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const theme = useTheme();
  const styles = getStyles(theme);

  const saveAsDraft = async () => {
    // Save the form as a draft

    const instance_name = schema.meta.instance_name
    const temp = replaceVariables(instance_name, formData)
    const title = evaluateCustomFunctions(temp, formData)

    try {

      //console.log("Saving form", formUUID);

      await insert("form_data", {
        form: schema.form,
        project: schema.project,
        uuid: formUUID,
        original_uuid: formUUID,
        title: title,
        created_by: user.id,
        created_by_name: user.fullName ?? user.id,
        created_on: new Date().toISOString(),
        status: 'draft',
        status_date: new Date().toISOString(),
        deleted: 0,
        synced: 0,
        form_data: JSON.stringify(formData),
      })
      router.dismissTo('/Tabs')
    } catch (e) {
      console.log(e)
    }
  };


  const handleOutsidePress = () => {
    if (menuVisible) {
      setMenuVisible(false);
    }
  };


  useEffect(() => {
    async function loadForm() {
      try {
        if (fdata_id) {
          const FormDataItem = await select('form_data', 'id = ?', fdata_id);
          const FormDefn = await select('form_defn', 'form_id = ?', FormDataItem[0].form);

          const FD = JSON.parse(FormDataItem[0].form_data);
          const FUUID = FormDataItem[0].uuid;
          //console.log('old uuid', FUUID)
          setFormUUID(FUUID);
          setFormData(FD);

          const parsedSchema = parseSchema(FormDefn[0]);
          setSchema(parsedSchema, FD, FUUID);

          if (parsedSchema.meta.default_language) {
            setLanguage('::' + parsedSchema.meta.default_language);
          } else {
            setLanguage('::Default');
          }
          return;
        }
        if (fdefn_id) {
          const FormDefn = await select('form_defn', 'id = ?', fdefn_id);
          const parsedSchema = parseSchema(FormDefn[0]);
          setSchema(parsedSchema);
          if (parsedSchema.meta.default_language) {
            setLanguage('::' + parsedSchema.meta.default_language);
          } else {
            setLanguage('::Default');
          }
          return;
        }

      } catch (error) {
        //console.error('Error loading form:', error);
        Alert.alert('Error', 'Failed to load form: ' + error.message);
      } finally {
        setLoading(false);
      }
    }

    loadForm();
  }, [fdata_id, fdefn_id]);

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
                  <Text style={[styles.label, { paddingVertical: 4, paddingLeft: 5, fontSize: 12  }, { color: language === '::' + lang ? theme.colors.primary : theme.colors.text }]}>- {lang}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableWithoutFeedback>
      )}

      <FormBuilder
        schema={schema}
        formData={formData}
        formUUID={formUUID}
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