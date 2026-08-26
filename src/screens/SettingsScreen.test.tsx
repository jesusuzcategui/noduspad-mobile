import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OBSWebSocket from 'obs-websocket-js';
import { SettingsScreen } from './SettingsScreen';

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
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Settings">{() => <SettingsScreen />}</Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>,
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
});
