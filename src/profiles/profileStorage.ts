import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Profile } from './types';

export const STORAGE_KEY_PROFILES = 'profiles-v1';
export const STORAGE_KEY_ACTIVE = 'active-profile-v1';

export const DEFAULT_PROFILE: Profile = { id: 'default', name: 'Perfil 1' };

function isValidProfile(value: unknown): value is Profile {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Profile>;
  return typeof candidate.id === 'string' && typeof candidate.name === 'string';
}

function isValidProfileArray(value: unknown): value is Profile[] {
  return Array.isArray(value) && value.every(isValidProfile);
}

export async function loadProfiles(): Promise<Profile[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_PROFILES);
    if (!stored) return [DEFAULT_PROFILE];
    const parsed: unknown = JSON.parse(stored);
    return isValidProfileArray(parsed) ? parsed : [DEFAULT_PROFILE];
  } catch (error) {
    console.warn('Profiles: failed to load profiles', error);
    return [DEFAULT_PROFILE];
  }
}

export async function saveProfiles(profiles: Profile[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
  } catch (error) {
    console.warn('Profiles: failed to save profiles', error);
  }
}

export async function loadActiveProfileId(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_ACTIVE);
    return stored ?? DEFAULT_PROFILE.id;
  } catch (error) {
    console.warn('Profiles: failed to load active profile id', error);
    return DEFAULT_PROFILE.id;
  }
}

export async function saveActiveProfileId(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_ACTIVE, id);
  } catch (error) {
    console.warn('Profiles: failed to save active profile id', error);
  }
}
