import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStreamDeckState } from './useStreamDeckState';
import { SEED_STATE } from './seedData';

const LEGACY_STORAGE_KEY = 'streamdeck-state-v2';
const PROFILE_ID = 'default';
const STORAGE_KEY = `${LEGACY_STORAGE_KEY}:${PROFILE_ID}`;

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('useStreamDeckState', () => {
  it('falls back to seed data and persists it when storage is empty', async () => {
    const { result } = await renderHook(() => useStreamDeckState(PROFILE_ID));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.state).toEqual(SEED_STATE);

    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    expect(JSON.parse(stored as string)).toEqual(SEED_STATE);
  });

  it('loads persisted state instead of seed data when storage has a value', async () => {
    const customState = {
      ...SEED_STATE,
      categoryOrder: [...SEED_STATE.categoryOrder].reverse(),
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(customState));

    const { result } = await renderHook(() => useStreamDeckState(PROFILE_ID));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.state).toEqual(customState);
  });

  it('reorderCategories updates state and persists the new order', async () => {
    const { result } = await renderHook(() => useStreamDeckState(PROFILE_ID));
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const reversed = [...SEED_STATE.categoryOrder].reverse();

    await act(async () => {
      result.current.reorderCategories(reversed);
    });

    expect(result.current.state?.categoryOrder).toEqual(reversed);

    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    expect(JSON.parse(stored as string).categoryOrder).toEqual(reversed);
  });

  it('reorderButtonsInCategory updates that category\'s buttonIds and persists it', async () => {
    const { result } = await renderHook(() => useStreamDeckState(PROFILE_ID));
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const categoryId = SEED_STATE.categoryOrder[0];
    const reversed = [...SEED_STATE.categories[categoryId].buttonIds].reverse();

    await act(async () => {
      result.current.reorderButtonsInCategory(categoryId, reversed);
    });

    expect(result.current.state?.categories[categoryId].buttonIds).toEqual(reversed);

    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    expect(JSON.parse(stored as string).categories[categoryId].buttonIds).toEqual(reversed);
  });

  it('updateButton merges the given fields and persists them', async () => {
    const { result } = await renderHook(() => useStreamDeckState(PROFILE_ID));
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const buttonId = 'btn-scene-1';

    await act(async () => {
      result.current.updateButton(buttonId, { label: 'Escena Renombrada', icon: 'camera' });
    });

    expect(result.current.state?.buttons[buttonId]).toMatchObject({
      label: 'Escena Renombrada',
      icon: 'camera',
      background: SEED_STATE.buttons[buttonId].background,
    });

    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(stored as string);
    expect(parsed.buttons[buttonId].label).toBe('Escena Renombrada');
  });

  it('addButton creates a new button, appends it to the category, and persists it', async () => {
    const { result } = await renderHook(() => useStreamDeckState(PROFILE_ID));
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const categoryId = SEED_STATE.categoryOrder[0];
    const previousButtonIds = SEED_STATE.categories[categoryId].buttonIds;

    let created;
    await act(async () => {
      created = result.current.addButton(categoryId);
    });

    expect(created).toMatchObject({
      label: 'Nuevo botón',
      icon: 'movie-outline',
      background: { type: 'color', color: '#3a7bfd' },
      action: { type: 'command', label: 'Nueva acción' },
    });

    const newId = (created as unknown as { id: string }).id;
    expect(result.current.state?.buttons[newId]).toEqual(created);
    expect(result.current.state?.categories[categoryId].buttonIds).toEqual([...previousButtonIds, newId]);

    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(stored as string);
    expect(parsed.buttons[newId]).toEqual(created);
    expect(parsed.categories[categoryId].buttonIds).toEqual([...previousButtonIds, newId]);
  });

  it('updateButton does nothing for an unknown button id', async () => {
    const { result } = await renderHook(() => useStreamDeckState(PROFILE_ID));
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      result.current.updateButton('does-not-exist', { label: 'x' });
    });

    expect(result.current.state).toEqual(SEED_STATE);
  });

  it('falls back to seed data when AsyncStorage.getItem throws', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('native module unavailable'));

    const { result } = await renderHook(() => useStreamDeckState(PROFILE_ID));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.state).toEqual(SEED_STATE);

    jest.restoreAllMocks();
  });

  it('falls back to seed data when stored value is invalid JSON', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'not-valid-json{{{');

    const { result } = await renderHook(() => useStreamDeckState(PROFILE_ID));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.state).toEqual(SEED_STATE);
  });

  it('falls back to seed data when stored value has an invalid shape', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({}));

    const { result } = await renderHook(() => useStreamDeckState(PROFILE_ID));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.state).toEqual(SEED_STATE);
  });

  it('createCategory adds a new category, appends it to categoryOrder, and persists it', async () => {
    const { result } = await renderHook(() => useStreamDeckState(PROFILE_ID));
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let newId: string = '';
    await act(async () => {
      newId = result.current.createCategory('Streaming');
    });

    expect(newId).not.toBe('');
    expect(result.current.state?.categoryOrder).toEqual([...SEED_STATE.categoryOrder, newId]);
    expect(result.current.state?.categories[newId]).toEqual({
      id: newId,
      name: 'Streaming',
      buttonIds: [],
    });

    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(stored as string);
    expect(parsed.categoryOrder).toEqual([...SEED_STATE.categoryOrder, newId]);
    expect(parsed.categories[newId]).toEqual({ id: newId, name: 'Streaming', buttonIds: [] });
  });

  it('createCategory trims the given name', async () => {
    const { result } = await renderHook(() => useStreamDeckState(PROFILE_ID));
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let newId: string = '';
    await act(async () => {
      newId = result.current.createCategory('  Streaming  ');
    });

    expect(result.current.state?.categories[newId].name).toBe('Streaming');
  });

  it('createCategory does nothing and returns an empty string for an empty/whitespace name', async () => {
    const { result } = await renderHook(() => useStreamDeckState(PROFILE_ID));
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let newId: string = 'not-empty';
    await act(async () => {
      newId = result.current.createCategory('   ');
    });

    expect(newId).toBe('');
    expect(result.current.state).toEqual(SEED_STATE);
  });

  it('renameCategory updates the category name and persists it', async () => {
    const { result } = await renderHook(() => useStreamDeckState(PROFILE_ID));
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const categoryId = SEED_STATE.categoryOrder[0];

    await act(async () => {
      result.current.renameCategory(categoryId, '  Renombrada  ');
    });

    expect(result.current.state?.categories[categoryId].name).toBe('Renombrada');

    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(stored as string);
    expect(parsed.categories[categoryId].name).toBe('Renombrada');
  });

  it('renameCategory does nothing for an unknown category id', async () => {
    const { result } = await renderHook(() => useStreamDeckState(PROFILE_ID));
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      result.current.renameCategory('does-not-exist', 'Nuevo Nombre');
    });

    expect(result.current.state).toEqual(SEED_STATE);
  });

  it('renameCategory does nothing for an empty/whitespace name', async () => {
    const { result } = await renderHook(() => useStreamDeckState(PROFILE_ID));
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const categoryId = SEED_STATE.categoryOrder[0];

    await act(async () => {
      result.current.renameCategory(categoryId, '   ');
    });

    expect(result.current.state).toEqual(SEED_STATE);
  });

  it('moveButtonToCategory moves the button between categories and persists it', async () => {
    const { result } = await renderHook(() => useStreamDeckState(PROFILE_ID));
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const [fromCategoryId, toCategoryId] = SEED_STATE.categoryOrder;
    const buttonId = SEED_STATE.categories[fromCategoryId].buttonIds[0];

    await act(async () => {
      result.current.moveButtonToCategory(buttonId, fromCategoryId, toCategoryId);
    });

    expect(result.current.state?.categories[fromCategoryId].buttonIds).not.toContain(buttonId);
    expect(result.current.state?.categories[toCategoryId].buttonIds).toContain(buttonId);

    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(stored as string);
    expect(parsed.categories[fromCategoryId].buttonIds).not.toContain(buttonId);
    expect(parsed.categories[toCategoryId].buttonIds).toContain(buttonId);
  });

  it('moveButtonToCategory does nothing when fromCategoryId equals toCategoryId', async () => {
    const { result } = await renderHook(() => useStreamDeckState(PROFILE_ID));
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const categoryId = SEED_STATE.categoryOrder[0];
    const buttonId = SEED_STATE.categories[categoryId].buttonIds[0];

    await act(async () => {
      result.current.moveButtonToCategory(buttonId, categoryId, categoryId);
    });

    expect(result.current.state).toEqual(SEED_STATE);
  });

  it('moveButtonToCategory does nothing for an unknown source or target category', async () => {
    const { result } = await renderHook(() => useStreamDeckState(PROFILE_ID));
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const categoryId = SEED_STATE.categoryOrder[0];
    const buttonId = SEED_STATE.categories[categoryId].buttonIds[0];

    await act(async () => {
      result.current.moveButtonToCategory(buttonId, 'does-not-exist', categoryId);
    });
    expect(result.current.state).toEqual(SEED_STATE);

    await act(async () => {
      result.current.moveButtonToCategory(buttonId, categoryId, 'does-not-exist');
    });
    expect(result.current.state).toEqual(SEED_STATE);
  });

  it('moveButtonToCategory does nothing for an unknown button id', async () => {
    const { result } = await renderHook(() => useStreamDeckState(PROFILE_ID));
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const [fromCategoryId, toCategoryId] = SEED_STATE.categoryOrder;

    await act(async () => {
      result.current.moveButtonToCategory('does-not-exist', fromCategoryId, toCategoryId);
    });

    expect(result.current.state).toEqual(SEED_STATE);
  });

  describe('profile namespacing', () => {
    it('falls back to the legacy unnamespaced key for the default profile when the namespaced key is empty', async () => {
      const legacyState = {
        ...SEED_STATE,
        categoryOrder: [...SEED_STATE.categoryOrder].reverse(),
      };
      await AsyncStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacyState));

      const { result } = await renderHook(() => useStreamDeckState('default'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.state).toEqual(legacyState);
    });

    it('does not fall back to the legacy key for a non-default profile', async () => {
      const legacyState = {
        ...SEED_STATE,
        categoryOrder: [...SEED_STATE.categoryOrder].reverse(),
      };
      await AsyncStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacyState));

      const { result } = await renderHook(() => useStreamDeckState('profile-2'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // A non-default profile has no data of its own yet — it must seed
      // fresh instead of inheriting the default profile's legacy data.
      expect(result.current.state).toEqual(SEED_STATE);
      const stored = await AsyncStorage.getItem('streamdeck-state-v2:profile-2');
      expect(JSON.parse(stored as string)).toEqual(SEED_STATE);
    });

    it('prefers the namespaced key over the legacy key once something has been saved under it', async () => {
      const legacyState = {
        ...SEED_STATE,
        categoryOrder: [...SEED_STATE.categoryOrder].reverse(),
      };
      await AsyncStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacyState));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_STATE));

      const { result } = await renderHook(() => useStreamDeckState('default'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.state).toEqual(SEED_STATE);
    });

    it('keeps two profiles fully isolated from each other', async () => {
      const { result: defaultResult } = await renderHook(() => useStreamDeckState('default'));
      await waitFor(() => expect(defaultResult.current.isLoading).toBe(false));

      const { result: otherResult } = await renderHook(() => useStreamDeckState('profile-2'));
      await waitFor(() => expect(otherResult.current.isLoading).toBe(false));

      await act(async () => {
        defaultResult.current.renameCategory(SEED_STATE.categoryOrder[0], 'Renombrada en default');
      });

      expect(defaultResult.current.state?.categories[SEED_STATE.categoryOrder[0]].name).toBe(
        'Renombrada en default',
      );
      expect(otherResult.current.state?.categories[SEED_STATE.categoryOrder[0]].name).toBe(
        SEED_STATE.categories[SEED_STATE.categoryOrder[0]].name,
      );

      const defaultStored = await AsyncStorage.getItem(STORAGE_KEY);
      expect(JSON.parse(defaultStored as string).categories[SEED_STATE.categoryOrder[0]].name).toBe(
        'Renombrada en default',
      );
      const otherStored = await AsyncStorage.getItem('streamdeck-state-v2:profile-2');
      expect(JSON.parse(otherStored as string).categories[SEED_STATE.categoryOrder[0]].name).toBe(
        SEED_STATE.categories[SEED_STATE.categoryOrder[0]].name,
      );
    });
  });
});
