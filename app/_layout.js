// app/_layout.js
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




// Sentry Initialization
Sentry.init({
  dsn: 'https://353d41653058700282e0748a68a61793@o4511093529575424.ingest.de.sentry.io/4511093544714320',
  sendDefaultPii: true,
  enableLogs: true,
});


const ThemedStatusBar = () => {
  const { isDark } = useTheme();
  return (
    <StatusBar
      translucent
      backgroundColor="transparent"
      style={isDark ? 'light' : 'dark'}
    />
  );
};

const SplashScreen = () => {
  const theme = useTheme();
  const { colors } = theme;
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
    </View>
  );
};


export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [i18nInstance, setI18nInstance] = useState(null);

  const router = useRouter();
  const segments = useSegments();

  // Auth Store: Hydrates the 'user' (Passport) from SecureStore
  const { user, isLoading, checkSession } = useAuthStore();

  // 1. System initialization (DB, i18n, and Auth State)
  useEffect(() => {
    const prepare = async () => {
      try {
        // Initialize SQLite
        await createTables();


        // Initialize language directories
        await LanguageManager.initializeDirectories();

        // Load i18n
        const { default: i18n } = await import('../i18n/index');
        setI18nInstance(i18n);

        // Hydrate the store from persistence
        // await checkSession();
      } catch (e) {
        console.warn("Initialization error", e);
      } finally {
        setIsReady(true);
      }
    };
    prepare();
  }, []);

  // 2. Navigation Guard Logic
  useEffect(() => {
    // Prevent navigation if the system isn't ready or still hydrating
    if (!isReady || isLoading || !i18nInstance) return;

    const performNavigation = async () => {
      const inAppGroup = segments[0] === '(app)';
      const inAuthGroup = segments[0] === '(auth)';

      // Validate the local "Passport" (Identity)
      const hasProfile = user && user.globalUsername && user.deviceId;
      console.log('hasprofile', hasProfile)

      // Check for onboarding completion flag
      const hasCompletedOnboarding = await SecureStore.getItemAsync('onboarding_completed');
      console.log('hasCompletedOnboarding', hasCompletedOnboarding)

      if (!hasCompletedOnboarding) {
        // Scenario: Fresh install or total reset -> Onboarding
        if (segments.length > 0 && segments[0] !== '') {
          router.replace('/');
        }
      }
      else if (!hasProfile) {
        // Scenario: Onboarded but no identity -> Register/Profile creation
        if (!inAuthGroup) {
          router.replace('/(auth)/register');
        }
      }
      else {
        // Scenario: Identity exists -> Main App
        if (!inAppGroup) {
          router.replace('/(app)/Main');
        }
      }
    };

    performNavigation();
  }, [isReady, isLoading, user, segments]);

  // Show custom splash until resources are ready
  if (!isReady || isLoading || !i18nInstance) {
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
    <I18nextProvider i18n={i18nInstance}>
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