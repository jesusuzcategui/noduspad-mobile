import React from 'react';
import { Pressable, Text } from 'react-native';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StreamDeckGrid } from './StreamDeckGrid';
import { EditModeProvider, useEditMode } from './EditModeContext';
import { SEED_STATE } from './seedData';
import { executeOBSCommand } from '../obs/obsCommands';
import { executeCommand } from '../commandServer/commandServerClient';
import { AllThemeProviders } from '../testUtils/AllThemeProviders';

jest.mock('../obs/obsCommands', () => {
  const actual = jest.requireActual('../obs/obsCommands');
  return { ...actual, executeOBSCommand: jest.fn() };
});

jest.mock('../commandServer/commandServerClient', () => {
  const actual = jest.requireActual('../commandServer/commandServerClient');
  return { ...actual, executeCommand: jest.fn() };
});

const mockExecuteOBSCommand = executeOBSCommand as jest.MockedFunction<typeof executeOBSCommand>;
const mockExecuteCommand = executeCommand as jest.MockedFunction<typeof executeCommand>;

// Renders StreamDeckGrid alongside a button that toggles edit mode on, so tests
// can exercise the edit-mode tap behavior without a real drawer.
function GridWithEditModeToggle() {
  const { toggleEditMode } = useEditMode();
  return (
    <>
      <Pressable testID="test-toggle-edit-mode" onPress={toggleEditMode}>
        <Text>toggle</Text>
      </Pressable>
      <StreamDeckGrid />
    </>
  );
}

const STORAGE_KEY = 'streamdeck-state-v2';

beforeEach(async () => {
  await AsyncStorage.clear();
  mockExecuteOBSCommand.mockReset();
  mockExecuteCommand.mockReset();
});

