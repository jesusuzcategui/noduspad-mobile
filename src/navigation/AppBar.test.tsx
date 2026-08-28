import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppBar } from './AppBar';
import { EditModeProvider, useEditMode } from '../streamdeck/EditModeContext';
import { AllThemeProviders } from '../testUtils/AllThemeProviders';

function renderAppBar(activeRoute: 'Home' | 'Settings' | 'About', onNavigate: (route: string) => void) {
  return render(
    <AllThemeProviders>
      <SafeAreaProvider>
        <EditModeProvider>
          <AppBar activeRoute={activeRoute} onNavigate={onNavigate} />
        </EditModeProvider>
      </SafeAreaProvider>
    </AllThemeProviders>,
  );
}

describe('AppBar', () => {
  it('renders all three routes', async () => {
    const { getByTestId } = await renderAppBar('Home', () => {});
    expect(getByTestId('appbar-Home')).toBeTruthy();
    expect(getByTestId('appbar-Settings')).toBeTruthy();
    expect(getByTestId('appbar-About')).toBeTruthy();
  });

  it('calls onNavigate with the pressed route', async () => {
    const onNavigate = jest.fn();
    const { getByTestId } = await renderAppBar('Home', onNavigate);
    await fireEvent.press(getByTestId('appbar-Settings'));
    expect(onNavigate).toHaveBeenCalledWith('Settings');
  });

  it('shows the Editar pill only when Home is the active route', async () => {
    const { getByTestId, queryByTestId, rerender } = await renderAppBar('Home', () => {});
    expect(getByTestId('appbar-edit-mode-toggle')).toBeTruthy();

    await rerender(
      <AllThemeProviders>
        <SafeAreaProvider>
          <EditModeProvider>
            <AppBar activeRoute="Settings" onNavigate={() => {}} />
          </EditModeProvider>
        </SafeAreaProvider>
      </AllThemeProviders>,
    );
    expect(queryByTestId('appbar-edit-mode-toggle')).toBeNull();
  });

  it('toggles edit mode when the Editar pill is pressed', async () => {
    const latest: { isEditMode: boolean } = { isEditMode: false };
    function Spy() {
      latest.isEditMode = useEditMode().isEditMode;
      return null;
    }

    const { getByTestId } = await render(
      <AllThemeProviders>
        <SafeAreaProvider>
          <EditModeProvider>
            <AppBar activeRoute="Home" onNavigate={() => {}} />
            <Spy />
          </EditModeProvider>
        </SafeAreaProvider>
      </AllThemeProviders>,
    );

    expect(latest.isEditMode).toBe(false);

    await fireEvent.press(getByTestId('appbar-edit-mode-toggle'));
    expect(latest.isEditMode).toBe(true);

    await fireEvent.press(getByTestId('appbar-edit-mode-toggle'));
    expect(latest.isEditMode).toBe(false);
  });

  it('renders the profile switcher as the first pill', async () => {
    const { getByTestId } = await renderAppBar('Home', () => {});
    expect(getByTestId('profile-switcher')).toBeTruthy();
    expect(getByTestId('profile-switcher-name').props.children).toBe('Perfil 1');
  });
});
