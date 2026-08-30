import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from './AuthContext';
import { saveAccount } from './accountStorage';
import { generateSalt, hashPasswordWithSalt } from './authService';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'test-password-123';

async function seedAccount() {
  const salt = generateSalt();
  await saveAccount({
    name: 'Jesus',
    email: TEST_EMAIL,
    passwordHash: hashPasswordWithSalt(TEST_PASSWORD, salt),
    salt,
  });
}

describe('useAuth', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('starts with hasAccount null while checking storage, then false when no account exists', async () => {
    const { result } = await renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(false);
    await waitFor(() => expect(result.current.hasAccount).toBe(false));
  });

  it('reports hasAccount true when an account is already stored', async () => {
    await seedAccount();
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.hasAccount).toBe(true));
  });

  it('register creates an account and authenticates', async () => {
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.hasAccount).toBe(false));

    await act(async () => {
      const ok = await result.current.register('Jesus', TEST_EMAIL, TEST_PASSWORD);
      expect(ok).toBe(true);
    });

    expect(result.current.hasAccount).toBe(true);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('register rejects empty fields', async () => {
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.hasAccount).toBe(false));

    await act(async () => {
      const ok = await result.current.register('', TEST_EMAIL, TEST_PASSWORD);
      expect(ok).toBe(false);
    });
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('login with correct credentials returns true and sets isAuthenticated', async () => {
    await seedAccount();
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.hasAccount).toBe(true));

    await act(() => {
      const ok = result.current.login(TEST_EMAIL, TEST_PASSWORD);
      expect(ok).toBe(true);
    });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('login with wrong credentials returns false and keeps isAuthenticated false', async () => {
    await seedAccount();
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.hasAccount).toBe(true));

    await act(() => {
      const ok = result.current.login('wrong@example.com', 'nope');
      expect(ok).toBe(false);
    });
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('logout resets isAuthenticated to false', async () => {
    await seedAccount();
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.hasAccount).toBe(true));

    await act(() => {
      result.current.login(TEST_EMAIL, TEST_PASSWORD);
    });
    expect(result.current.isAuthenticated).toBe(true);

    await act(() => {
      result.current.logout();
    });
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('resetAccount deletes the account and logs out', async () => {
    await seedAccount();
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.hasAccount).toBe(true));

    await act(() => {
      result.current.login(TEST_EMAIL, TEST_PASSWORD);
    });
    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => {
      await result.current.resetAccount();
    });

    expect(result.current.hasAccount).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('login with the just-deleted credentials fails after resetAccount', async () => {
    await seedAccount();
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.hasAccount).toBe(true));

    await act(async () => {
      await result.current.resetAccount();
    });
    expect(result.current.hasAccount).toBe(false);

    await act(() => {
      const ok = result.current.login(TEST_EMAIL, TEST_PASSWORD);
      expect(ok).toBe(false);
    });
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('register does not flip hasAccount/isAuthenticated when the storage write fails', async () => {
    const setItemSpy = jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.hasAccount).toBe(false));

    await act(async () => {
      const ok = await result.current.register('Jesus', TEST_EMAIL, TEST_PASSWORD);
      expect(ok).toBe(false);
    });

    expect(result.current.hasAccount).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    setItemSpy.mockRestore();
  });

  it('resetAccount does not flip hasAccount/isAuthenticated when the storage delete fails', async () => {
    await seedAccount();
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.hasAccount).toBe(true));

    await act(() => {
      result.current.login(TEST_EMAIL, TEST_PASSWORD);
    });
    expect(result.current.isAuthenticated).toBe(true);

    const removeItemSpy = jest
      .spyOn(AsyncStorage, 'removeItem')
      .mockRejectedValueOnce(new Error('disk error'));

    await act(async () => {
      const ok = await result.current.resetAccount();
      expect(ok).toBe(false);
    });

    expect(result.current.hasAccount).toBe(true);
    expect(result.current.isAuthenticated).toBe(true);
    removeItemSpy.mockRestore();
  });
});
