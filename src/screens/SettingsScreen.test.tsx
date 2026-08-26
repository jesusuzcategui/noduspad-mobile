import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OBSWebSocket from 'obs-websocket-js';
import { SettingsScreen } from './SettingsScreen';
import { EditModeProvider } from '../streamdeck/EditModeContext';
import { AllThemeProviders } from '../testUtils/AllThemeProviders';
import { useTheme } from '../theme/ThemeContext';
import { useGridAppearance } from '../theme/GridAppearanceContext';

jest.mock('obs-websocket-js', () => {
  return jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
    on: jest.fn(),
  }));
});

const MockedOBSWebSocket = OBSWebSocket as unknown as jest.Mock;

// SettingsScreen renders ScreenWithAppBar, which needs a real navigator screen.
const Stack = createNativeStackNavigator();

function renderSettingsScreen() {
  return render(
    <AllThemeProviders>
      <EditModeProvider>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="Settings">{() => <SettingsScreen />}</Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </EditModeProvider>
    </AllThemeProviders>,
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
  MockedOBSWebSocket.mockClear();
});

describe('SettingsScreen', () => {
  it('renders the OBS connection form with default values', async () => {
    const { getByTestId } = await renderSettingsScreen();

    await waitFor(() => {
      expect(getByTestId('obs-host').props.value).toBe('localhost');
    });
    expect(getByTestId('obs-port').props.value).toBe('4455');
  });

  it('connects to OBS and shows the connected status', async () => {
    const { getByTestId, getByText } = await renderSettingsScreen();
    await waitFor(() => {
      expect(getByTestId('obs-host').props.value).toBe('localhost');
    });

    await fireEvent.press(getByTestId('obs-connect'));

    await waitFor(() => {
      expect(getByText('Conectado')).toBeTruthy();
    });
  });

  it('disconnects when pressing the button again while connected', async () => {
    const { getByTestId, getByText } = await renderSettingsScreen();
    await waitFor(() => {
      expect(getByTestId('obs-host').props.value).toBe('localhost');
    });

    await fireEvent.press(getByTestId('obs-connect'));
    await waitFor(() => {
      expect(getByText('Conectado')).toBeTruthy();
    });

    await fireEvent.press(getByTestId('obs-connect'));
    await waitFor(() => {
      expect(getByText('Sin conexión')).toBeTruthy();
    });

    const instance = MockedOBSWebSocket.mock.results[0].value;
    expect(instance.disconnect).toHaveBeenCalled();
  });

  it('shows an error message when the connection fails', async () => {
    MockedOBSWebSocket.mockImplementation(() => ({
      connect: jest.fn().mockRejectedValue(new Error('Authentication failed')),
      disconnect: jest.fn(),
      on: jest.fn(),
    }));

    const { getByTestId } = await renderSettingsScreen();
    await waitFor(() => {
      expect(getByTestId('obs-host').props.value).toBe('localhost');
    });

    await fireEvent.press(getByTestId('obs-connect'));

    await waitFor(() => {
      expect(getByTestId('obs-error').props.children).toBe('Authentication failed');
    });
  });

  it('switches to the Apariencia tab and hides the OBS form', async () => {
    const { getByTestId, queryByTestId } = await renderSettingsScreen();
    await waitFor(() => {
      expect(getByTestId('obs-host')).toBeTruthy();
    });

    await fireEvent.press(getByTestId('settings-tab-appearance'));

    expect(queryByTestId('obs-host')).toBeNull();
    expect(getByTestId('theme-mode-system')).toBeTruthy();
  });

  it('changes the theme mode when a mode pill is pressed', async () => {
    const latest: { mode: string } = { mode: '' };
    function Spy() {
      latest.mode = useTheme().mode;
      return null;
    }

    const { getByTestId } = await render(
      <AllThemeProviders>
        <EditModeProvider>
          <NavigationContainer>
            <Stack.Navigator>
              <Stack.Screen name="Settings">
                {() => (
                  <>
                    <SettingsScreen />
                    <Spy />
                  </>
                )}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </EditModeProvider>
      </AllThemeProviders>,
    );

    await fireEvent.press(getByTestId('settings-tab-appearance'));
    await fireEvent.press(getByTestId('theme-mode-light'));

    expect(latest.mode).toBe('light');
  });

  it('adjusts the grid gap and border radius with the steppers', async () => {
    const latest: { gap: number; borderRadius: number } = { gap: 0, borderRadius: 0 };
    function Spy() {
      const appearance = useGridAppearance();
      latest.gap = appearance.gap;
      latest.borderRadius = appearance.borderRadius;
      return null;
    }

    const { getByTestId } = await render(
      <AllThemeProviders>
        <EditModeProvider>
          <NavigationContainer>
            <Stack.Navigator>
              <Stack.Screen name="Settings">
                {() => (
                  <>
                    <SettingsScreen />
                    <Spy />
                  </>
                )}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </EditModeProvider>
      </AllThemeProviders>,
    );

    await fireEvent.press(getByTestId('settings-tab-appearance'));

    const initialGap = latest.gap;
    const initialRadius = latest.borderRadius;

    await fireEvent.press(getByTestId('grid-gap-increment'));
    expect(latest.gap).toBe(initialGap + 2);

    await fireEvent.press(getByTestId('grid-radius-decrement'));
    expect(latest.borderRadius).toBe(initialRadius - 2);
  });
});
