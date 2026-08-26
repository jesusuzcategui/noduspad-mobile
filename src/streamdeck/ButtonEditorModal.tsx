import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StreamDeckIcon, type StreamDeckIconName } from './StreamDeckIcon';
import type { StreamDeckButton } from './types';
import { color, radius, shadow, space, type } from '../theme/glass';

const ICON_OPTIONS: StreamDeckIconName[] = ['movie-outline', 'microphone', 'camera', 'lock-outline', 'console'];

const COLOR_OPTIONS = ['#3a7bfd', '#2f9e6f', '#d9534f', '#9b59b6', '#5a6270', '#1a1a1a'];

type ButtonEditorModalProps = {
  button: StreamDeckButton | null;
  onClose: () => void;
  onSave: (buttonId: string, updates: Partial<StreamDeckButton>) => void;
};

export function ButtonEditorModal({ button, onClose, onSave }: ButtonEditorModalProps) {
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState<StreamDeckIconName>('movie-outline');
  const [backgroundColor, setBackgroundColor] = useState(COLOR_OPTIONS[0]);
  const [actionType, setActionType] = useState<'obs' | 'command'>('obs');
  const [actionLabel, setActionLabel] = useState('');

  useEffect(() => {
    if (!button) return;
    setLabel(button.label);
    setIcon(button.icon);
    setBackgroundColor(button.background.type === 'color' ? button.background.color : COLOR_OPTIONS[0]);
    setActionType(button.action.type);
    setActionLabel(button.action.label);
  }, [button]);

  if (!button) return null;

  const handleSave = () => {
    onSave(button.id, {
      label: label.trim() || button.label,
      icon,
      background: { type: 'color', color: backgroundColor },
      action: { type: actionType, label: actionLabel.trim() || label.trim() || button.label },
    });
    onClose();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -150}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
              <Text style={styles.title}>Editar botón</Text>

              <Text style={styles.label}>Nombre</Text>
              <TextInput
                testID="editor-label"
                style={styles.input}
                placeholderTextColor={color.textMuted}
                value={label}
                onChangeText={setLabel}
              />

              <Text style={styles.label}>Ícono</Text>
              <View style={styles.iconRow}>
                {ICON_OPTIONS.map(name => (
                  <Pressable
                    key={name}
                    testID={`editor-icon-${name}`}
                    onPress={() => setIcon(name)}
                    style={[styles.iconSwatch, icon === name && styles.iconSwatchActive]}>
                    <StreamDeckIcon name={name} size={24} color={color.textPrimary} />
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Color</Text>
              <View style={styles.colorRow}>
                {COLOR_OPTIONS.map(hex => (
                  <Pressable
                    key={hex}
                    testID={`editor-color-${hex}`}
                    onPress={() => setBackgroundColor(hex)}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: hex },
                      backgroundColor === hex && styles.colorSwatchActive,
                    ]}
                  />
                ))}
              </View>

              <Text style={styles.label}>Tipo de acción</Text>
              <View style={styles.segmentRow}>
                <Pressable
                  testID="editor-action-obs"
                  onPress={() => setActionType('obs')}
                  style={[styles.segment, actionType === 'obs' && styles.segmentActive]}>
                  <Text style={actionType === 'obs' ? styles.segmentTextActive : styles.segmentText}>OBS</Text>
                </Pressable>
                <Pressable
                  testID="editor-action-command"
                  onPress={() => setActionType('command')}
                  style={[styles.segment, actionType === 'command' && styles.segmentActive]}>
                  <Text style={actionType === 'command' ? styles.segmentTextActive : styles.segmentText}>
                    Comando
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.label}>Descripción de la acción</Text>
              <TextInput
                testID="editor-action-label"
                style={styles.input}
                placeholderTextColor={color.textMuted}
                value={actionLabel}
                onChangeText={setActionLabel}
              />

              <View style={styles.buttonRow}>
                <Pressable testID="editor-cancel" style={styles.cancelButton} onPress={onClose}>
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </Pressable>
                <Pressable testID="editor-save" style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>Guardar</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.xl,
  },
  card: {
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
    fontSize: 20,
    color: color.textPrimary,
    marginBottom: space.lg,
    textAlign: 'center',
  },
  label: {
    ...type.caption,
    color: color.textSecondary,
    marginBottom: space.xs,
    marginTop: space.sm,
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
  iconRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  iconSwatch: {
    width: 48,
    height: 48,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: color.inputBorder,
    backgroundColor: color.inputFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSwatchActive: {
    borderColor: color.accent,
    borderWidth: 2,
  },
  colorRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchActive: {
    borderColor: color.textPrimary,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  segment: {
    flex: 1,
    paddingVertical: space.sm + 2,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: color.inputBorder,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: color.accent,
    borderColor: color.accent,
  },
  segmentText: {
    ...type.label,
    color: color.textSecondary,
  },
  segmentTextActive: {
    ...type.label,
    color: '#ffffff',
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
  saveButtonText: {
    ...type.label,
    color: '#ffffff',
  },
});
