import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProfiles } from './useProfiles';
import { DEFAULT_PROFILE, loadActiveProfileId, loadProfiles } from './profileStorage';
import * as commandServerClient from '../commandServer/commandServerClient';
import * as obsCommands from '../obs/obsCommands';

// jest.mock (rather than jest.spyOn) is required here: useProfiles.ts imports
// resetSharedConnection/resetOBSSharedConnection as named imports, and only a
// full module mock reliably intercepts those call sites under this repo's
// Babel/Jest transform — mirrors the module-mock convention already used in
// StreamDeckGrid.test.tsx / SettingsScreen.test.tsx.
jest.mock('../commandServer/commandServerClient', () => {
  const actual = jest.requireActual('../commandServer/commandServerClient');
  return { ...actual, resetSharedConnection: jest.fn(actual.resetSharedConnection) };
});
jest.mock('../obs/obsCommands', () => {
  const actual = jest.requireActual('../obs/obsCommands');
  return { ...actual, resetOBSSharedConnection: jest.fn(actual.resetOBSSharedConnection) };
});

const mockResetCommandServer = commandServerClient.resetSharedConnection as jest.MockedFunction<
  typeof commandServerClient.resetSharedConnection
>;
const mockResetOBS = obsCommands.resetOBSSharedConnection as jest.MockedFunction<
  typeof obsCommands.resetOBSSharedConnection
>;

beforeEach(async () => {
  await AsyncStorage.clear();
  mockResetCommandServer.mockClear();
  mockResetOBS.mockClear();
});

describe('useProfiles', () => {
  it('loads the default profile list and active id on mount when storage is empty', async () => {
    const { result } = await renderHook(() => useProfiles());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.profiles).toEqual([DEFAULT_PROFILE]);
    expect(result.current.activeProfileId).toBe(DEFAULT_PROFILE.id);
  });

  it('switchProfile persists the new active id, updates state, and resets both shared sockets', async () => {
    const { result } = await renderHook(() => useProfiles());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.createProfile('Windows');
    });
    const newProfileId = result.current.profiles[1].id;

    mockResetCommandServer.mockClear();
    mockResetOBS.mockClear();

    await act(async () => {
      await result.current.switchProfile(DEFAULT_PROFILE.id);
    });

    expect(result.current.activeProfileId).toBe(DEFAULT_PROFILE.id);
    expect(await loadActiveProfileId()).toBe(DEFAULT_PROFILE.id);
    expect(mockResetCommandServer).toHaveBeenCalled();
    expect(mockResetOBS).toHaveBeenCalled();

    expect(newProfileId).not.toBe(DEFAULT_PROFILE.id);
  });

  it('createProfile appends and persists a new profile, and auto-switches to it', async () => {
    const { result } = await renderHook(() => useProfiles());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let created;
    await act(async () => {
      created = await result.current.createProfile('Windows');
    });

    expect((created as unknown as { name: string }).name).toBe('Windows');
    expect(result.current.profiles).toHaveLength(2);
    expect(result.current.activeProfileId).toBe((created as unknown as { id: string }).id);

    const storedProfiles = await loadProfiles();
    expect(storedProfiles).toHaveLength(2);
    expect(await loadActiveProfileId()).toBe((created as unknown as { id: string }).id);
  });

  it('createProfile trims the given name', async () => {
    const { result } = await renderHook(() => useProfiles());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let created;
    await act(async () => {
      created = await result.current.createProfile('  Windows  ');
    });

    expect((created as unknown as { name: string }).name).toBe('Windows');
  });

  it('createProfile does nothing for an empty/whitespace name', async () => {
    const { result } = await renderHook(() => useProfiles());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let created;
    await act(async () => {
      created = await result.current.createProfile('   ');
    });

    expect((created as unknown as { id: string }).id).toBe('');
    expect(result.current.profiles).toEqual([DEFAULT_PROFILE]);
    expect(result.current.activeProfileId).toBe(DEFAULT_PROFILE.id);
  });
});
