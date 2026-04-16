import * as Device from 'expo-device';
import { router } from 'expo-router';
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
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { getGlobalUsername } from '../../utils/deviceUtils';


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


  const isValidFullName = (name) => {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) return false;
    // Only allow letters (both cases) and spaces
    const nameRegex = /^[A-Za-z\s]+$/;
    return nameRegex.test(trimmedName);
  };
  useEffect(() => {
    const isValid =
      isValidFullName(fullName) &&
      phoneNumber.trim().length >= 10 &&
      password.length >= 6 &&
      password === confirmPassword;
    setIsFormValid(isValid);

    return () => {
      // Optional cleanup when the screen loses focus
    };
  }, [fullName, phoneNumber, password, confirmPassword]);


  const handleRegister = async () => {
    setLoading(true);
    setError('');


    try {
      // 1. Generate Global Username (Username + Device ID suffix)
      const globalUsername = getGlobalUsername(phoneNumber)

      // 2. Create the Profile Object (The "Passport")
      const userProfile = {
        fullName,
        phoneNumber,
        password, // Saved locally to auto-register on new instances
        globalUsername,
        deviceId: Device.osBuildId,
        registeredLocally: true,
      };

      // 3. Save locally to Zustand (which persists to SecureStore)
      await setUser(userProfile);

      // 4. Navigate to the main app / discovery page
      router.replace('/(app)/Main');

    } catch (err) {
      setError('Failed to save profile locally.');
    } finally {
      setLoading(false);
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