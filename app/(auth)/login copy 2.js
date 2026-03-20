import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator, Image, Keyboard, KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet, Text, TextInput, TouchableOpacity,
    TouchableWithoutFeedback, View
} from 'react-native';
import api from '../../api/axiosInstance';
import { config } from '../../constants/config';
import { getStyles } from '../../constants/styles';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { getForms } from '../../utils/services';

const logo = require('../../assets/images/AfyaDataLogo.png');

const LoginScreen = () => {
    const { t } = useTranslation();
    const { setUser } = useAuthStore();
    const { colors } = useTheme();

    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isFormValid, setIsFormValid] = useState(false);

    // Sync States
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState('');
    const [syncComplete, setSyncComplete] = useState(false);

    const theme = useTheme();
    const styles = getStyles(theme);

    const startDataSync = async () => {
        console.log('start data sync')
        setIsSyncing(true);
        setSyncStatus('Fetching active projects...');

        try {
            // 1. Fetch Active Projects
            const projResponse = await api.get('api/v1/projects/active');
            const projects = projResponse.data;

            if (projects && projects.length > 0) {
                setSyncStatus(`Found ${projects.length} projects. Syncing forms...`);

                // 2. Sync forms for each project
                for (const project of projects) {
                    setSyncStatus(prev => `${prev}\n\nProject: ${project.title}`);
                    // Utilizes getForms from services.js
                    await getForms(project.id, setSyncStatus);
                }

                setSyncStatus(prev => `${prev}\n\nAll data synchronized!`);
            } else {
                setSyncStatus('No active projects found.');
            }

            setSyncComplete(true);
        } catch (err) {
            console.error('Sync error:', err);
            setSyncStatus(prev => `${prev}\n\nSync failed. Check your connection.`);
            setSyncComplete(true);
        }
    };

    const handleLogin = async () => {
        if (!phoneNumber || !password) {
            setError(t('auth:fillAllFields'));
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await api.post('/api/v1/token/', {
                username: phoneNumber,
                password: password
            });

            const { access, refresh, user } = response.data;
            const authData = { access, refresh, user };

            // Save session and credentials
            await SecureStore.setItemAsync(config.TOKEN_KEY, JSON.stringify(authData));
            await SecureStore.setItemAsync('saved_username', phoneNumber);
            await SecureStore.setItemAsync('saved_password', password);

            setLoading(false);

            // Start the project/form sync
            await startDataSync();

            //setUser(user);

        } catch (err) {
            console.error('Login error:', err);
            setError(t('auth:invalidCredentials'));
            setLoading(false);
        }
    };

    const finalizeLogin = async () => {

        const tokenData = await SecureStore.getItemAsync(config.TOKEN_KEY);
        if (tokenData) {
            const { user } = JSON.parse(tokenData);

            setIsSyncing(false);
            setUser(user)

            router.replace('/(app)/Main');
        } else {
            alert('Login Failed')
        }



    };

    useEffect(() => {
        const isValid = phoneNumber.trim().length >= 10 && password.length >= 6;
        setIsFormValid(isValid);
    }, [phoneNumber, password]);

    const localstyles = StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background, padding: 20, justifyContent: 'center', alignItems: 'center' },
        input: {
            backgroundColor: theme.colors.inputBackground,
            borderColor: theme.colors.inputBorder,
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            color: theme.colors.text,
            width: '100%',
        },
        button: {
            backgroundColor: isFormValid ? theme.colors.buttonBackground : theme.colors.inputBorder,
            padding: 16,
            borderRadius: 8,
            alignItems: 'center',
            width: '100%',
        },
        buttonText: { color: theme.colors.buttonText, fontWeight: 'bold' },
        modalContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: 20
        },
        modalContent: {
            width: '100%',
            backgroundColor: theme.colors.background,
            borderRadius: 12,
            padding: 20,
            maxHeight: '80%',
            elevation: 5
        },
        syncTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 15, textAlign: 'center' },
        syncScroll: {
            backgroundColor: theme.colors.inputBackground,
            padding: 10,
            borderRadius: 8,
            maxHeight: 300,
            marginBottom: 20
        },
        syncText: { color: theme.colors.secText, fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
        skipButton: {
            padding: 10,
            alignItems: 'center',
        },
        skipText: { color: theme.colors.secText, textDecorationLine: 'underline' }
    });

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={localstyles.container}>
                    <Image source={logo} style={{ width: 120, height: 120, resizeMode: 'contain', marginBottom: 30 }} />

                    <TextInput
                        style={localstyles.input}
                        placeholder={t('auth:phonePlaceholder')}
                        placeholderTextColor={colors.secText}
                        keyboardType="phone-pad"
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                    />

                    <TextInput
                        style={localstyles.input}
                        placeholder={t('auth:passwordPlaceholder')}
                        placeholderTextColor={colors.secText}
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />

                    {error ? <Text style={[styles.errorText, { marginBottom: 15 }]}>{error}</Text> : null}

                    <TouchableOpacity style={localstyles.button} onPress={handleLogin} disabled={loading}>
                        {loading ? <ActivityIndicator color={theme.colors.buttonText} /> : <Text style={localstyles.buttonText}>{t('auth:loginAction')}</Text>}
                    </TouchableOpacity>

                    {/* SYNC MODAL */}
                    <Modal visible={isSyncing} transparent animationType="slide">
                        <View style={localstyles.modalContainer}>
                            <View style={localstyles.modalContent}>
                                <Text style={localstyles.syncTitle}>Initializing Workspace</Text>

                                {!syncComplete && <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginBottom: 15 }} />}

                                <ScrollView style={localstyles.syncScroll}>
                                    <Text style={localstyles.syncText}>{syncStatus}</Text>
                                </ScrollView>x

                                {syncComplete ? (
                                    <TouchableOpacity style={localstyles.button} onPress={finalizeLogin}>
                                        <Text style={localstyles.buttonText}>Finish Setup</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity style={localstyles.skipButton} onPress={finalizeLogin}>
                                        <Text style={localstyles.skipText}>Skip Sync for Now</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </Modal>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
};

export default LoginScreen;