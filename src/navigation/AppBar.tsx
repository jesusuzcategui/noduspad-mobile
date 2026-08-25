import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type DashboardRouteName = 'Home' | 'Settings' | 'About';

const ROUTES: DashboardRouteName[] = ['Home', 'Settings', 'About'];

type AppBarProps = {
  activeRoute: DashboardRouteName;
  onNavigate: (route: DashboardRouteName) => void;
};

export function AppBar({ activeRoute, onNavigate }: AppBarProps) {
  return (
    <View style={styles.container}>
      {ROUTES.map(route => (
        <Pressable
          key={route}
          testID={`appbar-${route}`}
          style={styles.item}
          onPress={() => onNavigate(route)}>
          <Text style={activeRoute === route ? styles.activeLabel : styles.label}>{route}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 56,
    backgroundColor: '#161616',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#8a8a8a',
    fontSize: 12,
  },
  activeLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
