import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StreamDeckGrid } from './StreamDeckGrid';
import { SEED_STATE } from './seedData';

const STORAGE_KEY = 'streamdeck-state-v2';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('StreamDeckGrid', () => {
  it('renders every seeded category once loaded', async () => {
    await render(<StreamDeckGrid />);

    await waitFor(() => {
      expect(screen.getByTestId('category-name-cat-obs')).toBeTruthy();
    });
    expect(screen.getByTestId('category-name-cat-system')).toBeTruthy();
  });

  it('shows tap feedback with the action label when a button is pressed', async () => {
    await render(<StreamDeckGrid />);

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
    await render(<StreamDeckGrid />);

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
});
