import { MaterialIcons, Octicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
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
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = getStyles(theme);
  const { user } = useAuthStore()

  const [showFullDescription, setShowFullDescription] = useState(false);
  const description = currentProject?.description || "";

  const [ready, setReady] = useState(false);
  const [formDefns, setFormDefns] = useState([]);
  const [curProjectStats, setCurrentProjetStats] = useState({});

  const [syncLogs, setSyncLogs] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const appendLog = (message) => {
    if (!message) return;
    setSyncLogs((prev) => prev + (prev ? '\n' : '') + message);
  };

  const goToSettings = useMemo(() => [
    { icon: 'settings', onPress: () => router.push('Project/Settings') }
  ], []);

  const getProjectStats = async (project_uuid) => {
    try {
      const select_str = `
                      COUNT(*) as total,
                      SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
                      SUM(CASE WHEN status = 'finalized' THEN 1 ELSE 0 END) as finalized,
                      SUM(CASE WHEN status = 'submitted' OR status = 'sent' THEN 1 ELSE 0 END) as sent,
                      SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived`;
      const result = await select('form_data', 'project = ? and created_by = ?', [project_uuid, user?.globalUsername], select_str)
      return {
        total: result[0].total || 0,
        draft: result[0].draft || 0,
        finalized: result[0].finalized || 0,
        sent: result[0].sent || 0,
        archived: result[0].archived || 0
      };
    } catch (error) {
      return { total: 0, draft: 0, finalized: 0, sent: 0, archived: 0 };
    }
  };

  const getProjectFormDefinitions = async (project_uuid) => {
    try {
      return await select('form_defn', 'project = ?', [project_uuid], 'id, form_id, title, version, icon, is_root, short_title', " is_root DESC ");
    } catch (error) { return [] }
  };

  const refreshProjectData = async () => {
    const pStats = await getProjectStats(project);
    setCurrentProjetStats(pStats);
    const fDefn = await getProjectFormDefinitions(project);
    setFormDefns(fDefn);
  };

  const handleUnsubscribe = async (project) => {
    const response = await api.post('/api/v1/project/unsubscribe', { "code": project.code });
    update('projects', { active: 0 }, 'id = ?', [project.id])
    setCurrentData(null);
    setCurrentProject(null);
    alert(response.data.message)
  };

  useEffect(() => {
    async function load() {
      try {
        const pStats = await getProjectStats(project)
        setCurrentProjetStats(pStats)
        const fDefn = await getProjectFormDefinitions(project)
        setFormDefns(fDefn)
      } catch (error) {
        console.error("Error loading FormDataView:", error);
      } finally {
        setReady(true);
      }
    }
    if (project) load();
  }, [project]);

  if (!ready) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppHeader title={t('projects:myProjects')} searchEnabled={false} rightActions={goToSettings} />

      {/* Main Container - Fills remaining space */}
      <View style={{ flex: 1, paddingHorizontal: 16 }}>

        {/* Top Section (flex: 3) */}
        <View style={[styles.card, { flex: 3, marginHorizontal: 0, marginBottom: 10, paddingVertical: 15 }]}>
          <Text style={styles.pageTitle}>{currentProject?.title}</Text>
          <Text style={[styles.hint, { color: theme.colors.primary, fontWeight: 'bold' }]}>
            {currentProject?.code}
          </Text>

          {/* Scrollable area for Description / Logs */}
          <ScrollView
            style={{ flex: 1, marginTop: 10 }}
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={true}
          >
            {!syncLogs ? (
              <View>
                <Text
                  style={[styles.bodyText, { opacity: 0.7 }]}
                  numberOfLines={showFullDescription ? undefined : 5}
                  ellipsizeMode="tail"
                >
                  {description}
                </Text>
                {description.length > 200 && (
                  <TouchableOpacity onPress={() => setShowFullDescription(!showFullDescription)}>
                    <Text style={{ color: theme.colors.primary, marginTop: 4, fontWeight: 'bold' }}>
                      {showFullDescription ? "Show Less" : "Read More"}
                    </Text>
                  </TouchableOpacity>
                )}

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
            ) : (
              <View style={{ flex: 1 }}>
                <View style={{ backgroundColor: theme.colors.inputBackground, borderRadius: 8 }}>
                  <Text style={[styles.hint, { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>
                    {syncLogs}
                  </Text>
                </View>

                {!isSyncing && (
                  <TouchableOpacity
                    onPress={() => setSyncLogs('')}
                    style={{
                      marginTop: 10,
                      alignSelf: 'flex-end',
                      paddingHorizontal: 20,
                      paddingVertical: 8,
                      backgroundColor: theme.colors.primary,
                      borderRadius: 6
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>OK</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>
        </View>

        {/* Grid Section (flex: 4) */}
        <View style={{ flex: 4 }}>


          <View style={[localStyles.gridRow]}>

            <TouchableOpacity
              onPress={() => { setTag('Sent'); router.push('(app)/Main/FormDataList') }}
              style={[styles.card, localStyles.gridBox]}
            >
              <Text style={[styles.pageTitle, { fontSize: 18 }]}>{curProjectStats.sent || 0}</Text>
              <Text style={styles.tiny}>{t('common:sent')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setTag('Finalized'); router.push('(app)/Main/FormDataList') }}
              style={[styles.card, localStyles.gridBox]}
            >
              <Text style={[styles.pageTitle, { fontSize: 18 }]}>{curProjectStats.finalized || 0}</Text>
              <Text style={styles.tiny}>{t('common:final')}</Text>
            </TouchableOpacity>

          </View>
          <View style={[localStyles.gridRow]}>

            <TouchableOpacity
              onPress={() => { setTag('Draft'); router.push('(app)/Main/FormDataList') }}
              style={[styles.card, localStyles.gridBox]}
            >
              <Text style={[styles.pageTitle, { fontSize: 18 }]}>{curProjectStats.draft || 0}</Text>
              <Text style={styles.tiny}>{t('common:draft')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/Form/ProjectForms')}
              style={[styles.card, localStyles.gridBox]}
            >
              <Text style={[styles.pageTitle, { fontSize: 18 }]}>{formDefns.length || 0}</Text>
              <Text style={styles.tiny}>{t('common:forms')}</Text>
            </TouchableOpacity>

          </View>
          <View style={[localStyles.gridRow]}>

            <TouchableOpacity
              onPress={async () => {
                setSyncLogs('Starting form sync...');
                setIsSyncing(true);
                try {
                  await getProjfectForms(currentProject.project, appendLog);
                  appendLog('Syncing reactions...');
                  await syncProjectReactions(currentProject.project, appendLog);
                  appendLog('Refresh complete.');
                  await refreshProjectData();
                } catch (e) { appendLog('Error: ' + e.message); } finally { setIsSyncing(false); }
              }}
              style={[styles.card, localStyles.gridBox]}
            >
              <MaterialIcons name="refresh" size={28} color={theme.colors.pageTitle} />
              <Text style={styles.tiny}>{t('projects:syncForms')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={async () => {
                setSyncLogs('Preparing data for submission...');
                setIsSyncing(true);
                try {
                  await submitProjectData(currentProject?.project, appendLog);
                  appendLog('Submission finished.');
                  await refreshProjectData();
                } catch (e) { appendLog('Submission failed.'); } finally { setIsSyncing(false); }
              }}
              style={[styles.card, localStyles.gridBox]}
            >
              <MaterialIcons name="send" size={26} color={theme.colors.pageTitle} />
              <Text style={styles.tiny}>{t('data:bulkSubmit')}</Text>
            </TouchableOpacity>

          </View>

        </View>
      </View>

      {/* Unsubscribe Action - Fixed at bottom */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 20 }}>
        <TouchableOpacity
          style={{
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
              t('projects:unsubscribeConfirmation'),
              [
                { text: t('common:no'), style: 'cancel' },
                { text: t('common:yes'), style: 'destructive', onPress: () => handleUnsubscribe(currentProject) }
              ]
            );
          }}
        >
          <MaterialIcons name="notifications-off" size={20} color={theme.colors.error} />
          <Text style={[styles.label, { color: theme.colors.error, marginLeft: 8, marginBottom: 0 }]}>
            {t('projects:unsubscribe')}
          </Text>
        </TouchableOpacity>
      </View>

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
    </View>
  )
}

const localStyles = StyleSheet.create({

  gridBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },

  gridRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    flex: 1
  }

});

export default ProjectDetailView

