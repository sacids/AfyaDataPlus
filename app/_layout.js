import { Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import api from '../api/axiosInstance';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { createTables } from '../utils/database';
import { getDeviceId } from '../utils/deviceUtils';
import { generatePassword } from '../utils/passwordUtils';

const ThemedStatusBar = () => {
  const { colors, isDark } = useTheme();
  return (
    <StatusBar
      translucent
      backgroundColor={colors.background}
      style={isDark ? 'light' : 'dark'}
    />
  );
};

const SplashScreen = () => {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      <Image
        source={require('../assets/images/AfyaDataLogo.png')}
        style={{ width: 120, height: 120, resizeMode: 'contain' }}
      />
      <Text
        style={{
          fontSize: 24,
          fontWeight: 'bold',
          color: colors.text,
          marginTop: 20,
          textAlign: 'center',
        }}
      >
        Afyadata
      </Text>
      <Text
        style={{
          fontSize: 16,
          color: colors.secText,
          textAlign: 'center',
          paddingHorizontal: 20,
        }}
      >
        Taarifa kwa Wakati
      </Text>
    </View>
  );
};

export default function RootLayout() {
  const { user, setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initialize() {
      try {
        await createTables();
        const storedUser = await SecureStore.getItemAsync('user');
        const username = await SecureStore.getItemAsync('username');

        if (storedUser && username) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
          } catch (parseError) {
            console.error('Error parsing stored user:', parseError);
            setUser(null);
          }
        } else if (username) {
          await attemptAutoLogin();
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Initialization error:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    async function attemptAutoLogin() {
      try {
        const username = getDeviceId();
        const password = await generatePassword(username);

        const response = await api.post('/api/v1/token/', {
          username,
          password,
        });

        const { access, refresh, user: userData } = response.data;

        await SecureStore.setItemAsync('accessToken', access);
        await SecureStore.setItemAsync('refreshToken', refresh);
        await SecureStore.setItemAsync('username', username);
        await SecureStore.setItemAsync('password', password);
        await SecureStore.setItemAsync('user', JSON.stringify(userData));

        setUser(userData);
      } catch (error) {
        console.error('Auto-login failed:', error);
        setUser(null);
      }
    }

    initialize();
  }, []); // Empty dependency array to run only once on mount

  if (isLoading) {
    return (
      <ThemeProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SplashScreen />
          <ThemedStatusBar />
        </GestureHandlerRootView>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={!user}>
            <Stack.Screen name="(auth)/start" />
          </Stack.Protected>
          <Stack.Protected guard={!!user}>
            <Stack.Screen name="(app)" initialRouteName="Tabs/FormDataList" />
          </Stack.Protected>
        </Stack>
        <ThemedStatusBar />
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}