import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AuthProvider } from '../auth/AuthContext';
import { LoginScreen } from './LoginScreen';
import { AllThemeProviders } from '../testUtils/AllThemeProviders';

async function renderLogin() {
  return render(
    <AllThemeProviders>
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>
    </AllThemeProviders>,
  );
}

describe('LoginScreen', () => {
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
    await fireEvent.changeText(getByTestId('login-email'), 'uzcateguijesusdev@gmail.com');
    await fireEvent.changeText(getByTestId('login-password'), '1238022');
    await fireEvent.press(getByTestId('login-submit'));
    expect(queryByTestId('login-error')).toBeNull();
  });
});
