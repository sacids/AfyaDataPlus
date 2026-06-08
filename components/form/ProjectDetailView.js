import { Ionicons, MaterialCommunityIcons, Octicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
// Imported Clipboard directly from 'react-native' to avoid native module missing errors
import { ActivityIndicator, Alert, Clipboard, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { refreshCredentials } from '../../api/axiosInstance'
import { getStyles } from '../../constants/styles'
import { useTheme } from '../../context/ThemeContext'
import { useAuthStore } from '../../store/authStore'
import { useFilterStore } from '../../store/filterStore'
import useProjectStore from '../../store/projectStore'
import { select } from '../../utils/database'
import { getProjectData, getProjectForms, submitProjectData, syncDiseaseKnowledge, syncProjectReactions, syncWorkflowData } from '../../utils/services'
import { AppHeader } from '../layout/AppHeader'

const ProjectDetailView = ({ project }) => {

  const { currentProject, setCurrentProject, setCurrentData, userData } = useProjectStore();
  const setFilter = useFilterStore((state) => state.setFilter);
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = getStyles(theme);
  const { user } = useAuthStore()

  const [ready, setReady] = useState(false);
  const [formDefns, setFormDefns] = useState([]);
  const [curProjectStats, setCurrentProjetStats] = useState({});
  const [logsModalVisible, showLogsModal] = useState(false);
  const afyadatalogo = require('../../assets/images/AfyaDataLogo.png');

  const [syncLogs, setSyncLogs] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const [syncingStates, setSyncingStates] = useState({
    forms: false,
    submit: false,
    data: false,
  });

  const appendLog = (message) => {
    if (!message) return;
    setSyncLogs((prev) => prev + (prev ? '\n' : '') + message);
  };

  const goToSettings = useMemo(() => [
    { icon: 'settings', onPress: () => router.push('Project/Settings') }
  ], []);

  // Safe wrapper to close and reset logs
  const handleCloseModal = () => {
    setSyncLogs(null);
    showLogsModal(false);
  };

  // Uses React Native core Clipboard string setter
  const copyToClipboard = () => {
    if (syncLogs) {
      Clipboard.setString(syncLogs);
      Alert.alert(t('common:success') || "Copied", t('projects:copiedToClipboard') || "Logs copied to clipboard!");
    }
  };

  const getProjectStats = async (project_uuid) => {
    try {
      const current_user = user?.globalUsername;

      if (!current_user) {
        return { total: 0, draft: 0, finalized: 0, sent: 0, archived: 0, unseen: 0 };
      }

      const sanitizedUser = current_user.replace(/'/g, "''");

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

  useEffect(() => {
    async function load() {
      try {
        const pStats = await getProjectStats(project)
        setCurrentProjetStats(pStats)
        const fDefn = await getProjectFormDefinitions(project)
        setFormDefns(fDefn)

        refreshCredentials();
        appendLog('Credentials refreshed.');
        getProjectForms(currentProject?.project, appendLog);
        appendLog('Syncing reactions...');
        syncProjectReactions(currentProject?.project, appendLog);
        appendLog('Syncing Project Data.');

        appendLog('Syncing Project Data.');
        getProjectData(currentProject?.project, appendLog);
        appendLog('Syncing workflow data...');
        syncWorkflowData(currentProject?.project, appendLog);
        syncDiseaseKnowledge(currentProject?.project, appendLog);
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
            source={{ uri: currentProject?.project_image_local }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              width: '100%',
              height: '60%',
            }}
            resizeMode="contain"
          />
        ) : (
          <Image
            source={afyadatalogo}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              width: '100%',
              height: '60%',
            }}
            resizeMode="contain"
          />
        )
      }
      <AppHeader title={`${currentProject ? currentProject?.instance_url?.replace(/^https?:\/\//, '').replace(/\/$/, '') : ''}`} searchEnabled={false} rightActions={goToSettings} />

      {/* Main Container */}
      <View style={{ flex: 1, paddingHorizontal: 16 }}>

        <View style={{ flex: 4, justifyContent: 'center', alignItems: 'flex-start' }}>
          {/* The container below is now perfectly centered vertically, and pinned to the left */}
          <View
            style={[
              {
                padding: 16,
                width: '80%',
                gap: 10,
                borderTopLeftRadius: 26,
                borderBottomRightRadius: 26,
                backgroundColor: theme.colors.primary + 'E1',
                //borderColor: darken(0.1, theme.colors.primary),
                borderColor: theme.colors.primary,
                borderWidth: 1,
              },
            ]}
          >
            {/* Top Section: Main Project Detail Trigger Link */}
            <TouchableOpacity
              onPress={() => router.push('/(app)/Project/Detail')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                width: '100%',
              }}
            >
              <Image
                source={afyadatalogo}
                style={[localStyles.logoImage, { backgroundColor: theme.colors.background }]}
                resizeMode="contain"
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: 'white',
                    fontSize: 20,
                    fontWeight: '600',
                  }}
                >
                  {currentProject?.title || 'Project Details'}
                </Text>

                {currentProject?.instance_url && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MaterialCommunityIcons name="earth" size={14} color="white" />
                    <Text style={[styles.hint, { color: 'white' }]}>{currentProject.instance_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {/* Bottom Section: Show Logs aligned perfectly to the bottom-right */}
            {syncLogs && (
              <View style={{ width: '100%', alignItems: 'flex-end' }}>
                <TouchableOpacity
                  onPress={() => showLogsModal(true)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 2,
                    paddingHorizontal: 4,
                  }}
                >
                  <MaterialCommunityIcons
                    name="text-box-search-outline"
                    size={16}
                    color="white"
                  />
                  <Text
                    style={{
                      color: 'white',
                      fontSize: 13,
                      fontWeight: '600',
                    }}
                  >
                    {t('projects:showSyncLogs')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
        {/* Grid Section */}
        <View style={{ flex: 5, marginTop: 10 }}>

          <View style={[localStyles.gridRow]}>
            <TouchableOpacity
              onPress={() => {
                setFilter({ key: 'status', value: 'All', label: 'All' });
                router.push('(app)/Main/FormDataList')
              }}
              style={[styles.card, localStyles.gridBox, { backgroundColor: `${theme.colors.inputBackground}D9` }]}
            >
              <View style={localStyles.iconBadgeRow}>
                <MaterialCommunityIcons name="file-eye-outline" size={64} color={theme.colors.primary} />
                <View style={[localStyles.badge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={localStyles.badgeText}>{curProjectStats.total || 0}</Text>
                </View>
              </View>
              <Text style={styles.tiny}>{t('common:total')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setFilter({ key: 'has_seen', value: 0, label: 'New' });
                router.push('(app)/Main/FormDataList')
              }}
              style={[styles.card, localStyles.gridBox, { backgroundColor: `${theme.colors.inputBackground}D9` }]}
            >
              <View style={localStyles.iconBadgeRow}>
                <MaterialCommunityIcons name="file-eye-outline" size={64} color={curProjectStats.unseen ? '#78A083' : theme.colors.primary} />
                {curProjectStats.unseen && (
                  <View style={[localStyles.badge, { backgroundColor: '#78A083' }]}>
                    <Text style={localStyles.badgeText}>{curProjectStats.unseen || 0}</Text>
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
                setSyncingStates(prev => ({ ...prev, ['forms']: true }));
                setIsSyncing(true);
                try {
                  await getProjectForms(currentProject?.project, appendLog);
                  appendLog('Syncing reactions...');
                  await syncProjectReactions(currentProject?.project, appendLog);
                  appendLog('Syncing Project Data.');
                  await refreshCredentials();
                  appendLog('Credentials refreshed.');
                  await refreshProjectData();
                  appendLog('Project data refreshed.');
                } catch (e) {
                  appendLog('Error: ' + e.message);
                } finally {
                  setIsSyncing(false);
                  setSyncingStates(prev => ({ ...prev, ['forms']: false }));
                }
              }}
              disabled={syncingStates.forms}
              style={[styles.card, localStyles.gridBox]}
            >
              {syncingStates.forms ? (
                <View style={localStyles.loaderContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
              ) : (
                <>
                  <MaterialCommunityIcons name="file-download-outline" size={64} color={theme.colors.primary} />
                  <Text style={[styles.tiny, { textAlign: 'center' }]}>{t('projects:fetchForms')}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/Form/ProjectForms')}
              style={[styles.card, localStyles.gridBox]}
            >
              <View style={localStyles.iconBadgeRow}>
                <MaterialCommunityIcons name="file-document-plus-outline" size={64} color={theme.colors.primary} />
                <View style={[localStyles.badge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={localStyles.badgeText}>{formDefns.length || 0}</Text>
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
                setSyncingStates(prev => ({ ...prev, ['data']: true }));
                try {
                  appendLog('Syncing Project Data.');
                  await getProjectData(currentProject?.project, appendLog);
                  appendLog('Syncing workflow data...');
                  await syncWorkflowData(currentProject?.project, appendLog);
                  appendLog('Project data fetched.');
                  await syncDiseaseKnowledge(currentProject?.project, appendLog);
                  appendLog('Disease knowledge synced.');
                  await refreshProjectData();
                  appendLog('Project data refreshed.');
                } catch (e) {
                  appendLog('Error: ' + e.message);
                } finally {
                  setIsSyncing(false);
                  setSyncingStates(prev => ({ ...prev, ['data']: false }));
                }
              }}
              onLongPress={async () => {
                setSyncLogs('Starting full data sync...');
                setIsSyncing(true);
                setSyncingStates(prev => ({ ...prev, ['data']: true }));
                try {
                  appendLog('Syncing Project Data.');
                  await getProjectData(currentProject?.project, appendLog, { incrementalSync: false, forceFullSync: true });
                  appendLog('Project data fetched.');
                  await syncDiseaseKnowledge(currentProject?.project, appendLog, true);
                  appendLog('Disease knowledge synced.')
                  await refreshProjectData();
                  appendLog('Project data refreshed.');
                } catch (e) {
                  appendLog('Error: ' + e.message);
                } finally {
                  setIsSyncing(false);
                  setSyncingStates(prev => ({ ...prev, ['data']: false }));
                }
              }}
              disabled={syncingStates.data}
              style={[styles.card, localStyles.gridBox]}
            >
              {syncingStates.data ? (
                <View style={localStyles.loaderContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
              ) : (
                <>
                  <MaterialCommunityIcons name="file-sync-outline" size={64} color={theme.colors.primary} />
                  <Text style={[styles.tiny, { textAlign: 'center' }]}>{t('projects:fetchData')}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={async () => {
                setSyncLogs('Preparing data for submission...');
                setIsSyncing(true);
                setSyncingStates(prev => ({ ...prev, ['submit']: true }));
                try {
                  await submitProjectData(currentProject?.project, appendLog);
                  appendLog('Submission finished.');
                  await syncWorkflowData(currentProject?.project, appendLog);
                  appendLog('Workflow data synced.');
                  await refreshProjectData();
                } catch (e) {
                  appendLog('Submission failed.');
                } finally {
                  setIsSyncing(false);
                  setSyncingStates(prev => ({ ...prev, ['submit']: false }));
                }
              }}
              disabled={syncingStates.submit}
              style={[styles.card, localStyles.gridBox]}
            >
              {syncingStates.submit ? (
                <View style={localStyles.loaderContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
              ) : (
                <>
                  <View style={localStyles.iconBadgeRow}>
                    <MaterialCommunityIcons name="receipt-send-outline" size={64} color={theme.colors.primary} />
                    <View style={[localStyles.badge, { backgroundColor: theme.colors.primary }]}>
                      <Text style={localStyles.badgeText}>{curProjectStats.finalized || 0}</Text>
                    </View>
                  </View>
                  <Text style={[styles.tiny, { textAlign: 'center' }]}>{t('data:bulkSubmit')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

        </View>
      </View>

      {/* Bottom Actions Container */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 10, gap: 10 }}>

        {/* Sync logs pill button, centered, independent of width */}


        {/* Group list & Switch Project Row */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={[styles.inputBase, { flexDirection: 'row', flex: 1, borderColor: theme.colors.primary, borderWidth: 2 }]}>
            <MaterialCommunityIcons name="account-group-outline" size={20} color={theme.colors.error} />
            <TouchableOpacity
              onLongPress={() => {
                const groupsList = (userData?.groups || []);
                if (groupsList.length > 0) {
                  Alert.alert("User Groups", groupsList.join('\n'), [{ text: "OK" }]);
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
              setCurrentProject(null);
              setFilter({ key: 'status', value: 'All', label: 'All' });
            }}
          >
            <Octicons name="arrow-switch" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Logs Modal View */}
      <Modal
        visible={logsModalVisible}
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View style={{ flex: 1, padding: 20, backgroundColor: theme.colors.background }}>
          <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 15 }}>
            {t('projects:syncLogs')}
          </Text>

          <ScrollView style={{ flex: 1, backgroundColor: theme.colors.inputBackground, padding: 12, borderRadius: 8, marginBottom: 20 }}>
            <Text style={{ color: theme.colors.text, fontSize: 14 }}>
              {syncLogs}
            </Text>
          </ScrollView>

          {/* Modal Buttons */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={copyToClipboard}
              style={[styles.inputBase, { flex: 1, backgroundColor: theme.colors.primary, borderColor: theme.colors.primary, flexDirection: 'row', gap: 8, justifyContent: 'center' }]}
            >
              <MaterialCommunityIcons name="content-copy" size={20} color="white" />
              <Text style={{ color: 'white', fontWeight: 'bold' }}>{t('common:copy') || "Copy Logs"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCloseModal}
              style={[styles.inputBase, { flex: 1, backgroundColor: 'transparent', borderColor: theme.colors.text, flexDirection: 'row', gap: 8, borderWidth: 1, justifyContent: 'center' }]}
            >
              <Ionicons name="close-circle-outline" size={20} color={theme.colors.text} />
              <Text style={{ color: theme.colors.text, fontWeight: 'bold' }}>{t('common:close') || "Close"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
    flex: 1,
  },
  iconBadgeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  badge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  badgeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loaderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  logoImage: {
    width: '20',
    height: 20,
    resizeMode: 'cover',
    borderRadius: 10,
  },
});

export default ProjectDetailView;