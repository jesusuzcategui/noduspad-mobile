import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useDashboardLayout } from './useBreakpoint';
import { blur, color, radius, space, type } from '../theme/glass';

export function GlassDrawerContent({ state, navigation, descriptors }: DrawerContentComponentProps) {
  const layout = useDashboardLayout();

  // In 'appbar' mode the drawer is zero-width and meant to stay invisible until
  // swiped open. Android's native BlurView does not reliably respect a zero-width
  // RN parent (it can still paint at its last non-zero size), so we skip mounting
  // any drawer content at all outside 'drawer' layout rather than fight that.
  if (layout !== 'drawer') {
    return null;
  }

  return (
    <View style={styles.root}>
      {/* @react-native-community/blur has no true native blur on Android — it falls
          back to compositing a near-opaque dark layer, and (per this component's own
          history) does not reliably respect its parent's bounds there either, so it
          can paint over content well outside the drawer. iOS has a real backdrop
          blur, so keep it there only; Android keeps the solid `tint` below. */}
      {Platform.OS === 'ios' && (
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType={blur.drawerType}
          blurAmount={blur.drawerAmount}
          reducedTransparencyFallbackColor={color.voidBottom}
        />
      )}
      <View style={[StyleSheet.absoluteFill, styles.tint]} />
      <View style={styles.items}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.drawerLabel ?? options.title ?? route.name;
          const active = state.index === index;

          return (
            <Pressable
              key={route.key}
              testID={`drawer-${route.name}`}
              onPress={() => navigation.navigate(route.name)}
              style={[styles.item, active && styles.itemActive]}>
              <Text style={active ? styles.labelActive : styles.label}>
                {typeof label === 'string' ? label : route.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: color.panelBorder,
  },
  tint: {
    backgroundColor: color.panelFill,
  },
  items: {
    flex: 1,
    paddingTop: space.xxl,
    paddingHorizontal: space.md,
  },
  item: {
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.chip,
    marginBottom: space.xs,
  },
  itemActive: {
    backgroundColor: color.panelFillPressed,
    borderWidth: 1,
    borderColor: color.panelHighlight,
  },
  label: {
    ...type.body,
    color: color.textSecondary,
  },
  labelActive: {
    ...type.body,
    color: color.textPrimary,
    fontWeight: '700',
  },
});
