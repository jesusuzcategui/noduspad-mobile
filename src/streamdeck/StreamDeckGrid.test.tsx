import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StreamDeckGrid } from './StreamDeckGrid';

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
});
