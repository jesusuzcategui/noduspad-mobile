import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_PROFILE,
  STORAGE_KEY_ACTIVE,
  STORAGE_KEY_PROFILES,
  loadActiveProfileId,
  loadProfiles,
  saveActiveProfileId,
  saveProfiles,
} from './profileStorage';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('profileStorage', () => {
  it('returns the default profile list when nothing is stored (first run)', async () => {
    expect(await loadProfiles()).toEqual([DEFAULT_PROFILE]);
  });

  it('returns the default active profile id when nothing is stored (first run)', async () => {
    expect(await loadActiveProfileId()).toBe(DEFAULT_PROFILE.id);
  });

  it('persists and reloads the profiles list', async () => {
    const profiles = [DEFAULT_PROFILE, { id: 'profile-2', name: 'Windows' }];
    await saveProfiles(profiles);
    expect(await loadProfiles()).toEqual(profiles);

    const stored = await AsyncStorage.getItem(STORAGE_KEY_PROFILES);
    expect(JSON.parse(stored as string)).toEqual(profiles);
  });

  it('persists and reloads the active profile id', async () => {
    await saveActiveProfileId('profile-2');
    expect(await loadActiveProfileId()).toBe('profile-2');

    const stored = await AsyncStorage.getItem(STORAGE_KEY_ACTIVE);
    expect(stored).toBe('profile-2');
  });

  it('falls back to the default profile list when stored value has an invalid shape', async () => {
    await AsyncStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify([{ id: 42 }]));
    expect(await loadProfiles()).toEqual([DEFAULT_PROFILE]);
  });

  it('falls back to the default profile list when stored value is invalid JSON', async () => {
    await AsyncStorage.setItem(STORAGE_KEY_PROFILES, 'not-valid-json{{{');
    expect(await loadProfiles()).toEqual([DEFAULT_PROFILE]);
  });

  it('falls back to defaults when AsyncStorage.getItem throws', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('native module unavailable'));
    expect(await loadProfiles()).toEqual([DEFAULT_PROFILE]);
    jest.restoreAllMocks();

    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('native module unavailable'));
    expect(await loadActiveProfileId()).toBe(DEFAULT_PROFILE.id);
    jest.restoreAllMocks();
  });
});
