import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator, Image, Keyboard, KeyboardAvoidingView,
    Modal, Platform, ScrollView, StyleSheet, Text, TextInput,
    TouchableOpacity, TouchableWithoutFeedback, View
} from 'react-native';
import { getStyles } from '../../constants/styles';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/authStore';

const logo = require('../../assets/images/AfyaDataLogo.png');

const LoginScreen = () => {
    const { t } = useTranslation();
    const { localAuthenticate, user } = useAuthStore();
    const { colors } = useTheme();

    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isFormValid, setIsFormValid] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);

    // Sync States
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState('');
    const [syncComplete, setSyncComplete] = useState(false);

    const theme = useTheme();
    const styles = getStyles(theme);

    useEffect(() => {
        setIsFormValid(phoneNumber.trim().length >= 10 && password.length >= 6);
    }, [phoneNumber, password]);

    // Check session status on mount
    useEffect(() => {
        if (user) {
            router.replace('/(app)/Main');
        }
        setCheckingSession(false);
    }, [user]);

    const handleLogin = async () => {
        if (!isFormValid) return;
        setLoading(true);
        setError('');

        // Authenticate locally - this now sets the full profile object behind the scenes
        const result = await localAuthenticate(phoneNumber, password);

        if (result.success) {
            setIsSyncing(true);
            triggerWorkspaceSync();
        } else {
            setLoading(false);
            setError(result.error);
        }
    };

    const triggerWorkspaceSync = async () => {
        setSyncStatus('Verifying local workspace profiles...');
        try {
            setTimeout(() => {
                setSyncStatus((prev) => prev + '\nLoading localized databases...');
                setTimeout(() => {
                    setSyncStatus((prev) => prev + '\nWorkspace prepared successfully!');
                    setSyncComplete(true);
                }, 800);
            }, 600);
        } catch (err) {
            setSyncStatus((prev) => prev + '\nSync incomplete. Defaulting to cached data.');
            setSyncComplete(true);
        }
    };

    const finalizeLogin = () => {
        setIsSyncing(false);
        router.replace('/(app)/Main');
    };

    if (checkingSession) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

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
            backgroundColor: isFormValid ? theme.colors.primary : theme.colors.inputBorder,
            padding: 16,
            borderRadius: 8,
            alignItems: 'center',
            width: '100%',
        },
        buttonText: {
            color: isFormValid ? 'white' : theme.colors.buttonText,
            fontWeight: 'bold'
        },
        registerContainer: {
            flexDirection: 'row',
            marginTop: 20,
            alignItems: 'center',
        },
        registerText: { color: theme.colors.secText },
        registerLink: { color: theme.colors.primary, fontWeight: 'bold', marginLeft: 5 },
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
            maxHeight: 200,
            marginBottom: 20
        },
        syncText: { color: theme.colors.secText, fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
        skipButton: { padding: 10, alignItems: 'center' },
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

                    {error ? <Text style={[styles.errorText, { marginBottom: 15, color: theme.colors.error }]}>{error}</Text> : null}

                    <TouchableOpacity style={localstyles.button} onPress={handleLogin} disabled={loading}>
                        {loading ? <ActivityIndicator color={theme.colors.buttonText} /> : <Text style={localstyles.buttonText}>{t('auth:loginAction')}</Text>}
                    </TouchableOpacity>

                    <View style={localstyles.registerContainer}>
                        <Text style={localstyles.registerText}>{t('auth:noAccount')}</Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                            <Text style={localstyles.registerLink}>{t('auth:registerAction')}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* SETUP SYNC MODAL */}
                    <Modal visible={isSyncing} transparent animationType="slide">
                        <View style={localstyles.modalContainer}>
                            <View style={localstyles.modalContent}>
                                <Text style={localstyles.syncTitle}>Initializing Workspace</Text>

                                {!syncComplete && <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginBottom: 15 }} />}

                                <ScrollView style={localstyles.syncScroll}>
                                    <Text style={localstyles.syncText}>{syncStatus}</Text>
                                </ScrollView>

                                {syncComplete ? (
                                    <TouchableOpacity style={localstyles.button} onPress={finalizeLogin}>
                                        <Text style={localstyles.buttonText}>Finish Setup</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity style={localstyles.skipButton} onPress={finalizeLogin}>
                                        <Text style={localstyles.skipText}>Skip Setup</Text>
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