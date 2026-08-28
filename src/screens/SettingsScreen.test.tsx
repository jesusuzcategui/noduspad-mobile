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
import { loadCommandServerConfig } from '../commandServer/commandServerStorage';
import * as commandServerClient from '../commandServer/commandServerClient';
import { ProfileProvider } from '../profiles/ProfileContext';

jest.mock('obs-websocket-js', () => {
  return jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
    on: jest.fn(),
  }));
});

// Without this mock, pressing "Probar conexión" on the Comandos tab opens a
// REAL `new WebSocket('ws://localhost:7070')` — non-deterministic in CI.
// Mirrors the module mock convention in StreamDeckGrid.test.tsx.
jest.mock('../commandServer/commandServerClient', () => {
  const actual = jest.requireActual('../commandServer/commandServerClient');
  return { ...actual, listCommands: jest.fn() };
});

const MockedOBSWebSocket = OBSWebSocket as unknown as jest.Mock;
const mockListCommands = commandServerClient.listCommands as jest.MockedFunction<
  typeof commandServerClient.listCommands
>;

// SettingsScreen renders ScreenWithAppBar, which needs a real navigator screen.
const Stack = createNativeStackNavigator();

function renderSettingsScreen() {
  return render(
    <AllThemeProviders>
      <ProfileProvider>
        <EditModeProvider>
          <NavigationContainer>
            <Stack.Navigator>
              <Stack.Screen name="Settings">{() => <SettingsScreen />}</Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </EditModeProvider>
      </ProfileProvider>
    </AllThemeProviders>,
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
  MockedOBSWebSocket.mockClear();
  mockListCommands.mockReset();
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

  it('shows the Comandos tab and persists host/port/password', async () => {
    const { getByTestId } = await renderSettingsScreen();
    await waitFor(() => {
      expect(getByTestId('obs-host')).toBeTruthy();
    });

    await fireEvent.press(getByTestId('settings-tab-commands'));
    await fireEvent.changeText(getByTestId('command-server-host'), '192.168.1.16');
    await fireEvent.changeText(getByTestId('command-server-port'), '7070');
    await fireEvent.changeText(getByTestId('command-server-password'), 'secret');

    await waitFor(async () => {
      const saved = await loadCommandServerConfig('default');
      expect(saved).toEqual({ host: '192.168.1.16', port: '7070', password: 'secret' });
    });
  });

  it('shows an error status on the Comandos tab when the connection test fails', async () => {
    mockListCommands.mockRejectedValue(new Error('Password incorrecto'));

    const { getByTestId, getByText } = await renderSettingsScreen();
    await waitFor(() => {
      expect(getByTestId('obs-host')).toBeTruthy();
    });

    await fireEvent.press(getByTestId('settings-tab-commands'));
    await fireEvent.press(getByTestId('command-server-connect'));

    await waitFor(() => {
      expect(getByText('Error de conexión')).toBeTruthy();
    });
    expect(getByTestId('command-server-status').props.children).toBe('Error de conexión');
    expect(getByTestId('command-server-error').props.children).toBe('Password incorrecto');
  });

  it('shows the Perfiles tab listing the default profile', async () => {
    const { getByTestId } = await renderSettingsScreen();
    await waitFor(() => {
      expect(getByTestId('obs-host')).toBeTruthy();
    });

    await fireEvent.press(getByTestId('settings-tab-profiles'));

    await waitFor(() => {
      expect(getByTestId('settings-profile-default')).toBeTruthy();
    });
  });

  it('creates a new profile from the Perfiles tab and switches to it', async () => {
    const { getByTestId, queryAllByTestId } = await renderSettingsScreen();
    await waitFor(() => {
      expect(getByTestId('obs-host')).toBeTruthy();
    });

    await fireEvent.press(getByTestId('settings-tab-profiles'));
    await fireEvent.press(getByTestId('settings-profile-create'));

    await waitFor(() => {
      expect(getByTestId('settings-profile-name-input')).toBeTruthy();
    });

    await fireEvent.changeText(getByTestId('settings-profile-name-input'), 'Windows');
    await fireEvent.press(getByTestId('settings-profile-name-save'));

    await waitFor(() => {
      expect(queryAllByTestId('settings-profile-default')).toHaveLength(1);
      const newProfileRows = queryAllByTestId(/^settings-profile-profile-/);
      expect(newProfileRows).toHaveLength(1);
    });
  });
});
