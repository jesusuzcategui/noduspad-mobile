import React from 'react';
import { Pressable, Text } from 'react-native';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StreamDeckGrid } from './StreamDeckGrid';
import { EditModeProvider, useEditMode } from './EditModeContext';
import { SEED_STATE } from './seedData';

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
});

describe('StreamDeckGrid', () => {
  it('renders every seeded category once loaded', async () => {
    await render(
      <EditModeProvider>
        <StreamDeckGrid />
      </EditModeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('category-name-cat-obs')).toBeTruthy();
    });
    expect(screen.getByTestId('category-name-cat-system')).toBeTruthy();
  });

  it('shows tap feedback with the action label when a button is pressed', async () => {
    await render(
      <EditModeProvider>
        <StreamDeckGrid />
      </EditModeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('streamdeck-button-btn-scene-1')).toBeTruthy();
    });

    await fireEvent.press(screen.getByTestId('streamdeck-button-btn-scene-1'));

    await waitFor(() => {
      expect(screen.getByTestId('tap-feedback-banner').props.children).toBe(
        'Ejecutaría: Cambiar a Escena 1',
      );
    });
  });

  it('reorders only the dragged category buttons and persists the correct categoryId', async () => {
    await render(
      <EditModeProvider>
        <StreamDeckGrid />
      </EditModeProvider>,
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

  it('opens the button editor instead of running the action when edit mode is on', async () => {
    await render(
      <EditModeProvider>
        <GridWithEditModeToggle />
      </EditModeProvider>,
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
