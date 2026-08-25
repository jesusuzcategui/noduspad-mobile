import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { useDashboardLayout } from './useBreakpoint';
import { AppBar, DashboardRouteName } from './AppBar';
import type { DashboardDrawerParamList } from './DashboardShell';

export function ScreenWithAppBar({ children }: { children: React.ReactNode }) {
  const layout = useDashboardLayout();
  const navigation = useNavigation<DrawerNavigationProp<DashboardDrawerParamList>>();
  const route = useRoute();

  return (
    <View style={styles.container}>
      <View style={styles.content}>{children}</View>
      {layout === 'appbar' && (
        <AppBar
          activeRoute={route.name as DashboardRouteName}
          onNavigate={(name: DashboardRouteName) => navigation.navigate(name)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
});
