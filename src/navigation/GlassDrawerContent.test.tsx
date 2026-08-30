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

function buildProps(
  navigate: jest.Mock,
  activeIndex = 0,
  collapsed = false,
  onToggleCollapse: jest.Mock = jest.fn(),
) {
  return {
    state: { index: activeIndex, routes },
    navigation: { navigate },
    descriptors: {
      'Home-1': { options: { title: 'Home' } },
      'Settings-1': { options: { title: 'Settings' } },
    },
    collapsed,
    onToggleCollapse,
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

  it('renders the profile switcher pinned at the bottom', async () => {
    const { getByTestId } = await renderDrawer(buildProps(jest.fn()));
    expect(getByTestId('profile-switcher')).toBeTruthy();
    expect(getByTestId('profile-switcher-name').props.children).toBe('Perfil 1');
  });

  it('renders the collapse toggle and calls onToggleCollapse when pressed', async () => {
    const onToggleCollapse = jest.fn();
    const { getByTestId } = await renderDrawer(buildProps(jest.fn(), 0, false, onToggleCollapse));

    expect(getByTestId('drawer-collapse-toggle')).toBeTruthy();

    await fireEvent.press(getByTestId('drawer-collapse-toggle'));
    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it('shows nav item labels when expanded and hides them when collapsed', async () => {
    const expanded = await renderDrawer(buildProps(jest.fn(), 0, false));
    expect(expanded.getByText('Home')).toBeTruthy();
    expect(expanded.getByText('Settings')).toBeTruthy();
    expect(expanded.getByTestId('drawer-logo')).toBeTruthy();

    const collapsed = await renderDrawer(buildProps(jest.fn(), 0, true));
    expect(collapsed.queryByText('Home')).toBeNull();
    expect(collapsed.queryByText('Settings')).toBeNull();
    expect(collapsed.queryByTestId('drawer-logo')).toBeNull();
    // Nav items and the toggle stay tappable in the collapsed rail.
    expect(collapsed.getByTestId('drawer-Home')).toBeTruthy();
    expect(collapsed.getByTestId('drawer-collapse-toggle')).toBeTruthy();
  });

  it('hides the profile switcher name and the edit mode label when collapsed', async () => {
    const { getByTestId, queryByTestId, queryByText } = await renderDrawer(
      buildProps(jest.fn(), 0, true),
    );
    expect(getByTestId('profile-switcher')).toBeTruthy();
    expect(queryByTestId('profile-switcher-name')).toBeNull();
    expect(getByTestId('drawer-edit-mode-toggle')).toBeTruthy();
    expect(queryByText('Modo edición')).toBeNull();
  });
});
