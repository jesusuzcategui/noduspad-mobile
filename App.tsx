/**
 * NativeStreamDeck
 * @format
 */

import 'react-native-gesture-handler';
import React, { useMemo } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, DarkTheme, DefaultTheme, Theme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/auth/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { GlassBackground } from './src/theme/GlassBackground';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { GridAppearanceProvider } from './src/theme/GridAppearanceContext';

function AppShell() {
  const { scheme, colors } = useTheme();

  const navigationTheme: Theme = useMemo(() => {
    const base = scheme === 'light' ? DefaultTheme : DarkTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.accent,
        background: 'transparent',
        card: 'transparent',
        text: colors.textPrimary,
        border: colors.panelBorder,
        notification: colors.danger,
      },
    };
  }, [scheme, colors]);

  return (
    <GlassBackground>
      <AuthProvider>
        <StatusBar barStyle={scheme === 'light' ? 'dark-content' : 'light-content'} />
        <NavigationContainer theme={navigationTheme}>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </GlassBackground>
  );
}

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <GridAppearanceProvider>
            <AppShell />
          </GridAppearanceProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
