import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator, Alert, FlatList, Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import UserProfileCard from '../../../components/cards/userProfileCard';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import LanguageManager from '../../../i18n/languageManager';
import { useAuthStore } from '../../../store/authStore';
import useProjectStore from '../../../store/projectStore';
import { useThemeStore } from '../../../store/ThemeStore';
import { resetDatabase, select, update } from '../../../utils/database';

const Settings = () => {
    const { t, i18n } = useTranslation();
    const { colors, isDark } = useTheme();
    const { toggleMode, mode } = useThemeStore();

    // Read current workspace configuration mapping from Zustand store
    const { currentProject, setCurrentData, setCurrentProject } = useProjectStore();

    // Auth Store for logout and user info
    const { user, logout } = useAuthStore();

    const globalStyles = getStyles({ colors });
    const insets = useSafeAreaInsets();

    const [serverUrl, setServerUrl] = useState('');
    const [projects, setProjects] = useState([]);
    const [isResetting, setIsResetting] = useState(false);
    const [isSwitchingProject, setIsSwitchingProject] = useState(false); // Spinner flag for project toggle adjustments
    const [availableLanguages, setAvailableLanguages] = useState([]);
    const [downloadedLanguages, setDownloadedLanguages] = useState([]);
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const [refreshing, setRefreshing] = useState(false);


    const handleUnsubscribe = async (project) => {
        const response = await axios.post(project.instance_url + '/api/v1/project/unsubscribe', { "code": project.code });
        update('projects', { active: 0 }, 'id = ?', [project.id])
        setCurrentData(null);
        setCurrentProject(null);
        alert(response.data.message)
    };

    useEffect(() => {
        loadInitialData();

        return () => {
            // Optional cleanup when the screen loses focus
        };
    }, []);

    const loadInitialData = async () => {
        await Promise.all([
            fetchProjects(),
            fetchAvailableLanguages(),
            fetchDownloadedLanguages()
        ]);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadInitialData();
        setRefreshing(false);
    };

    const fetchProjects = async () => {
        try {
            const results = await select('projects');
            setProjects(results);
        } catch (error) {
            console.error('Error fetching projects:', error);
        }
    };

    const fetchAvailableLanguages = async () => {
        const languages = await LanguageManager.fetchAvailableLanguages();
        setAvailableLanguages(languages);
    };

    const fetchDownloadedLanguages = async () => {
        const languages = await LanguageManager.fetchDownloadedLanguages();
        setDownloadedLanguages(languages);
    };

    const handleThemeToggle = () => {
        toggleMode(isDark ? 'light' : 'dark');
    };

    // Project selection and switching handler mimicking joinProject operation behavior
    const handleProjectToggle = async (project) => {
        // If it's already the active project, do nothing

        Alert.alert(
            t('projects:unsubscribe'),
            t('projects:unsubscribeConfirmation'),
            [
                { text: t('common:no'), style: 'cancel' },
                { text: t('common:yes'), style: 'destructive', onPress: () => handleUnsubscribe(currentProject) }
            ]
        );

    };

    const handleLogout = () => {
        Alert.alert(
            t('alerts:confirmation'),
            t('auth:logoutConfirm'),
            [
                { text: t('common:cancel'), style: 'cancel' },
                {
                    text: t('auth:signOut'),
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        router.replace('/(auth)/login');
                    }
                },
            ]
        );
    };

    const handleResetDatabase = () => {
        Alert.alert(
            t('settings:resetTitle'),
            t('settings:resetConfirm'),
            [
                { text: t('common:cancel'), style: 'cancel' },
                {
                    text: t('settings:resetAction'),
                    style: 'destructive',
                    onPress: async () => {
                        setIsResetting(true);
                        try {
                            // 1. Drop and Recreate SQLite Tables
                            await resetDatabase(); // Ensure migrations are run after recreating tables

                            // 2. Clear Project specific storage (AsyncStorage)
                            //await AsyncStorage.clear();

                            // 3. Clear Auth storage (SecureStore)
                            // This removes the user object, tokens, and "instances"
                            await SecureStore.deleteItemAsync('auth-storage');

                            // 4. Reset Zustand Stores in memory
                            setCurrentProject(null);
                            //useAuthStore.getState().logout();

                            // 5. Force navigation to onboarding
                            router.replace('/');
                        } catch (error) {
                            console.error('Reset error:', error);
                            Alert.alert("Error", "Failed to fully reset the app.");
                        } finally {
                            setIsResetting(false);
                        }
                    },
                },
            ]
        );
    };

    const renderLanguageItem = ({ item }) => (
        <TouchableOpacity
            style={[localStyles.languageItem, i18n.language === item.code && { backgroundColor: colors.primary + '15' }]}
            onPress={async () => {
                const isDownloaded = downloadedLanguages.find(l => l.code === item.code);
                if (isDownloaded) {
                    await i18n.changeLanguage(item.code);
                    setShowLanguageModal(false);
                } else {
                    Alert.alert(t('settings:downloadLanguage'), t('settings:confirmDownload'), [
                        { text: t('common:cancel'), style: 'cancel' },
                        {
                            text: t('common:download'),
                            onPress: async () => {
                                await LanguageManager.downloadLanguage(item.code);
                                await fetchDownloadedLanguages();
                                await i18n.changeLanguage(item.code);
                                setShowLanguageModal(false);
                            }
                        }
                    ]);
                }
            }}
        >
            <View>
                <Text style={[globalStyles.bodyText, i18n.language === item.code && { color: colors.primary, fontWeight: 'bold' }]}>
                    {item.nativeName}
                </Text>
                <Text style={globalStyles.hint}>{item.name}</Text>
            </View>
            {i18n.language === item.code ? (
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            ) : downloadedLanguages.find(l => l.code === item.code) ? (
                <Ionicons name="cloud-done-outline" size={22} color={colors.hint} />
            ) : (
                <Ionicons name="cloud-download-outline" size={22} color={colors.primary} />
            )}
        </TouchableOpacity>
    );

    return (
        <View style={[globalStyles.pageContainer, { paddingBottom: insets.bottom, paddingTop: insets.top }]}>
            <View style={globalStyles.headerContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={globalStyles.pageTitle}>{t('settings:title')}</Text>
                </View>
            </View>

            <ScrollView
                style={{ flex: 1, paddingHorizontal: 16 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
                }
            >
                {/* User Profile */}
                <UserProfileCard user={user} globalStyles={globalStyles} localStyles={localStyles} t={t} />

                {/* Projects Section */}
                <View style={globalStyles.card}>
                    <Text style={globalStyles.sectionTitle}>{t('settings:projects' || 'Projects')}</Text>
                    {projects.length === 0 ? (
                        <Text style={[globalStyles.hint, { paddingVertical: 10 }]}>
                            {t('settings:noProjects' || 'No local workspace profiles loaded.')}
                        </Text>
                    ) : (
                        projects.map((proj) => {
                            const isActive = proj.active === 0 ? false : true; // Assuming 'active' is stored as 0/1 in the database
                            return (
                                <View key={proj.id} style={[localStyles.flexRowSpace, { paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.inputBorder + '30' }]}>
                                    <View style={{ flex: 1, paddingRight: 10 }}>
                                        <Text style={[globalStyles.bodyText, isActive && { color: colors.primary, fontWeight: 'bold' }]}>
                                            {proj.name || proj.title || 'Unnamed Project'}
                                        </Text>
                                        <Text style={globalStyles.hint}>
                                            {isActive ? (t('settings:active' || 'Active Workspace')) : (t('settings:inactive' || 'Inactive'))}
                                        </Text>
                                    </View>
                                    <Switch
                                        value={isActive}
                                        onValueChange={() => handleProjectToggle(proj)}
                                        thumbColor={isActive ? colors.primary : '#f4f3f4'}
                                        trackColor={{ false: '#767577', true: colors.primary + '80' }}
                                    />
                                </View>
                            );
                        })
                    )}
                </View>

                {/* Preferences */}
                <View style={globalStyles.card}>
                    <Text style={globalStyles.sectionTitle}>{t('settings:preferences')}</Text>

                    <View style={localStyles.flexRowSpace}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <MaterialCommunityIcons name="brightness-6" size={22} color={colors.text} />
                            <Text style={globalStyles.bodyText}>{t('settings:darkMode')}</Text>
                        </View>
                        <Switch
                            value={mode === 'dark'}
                            onValueChange={handleThemeToggle}
                            thumbColor={isDark ? colors.primary : '#f4f3f4'}
                            trackColor={{ false: '#767577', true: colors.primary + '80' }}
                        />
                    </View>

                    <TouchableOpacity
                        style={[localStyles.flexRowSpace, { marginTop: 15 }]}
                        onPress={() => setShowLanguageModal(true)}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <MaterialIcons name="language" size={22} color={colors.text} />
                            <Text style={globalStyles.bodyText}>{t('settings:language')}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={[globalStyles.hint, { textTransform: 'uppercase' }]}>{i18n.language}</Text>
                            <MaterialIcons name="chevron-right" size={24} color={colors.hint} />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Danger Zone */}
                <View style={[globalStyles.card, { borderColor: colors.error, borderWidth: 1 }]}>
                    <Text style={[globalStyles.sectionTitle, { color: colors.error }]}>{t('settings:dangerZone')}</Text>
                    <TouchableOpacity style={[globalStyles.button, { backgroundColor: colors.error + '15', marginBottom: 10 }]} onPress={handleLogout}>
                        <Text style={[globalStyles.buttonText, { color: colors.error }]}>{t('auth:signOut')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[globalStyles.button, { backgroundColor: colors.error }]} onPress={handleResetDatabase}>
                        <Text style={[globalStyles.buttonText, { color: '#fff' }]}>{t('settings:resetDatabase')}</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                    <Text style={globalStyles.hint}>AfyaData Plus v{Constants.expoConfig?.version}</Text>
                </View>
            </ScrollView>

            {/* Language Selection Modal */}
            <Modal visible={showLanguageModal} animationType="slide" transparent={true}>
                <View style={localStyles.modalOverlay}>
                    <View style={[localStyles.modalContent, { backgroundColor: colors.background }]}>
                        <Text style={globalStyles.sectionTitle}>{t('settings:selectLanguage')}</Text>

                        <FlatList
                            data={[...downloadedLanguages, ...availableLanguages.filter(a => !downloadedLanguages.find(d => d.code === a.code))]}
                            renderItem={renderLanguageItem}
                            keyExtractor={(item) => item.code}
                            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.inputBorder, opacity: 0.5 }} />}
                        />

                        <TouchableOpacity
                            style={[globalStyles.button, { marginTop: 20, backgroundColor: colors.inputBorder }]}
                            onPress={() => setShowLanguageModal(false)}
                        >
                            <Text style={globalStyles.buttonText}>{t('common:close')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Loading Overlays */}
            {(isResetting || isSwitchingProject) && (
                <View style={localStyles.loadingOverlay}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={{ color: '#fff', marginTop: 10 }}>
                        {isResetting ? `${t('settings:resetting')}...` : 'Switching project...'}
                    </Text>
                </View>
            )}
        </View>
    );
};

const localStyles = StyleSheet.create({
    card: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        backgroundColor: 'rgba(150, 150, 150, 0.05)',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 15,
        textTransform: 'uppercase',
        opacity: 0.6,
    },
    rowItem: {
        paddingVertical: 8,
    },
    flexRowSpace: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    languageItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderRadius: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        minHeight: '50%',
        maxHeight: '80%',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    }
});

export default Settings;