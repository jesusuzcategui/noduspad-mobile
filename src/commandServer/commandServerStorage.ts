import AsyncStorage from '@react-native-async-storage/async-storage';

export type CommandServerConfig = {
  host: string;
  port: string;
  password: string;
};

const STORAGE_KEY = 'command-server-connection-v1';

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

export async function loadCommandServerConfig(): Promise<CommandServerConfig> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_COMMAND_SERVER_CONFIG;
    const parsed: unknown = JSON.parse(stored);
    return isValidCommandServerConfig(parsed) ? parsed : DEFAULT_COMMAND_SERVER_CONFIG;
  } catch (error) {
    console.warn('CommandServer: failed to load connection config', error);
    return DEFAULT_COMMAND_SERVER_CONFIG;
  }
}

export async function saveCommandServerConfig(config: CommandServerConfig): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.warn('CommandServer: failed to save connection config', error);
  }
}
