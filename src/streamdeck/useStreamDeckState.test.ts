import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStreamDeckState } from './useStreamDeckState';
import { SEED_STATE } from './seedData';

const STORAGE_KEY = 'streamdeck-state-v1';

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
