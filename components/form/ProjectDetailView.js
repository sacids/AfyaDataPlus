import { MaterialIcons, Octicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import api from '../../api/axiosInstance'
import { getStyles } from '../../constants/styles'
import { useTheme } from '../../context/ThemeContext'
import { useAuthStore } from '../../store/authStore'
import { useFilterStore } from '../../store/filterStore'
import useProjectStore from '../../store/projectStore'
import { select, update } from '../../utils/database'
import { getProjfectForms } from '../../utils/services'
import { AppHeader } from '../layout/AppHeader'
import { FormIcons } from '../layout/FormIcons'
const ProjectDetailView = ({ project }) => {

  const { currentProject, setCurrentProject, currentData, setCurrentData } = useProjectStore();

  const setTag = useFilterStore((state) => state.setFilter);
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const styles = getStyles(theme);

  const { user } = useAuthStore()


  const [dataSyncStatus, setDataSyncStatus] = useState('');
  const [formSyncStatus, setFormSyncStatus] = useState('');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formDefns, setFormDefns] = useState([]);
  const [curProjectStats, setCurrentProjetStats] = useState({});


  const goToSettings = useMemo(() => [
    {
      icon: 'settings',
      onPress: () => router.push('Project/Settings'),
    }
  ], []);

  const getProjectStats = async (project_uuid) => {

    try {
      const select_str = `
                      COUNT(*) as total,
                      SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
                      SUM(CASE WHEN status = 'finalized' THEN 1 ELSE 0 END) as finalized,
                      SUM(CASE WHEN status = 'submitted' OR status = 'sent' THEN 1 ELSE 0 END) as sent,
                      SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived`;

      const result = await select('form_data', 'project = ? and created_by = ?', [project_uuid, user.id], select_str)

      const stats = {
        total: result[0].total || 0,
        draft: result[0].draft || 0,
        finalized: result[0].finalized || 0,
        sent: result[0].sent || 0,
        archived: result[0].archived || 0
      };

      return stats
    } catch (error) {
      console.error('Error fetching project stats:', error);
      const stats = { total: 0, draft: 0, finalized: 0, sent: 0, archived: 0 };
      return stats
    }
  };

  const getProjectFormDefinitions = async (project_uuid) => {
    try {
      const result = await select('form_defn', 'project = ?', [project_uuid],
        'id, form_id, title, version, icon, is_root, short_title',
        " is_root DESC ");

      // If you need the full form definition, fetch it on-demand when user selects a form
      return result;
    } catch (error) {
      return []
    }
  };



  const handleUnsubscribe = async (project) => {
    console.log(project)
    const response = await api.post('/api/v1/project/unsubscribe', {
      "code": project.code
    });
    console.log(JSON.stringify(response.data, null, 2))
    const status = response.data;
    if (status.error) {
      // failed to unsubscribe
      update('projects', { active: 0 }, 'id = ?', [project.id])
      setCurrentData(null)
      setCurrentProject(null)
      //loadProjectsWithStats();

    } else {
      // unsubscribed succesfully
      update('projects', { active: 0 }, 'id = ?', [project.id])
      setCurrentData(null)
      setCurrentProject(null)
      //loadProjectsWithStats();
    }
    alert(status.message)
  };



  const handleSyncProjectForms = async () => {
    try {
      setLoading(true);
      // 1. Perform the sync (API -> SQLite)
      await getProjfectForms(currentProject.project, setFormSyncStatus)

      // 2. CRITICAL: Re-fetch from SQLite to update local state
      //getProjectFormDefinitions(currentProject.project);

      Alert.alert(t('alerts:success'), t('projects:syncComplete'));
    } catch (error) {
      Alert.alert(t('alerts:error'), t('projects:syncFailed'));
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    async function load() {

      try {
        // 1. Fetch the Schema for this specific form
        const pStats = await getProjectStats(project)
        setCurrentProjetStats(pStats)

        const fDefn = await getProjectFormDefinitions(project)
        setFormDefns(fDefn)

      } catch (error) {
        console.error("Error loading FormDataView:", error);
      } finally {
        // 3. CRITICAL: This was missing. Without this, 'ready' stays false.
        setReady(true);
      }
    }

    if (project) {
      load();
    }
  }, [project]); // Re-run if a different record is selected



  if (!ready) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <>
      <AppHeader
        title={t('projects:myProjects')}
        searchEnabled={false}
        rightActions={goToSettings}
      />


      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 1. PROJECT HEADER CARD */}
        <View style={[styles.card, { flexDirection: 'column', paddingVertical: 20 }]}>
          <Text style={styles.pageTitle}>{currentProject?.title}</Text>
          <Text style={[styles.hint, { color: theme.colors.primary, fontWeight: 'bold', marginTop: 4 }]}>
            {currentProject?.code}
          </Text>

          {currentProject?.description && (
            <Text style={[styles.bodyText, { marginTop: 12, opacity: 0.7 }]}>
              {currentProject?.description}
            </Text>
          )}

          {currentProject?.tags && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 15 }}>
              {currentProject?.tags.split(',').map((tag, i) => (
                <View key={i} style={{ backgroundColor: theme.colors.inputBorder, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                  <Text style={[styles.tiny, { fontSize: 10 }]}>{tag.trim().toUpperCase()}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 2. STATS GRID (EVENLY SPACED) */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[styles.sectionTitle, { fontSize: 13, marginBottom: 2, marginTop: 10, opacity: 0.6 }]}>
            {t('projects:projectData')}
          </Text>
          <TouchableOpacity
            onPress={() => handleSyncProjectForms()}>
            <MaterialIcons name="send" size={26} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.hint, { marginBottom: 10 }]}>
          {dataSyncStatus || t('sync:currentProjectStats')}
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {[
            {
              label: t('common:sent'),
              val: curProjectStats.sent || 0,
              color: '#2ecc71',
              icon: 'cloud-done',
              tag: 'Sent'
            },
            {
              label: t('common:final'),
              val: curProjectStats.finalized || 0,
              color: theme.colors.primary,
              icon: 'check-circle',
              tag: 'Finalized'
            },
            {
              label: t('common:draft'),
              val: curProjectStats.draft || 0,
              color: '#f1c40f',
              icon: 'edit',
              tag: 'Draft'
            },
            {
              label: t('common:archive'),
              val: curProjectStats.archived || 0,
              color: '#95a5a6',
              icon: 'archive',
              tag: 'Archived'
            }
          ].map((stat, idx) => (
            <TouchableOpacity
              onPress={() => {
                setTag(stat.tag);
                router.push('(app)/Main/FormDataList')
              }}
              key={idx}
              style={[styles.card, { width: '48%', flexDirection: 'column', alignItems: 'center', paddingVertical: 15 }]}
            >
              <MaterialIcons name={stat.icon} size={20} color={stat.color} />
              <Text style={[styles.pageTitle, { fontSize: 20, marginVertical: 4 }]}>{stat.val}</Text>
              <Text style={styles.tiny}>{stat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 3. AVAILABLE FORMS LIST */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[styles.sectionTitle, { fontSize: 13, marginBottom: 2, marginTop: 10, opacity: 0.6 }]}>
            {t('projects:projectForms')}
          </Text>
          <TouchableOpacity
            onPress={() => getProjfectForms(currentProject.project, setFormSyncStatus)}>
            <MaterialIcons name="refresh" size={30} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.hint, { marginBottom: 10 }]}>
          {formSyncStatus || t('sync:currentAvailableForms')}
        </Text>

        {/* SAFE MAPPING with Optional Chaining and Empty State Check */}
        {formDefns && formDefns.length > 0 ? (
          formDefns.map((form) => (
            <TouchableOpacity
              key={form.id}
              style={[styles.card, { paddingVertical: 15 }]}
              onPress={() => {
                if (form.is_root) {
                  router.push(`/Form/New?fdefn_id=${form.id}`)
                }
              }}
            >

              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <FormIcons
                  iconName={form.icon}
                  size={24}
                  color={theme.colors.primary}
                />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.bodyText}>{form.title}</Text>
                  <Text style={styles.tiny}>
                    {t('forms:version')}: {form.version}
                  </Text>
                </View>
                {form.is_root ? (
                  <MaterialIcons
                    name="add"
                    size={24}
                    color={theme.colors.hint}
                  />
                ) : null}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={[styles.card, { padding: 30, alignItems: 'center', borderStyle: 'dashed' }]}>
            <Text style={styles.hint}>{t('projects:noFormsAvailable')}</Text>
          </View>
        )}

        {/* 4. UNSUBSCRIBE ACTION */}
        <TouchableOpacity
          style={{
            marginTop: 20,
            marginBottom: 50,
            padding: 16,
            backgroundColor: theme.colors.error + '15',
            borderRadius: 12,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: theme.colors.error + '30'
          }}
          onPress={() => handleUnsubscribe(currentProject)}
        >
          <MaterialIcons name="notifications-off" size={20} color={theme.colors.error} />
          <Text style={[styles.label, { color: theme.colors.error, marginLeft: 8, marginBottom: 0 }]}>
            {t('projects:unsubscribe')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab]}
        onPress={() => {
          setCurrentData(null);
          setCurrentProject(null);
          setTag('all');
        }}
      >
        <Octicons name="arrow-switch" size={24} color="lightgray" />
      </TouchableOpacity>
    </>
  )
}


export default ProjectDetailView