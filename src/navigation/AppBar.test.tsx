import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AppBar } from './AppBar';

describe('AppBar', () => {
  it('renders all three routes', async () => {
    const { getByTestId } = await render(<AppBar activeRoute="Home" onNavigate={() => {}} />);
    expect(getByTestId('appbar-Home')).toBeTruthy();
    expect(getByTestId('appbar-Settings')).toBeTruthy();
    expect(getByTestId('appbar-About')).toBeTruthy();
  });

  it('calls onNavigate with the pressed route', async () => {
    const onNavigate = jest.fn();
    const { getByTestId } = await render(<AppBar activeRoute="Home" onNavigate={onNavigate} />);
    await fireEvent.press(getByTestId('appbar-Settings'));
    expect(onNavigate).toHaveBeenCalledWith('Settings');
  });
});
