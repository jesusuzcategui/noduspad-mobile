import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useDashboardLayout } from './useBreakpoint';
import { GlassDrawerContent } from './GlassDrawerContent';
import { HomeScreen } from '../screens/HomeScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AboutScreen } from '../screens/AboutScreen';

export type DashboardDrawerParamList = {
  Home: undefined;
  Settings: undefined;
  About: undefined;
};

const Drawer = createDrawerNavigator<DashboardDrawerParamList>();

export function DashboardShell() {
  const layout = useDashboardLayout();
  const isDrawerLayout = layout === 'drawer';

  return (
    <Drawer.Navigator
      drawerContent={GlassDrawerContent}
      screenOptions={{
        headerShown: false,
        drawerType: isDrawerLayout ? 'permanent' : 'front',
        drawerStyle: isDrawerLayout ? { width: 260 } : { width: 0 },
        swipeEnabled: isDrawerLayout,
      }}>
      <Drawer.Screen name="Home" component={HomeScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
      <Drawer.Screen name="About" component={AboutScreen} />
    </Drawer.Navigator>
  );
}
