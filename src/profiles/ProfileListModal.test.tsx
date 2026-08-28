import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProfileListModal } from './ProfileListModal';
import { ProfileProvider, useProfileContext } from './ProfileContext';
import { AllThemeProviders } from '../testUtils/AllThemeProviders';
import { DEFAULT_PROFILE, loadActiveProfileId, loadProfiles } from './profileStorage';

beforeEach(async () => {
  await AsyncStorage.clear();
});

function Spy({ latest }: { latest: { activeProfileId: string; profileCount: number } }) {
  const { activeProfileId, profiles } = useProfileContext();
  latest.activeProfileId = activeProfileId;
  latest.profileCount = profiles.length;
  return null;
}

async function renderModal(onClose = jest.fn()) {
  const latest = { activeProfileId: '', profileCount: 0 };
  const utils = await render(
    <AllThemeProviders>
      <ProfileProvider>
        <ProfileListModal visible onClose={onClose} />
        <Spy latest={latest} />
      </ProfileProvider>
    </AllThemeProviders>,
  );
  return { ...utils, latest, onClose };
}

describe('ProfileListModal', () => {
  it('lists the default profile and marks it active', async () => {
    const { getByTestId } = await renderModal();

    await waitFor(() => {
      expect(getByTestId(`profile-list-item-${DEFAULT_PROFILE.id}`)).toBeTruthy();
    });
    expect(getByTestId(`profile-list-item-${DEFAULT_PROFILE.id}-active`)).toBeTruthy();
  });

  it('opens the create-profile prompt when "+ Nuevo perfil" is pressed', async () => {
    const { getByTestId } = await renderModal();

    await fireEvent.press(getByTestId('profile-list-create'));

    await waitFor(() => {
      expect(getByTestId('profile-name-input')).toBeTruthy();
    });
  });

  it('creates a new profile, switches to it, persists it, and closes the modal', async () => {
    const onClose = jest.fn();
    const { getByTestId, latest } = await renderModal(onClose);

    await fireEvent.press(getByTestId('profile-list-create'));
    await waitFor(() => {
      expect(getByTestId('profile-name-input')).toBeTruthy();
    });

    await fireEvent.changeText(getByTestId('profile-name-input'), 'Windows');
    await fireEvent.press(getByTestId('profile-name-save'));

    await waitFor(() => {
      expect(latest.profileCount).toBe(2);
    });
    expect(latest.activeProfileId).not.toBe(DEFAULT_PROFILE.id);
    expect(onClose).toHaveBeenCalled();

    const storedProfiles = await loadProfiles();
    expect(storedProfiles).toHaveLength(2);
    expect(await loadActiveProfileId()).toBe(latest.activeProfileId);
  });

  it('switches to an existing profile when its row is pressed', async () => {
    const onClose = jest.fn();
    const { getByTestId, latest } = await renderModal(onClose);

    // Create a second profile first so there is something else to switch to.
    await fireEvent.press(getByTestId('profile-list-create'));
    await waitFor(() => expect(getByTestId('profile-name-input')).toBeTruthy());
    await fireEvent.changeText(getByTestId('profile-name-input'), 'Windows');
    await fireEvent.press(getByTestId('profile-name-save'));
    await waitFor(() => expect(latest.profileCount).toBe(2));

    onClose.mockClear();

    await fireEvent.press(getByTestId(`profile-list-item-${DEFAULT_PROFILE.id}`));

    await waitFor(() => {
      expect(latest.activeProfileId).toBe(DEFAULT_PROFILE.id);
    });
    expect(onClose).toHaveBeenCalled();
  });
});
