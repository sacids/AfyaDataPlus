import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import FormBuilder from '../../../components/form/FormBuilder';
import { parseSchema } from '../../../lib/form/schemaParser';
import { insert, select } from '../../../utils/database';

import { useFormStore } from '../../../store/FormStore-xx';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { evaluateCustomFunctions, replaceVariables } from '../../../lib/form/validation';
import { useAuthStore } from '../../../store/authStore';
import useProjectStore from '../../../store/projectStore';

const New = () => {
  const { fdefn_id, fdata_id, parent_uuid } = useLocalSearchParams();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const {
    language, setLanguage, schema, setSchema, reset,
    formData, setFormData, formUUID, setFormUUID,
    parentUUID, setParentUUID
  } = useFormStore();
  const { currentData } = useProjectStore();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const theme = useTheme();
  const styles = getStyles(theme);

  // Track if component is mounted
  const isMounted = useRef(true);
  // Track if we've already loaded
  const hasLoaded = useRef(false);

  const saveAsDraft = async () => {
    if (!schema) return;

    try {
      const instance_name = schema.meta.instance_name;
      const temp = replaceVariables(instance_name, formData);
      const title = evaluateCustomFunctions(temp, formData);

      await insert("form_data", {
        form: schema.form,
        project: schema.project,
        uuid: formUUID,
        original_uuid: formUUID,
        title: title,
        created_by: user.id,
        created_by_name: user.fullName ?? user.id,
        created_on: new Date().toISOString(),
        status: t('status:draft').toLowerCase(),
        status_date: new Date().toISOString(),
        deleted: 0,
        synced: 0,
        form_data: JSON.stringify(formData),
      });
      router.dismissTo('/Main');
    } catch (e) {
      console.log('Save draft error:', e);
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

  // SINGLE cleanup - only in New.js
  useEffect(() => {
    isMounted.current = true;

    return () => {
      console.log('🧹 New.js unmount - cleaning up');
      isMounted.current = false;
      // Only reset if we're actually unmounting
      if (isMounted.current === false) {
        reset();
      }
    };
  }, [reset]);

  useEffect(() => {
    async function loadForm() {
      // Prevent double loading
      if (hasLoaded.current) {
        console.log('Form already loaded, skipping');
        return;
      }

      try {
        console.log('📝 Loading form...');

        if (fdata_id) {
          const FormDataItem = await select('form_data', 'id = ?', fdata_id);
          if (!FormDataItem || FormDataItem.length === 0) {
            throw new Error('Form data not found');
          }

          const FormDefn = await select('form_defn', 'form_id = ?', FormDataItem[0].form);
          if (!FormDefn || FormDefn.length === 0) {
            throw new Error('Form definition not found');
          }

          const FD = JSON.parse(FormDataItem[0].form_data);
          const FUUID = FormDataItem[0].uuid;

          if (isMounted.current) {
            setFormUUID(FUUID);
            setFormData(FD);

            const parsedSchema = parseSchema(FormDefn[0]);
            setSchema(parsedSchema, FD, FUUID);

            if (parsedSchema.meta.default_language) {
              setLanguage('::' + parsedSchema.meta.default_language);
            } else {
              setLanguage('::' + t('forms:defaultLanguage'));
            }
          }
        }
        else if (fdefn_id) {
          const FormDefn = await select('form_defn', 'id = ?', fdefn_id);
          if (!FormDefn || FormDefn.length === 0) {
            throw new Error('Form definition not found');
          }

          const parsedSchema = parseSchema(FormDefn[0]);

          if (isMounted.current) {
            setSchema(parsedSchema);

            if (currentData) {
              setParentUUID(currentData.uuid);
            }

            if (parsedSchema.meta.default_language) {
              setLanguage('::' + parsedSchema.meta.default_language);
            } else {
              setLanguage('::' + t('forms:defaultLanguage'));
            }
          }
        }

        hasLoaded.current = true;

      } catch (error) {
        console.error('Error loading form:', error);
        if (isMounted.current) {
          Alert.alert(
            t('errors:errorTitle'),
            t('errors:failedLoad') + ': ' + error.message
          );
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    }

    loadForm();
  }, [fdata_id, fdefn_id, t]); // Remove setSchema, etc from dependencies to prevent loops

  if (loading) {
    return (
      <View style={[styles.pageContainer, { marginBottom: insets.bottom }]}>
        <ActivityIndicator size="large" color={theme.colors.text} />
      </View>
    );
  }

  if (!schema) {
    return (
      <View style={[styles.pageContainer, { paddingBottom: insets.bottom }]}>
        <Text style={styles.errorText}>
          {t('errors:errorTitle')}: {t('errors:schemaNotLoaded')}
        </Text>
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
              {schema.language.map((lang, idx) => (
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

      <FormBuilder
        schema={schema}
        formData={formData}
        formUUID={formUUID}
        parentUUID={parentUUID}
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