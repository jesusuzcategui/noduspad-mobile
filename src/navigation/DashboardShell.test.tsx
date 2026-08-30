import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DashboardShell } from './DashboardShell';
import { AllThemeProviders } from '../testUtils/AllThemeProviders';
import { EditModeProvider } from '../streamdeck/EditModeContext';
import { ProfileProvider } from '../profiles/ProfileContext';

// @react-navigation/drawer pulls in react-native-drawer-layout -> react-native-reanimated
// -> react-native-worklets, which requires the real native worklets runtime and cannot
// initialize under Jest. DashboardShell only needs createDrawerNavigator to produce a
// Navigator/Screen pair that registers routes and honors screenOptions, so we substitute
// the already-Jest-safe native-stack navigator (see PlaceholderScreen.test.tsx) for the
// drawer implementation in tests, while production code still uses the real drawer.
let capturedScreenOptions: any;
let capturedDrawerContent: any;

jest.mock('@react-navigation/drawer', () => {
  const { createNativeStackNavigator } = jest.requireActual('@react-navigation/native-stack');
  return {
    createDrawerNavigator: () => {
      const Stack = createNativeStackNavigator();
      const Navigator = (props: any) => {
        capturedScreenOptions = props.screenOptions;
        capturedDrawerContent = props.drawerContent;
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
      <AllThemeProviders>
        <NavigationContainer>
          <DashboardShell />
        </NavigationContainer>
      </AllThemeProviders>,
    );
    expect(screen.getByTestId('appbar-Home')).toBeTruthy();
  });

  it('hides the AppBar when layout is drawer', async () => {
    (useDashboardLayout as jest.Mock).mockReturnValue('drawer');
    await render(
      <AllThemeProviders>
        <NavigationContainer>
          <DashboardShell />
        </NavigationContainer>
      </AllThemeProviders>,
    );
    expect(screen.queryByTestId('appbar-Home')).toBeNull();
  });

  it('renders the Home screen by default', async () => {
    (useDashboardLayout as jest.Mock).mockReturnValue('appbar');
    await render(
      <AllThemeProviders>
        <NavigationContainer>
          <DashboardShell />
        </NavigationContainer>
      </AllThemeProviders>,
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
      <AllThemeProviders>
        <NavigationContainer>
          <DashboardShell />
        </NavigationContainer>
      </AllThemeProviders>,
    );
    expect(capturedScreenOptions.drawerType).toBe('permanent');
    expect(capturedScreenOptions.swipeEnabled).toBe(true);
    expect(capturedScreenOptions.drawerStyle).toEqual({ width: 260 });
  });

  it('configures the drawer as front/zero-width and swipe-disabled when layout is appbar', async () => {
    (useDashboardLayout as jest.Mock).mockReturnValue('appbar');
    await render(
      <AllThemeProviders>
        <NavigationContainer>
          <DashboardShell />
        </NavigationContainer>
      </AllThemeProviders>,
    );
    expect(capturedScreenOptions.drawerType).toBe('front');
    expect(capturedScreenOptions.swipeEnabled).toBe(false);
    expect(capturedScreenOptions.drawerStyle).toEqual({ width: 0 });
  });

  it('shrinks the permanent drawer width when the sidebar collapse toggle is pressed', async () => {
    (useDashboardLayout as jest.Mock).mockReturnValue('drawer');
    await render(
      <AllThemeProviders>
        <NavigationContainer>
          <DashboardShell />
        </NavigationContainer>
      </AllThemeProviders>,
    );
    expect(capturedScreenOptions.drawerStyle).toEqual({ width: 260 });

    // The mocked native-stack Navigator does not render `drawerContent` (that
    // prop is drawer-navigator-specific), so GlassDrawerContent never mounts
    // inside the tree above. DashboardShell owns the `collapsed` state and
    // passes it (plus a real setState-backed toggle) into the drawerContent
    // render-prop function it hands to Drawer.Navigator — capture that
    // function and mount its output separately to exercise the toggle. The
    // `onToggleCollapse` closure still updates the original DashboardShell
    // fiber, so pressing it here is observable via `capturedScreenOptions`
    // after DashboardShell re-renders.
    const drawerContentElement = capturedDrawerContent({
      state: { index: 0, routes: [{ key: 'Home-1', name: 'Home' }] },
      navigation: { navigate: jest.fn() },
      descriptors: { 'Home-1': { options: { title: 'Home' } } },
    });
    await render(
      <AllThemeProviders>
        <ProfileProvider>
          <EditModeProvider>{drawerContentElement}</EditModeProvider>
        </ProfileProvider>
      </AllThemeProviders>,
    );

    fireEvent.press(screen.getByTestId('drawer-collapse-toggle'));

    await waitFor(() => {
      expect(capturedScreenOptions.drawerStyle).toEqual({ width: 72 });
    });
  });
});
