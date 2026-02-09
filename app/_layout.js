// app/_layout.js
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import LanguageManager from '../i18n/languageManager';
import { createTables } from '../utils/database';

const ThemedStatusBar = () => {
  const { colors, isDark } = useTheme();
  return (
    <StatusBar
      translucent
      backgroundColor="transparent"
      style={isDark ? 'light' : 'dark'}
    />
  );
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
  const [isLoading, setIsLoading] = useState(true);
  const [i18nInstance, setI18nInstance] = useState(null);

  useEffect(() => {
    async function initialize() {
      try {
        // 1. Initialize database tables
        await createTables();

        // 2. Initialize language directories
        await LanguageManager.initializeDirectories();

        // 3. Verify languages were loaded
        const availableLanguages = await LanguageManager.fetchDownloadedLanguages();
        console.log(`Loaded ${availableLanguages.length} languages:`,
          availableLanguages.map(l => l.code).join(', '));

      } catch (error) {
        console.error('Initialization error:', error);
        // Log error but continue
      }
    }

    // Load i18n independently (always happens)
    async function loadI18n() {
      const { default: i18n } = await import('../i18n/index');
      setI18nInstance(i18n);
      setIsLoading(false);
    }

    initialize();
    loadI18n();
  }, []);

  if (isLoading || !i18nInstance) {
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
      <AuthProvider>
        <ThemeProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemedStatusBar />
            <Slot />
          </GestureHandlerRootView>
        </ThemeProvider>
      </AuthProvider>
    </I18nextProvider>
  );
}