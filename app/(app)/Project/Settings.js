import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator, Alert, FlatList, Modal,
    RefreshControl,
    ScrollView,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getStyles } from '../../../constants/styles';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import LanguageManager from '../../../i18n/languageManager';
import useProjectStore from '../../../store/projectStore';
import { useThemeStore } from '../../../store/ThemeStore';
import { createTables, dropTables, remove, select } from '../../../utils/database';

const Settings = () => {
    const { t, i18n } = useTranslation();
    const { colors, isDark } = useTheme();
    const { toggleMode, mode } = useThemeStore();
    const { setCurrentProject } = useProjectStore();
    const { authState, autoLogin, logout } = useAuth();
    const styles = getStyles({ colors });

    const [serverUrl, setServerUrl] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [currentLanguage, setCurrentLanguage] = useState('en');
    const [projects, setProjects] = useState([]);
    const [isResetting, setIsResetting] = useState(false);
    const [availableLanguages, setAvailableLanguages] = useState([]);
    const [downloadedLanguages, setDownloadedLanguages] = useState([]);
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const [downloadingLang, setDownloadingLang] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [languagesNeedingUpdate, setLanguagesNeedingUpdate] = useState({});

    const [appInfo, setAppInfo] = useState({
        version: '',
        buildNumber: '',
        platform: ''
    });

    const insets = useSafeAreaInsets();

    useEffect(() => {
        setAppInfo({
            version: Constants.expoConfig?.version || '1.0.0',
            buildNumber: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '1',
            platform: Constants.platform?.ios ? 'iOS' : 'Android'
        });
    }, []);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const [server, userLang] = await AsyncStorage.multiGet([
                    'serverUrl',
                    'user-language'
                ]);
                setServerUrl(server[1] || 'https://api.example.com');
                setCurrentLanguage(userLang[1] || 'en');

                if (userLang[1] && userLang[1] !== i18n.language) {
                    i18n.changeLanguage(userLang[1]);
                }
            } catch (error) {
                console.error(t('errors:failedLoad'), error);
            }
        };

        loadSettings();
        fetchProjects();
        fetchAvailableLanguages();
        fetchDownloadedLanguages();
    }, []);

    useEffect(() => {
        if (downloadedLanguages.length > 0) {
            checkAllUpdates();
        }
    }, [downloadedLanguages]);

    const fetchProjects = async () => {
        try {
            const data = await select('projects');
            setProjects(data);
        } catch (error) {
            console.error(t('errors:failedLoad'), error);
        }
    };

    const fetchAvailableLanguages = async () => {
        try {
            const [serverLangs, downloaded] = await Promise.all([
                LanguageManager.fetchAvailableLanguages(),
                LanguageManager.fetchDownloadedLanguages()
            ]);

            // Get downloaded language codes
            const downloadedCodes = downloaded.map(lang => lang.code);

            // Filter out languages that are already downloaded
            const filteredLangs = serverLangs.filter(lang => !downloadedCodes.includes(lang.code));

            setAvailableLanguages(filteredLangs);
        } catch (error) {
            console.error('Error fetching languages:', error);
            // Fallback
            setAvailableLanguages([]);
        }
    };

    const fetchDownloadedLanguages = async () => {
        try {
            const langs = await LanguageManager.fetchDownloadedLanguages();
            setDownloadedLanguages(langs);

            // Also update current language from i18n
            setCurrentLanguage(i18n.language);
        } catch (error) {
            console.error('Error fetching downloaded languages:', error);
            setDownloadedLanguages([
                { code: 'en', name: 'English', nativeName: 'English', isBundled: true }
            ]);
        }
    };

    const handleThemeToggle = () => {
        toggleMode(isDark ? 'light' : 'dark');
    };

    const handleSaveSettings = async () => {
        try {
            await AsyncStorage.setItem('serverUrl', serverUrl);
            Alert.alert(
                t('alerts:successTitle'),
                t('settings:settingsSaved')
            );
        } catch (error) {
            Alert.alert(
                t('errors:errorTitle'),
                t('errors:failedSave')
            );
            console.error(error);
        }
    };

    const handleResetDatabase = async () => {
        setIsResetting(true);
        Alert.alert(
            t('alerts:confirmation'),
            t('settings:confirmReset'),
            [
                {
                    text: t('common:cancel'),
                    style: 'cancel',
                    onPress: () => setIsResetting(false)
                },
                {
                    text: t('settings:resetDatabase'),
                    onPress: async () => {
                        try {
                            await dropTables();
                            await createTables();
                            setCurrentProject(null);
                            await AsyncStorage.clear();

                            if (serverUrl) {
                                await AsyncStorage.setItem('serverUrl', serverUrl);
                            }

                            Alert.alert(
                                t('alerts:successTitle'),
                                t('settings:databaseReset')
                            );

                            fetchProjects();

                            setIsResetting(false);
                        } catch (error) {
                            Alert.alert(
                                t('errors:errorTitle'),
                                t('settings:resetFailed')
                            );
                            console.error(error);
                            setIsResetting(false);
                        }
                    },
                    style: 'destructive',
                },
            ]
        );
    };

    const deleteProject = async (project) => {
        Alert.alert(
            t('alerts:confirmation'),
            `${t('projects:unsubscribeConfirm')}\n${project.title}`,
            [
                { text: t('common:cancel'), style: 'cancel' },
                {
                    text: t('common:delete'),
                    onPress: async () => {
                        try {
                            await remove('projects', 'id = ?', [project.id]);
                            await remove('form_data', 'project = ?', [project.project]);
                            Alert.alert(
                                t('alerts:successTitle'),
                                t('projects:unsubscribed')
                            );
                            fetchProjects();
                        } catch (error) {
                            Alert.alert(
                                t('errors:errorTitle'),
                                t('errors:failedDelete')
                            );
                            console.error(error);
                        }
                    },
                    style: 'destructive',
                },
            ]
        );
    };

    const downloadAndActivateLanguage = async (langCode, langName) => {
        try {
            setDownloadingLang(langCode);

            await LanguageManager.downloadLanguage(langCode);

            // Refresh lists
            await fetchDownloadedLanguages();
            await fetchAvailableLanguages();

            // Activate the language
            await i18n.changeLanguage(langCode);
            await AsyncStorage.setItem('user-language', langCode);
            setCurrentLanguage(langCode);

            Alert.alert(
                t('alerts:successTitle'),
                `${langName} ${t('settings:languageDownloaded')}`
            );

        } catch (error) {
            console.error('Error downloading language:', error);
            Alert.alert(
                t('errors:errorTitle'),
                t('errors:languageDownloadFailed')
            );
        } finally {
            setDownloadingLang(null);
        }
    };

    const changeLanguage = async (langCode) => {
        try {
            // Check if language is downloaded
            const isDownloaded = downloadedLanguages.some(lang => lang.code === langCode);

            if (!isDownloaded) {
                const langInfo = availableLanguages.find(lang => lang.code === langCode);
                if (langInfo) {
                    Alert.alert(
                        t('alerts:confirmation'),
                        `${t('settings:downloadLanguage')} ${langInfo.nativeName}?`,
                        [
                            { text: t('common:cancel'), style: 'cancel' },
                            {
                                text: t('common:download'),
                                onPress: () => downloadAndActivateLanguage(langCode, langInfo.nativeName)
                            }
                        ]
                    );
                }
                return;
            }

            // Language is already downloaded, just activate it
            await i18n.changeLanguage(langCode);
            await AsyncStorage.setItem('user-language', langCode);
            setCurrentLanguage(langCode);
            setShowLanguageModal(false);

            Alert.alert(
                t('alerts:successTitle'),
                `${t('settings:currentLanguage')}: ${langCode.toUpperCase()}`
            );
        } catch (error) {
            console.error('Error changing language:', error);
            Alert.alert(
                t('errors:errorTitle'),
                t('errors:failedUpdate')
            );
        }
    };


    // Function to check updates for all languages
    const checkAllUpdates = async () => {
        const updates = {};

        for (const lang of downloadedLanguages) {
            if (lang.code === 'en' || lang.isBundled) continue;

            try {
                // Your update check logic here
                const serverLangs = await LanguageManager.fetchAvailableLanguages();
                const serverLang = serverLangs.find(l => l.code === lang.code);

                if (serverLang && serverLang.version) {
                    const currentVersion = lang.version || '0';
                    const serverVersion = serverLang.version;
                    const needsUpdate = compareVersions(serverVersion, currentVersion) > 0;
                    updates[lang.code] = needsUpdate;
                }
            } catch (error) {
                console.error(`Error checking update for ${lang.code}:`, error);
            }
        }

        setLanguagesNeedingUpdate(updates);
    };


    const compareVersions = (v1, v2) => {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);

        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const num1 = parts1[i] || 0;
            const num2 = parts2[i] || 0;
            if (num1 > num2) return 1;
            if (num1 < num2) return -1;
        }
        return 0;
    };

    const updateLanguage = async (langCode) => {
        try {
            setDownloadingLang(langCode);
            await LanguageManager.downloadLanguage(langCode);
            await fetchDownloadedLanguages();
            await fetchAvailableLanguages();

            Alert.alert(
                t('alerts:successTitle'),
                t('settings:languageDownloaded')
            );
        } catch (error) {
            Alert.alert(
                t('errors:errorTitle'),
                t('errors:languageDownloadFailed')
            );
        } finally {
            setDownloadingLang(null);
        }
    };

    const removeLanguage = async (langCode) => {
        if (langCode === 'en') {
            Alert.alert(
                t('alerts:warning'),
                t('settings:cannotRemoveDefault')
            );
            return;
        }

        if (currentLanguage === langCode) {
            Alert.alert(
                t('alerts:warning'),
                t('settings:cannotRemoveActive')
            );
            return;
        }

        Alert.alert(
            t('alerts:confirmation'),
            `${t('settings:removeLanguage')} ${langCode}?`,
            [
                { text: t('common:cancel'), style: 'cancel' },
                {
                    text: t('common:remove'),
                    onPress: async () => {
                        try {
                            await LanguageManager.removeLanguage(langCode);
                            await fetchDownloadedLanguages();
                            await fetchAvailableLanguages();
                            Alert.alert(
                                t('alerts:successTitle'),
                                t('settings:languageRemoved')
                            );
                        } catch (s) {
                            Alert.alert(
                                t('errors:errorTitle'),
                                t('errors:languageRemoveFailed')
                            );
                        }
                    },
                    style: 'destructive'
                },
            ]
        );
    };

    const exportDatabase = async () => {
        Alert.alert(
            t('alerts:information'),
            t('settings:exportDatabaseInfo')
        );
    };

    const clearCache = async () => {
        Alert.alert(
            t('alerts:confirmation'),
            t('settings:clearCacheConfirm'),
            [
                { text: t('common:cancel'), style: 'cancel' },
                {
                    text: t('common:clear'),
                    onPress: async () => {
                        try {
                            // const cacheDir = `${FileSystem.cacheDirectory}`;
                            // await FileSystem.deleteAsync(cacheDir, { idempotent: true });
                            Alert.alert(
                                t('alerts:successTitle'),
                                t('settings:cacheCleared')
                            );
                        } catch (error) {
                            Alert.alert(
                                t('errors:errorTitle'),
                                t('errors:clearCacheFailed')
                            );
                        }
                    },
                    style: 'destructive',
                },
            ]
        );
    };

    const checkForAppUpdates = async () => {
        Alert.alert(
            t('alerts:information'),
            t('settings:checkUpdatesInfo')
        );
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([
            fetchProjects(),
            fetchAvailableLanguages(),
            fetchDownloadedLanguages()
        ]);
        setRefreshing(false);
    };

    const renderLanguageItem = ({ item }) => {
        const isDownloaded = downloadedLanguages.some(lang => lang.code === item.code);
        const isCurrent = currentLanguage === item.code;
        const isDownloading = downloadingLang === item.code;
        const isBundled = item.isBundled || item.code === 'en';
        const needsUpdate = languagesNeedingUpdate[item.code] || false; // Get from state


        return (
            <TouchableOpacity
                style={[
                    styles.card,
                    {
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 12,
                        marginBottom: 8,
                        minHeight: 60
                    },
                    isCurrent && { backgroundColor: colors.primary + '20' }
                ]}
                onPress={() => isDownloaded ? changeLanguage(item.code) : null}
                disabled={isDownloading || (!isDownloaded && isDownloading)}
            >
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 40, alignItems: 'center' }}>
                        {isDownloaded ? (
                            isCurrent ? (
                                <Ionicons name="radio-button-on" size={24} color={colors.primary} />
                            ) : (
                                <TouchableOpacity onPress={() => changeLanguage(item.code)}>
                                    <Ionicons name="radio-button-off" size={24} color={colors.hint} />
                                </TouchableOpacity>
                            )
                        ) : (
                            <Ionicons name="cloud-download-outline" size={24} color={colors.hint} />
                        )}
                    </View>

                    <View style={{ flex: 1 }}>
                        <Text style={[styles.bodyText, { fontWeight: '500' }]}>
                            {item.nativeName || item.name}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <Text style={[styles.hint, { fontSize: 12 }]}>
                                {item.name} ({item.code})
                            </Text>
                            {isBundled && (
                                <View style={{ backgroundColor: colors.primary + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                    <Text style={[styles.hint, { fontSize: 10, color: colors.primary }]}>
                                        Bundled
                                    </Text>
                                </View>
                            )}
                            {item.version && (
                                <Text style={[styles.hint, { fontSize: 10 }]}>
                                    v{item.version}
                                </Text>
                            )}
                        </View>
                    </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {isDownloading ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <>
                            {isDownloaded && !isBundled && !isCurrent && (
                                <>
                                    {needsUpdate && (
                                        <TouchableOpacity
                                            onPress={() => updateLanguage(item.code)}
                                            style={{ padding: 4 }}
                                        >
                                            <Ionicons name="refresh-circle-outline" size={20} color={colors.warning} />
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity
                                        onPress={() => removeLanguage(item.code)}
                                        style={{ padding: 4 }}
                                    >
                                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                                    </TouchableOpacity>
                                </>
                            )}
                            {!isDownloaded && (
                                <TouchableOpacity
                                    onPress={() => downloadAndActivateLanguage(item.code, item.nativeName)}
                                    style={[styles.button, { paddingHorizontal: 12, paddingVertical: 6 }]}
                                >
                                    <Text style={[styles.buttonText, { fontSize: 12 }]}>
                                        {t('common:download')}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderProjectItem = ({ item }) => (
        <View style={[styles.card, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }]}>
            <View style={{ flex: 1 }}>
                <Text style={[styles.label, { fontWeight: '500' }]}>{item.title}</Text>
                <Text style={[styles.hint, { marginTop: 2 }]}>
                    {t('projects:code')}: {item.code}
                </Text>
            </View>
            <TouchableOpacity
                onPress={() => deleteProject(item)}
                style={{ padding: 8 }}
            >
                <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={[styles.pageContainer, { paddingBottom: insets.bottom, paddingTop: insets.top }]}>
            <View style={styles.headerContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <MaterialCommunityIcons
                            name="arrow-left"
                            size={24}
                            color={colors.text}
                        />
                    </TouchableOpacity>
                    <Text style={styles.pageTitle}>{t('settings:title')}</Text>
                </View>
                <TouchableOpacity onPress={onRefresh}>
                    <Ionicons name="refresh" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={{ flex: 1, paddingHorizontal: 16 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
            >
                {/* App Info Section */}
                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 5 }}>
                        AfyaData
                    </Text>
                    <Text style={styles.hint}>
                        {t('common:version')} {appInfo.version} ({appInfo.buildNumber})
                    </Text>
                    <Text style={[styles.hint, { fontSize: 12, marginTop: 2 }]}>
                        {t('settings:platform')}: {appInfo.platform}
                    </Text>
                </View>

                {/* User Profile Section */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>{t('settings:userProfile')}</Text>

                    <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.inputBorder }}>
                        <Text style={styles.label}>{t('auth:username')}</Text>
                        <Text style={styles.hint}>{authState?.user?.username || 'N/A'}</Text>
                    </View>

                    <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.inputBorder }}>
                        <Text style={styles.label}>{t('auth:fullName')}</Text>
                        <Text style={styles.hint}>{authState?.user?.fullname || 'N/A'}</Text>
                    </View>

                    <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.inputBorder }}>
                        <Text style={styles.label}>{t('auth:email')}</Text>
                        <Text style={styles.hint}>{authState?.user?.email || 'N/A'}</Text>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 }}>
                        <Text style={styles.label}>{t('auth:syncAuth')}</Text>
                        <TouchableOpacity onPress={autoLogin}>
                            <Ionicons name="sync" size={24} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Projects Section */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>
                        {t('projects:myProjects')} ({projects.length})
                    </Text>

                    {projects.length > 0 ? (
                        projects.map((item) => (
                            <View key={item.id.toString()}>
                                {renderProjectItem({ item })}
                            </View>
                        ))
                    ) : (
                        <Text style={[styles.text, { paddingVertical: 20 }]}>
                            {t('projects:noActiveProjects')}
                        </Text>
                    )}

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: colors.inputBorder, marginTop: 12 }]}
                        onPress={() => router.push('/Project/Join')}
                    >
                        <Text style={[styles.buttonText, { color: colors.text }]}>
                            {t('projects:joinProject')}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Appearance Section */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>{t('settings:appearance')}</Text>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.inputBorder }}>
                        <Text style={styles.bodyText}>{t('settings:darkMode')}</Text>
                        <Switch
                            value={mode === 'dark'}
                            onValueChange={handleThemeToggle}
                            thumbColor={mode === 'dark' ? colors.primary : colors.inputBorder}
                            trackColor={{
                                false: colors.inputBorder,
                                true: colors.primary + '80'
                            }}
                        />
                    </View>

                    <TouchableOpacity
                        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 }}
                        onPress={() => setShowLanguageModal(true)}
                    >
                        <View>
                            <Text style={styles.bodyText}>{t('settings:language')}</Text>
                            <Text style={[styles.hint, { fontSize: 12, marginTop: 2 }]}>
                                {downloadedLanguages.find(lang => lang.code === currentLanguage)?.nativeName || currentLanguage.toUpperCase()}
                            </Text>
                        </View>
                        <MaterialIcons
                            name="keyboard-arrow-right"
                            size={20}
                            color={colors.hint}
                        />
                    </TouchableOpacity>
                </View>

                {/* Server Settings Section */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>{t('settings:serverSettings')}</Text>

                    <TextInput
                        style={styles.inputBase}
                        value={serverUrl}
                        onChangeText={setServerUrl}
                        placeholder={t('settings:serverUrl')}
                        placeholderTextColor={colors.hint}
                        keyboardType="url"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />

                    <TouchableOpacity
                        style={[styles.button, { marginTop: 12 }]}
                        onPress={handleSaveSettings}
                    >
                        <Text style={styles.buttonText}>{t('settings:saveSettings')}</Text>
                    </TouchableOpacity>
                </View>

                {/* Data Management Section */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>{t('settings:dataManagement')}</Text>

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: colors.inputBorder, marginBottom: 8 }]}
                        onPress={exportDatabase}
                    >
                        <Text style={[styles.buttonText, { color: colors.text }]}>
                            {t('settings:exportDatabase')}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: colors.inputBorder, marginBottom: 8 }]}
                        onPress={clearCache}
                    >
                        <Text style={[styles.buttonText, { color: colors.text }]}>
                            {t('settings:clearCache')}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: colors.inputBorder }]}
                        onPress={checkForAppUpdates}
                    >
                        <Text style={[styles.buttonText, { color: colors.text }]}>
                            {t('settings:checkUpdates')}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Danger Zone Section */}
                <View style={[styles.card, { borderColor: colors.error, borderWidth: 1, marginBottom: 20 }]}>
                    <Text style={[styles.sectionTitle, { color: colors.error }]}>
                        {t('settings:dangerZone')}
                    </Text>

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: colors.error, marginBottom: 12 }]}
                        onPress={handleResetDatabase}
                        disabled={isResetting}
                    >
                        <Text style={styles.buttonText}>
                            {isResetting ? t('common:loading') : t('settings:resetDatabase')}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: colors.error + '20', borderWidth: 1, borderColor: colors.error }]}
                        onPress={logout}
                    >
                        <Text style={[styles.buttonText, { color: colors.error }]}>
                            {t('auth:signOut')}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* App Info Footer */}
                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                    <Text style={[styles.hint, { textAlign: 'center' }]}>
                        {t('settings:copyright', { year: new Date().getFullYear() })}
                    </Text>
                    <Text style={[styles.hint, { fontSize: 10, marginTop: 5 }]}>
                        {t('settings:supportContact')}: support@afyadata.org
                    </Text>
                </View>
            </ScrollView>

            {/* Language Selection Modal */}
            <Modal
                visible={showLanguageModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowLanguageModal(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={styles.pageTitle}>{t('settings:selectLanguage')}</Text>
                            <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Downloaded Languages Section */}
                        {downloadedLanguages.length > 0 && (
                            <View style={{ marginBottom: 20 }}>
                                <Text style={[styles.sectionTitle, { fontSize: 14, marginBottom: 10 }]}>
                                    {t('settings:currentLanguage')} ({downloadedLanguages.length})
                                </Text>
                                <FlatList
                                    data={downloadedLanguages}
                                    renderItem={renderLanguageItem}
                                    keyExtractor={(item) => item.code}
                                    scrollEnabled={false}
                                    showsVerticalScrollIndicator={false}
                                />
                            </View>
                        )}

                        {/* Available Languages Section */}
                        {availableLanguages.length > 0 && (
                            <View>
                                <Text style={[styles.sectionTitle, { fontSize: 14, marginBottom: 10 }]}>
                                    {t('settings:downloadLanguage')} ({availableLanguages.length})
                                </Text>
                                <FlatList
                                    data={availableLanguages}
                                    renderItem={renderLanguageItem}
                                    keyExtractor={(item) => item.code}
                                    scrollEnabled={false}
                                    showsVerticalScrollIndicator={false}
                                    style={{ maxHeight: 300 }}
                                />
                            </View>
                        )}

                        {downloadedLanguages.length === 0 && availableLanguages.length === 0 && (
                            <Text style={{ textAlign: 'center', color: colors.hint, padding: 20 }}>
                                {t('data:noData')}
                            </Text>
                        )}

                        <TouchableOpacity
                            style={[styles.button, { marginTop: 20 }]}
                            onPress={() => setShowLanguageModal(false)}
                        >
                            <Text style={styles.buttonText}>{t('common:close')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default Settings;