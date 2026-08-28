import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from '../theme/ThemeContext';
import { GridAppearanceProvider } from '../theme/GridAppearanceContext';

// Mirrors App.tsx's real provider tree, which wraps everything in
// GestureHandlerRootView — without it, any component using GestureDetector
// (e.g. ColorPicker) throws "GestureDetector must be used as a descendant of
// GestureHandlerRootView" when rendered in tests.
export function AllThemeProviders({ children }: { children: React.ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <GridAppearanceProvider>{children}</GridAppearanceProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
