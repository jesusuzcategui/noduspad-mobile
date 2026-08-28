import { renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOBSConnection } from './useOBSConnection';
import { DEFAULT_OBS_CONFIG } from './obsConnectionStorage';

// connect()/disconnect() behavior (success, error, status transitions) is covered
// end-to-end by SettingsScreen.test.tsx via fireEvent, which wraps React updates in
// act() correctly. Calling those async methods directly from a bare renderHook
// result — with no user-event wrapper — doesn't get the same act() treatment and
// produces flaky, environment-dependent results, so config loading is all that's
// exercised at the hook level.
jest.mock('obs-websocket-js', () => {
  return jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
    on: jest.fn(),
  }));
});

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('useOBSConnection', () => {
  it('loads the default config when storage is empty', async () => {
    const { result } = await renderHook(() => useOBSConnection('default'));

    await waitFor(() => {
      expect(result.current.isLoadingConfig).toBe(false);
    });

    expect(result.current.config).toEqual(DEFAULT_OBS_CONFIG);
    expect(result.current.status).toBe('idle');
  });

  it('loads a previously persisted config', async () => {
    const config = { host: '192.168.1.5', port: '4455', password: 'secret' };
    await AsyncStorage.setItem('obs-connection-v1:default', JSON.stringify(config));

    const { result } = await renderHook(() => useOBSConnection('default'));

    await waitFor(() => {
      expect(result.current.isLoadingConfig).toBe(false);
    });

    expect(result.current.config).toEqual(config);
  });

  it('loads the legacy unnamespaced config for the default profile as a one-time fallback', async () => {
    const config = { host: '192.168.1.5', port: '4455', password: 'secret' };
    await AsyncStorage.setItem('obs-connection-v1', JSON.stringify(config));

    const { result } = await renderHook(() => useOBSConnection('default'));

    await waitFor(() => {
      expect(result.current.isLoadingConfig).toBe(false);
    });

    expect(result.current.config).toEqual(config);
  });

  it('keeps each profile isolated', async () => {
    const configA = { host: '192.168.1.5', port: '4455', password: 'secret-a' };
    const configB = { host: '192.168.1.6', port: '4456', password: 'secret-b' };
    await AsyncStorage.setItem('obs-connection-v1:default', JSON.stringify(configA));
    await AsyncStorage.setItem('obs-connection-v1:profile-2', JSON.stringify(configB));

    const { result: resultA } = await renderHook(() => useOBSConnection('default'));
    await waitFor(() => expect(resultA.current.isLoadingConfig).toBe(false));
    expect(resultA.current.config).toEqual(configA);

    const { result: resultB } = await renderHook(() => useOBSConnection('profile-2'));
    await waitFor(() => expect(resultB.current.isLoadingConfig).toBe(false));
    expect(resultB.current.config).toEqual(configB);
  });
});
