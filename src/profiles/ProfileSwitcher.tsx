import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useProfileContext } from './ProfileContext';
import { ProfileListModal } from './ProfileListModal';
import { useThemeColors } from '../theme/ThemeContext';
import { radius, space, type } from '../theme/glass';

type ProfileSwitcherProps = {
  // 'drawer': stacked avatar+name pinned to the bottom of the tablet/landscape
  // drawer (GlassDrawerContent). 'pill': same content styled as a pill row
  // item, for the phone/portrait AppBar.
  variant?: 'drawer' | 'pill';
};

export function ProfileSwitcher({ variant = 'drawer' }: ProfileSwitcherProps) {
  const { profiles, activeProfileId } = useProfileContext();
  const [modalVisible, setModalVisible] = useState(false);
  const color = useThemeColors();
  const styles = createStyles(color);

  const activeProfile = profiles.find(profile => profile.id === activeProfileId) ?? profiles[0];
  const initial = (activeProfile?.name ?? '?').trim().charAt(0).toUpperCase() || '?';

  return (
    <>
      <Pressable
        testID="profile-switcher"
        onPress={() => setModalVisible(true)}
        style={variant === 'pill' ? styles.pillContainer : styles.container}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text
          testID="profile-switcher-name"
          style={variant === 'pill' ? styles.pillName : styles.name}
          numberOfLines={1}>
          {activeProfile?.name}
        </Text>
      </Pressable>
      <ProfileListModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </>
  );
}

function createStyles(color: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: space.md,
      paddingHorizontal: space.sm,
      borderRadius: radius.chip,
      marginTop: 'auto',
      borderTopWidth: 1,
      borderTopColor: color.panelBorder,
      paddingTop: space.lg,
    },
    pillContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: space.sm,
      paddingVertical: space.xs,
      borderRadius: radius.pill,
    },
    avatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: color.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: space.sm,
    },
    avatarText: {
      ...type.label,
      color: '#ffffff',
    },
    name: {
      ...type.body,
      color: color.textSecondary,
      flexShrink: 1,
    },
    pillName: {
      ...type.caption,
      color: color.textMuted,
      maxWidth: 72,
    },
  });
}
