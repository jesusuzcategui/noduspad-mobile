import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GlassDrawerContent } from './GlassDrawerContent';
import { EditModeProvider } from '../streamdeck/EditModeContext';
import { AllThemeProviders } from '../testUtils/AllThemeProviders';
import { lightColor } from '../theme/glass';

jest.mock('./useBreakpoint', () => ({
  useDashboardLayout: jest.fn(() => 'drawer'),
}));

const routes = [
  { key: 'Home-1', name: 'Home' },
  { key: 'Settings-1', name: 'Settings' },
];

function buildProps(navigate: jest.Mock, activeIndex = 0) {
  return {
    state: { index: activeIndex, routes },
    navigation: { navigate },
    descriptors: {
      'Home-1': { options: { title: 'Home' } },
      'Settings-1': { options: { title: 'Settings' } },
    },
  } as any;
}

function renderDrawer(props: ReturnType<typeof buildProps>) {
  return render(
    <AllThemeProviders>
      <EditModeProvider>
        <GlassDrawerContent {...props} />
      </EditModeProvider>
    </AllThemeProviders>,
  );
}

describe('GlassDrawerContent', () => {
  it('renders a nav item per route and navigates on press', async () => {
    const navigate = jest.fn();
    const { getByTestId } = await renderDrawer(buildProps(navigate));

    await fireEvent.press(getByTestId('drawer-Settings'));
    expect(navigate).toHaveBeenCalledWith('Settings');
  });

  it('renders the logo', async () => {
    const { getByTestId } = await renderDrawer(buildProps(jest.fn()));
    expect(getByTestId('drawer-logo')).toBeTruthy();
  });

  it('shows the edit mode item only when Home is the active route', async () => {
    const onHome = await renderDrawer(buildProps(jest.fn(), 0));
    expect(onHome.getByTestId('drawer-edit-mode-toggle')).toBeTruthy();

    const onSettings = await renderDrawer(buildProps(jest.fn(), 1));
    expect(onSettings.queryByTestId('drawer-edit-mode-toggle')).toBeNull();
  });

  it('toggles edit mode when the edit mode item is pressed', async () => {
    const { getByTestId, getByText } = await renderDrawer(buildProps(jest.fn()));

    expect(getByText('Modo edición')).toBeTruthy();

    const flatStyle = () => {
      const style = getByTestId('drawer-edit-mode-toggle').props.style;
      return Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
    };

    expect(flatStyle().borderColor).not.toBe(lightColor.panelHighlight);

    await fireEvent.press(getByTestId('drawer-edit-mode-toggle'));

    expect(flatStyle().borderColor).toBe(lightColor.panelHighlight);

    await fireEvent.press(getByTestId('drawer-edit-mode-toggle'));

    expect(flatStyle().borderColor).not.toBe(lightColor.panelHighlight);
  });
});
