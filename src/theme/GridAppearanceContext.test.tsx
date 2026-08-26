import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GridAppearanceProvider, useGridAppearance } from './GridAppearanceContext';
import { DEFAULT_GRID_GAP, DEFAULT_GRID_RADIUS } from './glass';

const STORAGE_KEY = 'grid-appearance-v1';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <GridAppearanceProvider>{children}</GridAppearanceProvider>
);

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('GridAppearanceContext', () => {
  it('defaults to the base gap and border radius', async () => {
    const { result } = await renderHook(() => useGridAppearance(), { wrapper });
    await waitFor(() => {
      expect(result.current.gap).toBe(DEFAULT_GRID_GAP);
    });
    expect(result.current.borderRadius).toBe(DEFAULT_GRID_RADIUS);
  });

  it('updates and persists the gap', async () => {
    const { result } = await renderHook(() => useGridAppearance(), { wrapper });

    await act(async () => {
      result.current.setGap(20);
    });

    await waitFor(() => {
      expect(result.current.gap).toBe(20);
    });

    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    expect(JSON.parse(stored as string).gap).toBe(20);
  });

  it('updates and persists the border radius', async () => {
    const { result } = await renderHook(() => useGridAppearance(), { wrapper });

    await act(async () => {
      result.current.setBorderRadius(30);
    });

    await waitFor(() => {
      expect(result.current.borderRadius).toBe(30);
    });

    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    expect(JSON.parse(stored as string).borderRadius).toBe(30);
  });

  it('loads a previously persisted appearance on mount', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ gap: 16, borderRadius: 8 }));

    const { result } = await renderHook(() => useGridAppearance(), { wrapper });

    await waitFor(() => {
      expect(result.current.gap).toBe(16);
    });
    expect(result.current.borderRadius).toBe(8);
  });
});
