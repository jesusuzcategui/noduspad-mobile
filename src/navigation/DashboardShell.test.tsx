import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DashboardShell } from './DashboardShell';

// @react-navigation/drawer pulls in react-native-drawer-layout -> react-native-reanimated
// -> react-native-worklets, which requires the real native worklets runtime and cannot
// initialize under Jest. DashboardShell only needs createDrawerNavigator to produce a
// Navigator/Screen pair that registers routes and honors screenOptions, so we substitute
// the already-Jest-safe native-stack navigator (see PlaceholderScreen.test.tsx) for the
// drawer implementation in tests, while production code still uses the real drawer.
let capturedScreenOptions: any;

jest.mock('@react-navigation/drawer', () => {
  const { createNativeStackNavigator } = jest.requireActual('@react-navigation/native-stack');
  return {
    createDrawerNavigator: () => {
      const Stack = createNativeStackNavigator();
      const Navigator = (props: any) => {
        capturedScreenOptions = props.screenOptions;
        return <Stack.Navigator {...props} />;
      };
      return { Navigator, Screen: Stack.Screen };
    },
  };
});

jest.mock('./useBreakpoint', () => ({
  useDashboardLayout: jest.fn(),
}));

import { useDashboardLayout } from './useBreakpoint';

beforeEach(async () => {
  await AsyncStorage.clear();
});

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
    // Home now renders StreamDeckGrid with seeded categories.
    // Assert on the seeded category to verify HomeScreen (with real StreamDeckGrid)
    // is rendered, not a placeholder.
    await waitFor(() => {
      expect(screen.getByTestId('category-name-cat-obs')).toBeTruthy();
    });
  });

  it('configures the drawer as permanent and swipe-enabled when layout is drawer', async () => {
    (useDashboardLayout as jest.Mock).mockReturnValue('drawer');
    await render(
      <NavigationContainer>
        <DashboardShell />
      </NavigationContainer>,
    );
    expect(capturedScreenOptions.drawerType).toBe('permanent');
    expect(capturedScreenOptions.swipeEnabled).toBe(true);
    expect(capturedScreenOptions.drawerStyle).toBeUndefined();
  });

  it('configures the drawer as front/zero-width and swipe-disabled when layout is appbar', async () => {
    (useDashboardLayout as jest.Mock).mockReturnValue('appbar');
    await render(
      <NavigationContainer>
        <DashboardShell />
      </NavigationContainer>,
    );
    expect(capturedScreenOptions.drawerType).toBe('front');
    expect(capturedScreenOptions.swipeEnabled).toBe(false);
    expect(capturedScreenOptions.drawerStyle).toEqual({ width: 0 });
  });
});
