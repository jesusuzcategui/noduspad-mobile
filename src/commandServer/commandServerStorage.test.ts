import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_COMMAND_SERVER_CONFIG,
  loadCommandServerConfig,
  saveCommandServerConfig,
} from './commandServerStorage';

const PROFILE_ID = 'default';

describe('commandServerStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns defaults when nothing is stored', async () => {
    const config = await loadCommandServerConfig(PROFILE_ID);
    expect(config).toEqual(DEFAULT_COMMAND_SERVER_CONFIG);
  });

  it('persists and reloads a saved config', async () => {
    const config = { host: '192.168.1.16', port: '7070', password: 'secret' };
    await saveCommandServerConfig(PROFILE_ID, config);
    await expect(loadCommandServerConfig(PROFILE_ID)).resolves.toEqual(config);
  });

  it('falls back to defaults on invalid stored data', async () => {
    await AsyncStorage.setItem(`command-server-connection-v1:${PROFILE_ID}`, JSON.stringify({ host: 42 }));
    await expect(loadCommandServerConfig(PROFILE_ID)).resolves.toEqual(DEFAULT_COMMAND_SERVER_CONFIG);
  });

  it('namespaces config storage per profile, keeping profiles isolated', async () => {
    const configA = { host: '192.168.1.16', port: '7070', password: 'secret-a' };
    const configB = { host: '192.168.1.17', port: '7071', password: 'secret-b' };
    await saveCommandServerConfig('default', configA);
    await saveCommandServerConfig('profile-2', configB);

    await expect(loadCommandServerConfig('default')).resolves.toEqual(configA);
    await expect(loadCommandServerConfig('profile-2')).resolves.toEqual(configB);
  });

  it('falls back to the legacy unnamespaced key for the default profile only', async () => {
    const legacyConfig = { host: '10.0.0.5', port: '7070', password: 'legacy' };
    await AsyncStorage.setItem('command-server-connection-v1', JSON.stringify(legacyConfig));

    await expect(loadCommandServerConfig('default')).resolves.toEqual(legacyConfig);
    await expect(loadCommandServerConfig('profile-2')).resolves.toEqual(DEFAULT_COMMAND_SERVER_CONFIG);
  });
});
