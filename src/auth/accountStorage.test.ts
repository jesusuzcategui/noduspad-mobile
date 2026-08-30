import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteAccount, loadAccount, saveAccount, type Account } from './accountStorage';

const ACCOUNT: Account = {
  name: 'Jesus',
  email: 'jesus@example.com',
  passwordHash: 'deadbeef',
  salt: 'cafebabe',
};

describe('accountStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns null when no account is stored', async () => {
    await expect(loadAccount()).resolves.toBeNull();
  });

  it('returns null on corrupt stored data', async () => {
    await AsyncStorage.setItem('account-v1', 'not-json{{{');
    await expect(loadAccount()).resolves.toBeNull();
  });

  it('returns null when stored data does not match the Account shape', async () => {
    await AsyncStorage.setItem('account-v1', JSON.stringify({ email: 'only-email@example.com' }));
    await expect(loadAccount()).resolves.toBeNull();
  });

  it('persists and reloads an account', async () => {
    await saveAccount(ACCOUNT);
    await expect(loadAccount()).resolves.toEqual(ACCOUNT);
  });

  it('lowercases and trims the email before storing it', async () => {
    await saveAccount({ ...ACCOUNT, email: '  Jesus@Example.COM  ' });
    const loaded = await loadAccount();
    expect(loaded?.email).toBe('jesus@example.com');
  });

  it('deletes the stored account', async () => {
    await saveAccount(ACCOUNT);
    await deleteAccount();
    await expect(loadAccount()).resolves.toBeNull();
  });

  it('saveAccount resolves true on success', async () => {
    await expect(saveAccount(ACCOUNT)).resolves.toBe(true);
  });

  it('saveAccount resolves false when the underlying write fails', async () => {
    const setItemSpy = jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));
    await expect(saveAccount(ACCOUNT)).resolves.toBe(false);
    setItemSpy.mockRestore();
  });

  it('deleteAccount resolves true on success', async () => {
    await saveAccount(ACCOUNT);
    await expect(deleteAccount()).resolves.toBe(true);
  });

  it('deleteAccount resolves false when the underlying removal fails', async () => {
    const removeItemSpy = jest
      .spyOn(AsyncStorage, 'removeItem')
      .mockRejectedValueOnce(new Error('disk error'));
    await expect(deleteAccount()).resolves.toBe(false);
    removeItemSpy.mockRestore();
  });
});
