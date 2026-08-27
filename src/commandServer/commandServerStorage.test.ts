import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_COMMAND_SERVER_CONFIG,
  loadCommandServerConfig,
  saveCommandServerConfig,
} from './commandServerStorage';

describe('commandServerStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns defaults when nothing is stored', async () => {
    const config = await loadCommandServerConfig();
    expect(config).toEqual(DEFAULT_COMMAND_SERVER_CONFIG);
  });

  it('persists and reloads a saved config', async () => {
    const config = { host: '192.168.1.16', port: '7070', password: 'secret' };
    await saveCommandServerConfig(config);
    await expect(loadCommandServerConfig()).resolves.toEqual(config);
  });

  it('falls back to defaults on invalid stored data', async () => {
    await AsyncStorage.setItem('command-server-connection-v1', JSON.stringify({ host: 42 }));
    await expect(loadCommandServerConfig()).resolves.toEqual(DEFAULT_COMMAND_SERVER_CONFIG);
  });
});
