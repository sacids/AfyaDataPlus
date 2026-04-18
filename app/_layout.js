// app/_layout.js - Updated with production logging
import * as Sentry from '@sentry/react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ErrorBoundary from '../components/ErrorBoundary';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import LanguageManager from '../i18n/languageManager';
import { useAuthStore } from '../store/authStore';
import { createTables } from '../utils/database';
import i18n from '../i18n/index';


Sentry.init({
  dsn: 'https://353d41653058700282e0748a68a61793@o4511093529575424.ingest.de.sentry.io/4511093544714320',
  sendDefaultPii: true,
  enableLogs: true,
});

const ThemedStatusBar = () => {
  const { isDark } = useTheme();
  return (
    <StatusBar
      style={isDark ? 'light' : 'dark'}
    />
  );
};

const SplashScreen = () => {
  const theme = useTheme();
  const { colors } = theme;
  const { isLoading } = useAuthStore();


  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Image
        source={require('../assets/images/AfyaDataLogo.png')}
        style={{ width: 120, height: 120, resizeMode: 'contain', marginVertical: 20 }}
      />
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text, marginTop: 20, textAlign: 'center' }}>
        Afyadata
      </Text>
      <Text style={{ fontSize: 16, color: colors.secText, textAlign: 'center', paddingHorizontal: 20, marginTop: 10 }}>
        Taarifa kwa Wakati
      </Text>
      {/* Debug info - remove after fixing */}
      <View style={{ marginTop: 50, padding: 10, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 5 }}>
        <Text style={{ fontSize: 12, color: colors.secText }}>
          Status: {isLoading ? 'Loading...' : 'Ready'}
        </Text>
      </View>
    </View>
  );
};

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState(null);

  const router = useRouter();
  const segments = useSegments();

  const { user, isLoading, setLoadingComplete } = useAuthStore();


  // 1. System initialization
  useEffect(() => {

    const prepare = async () => {
      try {
        await createTables();
        await LanguageManager.initializeDirectories();
        setTimeout(() => {
          useAuthStore.getState().finishLoading();
        }, 100);

      } catch (e) {
        console.error('Init error details:', e);
        setInitError(e);
      } finally {
        setIsReady(true);
      }
    };

    prepare();

    // Safety timeout
    const timeout = setTimeout(() => {
      if (!isReady) {
        console.log('WARNING: Initialization taking too long, forcing ready');
        setIsReady(true);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  // 2. Navigation Guard Logic with detailed logging
  useEffect(() => {

    if (!isReady || isLoading) {
      return;
    }

    const performNavigation = async () => {
      try {

        const hasCompletedOnboarding = await SecureStore.getItemAsync('onboarding_completed');

        const hasProfile = user && user.globalUsername && user.deviceId;

        if (!hasCompletedOnboarding) {
          if (segments[0] !== '' && segments[0] !== 'onboarding') {
            router.replace('/');
          } 
        }
        else if (!hasProfile) {
          if (segments[0] !== '(auth)') {
            router.replace('/(auth)/register');
          } 
        }
        else {
          if (segments[0] !== '(app)') {
            router.replace('/(app)/Main');
          } 
        }
      } catch (error) {
        console.error('Navigation error details:', error);
      }
    };

    performNavigation();
  }, [isReady, isLoading, user, segments]);

  // Show splash until ready
  if (!isReady || isLoading) {
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
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ThemedStatusBar />
          <ErrorBoundary>
            <Slot />
          </ErrorBoundary>
        </GestureHandlerRootView>
      </ThemeProvider>
    </I18nextProvider>
  );
}