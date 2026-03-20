// app/_layout.js
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useRef } from 'react';
import { I18nextProvider } from 'react-i18next';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import LanguageManager from '../i18n/languageManager';
import { useAuthStore } from '../store/authStore';
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

// Main layout component
export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [i18nInstance, setI18nInstance] = useState(null);
  const { checkSession, user } = useAuthStore();
  const initialized = useRef(false);
  const navigationPerformed = useRef(false);
  const router = useRouter();
  const segments = useSegments();

  // Initialize app resources
  useEffect(() => {
    if (initialized.current) return;
    
    async function initialize() {
      try {
        initialized.current = true;
        
        // Initialize database tables
        await createTables();

        // Initialize language directories
        await LanguageManager.initializeDirectories();

        // Load i18n
        const { default: i18n } = await import('../i18n/index');
        setI18nInstance(i18n);

        // Check session silently
        await checkSession();

      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setIsReady(true);
      }
    }

    initialize();
  }, []);

  // Handle navigation after everything is initialized
  useEffect(() => {
    const performNavigation = async () => {
      // Only proceed if resources are ready and navigation hasn't been performed
      if (!isReady || !i18nInstance || navigationPerformed.current) return;
      
      try {
        const onboardingCompleted = await SecureStore.getItemAsync('onboarding_completed');
        //console.log('onboarding status:', onboardingCompleted);

        const inAuthGroup = segments[0] === '(auth)';
        const currentRoute = segments[1];

        navigationPerformed.current = true;

        // First install - no onboarding completed
        if (!onboardingCompleted) {
          if (!inAuthGroup || currentRoute !== 'index') {
            console.log('Navigating to onboarding');
            // Use setTimeout to ensure navigation happens after render
            setTimeout(() => {
              router.replace('/(auth)');
            }, 0);
          }
        }
        // User not logged in
        else if (!user) {
          if (!inAuthGroup) {
            console.log('Navigating to login');
            setTimeout(() => {
              router.replace('/(auth)/login');
            }, 0);
          } else if (currentRoute === 'index') {
            console.log('Navigating from index to login');
            setTimeout(() => {
              router.replace('/(auth)/login');
            }, 0);
          }
        }
        // User logged in
        else {
          if (inAuthGroup) {
            console.log('Navigating to main app');
            setTimeout(() => {
              router.replace('/(app)/Main');
            }, 0);
          }
        }
      } catch (error) {
        console.error('Navigation error:', error);
      }
    };

    performNavigation();
  }, [isReady, i18nInstance, user]); // Add dependencies

  // Don't render anything until resources are ready
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

  // Once everything is ready, render the app
  return (
    <I18nextProvider i18n={i18nInstance}>
      <ThemeProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ThemedStatusBar />
          <Slot />
        </GestureHandlerRootView>
      </ThemeProvider>
    </I18nextProvider>
  );
}