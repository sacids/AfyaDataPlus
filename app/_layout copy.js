// app/_layout.js
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import LanguageManager from '../i18n/languageManager';
import { useAuthStore } from '../store/authStore'; // Import your Zustand store
import { createTables } from '../utils/database';

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

// This component handles the redirection logic previously managed by AuthProvider
const AuthGuard = ({ children }) => {
  const { user } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';

    if (!user) {
      // If no user is logged in and they aren't in auth/onboarding, send to onboarding
      if (!inAuthGroup && !inOnboarding) {
        router.replace('/(auth)');
      }
    } else if (user && (inAuthGroup || inOnboarding)) {
      // If user is logged in but hits auth/onboarding pages, send to the app
      router.replace('/(app)/Main');
    }
  }, [user, segments]);

  return children;
};


const SplashScreen = () => {
  const { colors } = useTheme();
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

  useEffect(() => {
    async function initialize() {
      try {
        // 1. Initialize database tables
        await createTables();

        // 2. Initialize language directories
        await LanguageManager.initializeDirectories();

        // 3. Load i18n
        const { default: i18n } = await import('../i18n/index');
        setI18nInstance(i18n);

      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setIsReady(true);
      }
    }

    initialize();
  }, []);

  if (!isReady || !i18nInstance) {
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
          <AuthGuard>
            <ThemedStatusBar />
            <Slot />
          </AuthGuard>
        </GestureHandlerRootView>
      </ThemeProvider>
    </I18nextProvider>
  );
}