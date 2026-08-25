import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SEED_STATE } from './seedData';
import type { StreamDeckState } from './types';

const STORAGE_KEY = 'streamdeck-state-v1';

async function persist(state: StreamDeckState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useStreamDeckState() {
  const [state, setState] = useState<StreamDeckState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (cancelled) return;

      if (stored) {
        setState(JSON.parse(stored));
      } else {
        setState(SEED_STATE);
        await persist(SEED_STATE);
      }
      setIsLoading(false);
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
