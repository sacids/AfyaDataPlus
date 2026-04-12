import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  ActivityIndicator,
  Image, // Added
  Keyboard,
  KeyboardAvoidingView, // Added
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api/axiosInstance';
import { config } from '../../constants/config';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/authStore';


const logo = require('../../assets/images/AfyaDataLogo.png');

const RegisterScreen = () => {
  const { t } = useTranslation(); // Added
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const insets = useSafeAreaInsets();
  const { setUser } = useAuthStore();
  const theme = useTheme();

  useEffect(() => {
    const isValid =
      fullName.trim().length > 0 &&
      phoneNumber.trim().length >= 10 &&
      password.length >= 6 &&
      password === confirmPassword;
    setIsFormValid(isValid);

    return () => {
      // Optional cleanup when the screen loses focus
    };
  }, [fullName, phoneNumber, password, confirmPassword]);
  const handleRegister = async () => {
    try {
      setError('');

      // 1. API Request
      const response = await api.post('/api/v1/register', {
        fullName,
        username: phoneNumber,
        password: password,
        passwordConfirm: password,
        phoneNumber
      });

      console.log('registration response', JSON.stringify(response.data))


      // 3. Save Credentials for Auto-Login/Interceptors (Critical for your setup)
      console.log('saving username saved_username', phoneNumber)

      const { access, refresh, user } = response.data;
      const authData = { access, refresh, user };

      // 2. Save Session Tokenssss
      await SecureStore.setItemAsync(config.TOKEN_KEY, JSON.stringify(authData));
      await SecureStore.setItemAsync('saved_username', phoneNumber);
      await SecureStore.setItemAsync('saved_password', password);

      await SecureStore.setItemAsync('onboarding_completed', 'true');

      // 4. Update Zustand and Auth Context
      setUser(user);

      // 5. Navigate to Main App
      router.replace('/(app)/Main');

    } catch (err) {
      setLoading(false);
      console.error('Registration error:', err);

      // Handle Validation Errors from Response
      if (err.response && err.response.data && err.response.data.errors) {
        const serverErrors = err.response.data.errors;
        // Flatten the error object into a single string
        const errorMessages = Object.keys(serverErrors)
          .map(key => `${serverErrors[key].join(' ')}`)
          .join('\n');
        setError(errorMessages);
      } else if (err.response && err.response.data && err.response.data.error_msg) {
        setError(err.response.data.error_msg);
      } else {
        setError(t('auth:registrationFailed'));
      }
    }
  };



  const styles = StyleSheet.create({
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
        <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <Image source={logo} style={{ width: 120, height: 120, resizeMode: 'contain', marginBottom: 30 }} />

          <TextInput
            style={styles.input}
            placeholder={t('auth:fullNamePlaceholder')}
            value={fullName}
            placeholderTextColor={theme.colors.secText}
            onChangeText={setFullName}
          />
          <TextInput
            style={styles.input}
            placeholder={t('auth:phonePlaceholder')}
            keyboardType="phone-pad"
            placeholderTextColor={theme.colors.secText}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
          <TextInput
            style={styles.input}
            placeholder={t('auth:passwordPlaceholder')}
            placeholderTextColor={theme.colors.secText}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TextInput
            style={styles.input}
            placeholder={t('auth:confirmPasswordPlaceholder')}
            placeholderTextColor={theme.colors.secText}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={!isFormValid || loading}>
            {loading ? <ActivityIndicator color={theme.colors.buttonText} /> : <Text style={styles.buttonText}>{t('auth:registerAction')}</Text>}
          </TouchableOpacity>


        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default RegisterScreen;