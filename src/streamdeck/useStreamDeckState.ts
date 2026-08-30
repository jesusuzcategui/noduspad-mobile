import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SEED_STATE } from './seedData';
import type { StreamDeckButton, StreamDeckCategory, StreamDeckState } from './types';

// v2: buttons gained a required `icon` field. Bumping the key invalidates any
// state persisted by earlier builds instead of crashing on stale button shapes.
//
// Namespaced per-profile below (streamdeck-state-v2:{profileId}) so each
// profile (physical PC) has its own button/category layout. The bare key is
// kept as a one-time migration read for the 'default' profile only, so users
// who had a layout before profiles existed don't lose it.
const LEGACY_STORAGE_KEY = 'streamdeck-state-v2';

function storageKeyFor(profileId: string): string {
  return `${LEGACY_STORAGE_KEY}:${profileId}`;
}

async function persist(state: StreamDeckState, profileId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKeyFor(profileId), JSON.stringify(state));
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

export function useStreamDeckState(profileId: string) {
  const [state, setState] = useState<StreamDeckState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setState(null);
      try {
        let stored = await AsyncStorage.getItem(storageKeyFor(profileId));
        if (!stored && profileId === 'default') {
          // One-time migration read: a pre-profiles install has its data
          // under the bare legacy key. Don't delete it — just prefer the
          // namespaced key going forward once anything is saved under it.
          stored = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
        }
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
        await persist(SEED_STATE, profileId);
      } catch (error) {
        if (cancelled) return;
        console.warn('StreamDeck: failed to load state, falling back to seed data', error);
        setState(SEED_STATE);
        await persist(SEED_STATE, profileId);
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
  }, [profileId]);

  const reorderCategories = useCallback(
    (newOrder: string[]) => {
      setState(prev => {
        if (!prev) return prev;
        const next = { ...prev, categoryOrder: newOrder };
        persist(next, profileId);
        return next;
      });
    },
    [profileId],
  );

  const reorderButtonsInCategory = useCallback(
    (categoryId: string, newButtonOrder: string[]) => {
      setState(prev => {
        if (!prev) return prev;
        const next = {
          ...prev,
          categories: {
            ...prev.categories,
            [categoryId]: { ...prev.categories[categoryId], buttonIds: newButtonOrder },
          },
        };
        persist(next, profileId);
        return next;
      });
    },
    [profileId],
  );

  const addButton = useCallback(
    (categoryId: string): StreamDeckButton => {
      const newButton: StreamDeckButton = {
        id: `btn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        label: 'Nuevo botón',
        icon: 'movie-outline',
        iconColor: '#ffffff',
        background: { type: 'color', color: '#3a7bfd' },
        action: { type: 'command', label: 'Nueva acción' },
      };
      setState(prev => {
        if (!prev || !prev.categories[categoryId]) return prev;
        const next = {
          ...prev,
          buttons: { ...prev.buttons, [newButton.id]: newButton },
          categories: {
            ...prev.categories,
            [categoryId]: {
              ...prev.categories[categoryId],
              buttonIds: [...prev.categories[categoryId].buttonIds, newButton.id],
            },
          },
        };
        persist(next, profileId);
        return next;
      });
      return newButton;
    },
    [profileId],
  );

  const updateButton = useCallback(
    (buttonId: string, updates: Partial<StreamDeckButton>) => {
      setState(prev => {
        if (!prev || !prev.buttons[buttonId]) return prev;
        const next = {
          ...prev,
          buttons: {
            ...prev.buttons,
            [buttonId]: { ...prev.buttons[buttonId], ...updates },
          },
        };
        persist(next, profileId);
        return next;
      });
    },
    [profileId],
  );

  const deleteButton = useCallback(
    (buttonId: string) => {
      setState(prev => {
        if (!prev || !prev.buttons[buttonId]) return prev;
        const ownerCategoryId = prev.categoryOrder.find(id =>
          prev.categories[id].buttonIds.includes(buttonId),
        );

        const { [buttonId]: _removed, ...remainingButtons } = prev.buttons;
        const next = {
          ...prev,
          buttons: remainingButtons,
          categories: ownerCategoryId
            ? {
                ...prev.categories,
                [ownerCategoryId]: {
                  ...prev.categories[ownerCategoryId],
                  buttonIds: prev.categories[ownerCategoryId].buttonIds.filter(id => id !== buttonId),
                },
              }
            : prev.categories,
        };
        persist(next, profileId);
        return next;
      });
    },
    [profileId],
  );

  const createCategory = useCallback(
    (name: string): string => {
      const trimmed = name.trim();
      if (!trimmed) return '';

      const newCategory: StreamDeckCategory = {
        id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: trimmed,
        buttonIds: [],
      };
      setState(prev => {
        if (!prev) return prev;
        const next = {
          ...prev,
          categories: { ...prev.categories, [newCategory.id]: newCategory },
          categoryOrder: [...prev.categoryOrder, newCategory.id],
        };
        persist(next, profileId);
        return next;
      });
      return newCategory.id;
    },
    [profileId],
  );

  const renameCategory = useCallback(
    (categoryId: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;

      setState(prev => {
        if (!prev || !prev.categories[categoryId]) return prev;
        const next = {
          ...prev,
          categories: {
            ...prev.categories,
            [categoryId]: { ...prev.categories[categoryId], name: trimmed },
          },
        };
        persist(next, profileId);
        return next;
      });
    },
    [profileId],
  );

  const moveButtonToCategory = useCallback(
    (buttonId: string, fromCategoryId: string, toCategoryId: string) => {
      setState(prev => {
        if (!prev) return prev;
        if (fromCategoryId === toCategoryId) return prev;
        const fromCategory = prev.categories[fromCategoryId];
        const toCategory = prev.categories[toCategoryId];
        if (!fromCategory || !toCategory || !prev.buttons[buttonId]) return prev;
        if (!fromCategory.buttonIds.includes(buttonId)) return prev;

        const next = {
          ...prev,
          categories: {
            ...prev.categories,
            [fromCategoryId]: {
              ...fromCategory,
              buttonIds: fromCategory.buttonIds.filter(id => id !== buttonId),
            },
            [toCategoryId]: {
              ...toCategory,
              buttonIds: [...toCategory.buttonIds, buttonId],
            },
          },
        };
        persist(next, profileId);
        return next;
      });
    },
    [profileId],
  );

  return {
    state,
    isLoading,
    reorderCategories,
    reorderButtonsInCategory,
    addButton,
    updateButton,
    deleteButton,
    createCategory,
    renameCategory,
    moveButtonToCategory,
  };
}
