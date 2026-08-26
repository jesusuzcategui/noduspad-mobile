import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GlassDrawerContent } from './GlassDrawerContent';
import { EditModeProvider } from '../streamdeck/EditModeContext';

jest.mock('./useBreakpoint', () => ({
  useDashboardLayout: jest.fn(() => 'drawer'),
}));

const routes = [
  { key: 'Home-1', name: 'Home' },
  { key: 'Settings-1', name: 'Settings' },
];

function buildProps(navigate: jest.Mock) {
  return {
    state: { index: 0, routes },
    navigation: { navigate },
    descriptors: {
      'Home-1': { options: { title: 'Home' } },
      'Settings-1': { options: { title: 'Settings' } },
    },
  } as any;
}

describe('GlassDrawerContent', () => {
  it('renders a nav item per route and navigates on press', async () => {
    const navigate = jest.fn();
    const { getByTestId } = await render(
      <EditModeProvider>
        <GlassDrawerContent {...buildProps(navigate)} />
      </EditModeProvider>,
    );

    await fireEvent.press(getByTestId('drawer-Settings'));
    expect(navigate).toHaveBeenCalledWith('Settings');
  });

  it('toggles edit mode when the edit mode item is pressed', async () => {
    const { getByTestId, getByText } = await render(
      <EditModeProvider>
        <GlassDrawerContent {...buildProps(jest.fn())} />
      </EditModeProvider>,
    );

    expect(getByText('Modo edición')).toBeTruthy();

    const flatStyle = () => {
      const style = getByTestId('drawer-edit-mode-toggle').props.style;
      return Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
    };

    expect(flatStyle().borderColor).not.toBe('rgba(255,255,255,0.22)');

    await fireEvent.press(getByTestId('drawer-edit-mode-toggle'));

    expect(flatStyle().borderColor).toBe('rgba(255,255,255,0.22)');

    await fireEvent.press(getByTestId('drawer-edit-mode-toggle'));

    expect(flatStyle().borderColor).not.toBe('rgba(255,255,255,0.22)');
  });
});
