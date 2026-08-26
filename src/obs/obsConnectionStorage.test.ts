import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_OBS_CONFIG, loadOBSConfig, saveOBSConfig } from './obsConnectionStorage';

const STORAGE_KEY = 'obs-connection-v1';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('obsConnectionStorage', () => {
  it('returns the default config when storage is empty', async () => {
    expect(await loadOBSConfig()).toEqual(DEFAULT_OBS_CONFIG);
  });

  it('persists and reloads a config', async () => {
    const config = { host: '192.168.1.5', port: '4455', password: 'secret' };
    await saveOBSConfig(config);
    expect(await loadOBSConfig()).toEqual(config);

    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    expect(JSON.parse(stored as string)).toEqual(config);
  });

  it('falls back to the default config when stored value has an invalid shape', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ host: 'x' }));
    expect(await loadOBSConfig()).toEqual(DEFAULT_OBS_CONFIG);
  });

  it('falls back to the default config when stored value is invalid JSON', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'not-valid-json{{{');
    expect(await loadOBSConfig()).toEqual(DEFAULT_OBS_CONFIG);
  });

  it('falls back to the default config when AsyncStorage.getItem throws', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('native module unavailable'));
    expect(await loadOBSConfig()).toEqual(DEFAULT_OBS_CONFIG);
    jest.restoreAllMocks();
  });
});
