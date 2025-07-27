import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import useProjectStore from '../../../store/projectStore';
import { useThemeStore } from '../../../store/ThemeStore';
import { createTables, dropTables } from '../../../utils/database';

const Settings = () => {
    const { colors, isDark } = useTheme();
    const { toggleMode, mode } = useThemeStore();
    const { setCurrentProject } = useProjectStore();

    const [serverUrl, setServerUrl] = useState('https://api.example.com');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [language, setLanguage] = useState('en');
    const [isResetting, setIsResetting] = useState(false);

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

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            paddingHorizontal: 20,
            backgroundColor: colors.background,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 40,
            paddingBottom: 20,
            borderBottomWidth: 1,
            borderBottomColor: colors.inputBorder,
        },
        headerLeft: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 15,
        },
        headerTitle: {
            fontSize: 20,
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
            fontSize: 16,
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
            fontSize: 16,
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
        <View style={styles.container}>
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
                    <Text style={styles.headerTitle}>Settings</Text>
                </View>
                <TouchableOpacity onPress={() => alert('Search functionality coming soon')}>
                    <MaterialIcons
                        name="search"
                        size={24}
                        color={colors.text}
                    />
                </TouchableOpacity>
            </View>

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
        </View>
    );
};

export default Settings;