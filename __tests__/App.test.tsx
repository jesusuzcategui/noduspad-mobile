/**
 * @format
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../App';

// RootNavigator imports DashboardShell (even though the app starts unauthenticated
// and only renders Login), which imports @react-navigation/drawer. That module pulls
// in react-native-drawer-layout -> react-native-reanimated -> react-native-worklets,
// which requires the real native worklets runtime and cannot initialize under Jest.
// This is an import-time failure, not a render-time one, so it happens regardless of
// auth state. Same workaround as DashboardShell.test.tsx: substitute the already
// Jest-safe native-stack navigator for the drawer implementation in tests.
jest.mock('@react-navigation/drawer', () => {
  const { createNativeStackNavigator } = jest.requireActual('@react-navigation/native-stack');
  return {
    createDrawerNavigator: () => {
      const Stack = createNativeStackNavigator();
      return { Navigator: Stack.Navigator, Screen: Stack.Screen };
    },
  };
});

test('renders the Login screen on launch', async () => {
  const { getByText } = await render(<App />);
  expect(getByText('Native Stream Deck')).toBeTruthy();
});
