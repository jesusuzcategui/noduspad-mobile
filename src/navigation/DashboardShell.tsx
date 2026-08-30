import React, { useState } from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useDashboardLayout } from './useBreakpoint';
import { GlassDrawerContent } from './GlassDrawerContent';
import { HomeScreen } from '../screens/HomeScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AboutScreen } from '../screens/AboutScreen';
import { EditModeProvider } from '../streamdeck/EditModeContext';
import { ProfileProvider } from '../profiles/ProfileContext';

export type DashboardDrawerParamList = {
  Home: undefined;
  Settings: undefined;
  About: undefined;
};

const Drawer = createDrawerNavigator<DashboardDrawerParamList>();

// Fixed/expanded width of the permanent tablet sidebar (GlassDrawerContent).
const DRAWER_WIDTH_EXPANDED = 260;
// Slim icon-only rail width when the sidebar is collapsed. Wide enough to fit
// GlassDrawerContent's `item` padding (space.lg horizontal) plus a 24x24 icon
// without clipping.
const DRAWER_WIDTH_COLLAPSED = 72;

export function DashboardShell() {
  const layout = useDashboardLayout();
  const isDrawerLayout = layout === 'drawer';
  const [collapsed, setCollapsed] = useState(false);

  const drawerWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED;

  return (
    <ProfileProvider>
      <EditModeProvider>
        <Drawer.Navigator
          drawerContent={props => (
            <GlassDrawerContent
              {...props}
              collapsed={isDrawerLayout && collapsed}
              onToggleCollapse={() => setCollapsed(c => !c)}
            />
          )}
          screenOptions={{
            headerShown: false,
            drawerType: isDrawerLayout ? 'permanent' : 'front',
            drawerStyle: isDrawerLayout ? { width: drawerWidth } : { width: 0 },
            swipeEnabled: isDrawerLayout,
          }}>
          <Drawer.Screen name="Home" component={HomeScreen} />
          <Drawer.Screen name="Settings" component={SettingsScreen} />
          <Drawer.Screen name="About" component={AboutScreen} />
        </Drawer.Navigator>
      </EditModeProvider>
    </ProfileProvider>
  );
}
