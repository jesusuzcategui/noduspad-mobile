import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppBar } from './AppBar';
import { EditModeProvider, useEditMode } from '../streamdeck/EditModeContext';

function renderAppBar(activeRoute: 'Home' | 'Settings' | 'About', onNavigate: (route: string) => void) {
  return render(
    <SafeAreaProvider>
      <EditModeProvider>
        <AppBar activeRoute={activeRoute} onNavigate={onNavigate} />
      </EditModeProvider>
    </SafeAreaProvider>,
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

  it('toggles edit mode when the Editar pill is pressed', async () => {
    const latest: { isEditMode: boolean } = { isEditMode: false };
    function Spy() {
      latest.isEditMode = useEditMode().isEditMode;
      return null;
    }

    const { getByTestId } = await render(
      <SafeAreaProvider>
        <EditModeProvider>
          <AppBar activeRoute="Home" onNavigate={() => {}} />
          <Spy />
        </EditModeProvider>
      </SafeAreaProvider>,
    );

    expect(latest.isEditMode).toBe(false);

    await fireEvent.press(getByTestId('appbar-edit-mode-toggle'));
    expect(latest.isEditMode).toBe(true);

    await fireEvent.press(getByTestId('appbar-edit-mode-toggle'));
    expect(latest.isEditMode).toBe(false);
  });
});
