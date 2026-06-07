import { MaterialCommunityIcons, MaterialIcons, Octicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image} from 'react-native'
import api, { refreshCredentials } from '../../api/axiosInstance'
import { getStyles } from '../../constants/styles'
import { useTheme } from '../../context/ThemeContext'
import { useAuthStore } from '../../store/authStore'
import { useFilterStore } from '../../store/filterStore'
import useProjectStore from '../../store/projectStore'
import { select, update } from '../../utils/database'
import { getProjectData, getProjectForms, submitProjectData, syncProjectReactions, syncWorkflowData } from '../../utils/services'
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
        appendLog('Project data fetched.');;
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

      <AppHeader title={currentProject ? currentProject.title : t('projects:myProjects')} searchEnabled={false} rightActions={goToSettings} />

      {currentProject?.project_image_local && (
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
          resizeMode="cover"
        />
      )}
      {/* Main Container - Fills remaining space */}
      <View style={{ flex: 1, paddingHorizontal: 16 }}>

        {/* Top Section (flex: 3) */}
        {/* 
        <View 
          style={[styles.card, { flex: 2, marginHorizontal: 0, marginBottom: 10, paddingVertical: 15 }]}>
          <Text style={styles.pageTitle}>{currentProject?.title}</Text>
          <Text style={[styles.hint, { fontWeight: 'bold' }]}>
            {currentProject?.code} | {(userData?.groups || []).join(', ')}
          </Text>

          <ScrollView
            style={{ flex: 1, marginTop: 10 }}
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={true}>
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
        </View> */}

        <View
          style={[
            styles.card,
            {
              flex: 2,
              marginHorizontal: 0,
              marginBottom: 10,
              padding: 0,
              overflow: 'hidden', // important for background image clipping
              backgroundColor: 'transparent',
            },
          ]}
        >
          {/* Background Image */}
          {/* {currentProject?.project_image_local && (
            <Image
              source={{ uri: currentProject.project_image_local }}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                opacity: 0.8, // faint watermark effect
                resizeMode: 'cover',
              }}
            />
          )} */}

          {/* Optional dark/white overlay for better text readability */}
          <View
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              backgroundColor: theme.isDark
                ? 'rgba(0,0,0,0.4)'
                : 'rgba(255,255,255,0.4)',
            }}
          />

          {/* Foreground content */}
          {/* <Text style={styles.pageTitle}>
            {currentProject?.title}
          </Text> */}

          <Text style={[styles.hint, { fontWeight: 'bold' }]}>
            {currentProject?.code} | {(userData?.groups || []).join(', ')}
          </Text>

          {/* Scrollable area for Description / Logs */}
          <ScrollView
            style={{ flex: 1, marginTop: 10 }}
            contentContainerStyle={{ flexGrow: 1}}
            showsVerticalScrollIndicator={true}
          >
            {!syncLogs ? (
              <View>
                <Text
                  style={[styles.bodyText, { opacity: 0.85 }]}
                  numberOfLines={showFullDescription ? undefined : 5}
                  ellipsizeMode="tail"
                >
                  {description}
                </Text>

                {description.length > 200 && (
                  <TouchableOpacity
                    onPress={() =>
                      setShowFullDescription(!showFullDescription)
                    }
                  >
                    <Text
                      style={{
                        color: theme.colors.primary,
                        marginTop: 4,
                        fontWeight: 'bold',
                      }}
                    >
                      {showFullDescription
                        ? 'Show Less'
                        : 'Read More'}
                    </Text>
                  </TouchableOpacity>
                )}

                {Array.isArray(currentProject?.tags) && (
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: 6,
                      marginTop: 15,
                    }}
                  >
                    {currentProject?.tags.map((tag, i) => (
                      <View
                        key={i}
                        style={{
                          backgroundColor:
                            theme.colors.inputBorder,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={[styles.tiny, { fontSize: 10 }]}>
                          {tag.trim().toUpperCase()}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                <View
                  style={{
                  }}
                >
                  <Text
                    style={[
                      styles.hint,
                      {
                        fontFamily:
                          Platform.OS === 'ios'
                            ? 'Courier'
                            : 'monospace',
                      },
                    ]}
                  >
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
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                      OK
                    </Text>
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
              onPress={() => {
                setFilter({
                  key: 'status',
                  value: 'All',
                  label: 'All'
                });
                router.push('(app)/Main/FormDataList')
              }}
              style={[styles.card, localStyles.gridBox]}
            >
              <View style={localStyles.iconBadgeRow}>
                <MaterialCommunityIcons name="file-eye-outline" size={64} color={theme.colors.primary} />

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
              style={[styles.card, localStyles.gridBox]}
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

              <Text style={styles.tiny}>{t('projects:fetchForms')}</Text>
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

              <Text style={styles.tiny}>{t('common:forms')}</Text>
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
                  appendLog('Project data fetched.');;
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
                  appendLog('Project data fetched.');;
                  await refreshProjectData();
                  appendLog('Project data refreshed.');
                } catch (e) { appendLog('Error: ' + e.message); } finally { setIsSyncing(false); }
              }}

              style={[styles.card, localStyles.gridBox]}
            >
              <MaterialCommunityIcons name="file-sync-outline" size={64} color={theme.colors.primary} />
              <Text style={styles.tiny}>{t('projects:fetchData')}</Text>
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
              <Text style={styles.tiny}>{t('data:bulkSubmit')}</Text>
            </TouchableOpacity>

          </View>

        </View>

      </View>

      {/* Unsubscribe Action - Fixed at bottom */}
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 10 }}>
        <TouchableOpacity
          style={[styles.inputBase, { flexDirection: 'row', flex: 1, borderColor: theme.colors.primary, borderWidth: 2, }]}
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

        <TouchableOpacity
          style={[styles.inputBase, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
          onPress={() => {
            setCurrentData(null);
            setCurrentProject(null);
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
    justifyContent: 'center'
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

