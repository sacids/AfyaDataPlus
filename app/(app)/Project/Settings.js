import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/ThemeContext';
import useProjectStore from '../../../store/projectStore';
import { useThemeStore } from '../../../store/ThemeStore';
import { createTables, dropTables, remove, select } from '../../../utils/database';
import Constants from 'expo-constants';

const Settings = () => {
    const { colors, isDark } = useTheme();
    const { toggleMode, mode } = useThemeStore();
    const { setCurrentProject } = useProjectStore();

    const [serverUrl, setServerUrl] = useState('https://api.example.com');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [language, setLanguage] = useState('en');
    const [projects, setProjects] = useState([]);
    const [isResetting, setIsResetting] = useState(false);
    const appVersion = Constants.expoConfig.version;
    const insets = useSafeAreaInsets();

    // Load saved settings on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const settings = await AsyncStorage.multiGet([
                    'serverUrl',
                    'username',
                    'password',
                    'language'
                ]);

                setServerUrl(settings[0][1] || 'https://api.example.com');
                setUsername(settings[1][1] || '');
                setPassword(settings[2][1] || '');
                setLanguage(settings[3][1] || 'en');
            } catch (error) {
                console.error('Failed to load settings:', error);
            }
        };

        const fetchProjects = async () => {
            try {
                const data = await select('projects');
                //console.log('projects', data)
                setProjects(data);
            } catch (error) {
                console.error('Error fetching projects:', error);
            }
        };

        fetchProjects()
        loadSettings();
    }, []);

    const handleThemeToggle = () => {
        toggleMode(isDark ? 'light' : 'dark');
    };

    const handleSaveSettings = async () => {
        try {
            await AsyncStorage.multiSet([
                ['serverUrl', serverUrl],
                ['username', username],
                ['password', password],
                ['language', language],
            ]);
            Alert.alert('Settings Saved', 'Your settings have been saved successfully');
        } catch (error) {
            Alert.alert('Error', 'Failed to save settings');
            console.error(error);
        }
    };

    const handleResetDatabase = async () => {
        setIsResetting(true);
        try {
            Alert.alert(
                'Confirm Reset',
                'This will delete ALL local data. Are you sure?',
                [
                    { text: 'Cancel', style: 'cancel', onPress: () => setIsResetting(false) },
                    {
                        text: 'Reset',
                        onPress: async () => {
                            try {
                                await dropTables();
                                await createTables();
                                setCurrentProject(null);
                                await AsyncStorage.clear();
                                Alert.alert('Success', 'Database has been reset');
                            } catch (error) {
                                Alert.alert('Error', 'Failed to reset database');
                                console.error(error);
                            }
                        },
                        style: 'destructive',
                    },
                ]
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to reset database');
            console.error(error);
        } finally {
            setIsResetting(false);
        }
    };

    const deleteProject = async (item) => {

        Alert.alert(
            'Delete Project',
            'Are you sure you want to delete this project?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    onPress: async () => {
                        try {
                            await remove('projects', 'id = ?', [item.id]);
                            await remove('form_data', 'project = ?', [item.project]);
                            Alert.alert('Success', 'Project has been deleted');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete project');
                            console.error(error);
                        }
                    },
                    style: 'destructive',
                },
            ]
        );
    };

    const projectItem = (item) => {
        return (
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'space-between' }} key={item.id}>
                <Text style={styles.settingText}>{item.title}</Text>
                <TouchableOpacity onPress={() => deleteProject(item)}>
                    <Ionicons name="trash" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>
        );
    }

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: 10,
            paddingHorizontal: 15,
        },
        headerLeft: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 15,
        },
        headerTitle: {
            fontSize: 14,
            fontWeight: 'bold',
            color: colors.text,
        },
        section: {
            marginVertical: 20,
            padding: 15,
            borderRadius: 10,
            backgroundColor: colors.inputBackground,
        },
        sectionTitle: {
            fontSize: 14,
            fontWeight: 'bold',
            marginBottom: 15,
            color: colors.primary,
        },
        settingRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 12,
        },
        settingText: {
            fontSize: 14,
            color: colors.text,
        },
        input: {
            height: 45,
            borderColor: colors.inputBorder,
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 15,
            marginBottom: 15,
            color: colors.text,
            backgroundColor: colors.inputBackground,
        },
        button: {
            backgroundColor: colors.primary,
            padding: 15,
            borderRadius: 8,
            alignItems: 'center',
            marginTop: 10,
        },
        buttonText: {
            color: colors.buttonText,
            fontWeight: 'bold',
            fontSize: 16,
        },
        dangerButton: {
            backgroundColor: colors.error,
            marginTop: 20,
        },
        languageContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
    });

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom, paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <MaterialCommunityIcons
                            name="arrow-left"
                            size={24}
                            color={colors.text}
                        />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Settings ({appVersion})</Text>
                </View>
                <TouchableOpacity onPress={() => alert('Search functionality coming soon')}>
                    <MaterialIcons
                        name="search"
                        size={24}
                        color={colors.text}
                    />
                </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, paddingHorizontal: 15 }}>
                {/* Appearance Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Appearance</Text>

                    <View style={styles.settingRow}>
                        <Text style={styles.settingText}>Dark Mode</Text>
                        <Switch
                            value={mode === 'dark'}
                            onValueChange={handleThemeToggle}
                            thumbColor={isDark ? colors.primary : colors.inputBorder}
                            trackColor={{
                                false: colors.inputBorder,
                                true: colors.primary
                            }}
                        />
                    </View>

                    <View style={styles.settingRow}>
                        <Text style={styles.settingText}>Language</Text>
                        <View style={styles.languageContainer}>
                            <TextInput
                                style={[styles.input, { width: 100 }]}
                                value={language}
                                onChangeText={setLanguage}
                                placeholder="en"
                                placeholderTextColor={colors.label}
                            />
                        </View>
                    </View>
                </View>

                {/* Server Settings Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Projects Settings</Text>

                    {
                        projects.length > 0 && projects.map((item) => (
                            projectItem(item)
                        ))
                    }


                </View>

                {/* Server Settings Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Server Settings</Text>

                    <TextInput
                        style={styles.input}
                        value={serverUrl}
                        onChangeText={setServerUrl}
                        placeholder="Server URL"
                        placeholderTextColor={colors.label}
                        keyboardType="url"
                    />

                    <TextInput
                        style={styles.input}
                        value={username}
                        onChangeText={setUsername}
                        placeholder="Username"
                        placeholderTextColor={colors.label}
                        autoCapitalize="none"
                    />

                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Password"
                        placeholderTextColor={colors.label}
                        secureTextEntry
                    />

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleSaveSettings}
                    >
                        <Text style={styles.buttonText}>Save Settings</Text>
                    </TouchableOpacity>
                </View>

                {/* Danger Zone Section */}
                <View style={[styles.section, { borderColor: colors.error, borderWidth: 1 }]}>
                    <Text style={[styles.sectionTitle, { color: colors.error }]}>Danger Zone</Text>

                    <TouchableOpacity
                        style={[styles.button, styles.dangerButton]}
                        onPress={handleResetDatabase}
                        disabled={isResetting}
                    >
                        <Text style={styles.buttonText}>
                            {isResetting ? "Resetting..." : "Reset Database"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView >
        </View>
    );
};

export default Settings;