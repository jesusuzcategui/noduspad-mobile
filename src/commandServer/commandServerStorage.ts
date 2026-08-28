import AsyncStorage from '@react-native-async-storage/async-storage';

export type CommandServerConfig = {
  host: string;
  port: string;
  password: string;
};

// Legacy unnamespaced key — kept as a one-time migration read for the
// 'default' profile only (see loadCommandServerConfig below) so users who
// had a connection configured before profiles existed don't lose it.
const LEGACY_STORAGE_KEY = 'command-server-connection-v1';

function storageKeyFor(profileId: string): string {
  return `${LEGACY_STORAGE_KEY}:${profileId}`;
}

export const DEFAULT_COMMAND_SERVER_CONFIG: CommandServerConfig = {
  host: 'localhost',
  port: '7070',
  password: '',
};

function isValidCommandServerConfig(value: unknown): value is CommandServerConfig {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<CommandServerConfig>;
  return (
    typeof candidate.host === 'string' &&
    typeof candidate.port === 'string' &&
    typeof candidate.password === 'string'
  );
}

export async function loadCommandServerConfig(profileId: string): Promise<CommandServerConfig> {
  try {
    let stored = await AsyncStorage.getItem(storageKeyFor(profileId));
    if (!stored && profileId === 'default') {
      stored = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
    }
    if (!stored) return DEFAULT_COMMAND_SERVER_CONFIG;
    const parsed: unknown = JSON.parse(stored);
    return isValidCommandServerConfig(parsed) ? parsed : DEFAULT_COMMAND_SERVER_CONFIG;
  } catch (error) {
    console.warn('CommandServer: failed to load connection config', error);
    return DEFAULT_COMMAND_SERVER_CONFIG;
  }
}

export async function saveCommandServerConfig(profileId: string, config: CommandServerConfig): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKeyFor(profileId), JSON.stringify(config));
  } catch (error) {
    console.warn('CommandServer: failed to save connection config', error);
  }
}
