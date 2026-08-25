/**
 * NativeStreamDeck
 * @format
 */

import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, DarkTheme, Theme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/auth/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { GlassBackground } from './src/theme/GlassBackground';
import { color } from './src/theme/glass';

const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: color.accent,
    background: 'transparent',
    card: 'transparent',
    text: color.textPrimary,
    border: color.panelBorder,
    notification: color.danger,
  },
};

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <GlassBackground>
          <AuthProvider>
            <StatusBar barStyle="light-content" />
            <NavigationContainer theme={navigationTheme}>
              <RootNavigator />
            </NavigationContainer>
          </AuthProvider>
        </GlassBackground>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
