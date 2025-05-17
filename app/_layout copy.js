import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/authStore';

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



export default function FormLayout() {

  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    // Navigate based on auth state after layout mounts
    console.log('Layout - User:', user);
    const initialRoute = user ? '/Tabs' : '/start';
    router.replace(initialRoute);
  }, [user]);


  return (
    <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="start" />
          <Stack.Screen name="Tabs" />
          <Stack.Screen
            name="Form"
            options={{
              presentation: 'modal',
              animation: 'slide_from_right',
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="Project"
            options={{
              presentation: 'modal',
              animation: 'slide_from_right',
              gestureEnabled: true,
            }}
          />
          <Stack.Screen name="Data"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
              gestureEnabled: false,
            }} />
        </Stack>

        <ThemedStatusBar />
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}