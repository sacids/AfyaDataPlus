import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

export const useThemeStore = create(
  persist(
    (set, get) => ({
      mode: 'system', // 'light', 'dark', or 'system'
      systemMode: Appearance.getColorScheme() || 'light',
      toggleMode: (newMode) => set({ mode: newMode }),
      updateSystemMode: (systemMode) => set({ systemMode }),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Sync with system theme changes
Appearance.addChangeListener(({ colorScheme }) => {
  useThemeStore.getState().updateSystemMode(colorScheme || 'light');
});