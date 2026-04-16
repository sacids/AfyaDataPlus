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
import { getProjfectForms, submitProjectData, syncProjectReactions } from '../../utils/services'
import { AppHeader } from '../layout/AppHeader'

const ProjectDetailView = ({ project }) => {

  const { currentProject, setCurrentProject, setCurrentData } = useProjectStore();

  const setTag = useFilterStore((state) => state.setFilter);
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const styles = getStyles(theme);

  const { user } = useAuthStore()

  //console.log('currentproject', JSON.stringify(currentProject, null, 8))

  const [showFullDescription, setShowFullDescription] = useState(false);
  const description = currentProject?.description || "";


  const [dataSyncStatus, setDataSyncStatus] = useState('');
  const [formSyncStatus, setFormSyncStatus] = useState('');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formDefns, setFormDefns] = useState([]);
  const [curProjectStats, setCurrentProjetStats] = useState({});

  //console.log('current project', JSON.stringify(currentProject, null, 4))
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

      const result = await select('form_data', 'project = ? and created_by = ?', [project_uuid, user?.id], select_str)

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
    //console.log(project)
    const response = await api.post('/api/v1/project/unsubscribe', {
      "code": project.code
    });
    //console.log(JSON.stringify(response.data, null, 2))
    const status = response.data;
    if (status.error) {
      // failed to unsubscribe
      update('projects', { active: 0 }, 'id = ?', [project.id])
      setCurrentData(null);
      setCurrentProject(null);
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

    return () => {
      // Optional cleanup when the screen loses focus
    };
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

          <View>
            <Text
              style={[styles.bodyText, { marginTop: 12, opacity: 0.7 }]}
              numberOfLines={showFullDescription ? undefined : 3}
              ellipsizeMode="tail"
            >
              {description}
            </Text>

            {description.length > 100 && ( // Simple check, or use onTextLayout for precision
              <TouchableOpacity onPress={() => setShowFullDescription(!showFullDescription)}>
                <Text style={{ color: theme.colors.primary, marginTop: 4, fontWeight: 'bold' }}>
                  {showFullDescription ? "Show Less" : "Read More"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {Array.isArray(currentProject?.tags) && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 15 }}>
              {currentProject?.tags.map((tag, i) => (
                <View key={i} style={{ backgroundColor: theme.colors.inputBorder, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                  <Text style={[styles.tiny, { fontSize: 10 }]}>{tag.trim().toUpperCase()}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 2. STATS GRID (EVENLY SPACED) */}
        <Text style={[styles.hint, { marginBottom: 10 }]}>
          {dataSyncStatus || formSyncStatus || t('sync:currentProjectStats')}
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>

          <TouchableOpacity
            onPress={() => {
              setTag('Sent');
              router.push('(app)/Main/FormDataList')
            }}
            style={[styles.card, { width: '48%', flexDirection: 'column', alignItems: 'center', paddingVertical: 10 }]}
          >
            <Text style={[styles.pageTitle, { fontSize: 18, marginVertical: 4 }]}>{curProjectStats.sent || 0}</Text>
            <Text style={styles.tiny}>{t('common:sent')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setTag('Finalized');
              router.push('(app)/Main/FormDataList')
            }}
            style={[styles.card, { width: '48%', flexDirection: 'column', alignItems: 'center', paddingVertical: 10 }]}
          >
            {/* <MaterialIcons name={stat.icon} size={20} color={stat.color} /> */}
            <Text style={[styles.pageTitle, { fontSize: 18, marginVertical: 4 }]}>{curProjectStats.finalized || 0}</Text>
            <Text style={styles.tiny}>{t('common:final')}</Text>
          </TouchableOpacity>


          <TouchableOpacity
            onPress={() => {
              setTag('Draft');
              router.push('(app)/Main/FormDataList')
            }}
            style={[styles.card, { width: '48%', flexDirection: 'column', alignItems: 'center', paddingVertical: 10 }]}
          >
            {/* <MaterialIcons name={stat.icon} size={20} color={stat.color} /> */}
            <Text style={[styles.pageTitle, { fontSize: 18, marginVertical: 4 }]}>{curProjectStats.draft || 0}</Text>
            <Text style={styles.tiny}>{t('common:draft')}</Text>
          </TouchableOpacity>


          <TouchableOpacity
            onPress={() => router.push('/Form/ProjectForms')}
            style={[styles.card, { width: '48%', flexDirection: 'column', alignItems: 'center', paddingVertical: 10 }]}
          >
            <Text style={[styles.pageTitle, { fontSize: 18, marginVertical: 4 }]}>{formDefns.length || 0}</Text>
            <Text style={styles.tiny}>{t('common:forms')}</Text>
          </TouchableOpacity>


          <TouchableOpacity
            onPress={() => submitProjectData(currentProject?.project)}
            style={[styles.card, { width: '48%', flexDirection: 'column', alignItems: 'center', paddingVertical: 10 }]}
          >
            <MaterialIcons name="send" size={26} color={theme.colors.pageTitle} />
            <Text style={styles.tiny}>{t('data:bulkSubmit')}</Text>
          </TouchableOpacity>


          <TouchableOpacity
            onPress={async () => {
              await getProjfectForms(currentProject.project, setFormSyncStatus);
              await syncProjectReactions(currentProject.project, setFormSyncStatus);
            }}
            style={[styles.card, { width: '48%', flexDirection: 'column', alignItems: 'center', paddingVertical: 10 }]}
          >
            <MaterialIcons name="refresh" size={30} color={theme.colors.pageTitle} />
            <Text style={styles.tiny}>{t('projects:syncForms')}</Text>
          </TouchableOpacity>

        </View>

        {/* 4. UNSUBSCRIBE ACTION */}
        <TouchableOpacity
          style={{
            marginTop: 10,
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
          onPress={() => {
            Alert.alert(
              t('projects:unsubscribe'),
              t('projects:unsubscribeConfirmation', 'Do you want to stop participaing in this project?'),
              [
                {
                  text: t('common:no', 'No'),
                  style: 'cancel'
                },
                {
                  text: t('common:yes', 'Yes'),
                  style: 'destructive',
                  onPress: () => handleUnsubscribe(currentProject)
                }
              ]
            );
          }}
        >
          <MaterialIcons name="notifications-off" size={20} color={theme.colors.error} />
          <Text style={[styles.label, { color: theme.colors.error, marginLeft: 8, marginBottom: 0 }]}>
            {t('projects:unsubscribe')}
          </Text>
        </TouchableOpacity>
      </ScrollView >

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