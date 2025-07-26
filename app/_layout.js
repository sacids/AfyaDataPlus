import { router, Slot } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { config } from '../constants/config';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { createTables } from '../utils/database';
import { getDeviceId } from '../utils/deviceUtils';
import { generatePassword } from '../utils/passwordUtils';
const BASE_URL = config.BASE_URL;

// Component to handle StatusBar with theme
const ThemedStatusBar = () => {
  const theme = useTheme();
  return (
    <StatusBar
      translucent
      backgroundColor={theme.colors.background}
      style={theme.isDark ? 'light' : 'dark'}
    />
  );
};

async function getCredentials() {

  const username = getDeviceId();
  const password = await generatePassword(username);

  return {
    username,
    password
  };
}

const SplashScreen = () => {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
      }}
    >
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Image
        source={require('../assets/images/AfyaDataLogo.png')}
        style={{ width: 120, height: 120, resizeMode: 'contain' }}
      />
      <Text
        style={{
          fontSize: 24,
          fontWeight: 'bold',
          color: theme.colors.text,
          marginTop: 90,
          textAlign: 'center',
          marginBottom: 10,
        }}
      >
        Afyadata
      </Text>
      <Text
        style={{
          fontSize: 16,
          color: theme.colors.secText,
          textAlign: 'center',
          paddingHorizontal: 20,
        }}
      >
        Taarifa kwa Wakati
      </Text>
    </View>
  );
};


export default function FormLayout() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [initialRedirectDone, setInitialRedirectDone] = useState(false);
  const [isLoading, setIsLoading] = useState(true);



  useEffect(() => {
    async function initialize() {
      try {
        await createTables();

        if (!user) {
          const username = getDeviceId();
          const password = await generatePassword(username);

          const response = await fetch(BASE_URL + '/api/v1/token/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
          });
          console.log('login ',BASE_URL+'/api/v1/token/', username, password, response)
          if (!response.ok) {
            throw new Error(`Login failed: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();
          const { access, refresh, user: userData } = data;

          const accessToken = Array.isArray(access) ? access[0] : access;
          const refreshToken = Array.isArray(refresh) ? refresh[0] : refresh;

          await SecureStore.setItemAsync('accessToken', accessToken);
          await SecureStore.setItemAsync('refreshToken', refreshToken);
          await SecureStore.setItemAsync('username', username);
          await SecureStore.setItemAsync('password', password);

          setUser(userData); // this will update Zustand
        }
      } catch (error) {
        console.error('Initialize error:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    initialize();
  }, []);


  useEffect(() => {
    if (isLoading || initialRedirectDone) return;

    console.log('Layout - User:', user);

    const initialRoute = user ? '/Tabs' : '/start';
    router.replace(initialRoute);
    setInitialRedirectDone(true);

  }, [user, isLoading, initialRedirectDone]); // Only depend on user and initialRedirectDone

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
        <Slot />
        <ThemedStatusBar />
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}