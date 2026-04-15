import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import { CameraView, useCameraPermissions } from 'expo-camera'; // Updated for latest expo-camera
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import api, { hubApi } from '../../api/axiosInstance';
import { config } from '../../constants/config';
import { getStyles } from '../../constants/styles';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import useProjectStore from '../../store/projectStore';
import { insert, select } from '../../utils/database';
import { getGlobalUsername } from '../../utils/deviceUtils';
import { AppHeader } from '../layout/AppHeader';

const ProjectListView = () => {
  const { setCurrentProject, setCurrentData } = useProjectStore()
  const { t } = useTranslation()
  const theme = useTheme()
  const styles = getStyles(theme)

  const [viewMode, setViewMode] = useState('local') // 'local' | 'search' | 'public'
  const [displayList, setDisplayList] = useState([])
  const [searchCode, setSearchCode] = useState('')
  const [loading, setLoading] = useState(false)
  const isNavigating = useRef(false)

  // Camera Permissions
  const [permission, requestPermission] = useCameraPermissions()

  // 1. Available Projects (SQLite)
  const loadLocalProjects = async () => {
    setLoading(true)
    setViewMode('local')
    try {
      const localData = await select('projects')
      setDisplayList(localData || [])
    } catch (error) {
      console.error("SQLite Error:", error)
      Alert.alert(t('errors:errorTitle'), t('errors:databaseError'))
    } finally {
      setLoading(false)
    }
  }

  // 2. Search Logic
  const handleSearchByCode = async (codeOverride = null) => {
    const code = (codeOverride || searchCode).trim()
    if (!code) {
      Alert.alert(t('common:attention'), t('projects:enterCode'))
      return
    }

    setLoading(true)
    try {
      const response = await api.get(`/api/v1/projects/${code}`)
      const results = Array.isArray(response.data) ? response.data : [response.data]

      // If result found, switch to public view to show the result card
      setDisplayList(results)
      setViewMode('public')
    } catch (error) {
      Alert.alert(t('projects:error'), t('projects:projectNotFound'))
    } finally {
      setLoading(false)
    }
  }

  // 3. Browse Public
  const loadPublicProjects = async () => {
    setLoading(true)
    setViewMode('public')
    try {
      const response = await hubApi.get(config.AFYADATA_HUB_URL + '/api/v1/projects/discover/')
      console.log(JSON.stringify(response.data, null, 4))
      setDisplayList(response.data || [])
    } catch (error) {
      console.error("API Error:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLocalProjects()
  }, [])

  // Handle switching to Search Mode
  const enableSearchMode = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission()
      if (!granted) {
        Alert.alert(t('common:attention'), t('errors:cameraPermissionDenied'))
        return
      }
    }
    setViewMode('search')
    setSearchCode('')
  }

  const handleBarCodeScanned = ({ data }) => {
    if (data && !loading) {
      setSearchCode(data)
      handleSearchByCode(data)
    }
  }


  const handleJoinProject = async (projectFromHub) => {
    const { instance_url, remote_project_id } = projectFromHub;
    const authStore = useAuthStore.getState();

    let session = authStore.instances[instance_url];

    if (!session) {
      const globalUsername = getGlobalUsername(authStore.user.fullName);

      // 1. API Request
      try {
        const regResponse = await axios.post(`${instance_url}/api/v1/register/`, {
          username: authStore.user.globalUsername,
          fullName: authStore.user.fullName,
          phoneNumber: authStore.user.phone,
          device_id: authStore.user.deviceId,
          password: authStore.user.password
        });

        // Save session for this instance
        authStore.setInstanceSession(instance_url, regResponse.data.access, globalUsername);
      } catch (err) {
        console.error("Failed to auto-register on new instance", err);
        return;
      }
    }

    // SUBSEQUENT JOIN: Just request access to the project
    await api.post(`/api/v1/projects/${remote_project_id}/join/`);
  };

  const handleProjectPress = async (project) => {
    if (isNavigating.current) return
    try {
      if (viewMode === 'local') {
        isNavigating.current = true
        setCurrentData(null)
        setCurrentProject(project)
        router.replace('/(app)/Main/')
      } else {
        setLoading(true)













        const { instance_url, remote_project_id } = project;
        const authStore = useAuthStore.getState();

        let session = authStore.instances[instance_url];

        if (!session) {

          // 1. API Request
          try {

            const payload = {
              username: authStore.user.globalUsername,
              fullName: authStore.user.fullName,
              phoneNumber: authStore.user.phoneNumber,
              device_id: authStore.user.deviceId,
              password: authStore.user.password,
              passwordConfirm: authStore.user.password
            }

            console.log('payload', JSON.stringify(authStore.user, null, 5))
            const regResponse = await axios.post(`${instance_url}/api/v1/register`, payload);

            // Save session for this instance
            authStore.setInstanceSession(instance_url, regResponse.data.access, authStore.user.globalUsername);
          } catch (err) {
            console.error("Failed to auto-register on new instance", err);
            return;
          }
        }

        // SUBSEQUENT JOIN: Just request access to the project
        const response = await api.post(`/api/v1/project/${remote_project_id}/join/`);







        const project_to_save = response.data.project

        console.log('project to save', JSON.stringify(response.data, null, 4))


        if (!response.data.error) {
          const projectToSave = {
            ...project_to_save,
            project: project_to_save.id,
            instance_url: instance_url,
            tags: typeof project.tags === 'string' ? project.tags : JSON.stringify(project.tags || [])
          }
          await insert('projects', projectToSave)
          const localProjects = await select('projects', 'project = ?', [project.id])
          setCurrentData(null)
          setCurrentProject(localProjects[0] || projectToSave)
          isNavigating.current = true
          router.replace('/(app)/Main/')
        } else {
          Alert.alert(t('projects:joinFailed'), response.data.message)
        }
      }
    } catch (err) {
      Alert.alert(t('errors:errorTitle'), t('errors:unknown'))
    } finally {
      if (!isNavigating.current) setLoading(false)
      setTimeout(() => { isNavigating.current = false }, 1000)
    }
  }

  const goToSettings = useMemo(() => [{ icon: 'settings', onPress: () => router.push('Project/Settings') }], [])

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppHeader title={t('projects:myProjects')} searchEnabled={false} rightActions={goToSettings} />

      {/* Nav Toggle */}
      <View style={localStyles.navContainer(theme)}>
        <View style={localStyles.buttonRow}>
          <NavButton active={viewMode === 'local'} icon="folder-outline" label={t('projects:available')} onPress={loadLocalProjects} theme={theme} />
          <NavButton active={viewMode === 'search'} icon="qrcode-scan" label={t('projects:code')} onPress={enableSearchMode} theme={theme} />
          <NavButton active={viewMode === 'public'} icon="earth" label={t('projects:browse')} onPress={loadPublicProjects} theme={theme} />
        </View>
      </View>

      {/* Main Content Area */}
      <View style={{ flex: 1 }}>
        {viewMode === 'search' ? (
          <View style={localStyles.searchContainer}>
            {/* 1. TextInput */}
            <View style={localStyles.inputWrapper(theme)}>
              <TextInput
                style={[localStyles.input, { color: theme.colors.text }]}
                placeholder={t('projects:enterCode')}
                placeholderTextColor={theme.colors.hint}
                value={searchCode}
                onChangeText={setSearchCode}
                autoCapitalize="characters"
              />
              {searchCode.length > 0 && (
                <TouchableOpacity onPress={() => setSearchCode('')} style={{ padding: 10 }}>
                  <MaterialIcons name="close" size={20} color={theme.colors.hint} />
                </TouchableOpacity>
              )}
            </View>

            <Text style={[styles.secTextInput, { textAlign: 'center', marginBottom: 18 }]} >OR</Text>

            {/* 2. CameraView - Occupying remaining space */}
            <View style={localStyles.cameraContainer(theme)}>
              <CameraView
                style={StyleSheet.absoluteFillObject}
                onBarcodeScanned={handleBarCodeScanned}
                barcodeSettings={{ barcodeTypes: ['qr'] }}
              >
                <View style={localStyles.cameraOverlay}>
                  <View style={localStyles.scanFrame} />
                  <Text style={localStyles.scanText}>{t('projects:alignQrCode')}</Text>
                </View>
              </CameraView>
            </View>

            {/* 3. Search Button */}
            <TouchableOpacity
              style={[styles.button, styles.inputBase, localStyles.searchSubmitBtn,]}
              onPress={() => handleSearchByCode()}
            >
              <MaterialIcons name="search" size={20} color="white" />
              <Text style={styles.buttonText}>{t('projects:searchProject')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* FlatList for Local and Public Browse */
          loading ? (
            <View style={localStyles.loaderOverlay}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
          ) : (
            <FlatList
              data={displayList}
              keyExtractor={(item, index) => item.id?.toString() || index.toString()}
              contentContainerStyle={[styles.scrollContent, { paddingHorizontal: 16 }]}
              renderItem={({ item }) => (
                <ProjectCard item={item} onPress={() => handleProjectPress(item)} theme={theme} t={t} styles={styles} />
              )}
              ListEmptyComponent={
                <View style={localStyles.emptyState}>
                  <MaterialCommunityIcons name="clipboard-text-search-outline" size={48} color={theme.colors.hint} />
                  <Text style={[styles.hint, { marginTop: 10 }]}>{t('projects:noProjectsFound')}</Text>
                </View>
              }
            />
          )
        )}
      </View>

      <TouchableOpacity style={[styles.fab, { backgroundColor: theme.colors.primary }]} onPress={() => router.push(`/Main/`)}>
        <MaterialIcons name="home-filled" size={24} color="white" />
      </TouchableOpacity>
    </View>
  )
}