describe('StreamDeckGrid', () => {
  it('renders every seeded category once loaded', async () => {
    await render(
      <AllThemeProviders>
      <EditModeProvider>
        <StreamDeckGrid />
      </EditModeProvider>
      </AllThemeProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('category-name-cat-obs')).toBeTruthy();
    });
    expect(screen.getByTestId('category-name-cat-system')).toBeTruthy();
  });

  it('shows "no configurado" for OBS buttons saved without a command', async () => {
    await render(
      <AllThemeProviders>
      <EditModeProvider>
        <StreamDeckGrid />
      </EditModeProvider>
      </AllThemeProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('streamdeck-button-btn-scene-1')).toBeTruthy();
    });

    await fireEvent.press(screen.getByTestId('streamdeck-button-btn-scene-1'));

    await waitFor(() => {
      expect(screen.getByTestId('tap-feedback-banner').props.children).toBe(
        'No configurado: Cambiar a Escena 1',
      );
    });
    expect(mockExecuteOBSCommand).not.toHaveBeenCalled();
  });

  it('executes the stored OBS command when a configured button is pressed', async () => {
    mockExecuteOBSCommand.mockResolvedValue(undefined);
    const customState = {
      ...SEED_STATE,
      buttons: {
        ...SEED_STATE.buttons,
        'btn-scene-1': {
          ...SEED_STATE.buttons['btn-scene-1'],
          action: { type: 'obs' as const, label: 'Cambiar a YT2', command: 'change-scene' as const, sceneName: 'YT2' },
        },
      },
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(customState));

    await render(
      <AllThemeProviders>
      <EditModeProvider>
        <StreamDeckGrid />
      </EditModeProvider>
      </AllThemeProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('streamdeck-button-btn-scene-1')).toBeTruthy();
    });

    await fireEvent.press(screen.getByTestId('streamdeck-button-btn-scene-1'));

    await waitFor(() => {
      expect(mockExecuteOBSCommand).toHaveBeenCalledWith('change-scene', 'YT2');
    });
    expect(screen.getByTestId('tap-feedback-banner').props.children).toBe('Ejecutando: Cambiar a YT2');
  });

  it('shows an error banner when executing the OBS command fails', async () => {
    mockExecuteOBSCommand.mockRejectedValue(new Error('No se pudo conectar a OBS'));
    const customState = {
      ...SEED_STATE,
      buttons: {
        ...SEED_STATE.buttons,
        'btn-scene-1': {
          ...SEED_STATE.buttons['btn-scene-1'],
          action: { type: 'obs' as const, label: 'Cambiar a YT2', command: 'change-scene' as const, sceneName: 'YT2' },
        },
      },
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(customState));

    await render(
      <AllThemeProviders>
      <EditModeProvider>
        <StreamDeckGrid />
      </EditModeProvider>
      </AllThemeProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('streamdeck-button-btn-scene-1')).toBeTruthy();
    });

    await fireEvent.press(screen.getByTestId('streamdeck-button-btn-scene-1'));

    await waitFor(() => {
      expect(screen.getByTestId('tap-feedback-banner').props.children).toBe('Error: No se pudo conectar a OBS');
    });
  });

  it('executes the stored command when a configured command button is pressed', async () => {
    mockExecuteCommand.mockResolvedValue(undefined);
    const customState = {
      ...SEED_STATE,
      buttons: {
        ...SEED_STATE.buttons,
        'btn-lock-screen': {
          ...SEED_STATE.buttons['btn-lock-screen'],
          action: { type: 'command' as const, label: 'Bloquear pantalla', commandId: 'cmd-1' },
        },
      },
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(customState));

    await render(
      <AllThemeProviders>
      <EditModeProvider>
        <StreamDeckGrid />
      </EditModeProvider>
      </AllThemeProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('streamdeck-button-btn-lock-screen')).toBeTruthy();
    });

    await fireEvent.press(screen.getByTestId('streamdeck-button-btn-lock-screen'));

    await waitFor(() => {
      expect(mockExecuteCommand).toHaveBeenCalledWith('cmd-1');
    });
    expect(screen.getByTestId('tap-feedback-banner').props.children).toBe('Ejecutando: Bloquear pantalla');
  });

  it('shows an error banner when executing the command fails', async () => {
    mockExecuteCommand.mockRejectedValue(new Error('server caído'));
    const customState = {
      ...SEED_STATE,
      buttons: {
        ...SEED_STATE.buttons,
        'btn-lock-screen': {
          ...SEED_STATE.buttons['btn-lock-screen'],
          action: { type: 'command' as const, label: 'Bloquear pantalla', commandId: 'cmd-1' },
        },
      },
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(customState));

    await render(
      <AllThemeProviders>
      <EditModeProvider>
        <StreamDeckGrid />
      </EditModeProvider>
      </AllThemeProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('streamdeck-button-btn-lock-screen')).toBeTruthy();
    });

    await fireEvent.press(screen.getByTestId('streamdeck-button-btn-lock-screen'));

    await waitFor(() => {
      expect(screen.getByTestId('tap-feedback-banner').props.children).toBe('Error: server caído');
    });
  });

  it('reorders only the dragged category buttons and persists the correct categoryId', async () => {
    await render(
      <AllThemeProviders>
      <EditModeProvider>
        <StreamDeckGrid />
      </EditModeProvider>
      </AllThemeProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('category-name-cat-obs')).toBeTruthy();
    });

    await fireEvent.press(screen.getByTestId('mock-drag-end-category-buttons-cat-obs'));

    await waitFor(async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(stored as string);
      expect(parsed.categories['cat-obs'].buttonIds).toEqual(
        [...SEED_STATE.categories['cat-obs'].buttonIds].reverse(),
      );
    });

    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(stored as string);
    expect(parsed.categories['cat-system'].buttonIds).toEqual(
      SEED_STATE.categories['cat-system'].buttonIds,
    );
  });

  it('creates a new button via the add-button tile and opens its editor', async () => {
    await render(
      <AllThemeProviders>
      <EditModeProvider>
        <GridWithEditModeToggle />
      </EditModeProvider>
      </AllThemeProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('category-name-cat-obs')).toBeTruthy();
    });

    await fireEvent.press(screen.getByTestId('test-toggle-edit-mode'));

    await fireEvent(screen.getByTestId('category-row-layout-cat-obs'), 'layout', {
      nativeEvent: { layout: { width: 320, height: 100, x: 0, y: 0 } },
    });
    await waitFor(() => {
      expect(screen.getByTestId('add-button-cat-obs')).toBeTruthy();
    });

    await fireEvent.press(screen.getByTestId('add-button-cat-obs'));

    await waitFor(() => {
      expect(screen.getByTestId('editor-label').props.value).toBe('Nuevo botón');
    });
  });

  it('opens the button editor instead of running the action when edit mode is on', async () => {
    await render(
      <AllThemeProviders>
      <EditModeProvider>
        <GridWithEditModeToggle />
      </EditModeProvider>
      </AllThemeProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('streamdeck-button-btn-scene-1')).toBeTruthy();
    });

    await fireEvent.press(screen.getByTestId('test-toggle-edit-mode'));
    await fireEvent.press(screen.getByTestId('streamdeck-button-btn-scene-1'));

    await waitFor(() => {
      expect(screen.getByTestId('editor-label').props.value).toBe('Escena 1');
    });
    expect(screen.queryByTestId('tap-feedback-banner')).toBeNull();
  });
});
