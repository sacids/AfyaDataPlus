import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as LocalAuthentication from 'expo-local-authentication';
import { Redirect, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const AuthScreen = ({ onAuthenticated }) => {
  const { colors } = useTheme();
  const [error, setError] = useState('');

  const handleDeviceAuth = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        setError('Device security not available. Please set up a PIN, fingerprint, or Face ID.');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access AfyaData',
        fallbackLabel: 'Use Device PIN',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setError('');
        onAuthenticated();
      } else {
        setError('Authentication failed. Please try again.');
      }
    } catch (err) {
      console.error('Device authentication error:', err);
      setError('Error during authentication. Please try again.');
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <Image
        source={require('../../assets/images/AfyaDataLogo.png')}
        style={{ width: 120, height: 120, contentFit: 'contain', marginBottom: 80 }}
      />
      <Text style={{ fontSize: 14, color: colors.text, marginBottom: 30, textAlign: 'center', paddingHorizontal: 20 }}>
        Authenticate with Device PIN, Fingerprint, or Face ID
      </Text>
      {error ? <Text style={{ color: 'red', marginBottom: 16, textAlign: 'center', paddingHorizontal: 20 }}>{error}</Text> : null}
      <TouchableOpacity style={{ alignItems: 'center' }} onPress={handleDeviceAuth}>
        <Ionicons name="finger-print-sharp" size={60} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
};

export default function ProtectedLayout() {
  const { authState } = useAuth();
  const { colors } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isDeviceSecurityEnrolled, setIsDeviceSecurityEnrolled] = useState(false);

  useEffect(() => {
    async function checkDeviceSecurity() {
      try {
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setIsDeviceSecurityEnrolled(isEnrolled);
        setIsChecking(false);
      } catch (error) {
        console.error('Error checking device security:', error);
        setIsDeviceSecurityEnrolled(false);
        setIsChecking(false);
      }
    }
    checkDeviceSecurity();
  }, []);

  // Redirect to auth if not authenticated
  if (!authState) {
    return <Redirect href="/(auth)" />;
  }

  if (isChecking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isDeviceSecurityEnrolled && !isAuthenticated) {
    return <AuthScreen onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" />
    </Stack>
  );
}