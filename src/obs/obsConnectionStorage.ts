import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OBSConnectionConfig } from './types';

const STORAGE_KEY = 'obs-connection-v1';

export const DEFAULT_OBS_CONFIG: OBSConnectionConfig = {
  host: 'localhost',
  port: '4455',
  password: '',
};

function isValidOBSConfig(value: unknown): value is OBSConnectionConfig {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<OBSConnectionConfig>;
  return (
    typeof candidate.host === 'string' &&
    typeof candidate.port === 'string' &&
    typeof candidate.password === 'string'
  );
}

export async function loadOBSConfig(): Promise<OBSConnectionConfig> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_OBS_CONFIG;
    const parsed: unknown = JSON.parse(stored);
    return isValidOBSConfig(parsed) ? parsed : DEFAULT_OBS_CONFIG;
  } catch (error) {
    console.warn('OBS: failed to load connection config', error);
    return DEFAULT_OBS_CONFIG;
  }
}

export async function saveOBSConfig(config: OBSConnectionConfig): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.warn('OBS: failed to save connection config', error);
  }
}
