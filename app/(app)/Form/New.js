import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FormPage from '../../../components/FormPage';
import NavigationButtons from '../../../components/NavigationButtons';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { evaluateODKExpression } from '../../../lib/form/odkEngine';
import { useAuthStore } from '../../../store/authStore';
import { useFormStore } from '../../../store/useFormStore';
import { insert, select } from '../../../utils/database';





export default function NewForm() {
  const { fdefn_id, fdata_id, parent_uuid } = useLocalSearchParams();

  const initForm = useFormStore(state => state.initForm);
  const currentPage = useFormStore(state => state.currentPage);
  const schema = useFormStore(state => state.schema);
  const language = useFormStore(state => state.language);
  const setLanguage = useFormStore(state => state.setLanguage);


  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();

  const saveAsDraft = async () => {


    const formData = useFormStore.getState().formData;
    const formUUID = useFormStore.getState().formUUID;
    const parentUUID = useFormStore.getState().parentUUID;

    const generatedTitle = evaluateODKExpression(schema.form_defn.meta.instance_name, formData);
    const title = generatedTitle || schema.form_defn.title;


    try {
      await insert("form_data", {
        form: fdefn_id,
        project: schema.project,
        uuid: formUUID,
        original_uuid: formUUID,
        parent_uuid: parentUUID,
        title: title,
        created_by: user.id,
        created_by_name: user.fullName ?? user.id,
        created_on: new Date().toISOString(),
        status: 'draft',
        status_date: new Date().toISOString(),
        deleted: 0,
        synced: 0,
        form_data: JSON.stringify(formData),
      });
      router.replace('/Main');
    } catch (e) {
      console.log(e);
      Alert.alert(
        t('errors:errorTitle'),
        t('errors:failedSave')
      );
    }
  };

  const handleOutsidePress = () => {
    if (menuVisible) {
      setMenuVisible(false);
    }
  };

  useEffect(() => {
    async function load() {
      try {
        // 1. Fetch Schema from DB
        const schemaData = await select('form_defn', 'id = ?', [fdefn_id]);
        if (!schemaData || schemaData.length === 0) throw new Error("Schema not found");

        const parsedSchema = {
          ...schemaData[0],
          form_defn: JSON.parse(schemaData[0].form_defn)
        };

        //console.log('schema', JSON.stringify(parsedSchema, null, 5))

        // 2. Fetch existing data if editing (fdata_id exists)
        let existingData = null;
        let existingUUID = null;

        if (fdata_id) {
          const dataRecord = await select('form_data', 'id = ?', [fdata_id]);
          if (dataRecord.length > 0) {
            existingData = JSON.parse(dataRecord[0].form_data);
            existingUUID = dataRecord[0].uuid;
          }
        }

        // 3. Initialize the global store
        initForm(parsedSchema, existingData, existingUUID, parent_uuid);

      } catch (error) {
        console.error("Initialization Error:", error);
      } finally {
        setLoading(false);
      }
    }

    load();

    return () => {
      // Optional cleanup when the screen loses focus
    };
  }, [fdefn_id, fdata_id, parent_uuid]);

  if (loading || !schema) {
    return (
      <View style={[styles.pageContainer, { marginBottom: insets.bottom }]}>
        <ActivityIndicator size="large" color={theme.colors.text} />
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
            <View style={[lstyles.menu, { backgroundColor: theme.colors.background }]}>
              <View
                style={{
                  ...StyleSheet.absoluteFillObject,
                  backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  borderRadius: 6,
                }}
              />
              <TouchableOpacity onPress={() => saveAsDraft()}>
                <Text style={[styles.label, { paddingVertical: 8, fontSize: 14 }]}>
                  {t('forms:saveAsDraft')}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.label, { paddingVertical: 8, fontSize: 14 }]}>
                {t('forms:changeLanguage')}
              </Text>
              {schema.form_defn.languages.map((lang, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    setLanguage('::' + lang);
                    setMenuVisible(false);
                  }}
                >
                  <Text style={[
                    styles.label,
                    { paddingVertical: 4, paddingLeft: 5, fontSize: 12 },
                    { color: language === '::' + lang ? theme.colors.primary : theme.colors.text }
                  ]}>
                    - {lang}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableWithoutFeedback>
      )}

      <FormPage pageIndex={currentPage} />
      <NavigationButtons />
    </View>
  );
}



const lstyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 100,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menu: {
    marginTop: 80,
    marginRight: 15,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    width: 190,
    elevation: 5,
    zIndex: 101,
  },
});