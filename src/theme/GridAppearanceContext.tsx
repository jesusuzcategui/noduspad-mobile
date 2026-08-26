import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_GRID_GAP, DEFAULT_GRID_RADIUS } from './glass';

const STORAGE_KEY = 'grid-appearance-v1';

export const GRID_GAP_MIN = 4;
export const GRID_GAP_MAX = 32;
export const GRID_RADIUS_MIN = 0;
export const GRID_RADIUS_MAX = 40;

type GridAppearance = { gap: number; borderRadius: number };

type GridAppearanceContextValue = GridAppearance & {
  setGap: (gap: number) => void;
  setBorderRadius: (borderRadius: number) => void;
};

const DEFAULTS: GridAppearance = { gap: DEFAULT_GRID_GAP, borderRadius: DEFAULT_GRID_RADIUS };

const GridAppearanceContext = createContext<GridAppearanceContextValue | null>(null);

function isValidAppearance(value: unknown): value is GridAppearance {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<GridAppearance>;
  return typeof candidate.gap === 'number' && typeof candidate.borderRadius === 'number';
}

async function persist(state: GridAppearance): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('GridAppearance: failed to persist state', error);
  }
}

export function GridAppearanceProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearance] = useState<GridAppearance>(DEFAULTS);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY).then(stored => {
      if (cancelled || !stored) return;
      try {
        const parsed: unknown = JSON.parse(stored);
        if (isValidAppearance(parsed)) setAppearance(parsed);
      } catch {
        // Ignore malformed storage — keep defaults.
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setGap = (gap: number) => {
    setAppearance(prev => {
      const next = { ...prev, gap };
      persist(next);
      return next;
    });
  };

  const setBorderRadius = (borderRadius: number) => {
    setAppearance(prev => {
      const next = { ...prev, borderRadius };
      persist(next);
      return next;
    });
  };

  const value = useMemo(
    () => ({ ...appearance, setGap, setBorderRadius }),
    [appearance],
  );

  return <GridAppearanceContext.Provider value={value}>{children}</GridAppearanceContext.Provider>;
}

export function useGridAppearance(): GridAppearanceContextValue {
  const context = useContext(GridAppearanceContext);
  if (!context) {
    throw new Error('useGridAppearance must be used within a GridAppearanceProvider');
  }
  return context;
}
