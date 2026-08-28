import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useProfileContext } from './ProfileContext';
import { CategoryNameModal } from '../streamdeck/CategoryNameModal';
import { useThemeColors } from '../theme/ThemeContext';
import { radius, shadow, space, type } from '../theme/glass';

type ProfileListModalProps = {
  visible: boolean;
  onClose: () => void;
};

const CREATE_PROFILE_TEST_IDS = {
  input: 'profile-name-input',
  cancel: 'profile-name-cancel',
  save: 'profile-name-save',
};

export function ProfileListModal({ visible, onClose }: ProfileListModalProps) {
  const { profiles, activeProfileId, switchProfile, createProfile } = useProfileContext();
  const [creating, setCreating] = useState(false);
  const color = useThemeColors();
  const styles = createStyles(color);

  const handleSwitch = (id: string) => {
    switchProfile(id);
    onClose();
  };

  const handleCreateSave = (name: string) => {
    createProfile(name);
    setCreating(false);
    onClose();
  };

  return (
    <>
      <Modal visible={visible && !creating} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable testID="profile-list-overlay" style={styles.overlay} onPress={onClose}>
          {/* eslint-disable-next-line react-native/no-inline-styles */}
          <Pressable style={styles.card} onPress={() => {}}>
            <Text style={styles.title}>Perfiles</Text>
            <FlatList
              testID="profile-list"
              data={profiles}
              keyExtractor={item => item.id}
              renderItem={({ item }) => {
                const active = item.id === activeProfileId;
                return (
                  <Pressable
                    testID={`profile-list-item-${item.id}`}
                    onPress={() => handleSwitch(item.id)}
                    style={[styles.row, active && styles.rowActive]}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{item.name.trim().charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={active ? styles.rowTextActive : styles.rowText}>{item.name}</Text>
                    {active && <View testID={`profile-list-item-${item.id}-active`} style={styles.activeDot} />}
                  </Pressable>
                );
              }}
            />
            <Pressable testID="profile-list-create" onPress={() => setCreating(true)} style={styles.createRow}>
              <Text style={styles.createText}>+ Nuevo perfil</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <CategoryNameModal
        visible={creating}
        title="Nuevo perfil"
        onCancel={() => setCreating(false)}
        onSave={handleCreateSave}
        testIDs={CREATE_PROFILE_TEST_IDS}
      />
    </>
  );
}

function createStyles(color: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
      paddingHorizontal: space.xl,
    },
    card: {
      width: '100%',
      maxHeight: '70%',
      backgroundColor: color.voidBottom,
      borderRadius: radius.panel,
      borderWidth: 1,
      borderColor: color.panelBorder,
      paddingHorizontal: space.xl,
      paddingVertical: space.xl,
      ...shadow.panel,
    },
    title: {
      ...type.title,
      fontSize: 18,
      color: color.textPrimary,
      marginBottom: space.lg,
      textAlign: 'center',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: space.md,
      paddingHorizontal: space.md,
      borderRadius: radius.chip,
      marginBottom: space.xs,
    },
    rowActive: {
      backgroundColor: color.panelFillPressed,
      borderWidth: 1,
      borderColor: color.panelHighlight,
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: color.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: space.sm,
    },
    avatarText: {
      ...type.label,
      color: '#ffffff',
    },
    rowText: {
      ...type.body,
      color: color.textSecondary,
      flex: 1,
    },
    rowTextActive: {
      ...type.body,
      color: color.textPrimary,
      fontWeight: '700',
      flex: 1,
    },
    activeDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: color.accent,
    },
    createRow: {
      marginTop: space.md,
      paddingVertical: space.md,
      borderRadius: radius.input,
      borderWidth: 1,
      borderColor: color.inputBorder,
      alignItems: 'center',
    },
    createText: {
      ...type.label,
      color: color.accent,
    },
  });
}
