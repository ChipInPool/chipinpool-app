import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme, ActivityIndicator, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const THEME_STORAGE_KEY = '@chipinpool_theme_mode';

export type ThemeMode = 'system' | 'light' | 'dark';

const lightColors = {
  navy: '#F8F9FA',
  navyLight: '#FFFFFF',
  mint: '#00A878',
  mintDark: '#008B63',
  slate: '#6B7280',
  white: '#1F2937',
  text: '#1F2937',
  textSecondary: '#6B7280',
  background: '#F8F9FA',
  card: 'rgba(0,0,0,0.04)',
  cardBorder: 'rgba(0,0,0,0.08)',
  inputBg: 'rgba(0,0,0,0.04)',
  inputBorder: 'rgba(0,0,0,0.12)',
  tabBar: '#FFFFFF',
  tabBarBorder: 'rgba(0,0,0,0.1)',
  blue: '#4A90D9',
  yellow: '#F59E0B',
  purple: '#A78BFA',
  amber: '#F59E0B',
  red: '#EF4444',
  green: '#10B981',
  statusBar: 'dark' as 'light' | 'dark',
};

const darkColors = {
  navy: '#001F3F',
  navyLight: '#002A54',
  mint: '#7FFFD4',
  mintDark: '#5ECFA0',
  slate: '#708090',
  white: '#FFFFFF',
  text: '#FFFFFF',
  textSecondary: '#708090',
  background: '#001F3F',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.08)',
  inputBg: 'rgba(255,255,255,0.05)',
  inputBorder: 'rgba(255,255,255,0.1)',
  tabBar: '#001F3F',
  tabBarBorder: 'rgba(255,255,255,0.1)',
  blue: '#4A90D9',
  yellow: '#FBBF24',
  purple: '#A78BFA',
  amber: '#F59E0B',
  red: '#f87171',
  green: '#34D399',
  statusBar: 'light' as 'light' | 'dark',
};

export type ThemeColors = typeof darkColors;

interface ThemeContextType {
  colors: ThemeColors;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: darkColors,
  isDark: true,
  themeMode: 'system',
  setThemeMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(THEME_STORAGE_KEY)
      .then((stored: string | null) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setThemeModeState(stored);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoaded(true);
      });
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    SecureStore.setItemAsync(THEME_STORAGE_KEY, mode).catch(() => {});
  }, []);

  const isDark = themeMode === 'system'
    ? systemColorScheme !== 'light'
    : themeMode === 'dark';

  const colors = isDark ? darkColors : lightColors;

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#001F3F' }}>
        <ActivityIndicator size="large" color="#7FFFD4" />
      </View>
    );
  }

  return (
    <ThemeContext.Provider value={{ colors, isDark, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
