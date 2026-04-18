import * as Device from 'expo-device';
import { router } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
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
  const { t } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [submissionError, setSubmissionError] = useState('');

  const insets = useSafeAreaInsets();
  const { setUser } = useAuthStore();
  const theme = useTheme();

  // Validation Logic
  const isValidFullName = (name) => /^[A-Za-z\s]+$/.test(name.trim()) && name.trim().length > 0;
  const isValidPhone = phoneNumber.trim().length >= 10;
  const isValidPassword = password.length >= 6;
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const isFormValid = useMemo(() => 
    isValidFullName(fullName) && isValidPhone && isValidPassword && passwordsMatch,
    [fullName, phoneNumber, password, confirmPassword]
  );

  const handleRegister = async () => {
    setLoading(true);
    setSubmissionError('');

    try {
      // Logic aligns with Device ID priority
      const globalUsername = getGlobalUsername(phoneNumber);

      const userProfile = {
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        password, 
        globalUsername,
        deviceId: Device.osBuildId || 'unknown_device',
        registeredLocally: true,
      };

      await setUser(userProfile);
      router.replace('/(app)/Main');
    } catch (err) {
      setSubmissionError(t('auth:errorSavingProfile'));
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: { 
      flexGrow: 1, 
      backgroundColor: theme.colors.background, 
      padding: 20, 
      justifyContent: 'center', 
      alignItems: 'center' 
    },
    input: {
      backgroundColor: theme.colors.inputBackground,
      borderColor: theme.colors.inputBorder,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      color: theme.colors.text,
      width: '100%',
    },
    helperText: {
      alignSelf: 'flex-start',
      color: theme.colors.error,
      fontSize: 12,
      marginBottom: 10,
      marginTop: -8,
    },
    button: {
      backgroundColor: isFormValid ? theme.colors.buttonBackground : theme.colors.inputBorder,
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
      width: '100%',
      marginTop: 10,
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
          {fullName.length > 0 && !isValidFullName(fullName) && (
            <Text style={styles.helperText}>{t('auth:nameError')}</Text>
          )}
          
          <TextInput
            style={styles.input}
            placeholder={t('auth:phonePlaceholder')}
            keyboardType="phone-pad"
            placeholderTextColor={theme.colors.secText}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
          {phoneNumber.length > 0 && !isValidPhone && (
            <Text style={styles.helperText}>{t('auth:phoneError')}</Text>
          )}

          <TextInput
            style={styles.input}
            placeholder={t('auth:passwordPlaceholder')}
            placeholderTextColor={theme.colors.secText}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {password.length > 0 && !isValidPassword && (
            <Text style={styles.helperText}>{t('auth:passError')}</Text>
          )}

          <TextInput
            style={styles.input}
            placeholder={t('auth:confirmPasswordPlaceholder')}
            placeholderTextColor={theme.colors.secText}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          {confirmPassword.length > 0 && !passwordsMatch && (
            <Text style={styles.helperText}>{t('auth:matchError')}</Text>
          )}

          {submissionError ? <Text style={styles.errorText}>{submissionError}</Text> : null}

          <TouchableOpacity 
            style={styles.button} 
            onPress={handleRegister} 
            disabled={!isFormValid || loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.buttonText} />
            ) : (
              <Text style={styles.buttonText}>{t('auth:registerAction')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default RegisterScreen;