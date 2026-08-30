import React from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { Home, Info, PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react-native';
import { useDashboardLayout } from './useBreakpoint';
import { useEditMode } from '../streamdeck/EditModeContext';
import { useTheme } from '../theme/ThemeContext';
import { blur, blurTypeForScheme, radius, space, type } from '../theme/glass';
import { ProfileSwitcher } from '../profiles/ProfileSwitcher';

// Maps the drawer's fixed route set to a representative icon for the
// collapsed (icon-only) rendering. The route set is small and static
// (Home/Settings/About), so a direct lookup is simpler than inventing a
// per-screen icon prop.
const ROUTE_ICONS: Record<string, typeof Home> = {
  Home,
  Settings,
  About: Info,
};

export type GlassDrawerContentProps = DrawerContentComponentProps & {
  collapsed: boolean;
  onToggleCollapse: () => void;
};

export function GlassDrawerContent({
  state,
  navigation,
  descriptors,
  collapsed,
  onToggleCollapse,
}: GlassDrawerContentProps) {
  const layout = useDashboardLayout();
  const { isEditMode, toggleEditMode } = useEditMode();
  const { scheme, colors: color } = useTheme();
  const styles = createStyles(color);

  // In 'appbar' mode the drawer is zero-width and meant to stay invisible until
  // swiped open. Android's native BlurView does not reliably respect a zero-width
  // RN parent (it can still paint at its last non-zero size), so we skip mounting
  // any drawer content at all outside 'drawer' layout rather than fight that.
  if (layout !== 'drawer') {
    return null;
  }

  const activeRouteName = state.routes[state.index].name;

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
          blurType={blurTypeForScheme(scheme)}
          blurAmount={blur.drawerAmount}
          reducedTransparencyFallbackColor={color.voidBottom}
        />
      )}
      <View style={[StyleSheet.absoluteFill, styles.tint]} />
      <View style={styles.items}>
        <View style={[styles.logoWrap, collapsed && styles.logoWrapCollapsed]}>
          {!collapsed && (
            <Image
              testID="drawer-logo"
              source={require('../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          )}
          <Pressable
            testID="drawer-collapse-toggle"
            onPress={onToggleCollapse}
            style={styles.collapseToggle}
            hitSlop={space.xs}>
            {collapsed ? (
              <PanelLeftOpen size={20} color={color.textSecondary} />
            ) : (
              <PanelLeftClose size={20} color={color.textSecondary} />
            )}
          </Pressable>
        </View>

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.drawerLabel ?? options.title ?? route.name;
          const active = state.index === index;
          const RouteIcon = ROUTE_ICONS[route.name];

          return (
            <Pressable
              key={route.key}
              testID={`drawer-${route.name}`}
              onPress={() => navigation.navigate(route.name)}
              style={[
                styles.item,
                active && styles.itemActive,
                collapsed && styles.itemCollapsed,
              ]}>
              {RouteIcon && (
                <RouteIcon
                  size={20}
                  color={active ? color.textPrimary : color.textSecondary}
                  style={collapsed ? undefined : styles.itemIcon}
                />
              )}
              {!collapsed && (
                <Text style={active ? styles.labelActive : styles.label}>
                  {typeof label === 'string' ? label : route.name}
                </Text>
              )}
            </Pressable>
          );
        })}

        {activeRouteName === 'Home' && (
          <Pressable
            testID="drawer-edit-mode-toggle"
            onPress={toggleEditMode}
            style={[
              styles.item,
              styles.editModeItem,
              isEditMode && styles.itemActive,
              collapsed && styles.itemCollapsed,
            ]}>
            {!collapsed && (
              <Text style={isEditMode ? styles.labelActive : styles.label}>Modo edición</Text>
            )}
            <View style={[styles.editModeDot, isEditMode && styles.editModeDotActive]} />
          </Pressable>
        )}

        <ProfileSwitcher variant="drawer" compact={collapsed} />
      </View>
    </View>
  );
}

function createStyles(color: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
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
      paddingTop: space.xl,
      paddingHorizontal: space.md,
    },
    logoWrap: {
      alignItems: 'center',
      marginBottom: space.xl,
    },
    logoWrapCollapsed: {
      alignItems: 'center',
    },
    logo: {
      width: 72,
      height: 62,
    },
    collapseToggle: {
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginTop: space.sm,
      padding: space.xs,
      borderRadius: radius.chip,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: space.md,
      paddingHorizontal: space.lg,
      borderRadius: radius.chip,
      marginBottom: space.xs,
    },
    itemCollapsed: {
      justifyContent: 'center',
      paddingHorizontal: space.sm,
    },
    itemIcon: {
      marginRight: space.sm,
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
    editModeItem: {
      marginTop: space.xl,
      borderTopWidth: 1,
      borderTopColor: color.panelBorder,
      paddingTop: space.lg + space.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    editModeDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: color.textMuted,
    },
    editModeDotActive: {
      backgroundColor: color.accent,
    },
  });
}
