import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SEED_STATE } from './seedData';
import type { StreamDeckState } from './types';

const STORAGE_KEY = 'streamdeck-state-v1';

async function persist(state: StreamDeckState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('StreamDeck: failed to persist state', error);
  }
}

function isValidStreamDeckState(value: unknown): value is StreamDeckState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<StreamDeckState>;
  return (
    Array.isArray(candidate.categoryOrder) &&
    typeof candidate.categories === 'object' &&
    candidate.categories !== null &&
    typeof candidate.buttons === 'object' &&
    candidate.buttons !== null
  );
}

export function useStreamDeckState() {
  const [state, setState] = useState<StreamDeckState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;

        if (stored) {
          const parsed: unknown = JSON.parse(stored);
          if (isValidStreamDeckState(parsed)) {
            setState(parsed);
            return;
          }
          console.warn('StreamDeck: stored state has an invalid shape, falling back to seed data');
        }

        setState(SEED_STATE);
        await persist(SEED_STATE);
      } catch (error) {
        if (cancelled) return;
        console.warn('StreamDeck: failed to load state, falling back to seed data', error);
        setState(SEED_STATE);
        await persist(SEED_STATE);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const reorderCategories = useCallback((newOrder: string[]) => {
    setState(prev => {
      if (!prev) return prev;
      const next = { ...prev, categoryOrder: newOrder };
      persist(next);
      return next;
    });
  }, []);

  const reorderButtonsInCategory = useCallback((categoryId: string, newButtonOrder: string[]) => {
    setState(prev => {
      if (!prev) return prev;
      const next = {
        ...prev,
        categories: {
          ...prev.categories,
          [categoryId]: { ...prev.categories[categoryId], buttonIds: newButtonOrder },
        },
      };
      persist(next);
      return next;
    });
  }, []);

  return { state, isLoading, reorderCategories, reorderButtonsInCategory };
}
