import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as LocalAuthentication from 'expo-local-authentication';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/authStore';

const AuthScreen = ({ onAuthenticated }) => {
  const { colors } = useTheme();
  const [error, setError] = useState('');

  const handleDeviceAuth = useCallback(async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        onAuthenticated();
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access AfyaData',
        fallbackLabel: 'Use Device PIN',
      });

      if (result.success) {
        setError('');
        onAuthenticated();
      } else {
        setError('Authentication failed. Please try again.');
      }
    } catch (err) {
      console.error('Device authentication error:', err);
      setError('Error during authentication.');
    }
  }, [onAuthenticated]);

  // Auto-trigger biometric prompt on mount
  useEffect(() => {
    handleDeviceAuth();
  }, [handleDeviceAuth]);

  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <Image
        source={require('../../assets/images/AfyaDataLogo.png')}
        style={styles.logo}
      />
      <Text style={[styles.instruction, { color: colors.text }]}>
        Authenticate with Device PIN, Fingerprint, or Face ID
      </Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <TouchableOpacity style={styles.biometricBtn} onPress={handleDeviceAuth}>
        <Ionicons name="finger-print-sharp" size={60} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}; // Fixed: Properly closing the component here

export default function ProtectedLayout() {
  const { colors } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkDeviceSecurity() {
      try {
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (!isEnrolled) {
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Error checking device security:', error);
        setIsAuthenticated(true);
      } finally {
        setIsChecking(false);
      }
    }
    checkDeviceSecurity();
  }, []);

  if (isChecking) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" />
      <Stack.Screen name="Project" />
      <Stack.Screen name="Form" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logo: { width: 120, height: 120, contentFit: 'contain', marginBottom: 80 },
  instruction: { fontSize: 14, marginBottom: 30, textAlign: 'center', paddingHorizontal: 40 },
  errorText: { color: '#FF6B6B', marginBottom: 16, textAlign: 'center', paddingHorizontal: 20 },
  biometricBtn: { alignItems: 'center', padding: 20 }
});