import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { createTables } from '../utils/database';

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initialize() {
      try {
        await createTables();
        
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, []); // Empty dependency array to run only once on mount

  //console.log('app.layout')
  
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
    <AuthProvider>
      <ThemeProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ThemedStatusBar />
          <Slot />
        </GestureHandlerRootView>
      </ThemeProvider>
    </AuthProvider>
);

}