import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next'; // Added
import { ActivityIndicator, Image, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import api from '../../api/axiosInstance';
import { config } from '../../constants/config';
import { getStyles } from '../../constants/styles';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/authStore';

const logo = require('../../assets/images/AfyaDataLogo.png');

const LoginScreen = () => {
    const { t } = useTranslation(); // Added
    const { setUser } = useAuthStore();
    const { colors } = useTheme();

    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isFormValid, setIsFormValid] = useState(false);
    const theme = useTheme();
    const styles = getStyles(theme);

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

            // 1. Save tokens for the current session
            await SecureStore.setItemAsync(config.TOKEN_KEY, JSON.stringify(authData));

            // 2. Save raw credentials for AuthStore/Axios Interceptor auto-login
            // These keys ('username' and 'password') match your authStore.logout logic


            await SecureStore.setItemAsync('saved_username', phoneNumber);
            await SecureStore.setItemAsync('saved_password', password);

            // 3. Update Global States
            setUser(user);

            // 4. Navigate
            router.replace('/(app)/Main');

        } catch (err) {
            console.error('Login error:', err);
            setError(t('auth:invalidCredentials'));
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        const isValid =
            phoneNumber.trim().length >= 10 &&
            password.length >= 6
        setIsFormValid(isValid);
    }, [phoneNumber, password]);



    const localstyles = StyleSheet.create({
        container: { flexGrow: 1, backgroundColor: theme.colors.background, padding: 20, justifyContent: 'center', alignItems: 'center' },
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
        errorText: { color: theme.colors.error, marginBottom: 16, textAlign: 'center' },
    });

    return (

        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, backgroundColor: theme.colors.background }}
        >
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

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <TouchableOpacity style={localstyles.button} onPress={handleLogin} disabled={loading}>
                        {loading ? <ActivityIndicator color={theme.colors.buttonText} /> : <Text style={localstyles.buttonText}>{t('auth:loginAction')}</Text>}
                    </TouchableOpacity>
                </View>

            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
};

export default LoginScreen;