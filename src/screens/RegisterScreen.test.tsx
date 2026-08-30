import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider } from '../auth/AuthContext';
import { RegisterScreen } from './RegisterScreen';
import { AllThemeProviders } from '../testUtils/AllThemeProviders';

async function renderRegister() {
  return render(
    <AllThemeProviders>
      <AuthProvider>
        <RegisterScreen />
      </AuthProvider>
    </AllThemeProviders>,
  );
}

describe('RegisterScreen', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('shows an error when name is empty', async () => {
    const { getByTestId } = await renderRegister();
    await fireEvent.press(getByTestId('register-submit'));
    expect(getByTestId('register-error').props.children).toBe('Nombre es requerido');
  });

  it('shows an error when email is empty', async () => {
    const { getByTestId } = await renderRegister();
    await fireEvent.changeText(getByTestId('register-name'), 'Jesus');
    await fireEvent.press(getByTestId('register-submit'));
    expect(getByTestId('register-error').props.children).toBe('Email es requerido');
  });

  it('shows an error for invalid email format', async () => {
    const { getByTestId } = await renderRegister();
    await fireEvent.changeText(getByTestId('register-name'), 'Jesus');
    await fireEvent.changeText(getByTestId('register-email'), 'not-an-email');
    await fireEvent.changeText(getByTestId('register-password'), 'password123');
    await fireEvent.changeText(getByTestId('register-confirm-password'), 'password123');
    await fireEvent.press(getByTestId('register-submit'));
    expect(getByTestId('register-error').props.children).toBe('Email inválido');
  });

  it('shows an error when password is too short', async () => {
    const { getByTestId } = await renderRegister();
    await fireEvent.changeText(getByTestId('register-name'), 'Jesus');
    await fireEvent.changeText(getByTestId('register-email'), 'jesus@example.com');
    await fireEvent.changeText(getByTestId('register-password'), '123');
    await fireEvent.changeText(getByTestId('register-confirm-password'), '123');
    await fireEvent.press(getByTestId('register-submit'));
    expect(getByTestId('register-error').props.children).toBe(
      'La contraseña debe tener al menos 6 caracteres',
    );
  });

  it('shows an error when passwords do not match', async () => {
    const { getByTestId } = await renderRegister();
    await fireEvent.changeText(getByTestId('register-name'), 'Jesus');
    await fireEvent.changeText(getByTestId('register-email'), 'jesus@example.com');
    await fireEvent.changeText(getByTestId('register-password'), 'password123');
    await fireEvent.changeText(getByTestId('register-confirm-password'), 'different123');
    await fireEvent.press(getByTestId('register-submit'));
    expect(getByTestId('register-error').props.children).toBe('Las contraseñas no coinciden');
  });

  it('creates an account and clears the error on success', async () => {
    const { getByTestId, queryByTestId } = await renderRegister();
    await fireEvent.changeText(getByTestId('register-name'), 'Jesus');
    await fireEvent.changeText(getByTestId('register-email'), 'jesus@example.com');
    await fireEvent.changeText(getByTestId('register-password'), 'password123');
    await fireEvent.changeText(getByTestId('register-confirm-password'), 'password123');
    await fireEvent.press(getByTestId('register-submit'));

    await waitFor(() => expect(queryByTestId('register-error')).toBeNull());
    const stored = await AsyncStorage.getItem('account-v1');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored as string);
    expect(parsed.email).toBe('jesus@example.com');
    expect(parsed.name).toBe('Jesus');
  });
});
