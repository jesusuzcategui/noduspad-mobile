import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { QUICK_ICON_NAMES, StreamDeckIcon, type StreamDeckIconName } from './StreamDeckIcon';
import { IconPickerModal } from './IconPickerModal';
import { OBS_COMMANDS, fetchOBSScenes, type OBSCommandKey } from '../obs/obsCommands';
import { listCommands, type CommandDTO } from '../commandServer/commandServerClient';
import { useThemeColors } from '../theme/ThemeContext';
import type { StreamDeckButton } from './types';
import { radius, shadow, space, type } from '../theme/glass';

const ICON_OPTIONS = QUICK_ICON_NAMES;

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
  const [iconPickerVisible, setIconPickerVisible] = useState(false);
  const [commandKey, setCommandKey] = useState<OBSCommandKey | null>(null);
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const [scenes, setScenes] = useState<string[] | null>(null);
  const [scenesLoading, setScenesLoading] = useState(false);
  const [scenesError, setScenesError] = useState<string | null>(null);
  const [existingCommands, setExistingCommands] = useState<CommandDTO[] | null>(null);
  const [commandsError, setCommandsError] = useState<string | null>(null);
  const [selectedCommandId, setSelectedCommandId] = useState<string | null>(null);
  const isQuickIcon = (ICON_OPTIONS as string[]).includes(icon);
  const color = useThemeColors();
  const styles = createStyles(color);

  useEffect(() => {
    if (!button) return;
    setLabel(button.label);
    setIcon(button.icon);
    setBackgroundColor(button.background.type === 'color' ? button.background.color : COLOR_OPTIONS[0]);
    setActionType(button.action.type);
    setActionLabel(button.action.label);
    setCommandKey(button.action.command ?? null);
    setSelectedScene(button.action.sceneName ?? null);
    setScenes(null);
    setScenesError(null);
    setSelectedCommandId(button.action.commandId ?? null);
    setExistingCommands(null);
    setCommandsError(null);
  }, [button]);

  const handleActionTypeChange = (type: 'obs' | 'command') => {
    setActionType(type);
    if (type === 'command' && existingCommands === null) {
      listCommands()
        .then(setExistingCommands)
        .catch(err => setCommandsError(err instanceof Error ? err.message : 'No se pudo conectar al server'));
    }
  };

  const handleSelectCommand = (key: OBSCommandKey) => {
    setCommandKey(key);
    const command = OBS_COMMANDS.find(c => c.key === key)!;
    if (!command.needsScene) {
      setActionLabel(command.label);
      setSelectedScene(null);
      return;
    }
    if (scenes) return;
    setScenesLoading(true);
    setScenesError(null);
    fetchOBSScenes()
      .then(setScenes)
      .catch(err => setScenesError(err instanceof Error ? err.message : 'No se pudo conectar a OBS'))
      .finally(() => setScenesLoading(false));
  };

  if (!button) return null;

  const handleSave = () => {
    onSave(button.id, {
      label: label.trim() || button.label,
      icon,
      background: { type: 'color', color: backgroundColor },
      action: {
        type: actionType,
        label: actionLabel.trim() || label.trim() || button.label,
        ...(actionType === 'obs' && commandKey ? { command: commandKey } : {}),
        ...(actionType === 'obs' && commandKey === 'change-scene' && selectedScene
          ? { sceneName: selectedScene }
          : {}),
        ...(actionType === 'command' && selectedCommandId ? { commandId: selectedCommandId } : {}),
      },
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
                <Pressable
                  testID="editor-icon-more"
                  onPress={() => setIconPickerVisible(true)}
                  style={[styles.iconSwatch, !isQuickIcon && styles.iconSwatchActive]}>
                  {isQuickIcon ? (
                    <Text style={styles.moreLabel}>+</Text>
                  ) : (
                    <StreamDeckIcon name={icon} size={24} color={color.textPrimary} />
                  )}
                </Pressable>
              </View>

              <IconPickerModal
                visible={iconPickerVisible}
                onClose={() => setIconPickerVisible(false)}
                onSelect={setIcon}
              />

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
                  onPress={() => handleActionTypeChange('obs')}
                  style={[styles.segment, actionType === 'obs' && styles.segmentActive]}>
                  <Text style={actionType === 'obs' ? styles.segmentTextActive : styles.segmentText}>OBS</Text>
                </Pressable>
                <Pressable
                  testID="editor-action-command"
                  onPress={() => handleActionTypeChange('command')}
                  style={[styles.segment, actionType === 'command' && styles.segmentActive]}>
                  <Text style={actionType === 'command' ? styles.segmentTextActive : styles.segmentText}>
                    Comando
                  </Text>
                </Pressable>
              </View>

              {actionType === 'obs' && (
                <>
                  <Text style={styles.label}>Comando OBS</Text>
                  <View style={styles.commandWrap}>
                    {OBS_COMMANDS.map(command => (
                      <Pressable
                        key={command.key}
                        testID={`editor-command-${command.key}`}
                        onPress={() => handleSelectCommand(command.key)}
                        style={[styles.commandChip, commandKey === command.key && styles.commandChipActive]}>
                        <Text
                          style={
                            commandKey === command.key ? styles.commandChipTextActive : styles.commandChipText
                          }>
                          {command.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {commandKey === 'change-scene' && (
                    <View style={styles.sceneBox}>
                      {scenesLoading && <ActivityIndicator testID="editor-scenes-loading" color={color.accent} />}
                      {scenesError && (
                        <View>
                          <Text testID="editor-scenes-error" style={styles.errorText}>
                            {scenesError}
                          </Text>
                          <Pressable testID="editor-scenes-retry" onPress={() => handleSelectCommand('change-scene')}>
                            <Text style={styles.retryText}>Reintentar</Text>
                          </Pressable>
                        </View>
                      )}
                      {scenes && (
                        <View style={styles.commandWrap}>
                          {scenes.map(sceneName => (
                            <Pressable
                              key={sceneName}
                              testID={`editor-scene-${sceneName}`}
                              onPress={() => {
                                setSelectedScene(sceneName);
                                setActionLabel(`Cambiar a ${sceneName}`);
                              }}
                              style={[
                                styles.commandChip,
                                selectedScene === sceneName && styles.commandChipActive,
                              ]}>
                              <Text
                                style={
                                  selectedScene === sceneName
                                    ? styles.commandChipTextActive
                                    : styles.commandChipText
                                }>
                                {sceneName}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </>
              )}

              {actionType === 'command' && (
                <View style={styles.sceneBox}>
                  {commandsError && (
                    <Text testID="editor-commands-error" style={styles.errorText}>
                      {commandsError}
                    </Text>
                  )}
                  {existingCommands === null && !commandsError && <ActivityIndicator color={color.accent} />}
                  {existingCommands && (
                    <View style={styles.commandWrap}>
                      {existingCommands.map(cmd => (
                        <Pressable
                          key={cmd.id}
                          testID={`editor-existing-command-${cmd.id}`}
                          onPress={() => {
                            setSelectedCommandId(cmd.id);
                            setActionLabel(cmd.label);
                          }}
                          style={[styles.commandChip, selectedCommandId === cmd.id && styles.commandChipActive]}>
                          <Text
                            style={
                              selectedCommandId === cmd.id ? styles.commandChipTextActive : styles.commandChipText
                            }>
                            {cmd.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              )}

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

function createStyles(color: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
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
  moreLabel: {
    ...type.label,
    fontSize: 20,
    color: color.textSecondary,
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
  commandWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  commandChip: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: color.inputBorder,
    backgroundColor: color.inputFill,
  },
  commandChipActive: {
    borderColor: color.accent,
    backgroundColor: color.accent,
  },
  commandChipText: {
    ...type.label,
    color: color.textSecondary,
  },
  commandChipTextActive: {
    ...type.label,
    color: '#ffffff',
  },
  sceneBox: {
    marginTop: space.sm,
  },
  errorText: {
    ...type.caption,
    color: '#d9534f',
    marginBottom: space.xs,
  },
  retryText: {
    ...type.label,
    color: color.accent,
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
}
