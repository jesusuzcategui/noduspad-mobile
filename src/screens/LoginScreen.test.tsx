import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider } from '../auth/AuthContext';
import { saveAccount } from '../auth/accountStorage';
import { generateSalt, hashPasswordWithSalt } from '../auth/authService';
import { LoginScreen } from './LoginScreen';
import { AllThemeProviders } from '../testUtils/AllThemeProviders';

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

async function renderLogin() {
  const utils = render(
    <AllThemeProviders>
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>
    </AllThemeProviders>,
  );
  // Let AuthProvider finish loading the seeded account from storage
  // before any interaction, since login() reads it from state.
  await new Promise<void>(resolve => setTimeout(resolve, 0));
  return utils;
}

describe('LoginScreen', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await seedAccount();
  });

  it('shows an error when submitting empty fields', async () => {
    const { getByTestId } = await renderLogin();
    await fireEvent.press(getByTestId('login-submit'));
    expect(getByTestId('login-error').props.children).toBe('Email es requerido');
  });

  it('shows an error for invalid email format', async () => {
    const { getByTestId } = await renderLogin();
    await fireEvent.changeText(getByTestId('login-email'), 'not-an-email');
    await fireEvent.changeText(getByTestId('login-password'), 'whatever');
    await fireEvent.press(getByTestId('login-submit'));
    expect(getByTestId('login-error').props.children).toBe('Email inválido');
  });

  it('shows an error for wrong credentials', async () => {
    const { getByTestId } = await renderLogin();
    await fireEvent.changeText(getByTestId('login-email'), 'wrong@example.com');
    await fireEvent.changeText(getByTestId('login-password'), 'wrong-pass');
    await fireEvent.press(getByTestId('login-submit'));
    expect(getByTestId('login-error').props.children).toBe('Credenciales inválidas');
  });

  it('clears the error on correct credentials', async () => {
    const { getByTestId, queryByTestId } = await renderLogin();
    await fireEvent.changeText(getByTestId('login-email'), TEST_EMAIL);
    await fireEvent.changeText(getByTestId('login-password'), TEST_PASSWORD);
    await fireEvent.press(getByTestId('login-submit'));
    expect(queryByTestId('login-error')).toBeNull();
  });

  describe('forgot password', () => {
    let alertSpy: jest.SpyInstance;

    beforeEach(() => {
      alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    });

    afterEach(() => {
      alertSpy.mockRestore();
    });

    it('shows a destructive confirmation dialog', async () => {
      const { getByTestId } = await renderLogin();
      await fireEvent.press(getByTestId('login-forgot-password'));
      expect(alertSpy).toHaveBeenCalledTimes(1);
      const [, , buttons] = alertSpy.mock.calls[0];
      expect(buttons.some((b: { style?: string }) => b.style === 'destructive')).toBe(true);
    });

    it('deletes the account when confirmed', async () => {
      const { getByTestId } = await renderLogin();
      await fireEvent.press(getByTestId('login-forgot-password'));
      const [, , buttons] = alertSpy.mock.calls[0];
      const confirmButton = buttons.find((b: { style?: string }) => b.style === 'destructive');
      await confirmButton.onPress();
      await waitFor(async () => {
        await expect(AsyncStorage.getItem('account-v1')).resolves.toBeNull();
      });
    });

    it('shows an inline error when the delete fails, instead of silently doing nothing', async () => {
      const removeItemSpy = jest
        .spyOn(AsyncStorage, 'removeItem')
        .mockRejectedValueOnce(new Error('disk error'));

      const { getByTestId } = await renderLogin();
      await fireEvent.press(getByTestId('login-forgot-password'));
      const [, , buttons] = alertSpy.mock.calls[0];
      const confirmButton = buttons.find((b: { style?: string }) => b.style === 'destructive');
      await confirmButton.onPress();

      await waitFor(() => {
        expect(getByTestId('login-error').props.children).toBe(
          'No se pudo borrar la cuenta. Intentá de nuevo.',
        );
      });
      removeItemSpy.mockRestore();
    });
  });
});
