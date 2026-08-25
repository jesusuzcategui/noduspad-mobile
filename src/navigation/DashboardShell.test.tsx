import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { DashboardShell } from './DashboardShell';

// @react-navigation/drawer pulls in react-native-drawer-layout -> react-native-reanimated
// -> react-native-worklets, which requires the real native worklets runtime and cannot
// initialize under Jest. DashboardShell only needs createDrawerNavigator to produce a
// Navigator/Screen pair that registers routes and honors screenOptions, so we substitute
// the already-Jest-safe native-stack navigator (see PlaceholderScreen.test.tsx) for the
// drawer implementation in tests, while production code still uses the real drawer.
jest.mock('@react-navigation/drawer', () => {
  const { createNativeStackNavigator } = jest.requireActual('@react-navigation/native-stack');
  return {
    createDrawerNavigator: () => {
      const Stack = createNativeStackNavigator();
      return { Navigator: Stack.Navigator, Screen: Stack.Screen };
    },
  };
});

jest.mock('./useBreakpoint', () => ({
  useDashboardLayout: jest.fn(),
}));

import { useDashboardLayout } from './useBreakpoint';

describe('DashboardShell', () => {
  it('shows the AppBar when layout is appbar', async () => {
    (useDashboardLayout as jest.Mock).mockReturnValue('appbar');
    await render(
      <NavigationContainer>
        <DashboardShell />
      </NavigationContainer>,
    );
    expect(screen.getByTestId('appbar-Home')).toBeTruthy();
  });

  it('hides the AppBar when layout is drawer', async () => {
    (useDashboardLayout as jest.Mock).mockReturnValue('drawer');
    await render(
      <NavigationContainer>
        <DashboardShell />
      </NavigationContainer>,
    );
    expect(screen.queryByTestId('appbar-Home')).toBeNull();
  });

  it('renders the Home screen by default', async () => {
    (useDashboardLayout as jest.Mock).mockReturnValue('appbar');
    await render(
      <NavigationContainer>
        <DashboardShell />
      </NavigationContainer>,
    );
    // 'Home' also appears as the AppBar tab label in this layout, so assert on the
    // screen's own content (PlaceholderScreen's testID) rather than the ambiguous text.
    expect(screen.getByTestId('placeholder-title').props.children).toBe('Home');
  });
});
