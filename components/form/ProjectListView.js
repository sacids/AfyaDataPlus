import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import { CameraView, useCameraPermissions } from 'expo-camera'; // Updated for latest expo-camera
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import api, { hubApi } from '../../api/axiosInstance';
import { config } from '../../constants/config';
import { getStyles } from '../../constants/styles';
import { useTheme } from '../../context/ThemeContext';
import { xorDecrypt } from '../../lib/form/utils';
import { useAuthStore } from '../../store/authStore';
import useProjectStore from '../../store/projectStore';
import { insert, select } from '../../utils/database';
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
  const isScanning = useRef(false);

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
      const response = await hubApi.get('/api/v1/projects/discover/')
      //console.log(JSON.stringify(response.data, null, 4))
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

  const handleBarCodeScanned = async ({ data }) => {
    // 1. Immediate Lock: if we are already processing or loading, exit.
    if (isScanning.current || loading) return;

    // 2. Set the lock
    isScanning.current = true;
    setLoading(true);

    try {
      if (data) {
        //setSearchCode(data);


        const { user } = useAuthStore.getState();
        //console.log('Processing scan for:', data);
        const [prefix, encoded] = data.split(':');
        const key = (prefix === 'G') ? config.AFYADATA_GLOBAL_KEY : user.globalUsername;

        // 1. Decrypt the XOR string
        const decryptedJson = xorDecrypt(encoded, key);

        const qr_data = JSON.parse(decryptedJson);

        // 3. Check Expiry
        if (qr_data.exp && new Date(qr_data.exp) < new Date()) {
          alert("This project invitation has expired.");
          return;
        }

        // console.log("Success! QR ID:", qr_data.id);
        // console.log("URL to call:", qr_data.url);

        const url = qr_data.url + '?qr_id=' + qr_data.id

        const response = await joinProject(url);
        const project_to_save = response.project;

        if (project_to_save) {
          setCurrentData(null);
          setCurrentProject(project_to_save); // Ensure you pass the object, not the array if possible
          isNavigating.current = true;
          router.replace('/(app)/Main/');
        } else {
          Alert.alert(
            t('projects:joinFailed'),
            response.message,
            [{ text: 'OK', onPress: () => { isScanning.current = false; } }] // Unlock on dismiss
          );
        }
      }
    } catch (error) {
      console.error("Scan Error:", error);
      isScanning.current = false; // Unlock so user can try again
    } finally {
      setLoading(false);
      // Note: If navigating, we don't reset isScanning to prevent "double jumps"
    }
  };



  const joinProject = async (url) => {

    const instance_url = new URL(url).origin
    const authStore = useAuthStore.getState();

    let session = authStore.instances[instance_url];

    //console.log('instance url', instance_url)

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

        //console.log('user', JSON.stringify(authStore.user, null, 5))
        //console.log('payload', JSON.stringify(payload, null, 5))
        const regResponse = await axios.post(`${instance_url}/api/v1/register`, payload);

        // Save session for this instance
        authStore.setInstanceSession(instance_url, regResponse.data.access, authStore.user.globalUsername);
      } catch (err) {
        console.error("Failed to auto-register on new instance", err);
        return;
      }
    }

    // SUBSEQUENT JOIN: Just request access to the project
    const response = await api.post(`${url}`);
    const project_to_save = response.data.project

    if (!response.data.error) {
      const projectToSave = {
        ...project_to_save,
        project: project_to_save.id,
        instance_url: instance_url,
        tags: typeof project_to_save.tags === 'string' ? project_to_save.tags : JSON.stringify(project_to_save.tags || [])
      }
      await insert('projects', projectToSave)
      const localProjects = await select('projects', 'project = ?', [project_to_save.id])

      return {
        "message": response?.data?.message,
        "project": localProjects && localProjects.length > 0 ? localProjects[0] : null
      }
    } else {
      return { "message": response?.data?.message, "project": false }
    }

  }

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
        const join_url = `${instance_url}/api/v1/project/${remote_project_id}/join/`
        const response = await joinProject(join_url)
        const project_to_save = response.project

        if (project_to_save) {
          setCurrentData(null)
          setCurrentProject(project_to_save[0])
          isNavigating.current = true
          router.replace('/(app)/Main/')
        } else {
          Alert.alert(t('projects:joinFailed'), project_to_save.message)
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