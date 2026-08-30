import AsyncStorage from '@react-native-async-storage/async-storage';

export type Account = {
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
};

const STORAGE_KEY = 'account-v1';

function isValidAccount(value: unknown): value is Account {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Account>;
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.passwordHash === 'string' &&
    typeof candidate.salt === 'string'
  );
}

export async function loadAccount(): Promise<Account | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    return isValidAccount(parsed) ? parsed : null;
  } catch (error) {
    console.warn('Account: failed to load account', error);
    return null;
  }
}

export async function saveAccount(account: Account): Promise<boolean> {
  try {
    // Canonicalize the email once at the point of storage so every stored
    // account is compared case-insensitively against what login normalizes
    // the typed email to (see authService.verifyCredentials).
    const normalized: Account = { ...account, email: account.email.trim().toLowerCase() };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return true;
  } catch (error) {
    console.warn('Account: failed to save account', error);
    return false;
  }
}

export async function deleteAccount(): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.warn('Account: failed to delete account', error);
    return false;
  }
}
