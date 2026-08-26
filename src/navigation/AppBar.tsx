import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassPanel } from '../theme/GlassPanel';
import { useEditMode } from '../streamdeck/EditModeContext';
import { blur, color, radius, space, type } from '../theme/glass';

export type DashboardRouteName = 'Home' | 'Settings' | 'About';

const ROUTES: DashboardRouteName[] = ['Home', 'Settings', 'About'];

type AppBarProps = {
  activeRoute: DashboardRouteName;
  onNavigate: (route: DashboardRouteName) => void;
};

export function AppBar({ activeRoute, onNavigate }: AppBarProps) {
  const insets = useSafeAreaInsets();
  const { isEditMode, toggleEditMode } = useEditMode();

  return (
    <View style={[styles.floatWrap, { paddingBottom: insets.bottom + space.md }]}>
      <GlassPanel
        style={styles.container}
        radius={radius.pill}
        blurAmount={blur.appBarAmount}>
        {ROUTES.map(route => {
          const active = activeRoute === route;
          return (
            <Pressable
              key={route}
              testID={`appbar-${route}`}
              style={styles.item}
              onPress={() => onNavigate(route)}>
              <View style={[styles.pill, active && styles.pillActive]}>
                <Text style={active ? styles.activeLabel : styles.label}>{route}</Text>
              </View>
            </Pressable>
          );
        })}
        <Pressable testID="appbar-edit-mode-toggle" style={styles.item} onPress={toggleEditMode}>
          <View style={[styles.pill, isEditMode && styles.pillActive]}>
            <Text style={isEditMode ? styles.activeLabel : styles.label}>Editar</Text>
          </View>
        </Pressable>
      </GlassPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  floatWrap: {
    paddingHorizontal: space.lg,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 64,
    paddingHorizontal: space.sm,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 2,
    borderRadius: radius.pill,
  },
  pillActive: {
    backgroundColor: color.accentGlow,
  },
  label: {
    ...type.caption,
    color: color.textMuted,
  },
  activeLabel: {
    ...type.caption,
    color: color.textPrimary,
    fontWeight: '700',
  },
});
