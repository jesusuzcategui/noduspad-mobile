import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OBSConnectionConfig } from './types';

// Legacy unnamespaced key — kept as a one-time migration read for the
// 'default' profile only (see loadOBSConfig below) so users who had OBS
// configured before profiles existed don't lose it.
const LEGACY_STORAGE_KEY = 'obs-connection-v1';

function storageKeyFor(profileId: string): string {
  return `${LEGACY_STORAGE_KEY}:${profileId}`;
}

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

export async function loadOBSConfig(profileId: string): Promise<OBSConnectionConfig> {
  try {
    let stored = await AsyncStorage.getItem(storageKeyFor(profileId));
    if (!stored && profileId === 'default') {
      stored = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
    }
    if (!stored) return DEFAULT_OBS_CONFIG;
    const parsed: unknown = JSON.parse(stored);
    return isValidOBSConfig(parsed) ? parsed : DEFAULT_OBS_CONFIG;
  } catch (error) {
    console.warn('OBS: failed to load connection config', error);
    return DEFAULT_OBS_CONFIG;
  }
}

export async function saveOBSConfig(profileId: string, config: OBSConnectionConfig): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKeyFor(profileId), JSON.stringify(config));
  } catch (error) {
    console.warn('OBS: failed to save connection config', error);
  }
}
