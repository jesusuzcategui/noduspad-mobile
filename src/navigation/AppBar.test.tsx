import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppBar } from './AppBar';

describe('AppBar', () => {
  it('renders all three routes', async () => {
    const { getByTestId } = await render(
      <SafeAreaProvider>
        <AppBar activeRoute="Home" onNavigate={() => {}} />
      </SafeAreaProvider>,
    );
    expect(getByTestId('appbar-Home')).toBeTruthy();
    expect(getByTestId('appbar-Settings')).toBeTruthy();
    expect(getByTestId('appbar-About')).toBeTruthy();
  });

  it('calls onNavigate with the pressed route', async () => {
    const onNavigate = jest.fn();
    const { getByTestId } = await render(
      <SafeAreaProvider>
        <AppBar activeRoute="Home" onNavigate={onNavigate} />
      </SafeAreaProvider>,
    );
    await fireEvent.press(getByTestId('appbar-Settings'));
    expect(onNavigate).toHaveBeenCalledWith('Settings');
  });
});
