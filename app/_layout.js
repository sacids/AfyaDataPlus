import { router, Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { createTables } from '../utils/database';

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
  const [initialRedirectDone, setInitialRedirectDone] = useState(false);

  useEffect(() => {
    async function initialize() {
      //await dropTables()
      await createTables();
    }
    initialize()
  }, [])

  useEffect(() => {

    if (initialRedirectDone) return;

    console.log('Layout - User:', user);
    const initialRoute = user ? '/Tabs' : '/start';

    setTimeout(() => {
      router.replace(initialRoute);
      setInitialRedirectDone(true);
    }, 0);
  }, [user]);


  return (
    <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Slot />
        <ThemedStatusBar />
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}