// Sub-components
const NavButton = ({ active, icon, label, onPress, theme }) => (
  <TouchableOpacity onPress={onPress} style={[localStyles.navBtn, { backgroundColor: active ? theme.colors.primary : theme.colors.inputBackground }]}>
    <MaterialCommunityIcons name={icon} size={18} color={active ? 'white' : theme.colors.primary} />
    <Text style={[localStyles.navLabel, { color: active ? 'white' : theme.colors.text }]}>{label}</Text>
  </TouchableOpacity>
)

const ProjectCard = ({ item, onPress, theme, t, styles }) => (
  <TouchableOpacity onPress={onPress} style={[styles.inputBase, { marginBottom: 12 }]}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.pageTitle, { fontSize: 16 }]}>{item.title}</Text>
        <Text style={[styles.hint]} numberOfLines={2}>{item.description}</Text>
        <View style={localStyles.badgeRow}>
          <View style={localStyles.codeBadge(theme)}><Text style={localStyles.codeText(theme)}>{item.code}</Text></View>
          <Text style={[styles.tiny, { color: theme.colors.hint, marginLeft: 8 }]}>{item.category}</Text>
        </View>
      </View>

      <MaterialIcons name="chevron-right" size={24} color={theme.colors.hint} />
    </View>

  </TouchableOpacity >
)

