import React from 'react';
import { ThemeProvider } from '../theme/ThemeContext';
import { GridAppearanceProvider } from '../theme/GridAppearanceContext';

export function AllThemeProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <GridAppearanceProvider>{children}</GridAppearanceProvider>
    </ThemeProvider>
  );
}
