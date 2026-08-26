import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from './ThemeContext';
import { darkColor, lightColor } from './glass';

const STORAGE_KEY = 'theme-mode-v1';

const wrapper = ({ children }: { children: React.ReactNode }) => <ThemeProvider>{children}</ThemeProvider>;

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('ThemeContext', () => {
  it('defaults to system mode', async () => {
    const { result } = await renderHook(() => useTheme(), { wrapper });
    await waitFor(() => {
      expect(result.current.mode).toBe('system');
    });
  });

  it('switches to the light palette when mode is set to light', async () => {
    const { result } = await renderHook(() => useTheme(), { wrapper });

    await act(async () => {
      result.current.setMode('light');
    });

    await waitFor(() => {
      expect(result.current.scheme).toBe('light');
    });
    expect(result.current.colors).toEqual(lightColor);
  });

  it('switches to the dark palette when mode is set to dark', async () => {
    const { result } = await renderHook(() => useTheme(), { wrapper });

    await act(async () => {
      result.current.setMode('dark');
    });

    await waitFor(() => {
      expect(result.current.scheme).toBe('dark');
    });
    expect(result.current.colors).toEqual(darkColor);
  });

  it('persists the chosen mode to AsyncStorage', async () => {
    const { result } = await renderHook(() => useTheme(), { wrapper });

    await act(async () => {
      result.current.setMode('dark');
    });

    await waitFor(async () => {
      expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe('dark');
    });
  });

  it('loads a previously persisted mode on mount', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'dark');

    const { result } = await renderHook(() => useTheme(), { wrapper });

    await waitFor(() => {
      expect(result.current.mode).toBe('dark');
    });
  });
});
