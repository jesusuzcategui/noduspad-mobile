import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStreamDeckState } from './useStreamDeckState';
import { SEED_STATE } from './seedData';

const STORAGE_KEY = 'streamdeck-state-v2';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('useStreamDeckState', () => {
  it('falls back to seed data and persists it when storage is empty', async () => {
    const { result } = await renderHook(() => useStreamDeckState());

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

    const { result } = await renderHook(() => useStreamDeckState());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.state).toEqual(customState);
  });

  it('reorderCategories updates state and persists the new order', async () => {
    const { result } = await renderHook(() => useStreamDeckState());
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
    const { result } = await renderHook(() => useStreamDeckState());
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
    const { result } = await renderHook(() => useStreamDeckState());
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
    const { result } = await renderHook(() => useStreamDeckState());
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
    const { result } = await renderHook(() => useStreamDeckState());
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

    const { result } = await renderHook(() => useStreamDeckState());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.state).toEqual(SEED_STATE);

    jest.restoreAllMocks();
  });

  it('falls back to seed data when stored value is invalid JSON', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'not-valid-json{{{');

    const { result } = await renderHook(() => useStreamDeckState());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.state).toEqual(SEED_STATE);
  });

  it('falls back to seed data when stored value has an invalid shape', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({}));

    const { result } = await renderHook(() => useStreamDeckState());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.state).toEqual(SEED_STATE);
  });
});
