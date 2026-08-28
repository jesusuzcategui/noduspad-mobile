import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProfileSwitcher } from './ProfileSwitcher';
import { ProfileProvider } from './ProfileContext';
import { AllThemeProviders } from '../testUtils/AllThemeProviders';

beforeEach(async () => {
  await AsyncStorage.clear();
});

function renderSwitcher(variant?: 'drawer' | 'pill') {
  return render(
    <AllThemeProviders>
      <ProfileProvider>
        <ProfileSwitcher variant={variant} />
      </ProfileProvider>
    </AllThemeProviders>,
  );
}

describe('ProfileSwitcher', () => {
  it('shows the active profile initial and name', async () => {
    const { getByTestId } = await renderSwitcher();

    await waitFor(() => {
      expect(getByTestId('profile-switcher-name').props.children).toBe('Perfil 1');
    });
  });

  it('opens the profile list modal when pressed', async () => {
    const { getByTestId } = await renderSwitcher();

    await fireEvent.press(getByTestId('profile-switcher'));

    await waitFor(() => {
      expect(getByTestId('profile-list')).toBeTruthy();
    });
  });

  it('renders without a ProfileProvider, falling back to the default profile', async () => {
    const { getByTestId } = await render(
      <AllThemeProviders>
        <ProfileSwitcher />
      </AllThemeProviders>,
    );

    expect(getByTestId('profile-switcher-name').props.children).toBe('Perfil 1');
  });
});
