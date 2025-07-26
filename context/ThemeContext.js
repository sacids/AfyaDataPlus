import React, { createContext, useContext, useMemo } from 'react';
import { useThemeStore } from '../store/ThemeStore';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const { mode, systemMode } = useThemeStore();

  const theme = useMemo(() => {
    const isDark = mode === 'system' ? systemMode === 'dark' : mode === 'dark';

    return {
      isDark,
      colors: {
        background: isDark ? '#121212' : '#fefefe',
        text: isDark ? '#ffffff' : '#000000',
        secText: isDark ? '#ddd' : '#222',
        label: isDark ? '#cccccc' : '#333333',
        inputBackground: isDark ? '#1e1e1e' : '#ededed',
        inputBorder: isDark ? '#555555' : '#cccccc',
        buttonBackground: isDark ? '#a72626' : '#a72626',
        secButtonBackground: isDark ? '#e26e26' : '#e26e26',
        buttonText: '#ffffff',
        error: isDark ? '#ff5555' : '#ff0000',
        primary: isDark ? '#a72626' : '#a72626',
        checkbox: isDark ? '#bb86fc' : '#a72626',
        tabBarActiveTintColor: isDark ? '#a72626' : '#a72626',
        tabBarInactiveTintColor: isDark ? '#999999' : '#666666',
        tagBackground: isDark ? '#1e1e1e' : '#f2f2f2',
        tagText: isDark ? '#d4d4d4' : '#999999',
        //tabBarActiveTintColor: isDark ? '#ab0836' : '#007bff',
      },
    };
  }, [mode, systemMode]);

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};