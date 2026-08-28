import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_OBS_CONFIG, loadOBSConfig, saveOBSConfig } from './obsConnectionStorage';

const LEGACY_STORAGE_KEY = 'obs-connection-v1';
const PROFILE_ID = 'default';
const STORAGE_KEY = `${LEGACY_STORAGE_KEY}:${PROFILE_ID}`;

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('obsConnectionStorage', () => {
  it('returns the default config when storage is empty', async () => {
    expect(await loadOBSConfig(PROFILE_ID)).toEqual(DEFAULT_OBS_CONFIG);
  });

  it('persists and reloads a config', async () => {
    const config = { host: '192.168.1.5', port: '4455', password: 'secret' };
    await saveOBSConfig(PROFILE_ID, config);
    expect(await loadOBSConfig(PROFILE_ID)).toEqual(config);

    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    expect(JSON.parse(stored as string)).toEqual(config);
  });

  it('falls back to the default config when stored value has an invalid shape', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ host: 'x' }));
    expect(await loadOBSConfig(PROFILE_ID)).toEqual(DEFAULT_OBS_CONFIG);
  });

  it('falls back to the default config when stored value is invalid JSON', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'not-valid-json{{{');
    expect(await loadOBSConfig(PROFILE_ID)).toEqual(DEFAULT_OBS_CONFIG);
  });

  it('falls back to the default config when AsyncStorage.getItem throws', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('native module unavailable'));
    expect(await loadOBSConfig(PROFILE_ID)).toEqual(DEFAULT_OBS_CONFIG);
    jest.restoreAllMocks();
  });

  it('namespaces config storage per profile, keeping profiles isolated', async () => {
    const configA = { host: '192.168.1.5', port: '4455', password: 'secret-a' };
    const configB = { host: '192.168.1.6', port: '4456', password: 'secret-b' };
    await saveOBSConfig('default', configA);
    await saveOBSConfig('profile-2', configB);

    await expect(loadOBSConfig('default')).resolves.toEqual(configA);
    await expect(loadOBSConfig('profile-2')).resolves.toEqual(configB);
  });

  it('falls back to the legacy unnamespaced key for the default profile only', async () => {
    const legacyConfig = { host: '10.0.0.5', port: '4455', password: 'legacy' };
    await AsyncStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacyConfig));

    await expect(loadOBSConfig('default')).resolves.toEqual(legacyConfig);
    await expect(loadOBSConfig('profile-2')).resolves.toEqual(DEFAULT_OBS_CONFIG);
  });
});
