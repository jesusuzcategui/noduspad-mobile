import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useThemeColors } from '../theme/ThemeContext';
import { radius, shadow, space, type } from '../theme/glass';

type CategoryNameModalTestIDs = {
  input: string;
  cancel: string;
  save: string;
};

const DEFAULT_TEST_IDS: CategoryNameModalTestIDs = {
  input: 'category-name-input',
  cancel: 'category-name-cancel',
  save: 'category-name-save',
};

type CategoryNameModalProps = {
  visible: boolean;
  title: string;
  initialValue?: string;
  onCancel: () => void;
  onSave: (name: string) => void;
  // Generic enough to reuse for any "prompt for a name" flow (e.g. profile
  // creation in src/profiles) without duplicating this modal's logic — pass
  // distinct testIDs so each caller's tests can target the right instance.
  testIDs?: CategoryNameModalTestIDs;
};

export function CategoryNameModal({
  visible,
  title,
  initialValue,
  onCancel,
  onSave,
  testIDs = DEFAULT_TEST_IDS,
}: CategoryNameModalProps) {
  const [name, setName] = useState(initialValue ?? '');
  const color = useThemeColors();
  const styles = createStyles(color);

  useEffect(() => {
    setName(initialValue ?? '');
  }, [visible, initialValue]);

  const trimmed = name.trim();
  const canSave = trimmed.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave(trimmed);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <TextInput
            testID={testIDs.input}
            style={styles.input}
            placeholderTextColor={color.textMuted}
            value={name}
            onChangeText={setName}
            autoFocus
          />
          <View style={styles.buttonRow}>
            <Pressable testID={testIDs.cancel} style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable
              testID={testIDs.save}
              style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
              disabled={!canSave}
              onPress={handleSave}>
              <Text style={styles.saveButtonText}>Guardar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
    input: {
      borderWidth: 1,
      borderColor: color.inputBorder,
      borderRadius: radius.input,
      backgroundColor: color.inputFill,
      color: color.textPrimary,
      paddingHorizontal: space.lg,
      paddingVertical: space.md,
      ...type.body,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: space.md,
      marginTop: space.xl,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: space.md,
      borderRadius: radius.input,
      borderWidth: 1,
      borderColor: color.inputBorder,
      alignItems: 'center',
    },
    cancelButtonText: {
      ...type.label,
      color: color.textSecondary,
    },
    saveButton: {
      flex: 1,
      paddingVertical: space.md,
      borderRadius: radius.input,
      backgroundColor: color.accent,
      alignItems: 'center',
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveButtonText: {
      ...type.label,
      color: '#ffffff',
    },
  });
}
