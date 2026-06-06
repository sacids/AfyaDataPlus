import { MaterialCommunityIcons, Octicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import api, { refreshCredentials } from '../../api/axiosInstance'
import { getStyles } from '../../constants/styles'
import { useTheme } from '../../context/ThemeContext'
import { useAuthStore } from '../../store/authStore'
import { useFilterStore } from '../../store/filterStore'
import useProjectStore from '../../store/projectStore'
import { select, update } from '../../utils/database'
import { getProjectData, getProjectForms, submitProjectData, syncDiseaseKnowledge, syncProjectReactions, syncWorkflowData } from '../../utils/services'
import { AppHeader } from '../layout/AppHeader'

const ProjectDetailView = ({ project }) => {

  const { currentProject, setCurrentProject, setCurrentData, userData } = useProjectStore();
  const setFilter = useFilterStore((state) => state.setFilter);
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = getStyles(theme);
  const { user } = useAuthStore()

  //console.log('current project in detail view', JSON.stringify(currentProject,null,5))

  //console.log('userData', userData.groups)

  const [showFullDescription, setShowFullDescription] = useState(false);
  const description = currentProject?.description || "";

  const [ready, setReady] = useState(false);
  const [formDefns, setFormDefns] = useState([]);
  const [curProjectStats, setCurrentProjetStats] = useState({});
  const afyadatalogo = require('../../assets/images/AfyaDataLogo.png');

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
      const current_user = user?.globalUsername;

      if (!current_user) {
        return { total: 0, draft: 0, finalized: 0, sent: 0, archived: 0, unseen: 0 };
      }

      // Escape single quotes in username to prevent SQL injection vulnerabilities
      const sanitizedUser = current_user.replace(/'/g, "''");

      // Inject the string directly into INSTR to keep select parameters clean
      const select_str = `
                      COUNT(*) as total,
                      SUM(CASE WHEN status = 'finalized' THEN 1 ELSE 0 END) as finalized,
                      SUM(CASE 
                        WHEN seen_by IS NULL OR seen_by = '' THEN 1
                        WHEN INSTR(',' || seen_by || ',', ',${sanitizedUser},') = 0 THEN 1 
                        ELSE 0 
                      END) as unseen`;

      const result = await select(
        'form_data',
        'project = ? and parent_uuid is null',
        [project_uuid],
        select_str
      );

      //console.log("Project Stats Result:", result);

      return {
        total: result[0]?.total || 0,
        unseen: result[0]?.unseen || 0,
      };
    } catch (error) {
      console.error("Error fetching project stats:", error);
      return { total: 0, draft: 0, finalized: 0, sent: 0, archived: 0, unseen: 0 };
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
    setCurrentProject({});
    alert(response.data.message)
  };

  useEffect(() => {
    async function load() {
      try {
        const pStats = await getProjectStats(project)
        setCurrentProjetStats(pStats)
        const fDefn = await getProjectFormDefinitions(project)
        setFormDefns(fDefn)

        refreshCredentials();
        appendLog('Credentials refreshed.');
        getProjectForms(currentProject.project, appendLog);
        appendLog('Syncing reactions...');
        syncProjectReactions(currentProject.project, appendLog);
        appendLog('Syncing Project Data.');

        appendLog('Syncing Project Data.');
        getProjectData(currentProject.project, appendLog);
        appendLog('Syncing workflow data...');
        syncWorkflowData(currentProject?.project, appendLog);
        syncDiseaseKnowledge(currentProject.project, appendLog);
        appendLog('Disease knowledge synced.');
        refreshProjectData();
        appendLog('Project data refreshed.');

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
      {
        currentProject?.project_image_local ? (
          <Image
            source={{ uri: currentProject.project_image_local }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              width: '100%',
              height: '50%',
            }}
            resizeMode="contain"
          />
        ) : (
          <Image
            source={{ uri: afyadatalogo }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              width: '100%',
              height: '50%',
            }}
            resizeMode="contain"
          />
        )
      }
      <AppHeader title={currentProject ? currentProject.title : t('projects:myProjects')} searchEnabled={false} rightActions={goToSettings} />
      {/* <Text style={[styles.hint, { fontWeight: 'bold', paddingHorizontal: 12, paddingBottom: 8, marginTop: -8 }]}>
        {currentProject?.code} | {(userData?.groups || []).join(', ')}
      </Text> */}

      {/* Main Container - Fills remaining space */}
      <View style={{ flex: 1, paddingHorizontal: 16 }}>


        <View style={[{ flex: 2, }]}>
        </View>

        {/* Grid Section (flex: 4) */}
        <View style={{ flex: 4 }}>


          <View style={[localStyles.gridRow]}>

            <TouchableOpacity
              onPress={() => {
                setFilter({
                  key: 'status',
                  value: 'All',
                  label: 'All'
                });
                router.push('(app)/Main/FormDataList')
              }}
              style={[styles.card, localStyles.gridBox, { backgroundColor: `${theme.colors.inputBackground}D9` }]}
            >
              <View style={localStyles.iconBadgeRow}>
                <MaterialCommunityIcons name="file-eye-outline" size={64} color={theme.colors.primary} />``

                {/* Form Count Badge */}
                <View style={[localStyles.badge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={localStyles.badgeText}>
                    {curProjectStats.total || 0}
                  </Text>
                </View>
              </View>


              <Text style={styles.tiny}>{t('common:total')}</Text>
            </TouchableOpacity>


            <TouchableOpacity
              onPress={() => {
                setFilter({
                  key: 'has_seen',
                  value: 0,
                  label: 'New'
                });; router.push('(app)/Main/FormDataList')
              }}
              style={[styles.card, localStyles.gridBox, { backgroundColor: `${theme.colors.inputBackground}D9` }]}
            >

              <View style={localStyles.iconBadgeRow}>
                <MaterialCommunityIcons name="file-eye-outline" size={64} color={curProjectStats.unseen ? '#78A083' : theme.colors.primary} />

                {/* Form Count Badge */}
                {curProjectStats.unseen && (
                  <View style={[localStyles.badge, { backgroundColor: '#78A083' }]}>
                    <Text style={localStyles.badgeText}>
                      {curProjectStats.unseen || 0}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tiny, { color: curProjectStats.unseen ? '#78A083' : theme.colors.primary }]}>{t('common:new')}</Text>
            </TouchableOpacity>

          </View>
          <View style={[localStyles.gridRow]}>

            <TouchableOpacity
              onPress={async () => {
                setSyncLogs('Starting form sync...');
                setIsSyncing(true);
                try {
                  await getProjectForms(currentProject.project, appendLog);
                  appendLog('Syncing reactions...');
                  await syncProjectReactions(currentProject.project, appendLog);
                  appendLog('Syncing Project Data.');
                  await refreshCredentials();
                  appendLog('Credentials refreshed.');
                  await refreshProjectData();
                  appendLog('Project data refreshed.');
                } catch (e) { appendLog('Error: ' + e.message); } finally { setIsSyncing(false); }
              }}
              style={[styles.card, localStyles.gridBox]}
            >
              <MaterialCommunityIcons name="file-download-outline" size={64} color={theme.colors.primary} />

              <Text style={[styles.tiny, { textAlign: 'center' }]}>{t('projects:fetchForms')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/Form/ProjectForms')}
              style={[styles.card, localStyles.gridBox]}
            >
              {/* Row Container to align Icon and Badge at the baseline */}
              <View style={localStyles.iconBadgeRow}>
                <MaterialCommunityIcons name="file-document-plus-outline" size={64} color={theme.colors.primary} />

                {/* Form Count Badge */}
                <View style={[localStyles.badge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={localStyles.badgeText}>
                    {formDefns.length || 0}
                  </Text>
                </View>
              </View>

              <Text style={[styles.tiny, { textAlign: 'center' }]}>{t('common:forms')}</Text>
            </TouchableOpacity>
          </View>
          <View style={[localStyles.gridRow]}>

            <TouchableOpacity
              onPress={async () => {
                setSyncLogs('Starting form sync...');
                setIsSyncing(true);
                try {
                  appendLog('Syncing Project Data.');
                  await getProjectData(currentProject.project, appendLog);
                  appendLog('Syncing workflow data...');
                  await syncWorkflowData(currentProject?.project, appendLog);
                  appendLog('Project data fetched.');
                  await syncDiseaseKnowledge(currentProject.project, appendLog);
                  appendLog('Disease knowledge synced.');
                  await refreshProjectData();
                  appendLog('Project data refreshed.');
                } catch (e) { appendLog('Error: ' + e.message); } finally { setIsSyncing(false); }
              }}

              onLongPress={async () => {
                setSyncLogs('Starting full data sync...');
                setIsSyncing(true);
                try {
                  appendLog('Syncing Project Data.');
                  await getProjectData(currentProject.project, appendLog, { incrementalSync: false, forceFullSync: true });
                  appendLog('Project data fetched.');
                  await syncDiseaseKnowledge(currentProject.project, appendLog, true);
                  appendLog('Disease knowledge synced.')
                  await refreshProjectData();
                  appendLog('Project data refreshed.');
                } catch (e) { appendLog('Error: ' + e.message); } finally { setIsSyncing(false); }
              }}

              style={[styles.card, localStyles.gridBox]}
            >
              <MaterialCommunityIcons name="file-sync-outline" size={64} color={theme.colors.primary} />
              <Text style={[styles.tiny, { textAlign: 'center' }]}>{t('projects:fetchData')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={async () => {
                setSyncLogs('Preparing data for submission...');
                setIsSyncing(true);
                try {
                  await submitProjectData(currentProject?.project, appendLog);
                  appendLog('Submission finished.');
                  await syncWorkflowData(currentProject?.project, appendLog);
                  appendLog('Workflow data synced.');
                  await refreshProjectData();
                } catch (e) { appendLog('Submission failed.'); } finally { setIsSyncing(false); }
              }}
              style={[styles.card, localStyles.gridBox]}
            >
              <View style={localStyles.iconBadgeRow}>
                <MaterialCommunityIcons name="receipt-send-outline" size={64} color={theme.colors.primary} />

                {/* Form Count Badge */}
                <View style={[localStyles.badge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={localStyles.badgeText}>
                    {curProjectStats.finalized || 0}
                  </Text>
                </View>
              </View>
              <Text style={[styles.tiny, { textAlign: 'center' }]}>{t('data:bulkSubmit')}</Text>
            </TouchableOpacity>

          </View>

        </View>

      </View>

      {/* Unsubscribe Action - Fixed at bottom */}
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 10 }}>
        <TouchableOpacity
          style={[styles.inputBase, { flexDirection: 'row', flex: 1, borderColor: theme.colors.primary, borderWidth: 2, }]}
        // onPress={() => {

        //   Alert.alert(
        //     t('projects:unsubscribe'),
        //     t('projects:unsubscribeConfirmation'),
        //     [
        //       { text: t('common:no'), style: 'cancel' },
        //       { text: t('common:yes'), style: 'destructive', onPress: () => handleUnsubscribe(currentProject) }
        //     ]
        //   );
        // }}
        >
          <MaterialCommunityIcons name="account-group-outline" size={20} color={theme.colors.error} />
          <TouchableOpacity
            onLongPress={() => {
              const groupsList = (userData?.groups || []);
              if (groupsList.length > 0) {
                Alert.alert(
                  "User Groups",
                  groupsList.join('\n'),
                  [{ text: "OK" }]
                );
              }
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.label, { color: theme.colors.error, marginLeft: 8, marginBottom: 0 }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {(userData?.groups || []).join(', ')}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.inputBase, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
          onPress={() => {
            setCurrentData(null);
            setCurrentProject({});
            setFilter({
              key: 'status',
              value: 'All',
              label: 'All'
            });
          }}
        >
          <Octicons name="arrow-switch" size={24} color="white" />
        </TouchableOpacity>
      </View>


    </View >
  )
}

const localStyles = StyleSheet.create({



  gridBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  gridRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    flex: 1
  },

  iconBadgeRow: {
    flexDirection: 'row',
    alignItems: 'baseline', // Forces the bottom of the badge to line up with the bottom of the icon
  },
  badge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,          // Gives a little breathing room between the icon and the badge
  },
  badgeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});


export default ProjectDetailView