const localStyles = StyleSheet.create({
  navContainer: (theme) => ({ paddingHorizontal: 16, paddingTop: 16, backgroundColor: theme.colors.background }),
  buttonRow: { flexDirection: 'row', gap: 8 },
  navBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  navLabel: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  searchContainer: { flex: 1, padding: 16 },
  inputWrapper: (theme) => ({
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    alignItems: 'center',
    marginBottom: 16
  }),
  input: { flex: 1, paddingHorizontal: 12, height: 50, fontSize: 16 },
  cameraContainer: (theme) => ({
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'black',
    borderWidth: 1,
    borderColor: theme.colors.inputBorder
  }),
  cameraOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: 200, height: 200, borderWidth: 2, borderColor: 'white', borderRadius: 16, borderStyle: 'dashed' },
  scanText: { color: 'white', marginTop: 20, fontSize: 12, fontWeight: 'bold' },
  searchSubmitBtn: { marginTop: 16, flexDirection: 'row', gap: 8, height: 55 },
  loaderOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: (theme) => ({ backgroundColor: theme.colors.card, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.inputBorder + '20' }),
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  codeBadge: (theme) => ({ backgroundColor: theme.colors.primary + '15', paddingHorizontal: 6, borderRadius: 4 }),
  codeText: (theme) => ({ color: theme.colors.primary, fontSize: 10, fontWeight: 'bold' }),
  emptyState: { alignItems: 'center', marginTop: 40 }
})

export default ProjectListView