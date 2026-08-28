import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { deletePersistedButtonImage, isPersistedButtonImageUri, persistButtonImage } from './buttonImageStorage';
import { ColorPicker } from './ColorPicker';
import { QUICK_ICON_NAMES, StreamDeckIcon, type StreamDeckIconName } from './StreamDeckIcon';
import { IconPickerModal } from './IconPickerModal';
import { OBS_COMMANDS, fetchOBSScenes, type OBSCommandKey } from '../obs/obsCommands';
import { createCommand, listCommands, type CommandDTO, type CommandKind } from '../commandServer/commandServerClient';
import { useThemeColors } from '../theme/ThemeContext';
import type { StreamDeckButton } from './types';
import { radius, shadow, space, type } from '../theme/glass';

const ICON_OPTIONS = QUICK_ICON_NAMES;

// Quick-pick shortcuts shown above the free-color picker for both the
// background and icon/label colors.
const COLOR_OPTIONS = ['#3a7bfd', '#2f9e6f', '#d9534f', '#9b59b6', '#5a6270', '#1a1a1a'];
const DEFAULT_ICON_COLOR = '#ffffff';

// Matches the fixed media_key targets the noduspad-pc server accepts.
const MEDIA_KEY_OPTIONS: { target: string; label: string }[] = [
  { target: 'play_pause', label: 'Play/Pause' },
  { target: 'next', label: 'Siguiente' },
  { target: 'prev', label: 'Anterior' },
  { target: 'vol_up', label: 'Subir volumen' },
  { target: 'vol_down', label: 'Bajar volumen' },
  { target: 'mute', label: 'Silenciar' },
];

type ButtonEditorModalProps = {
  button: StreamDeckButton | null;
  categories?: { id: string; name: string }[];
  currentCategoryId?: string | null;
  onMoveCategory?: (categoryId: string) => void;
  onClose: () => void;
  onSave: (buttonId: string, updates: Partial<StreamDeckButton>) => void;
};

export function ButtonEditorModal({
  button,
  categories = [],
  currentCategoryId = null,
  onMoveCategory,
  onClose,
  onSave,
}: ButtonEditorModalProps) {
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState<StreamDeckIconName>('movie-outline');
  const [backgroundColor, setBackgroundColor] = useState(COLOR_OPTIONS[0]);
  const [iconColor, setIconColor] = useState(DEFAULT_ICON_COLOR);
  const [backgroundType, setBackgroundType] = useState<'color' | 'image'>('color');
  const [backgroundUri, setBackgroundUri] = useState<string | null>(null);
  const [imagePickerError, setImagePickerError] = useState<string | null>(null);
  const [imagePickerBusy, setImagePickerBusy] = useState(false);
  // The persisted image path the modal opened with, so handleSave can clean
  // up the old file on disk if the user picks a different image, or moves
  // away from an image background, before saving.
  const [initialPersistedUri, setInitialPersistedUri] = useState<string | null>(null);
  const [hideIcon, setHideIcon] = useState(false);
  const [hideLabel, setHideLabel] = useState(false);
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
  const [creatingCommand, setCreatingCommand] = useState(false);
  const [newCommandKind, setNewCommandKind] = useState<CommandKind>('media_key');
  const [newCommandLabel, setNewCommandLabel] = useState('');
  const [newCommandTarget, setNewCommandTarget] = useState('');
  const [createCommandBusy, setCreateCommandBusy] = useState(false);
  const [createCommandError, setCreateCommandError] = useState<string | null>(null);
  const isQuickIcon = (ICON_OPTIONS as string[]).includes(icon);
  const color = useThemeColors();
  const styles = createStyles(color);

  useEffect(() => {
    if (!button) return;
    setLabel(button.label);
    setIcon(button.icon);
    setBackgroundColor(button.background.type === 'color' ? button.background.color : COLOR_OPTIONS[0]);
    setIconColor(button.iconColor ?? DEFAULT_ICON_COLOR);
    setBackgroundType(button.background.type === 'image' ? 'image' : 'color');
    setBackgroundUri(button.background.type === 'image' ? button.background.uri : null);
    setImagePickerError(null);
    setImagePickerBusy(false);
    setInitialPersistedUri(
      button.background.type === 'image' && isPersistedButtonImageUri(button.background.uri)
        ? button.background.uri
        : null,
    );
    setHideIcon(button.hideIcon ?? false);
    setHideLabel(button.hideLabel ?? false);
    setActionType(button.action.type);
    setActionLabel(button.action.label);
    setCommandKey(button.action.command ?? null);
    setSelectedScene(button.action.sceneName ?? null);
    setScenes(null);
    setScenesError(null);
    setSelectedCommandId(button.action.commandId ?? null);
    setExistingCommands(null);
    setCommandsError(null);
    setCreatingCommand(false);
    setNewCommandKind('media_key');
    setNewCommandLabel('');
    setNewCommandTarget('');
    setCreateCommandError(null);
  }, [button]);

  const handleCreateCommand = () => {
    const target = newCommandKind === 'launch_app' ? newCommandTarget.trim() : newCommandTarget;
    if (newCommandKind === 'launch_app' && !target) {
      setCreateCommandError('Escribí el comando a ejecutar');
      return;
    }
    const label =
      newCommandLabel.trim() || (newCommandKind === 'media_key' ? MEDIA_KEY_OPTIONS.find(o => o.target === target)?.label ?? target : target);
    setCreateCommandBusy(true);
    setCreateCommandError(null);
    createCommand(label, newCommandKind, target)
      .then(created => {
        setExistingCommands(prev => [...(prev ?? []), created]);
        setSelectedCommandId(created.id);
        setActionLabel(created.label);
        setCreatingCommand(false);
        setNewCommandLabel('');
        setNewCommandTarget('');
      })
      .catch(err => setCreateCommandError(err instanceof Error ? err.message : 'No se pudo crear el comando'))
      .finally(() => setCreateCommandBusy(false));
  };

  // Fetches the command list whenever the editor is showing the "Comando"
  // action type and we don't have it yet — not just when the user presses
  // the segment. Without this, opening the editor on a button whose
  // action.type is ALREADY 'command' (e.g. a seeded button) never triggers
  // a fetch, leaving the picker's spinner spinning forever.
  useEffect(() => {
    if (actionType !== 'command' || existingCommands !== null) return;
    listCommands()
      .then(setExistingCommands)
      .catch(err => setCommandsError(err instanceof Error ? err.message : 'No se pudo conectar al server'));
  }, [actionType, existingCommands]);

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

  const handlePickImage = () => {
    setImagePickerError(null);
    // quality: 1 (no re-compression) — 0.8 visibly softened/pixelated small
    // button-tile thumbnails on real devices; button tiles are small enough
    // on screen that JPEG re-encoding artifacts show up disproportionately.
    launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, quality: 1 }, response => {
      if (response.didCancel) return;
      if (response.errorCode) {
        setImagePickerError(response.errorMessage ?? 'No se pudo seleccionar la imagen');
        return;
      }
      const uri = response.assets?.[0]?.uri;
      if (!uri || !button) return;
      // The picker's `content://` URI isn't a stable full-resolution
      // reference across app restarts on Android — copy it into our own
      // storage right away and use THAT path as the button's background.
      setImagePickerBusy(true);
      persistButtonImage(uri, button.id)
        .then(persistedUri => {
          // Fall back to the raw picker uri rather than losing the picked
          // image entirely if the copy failed for some reason.
          setBackgroundUri(persistedUri ?? uri);
        })
        .finally(() => setImagePickerBusy(false));
    });
  };

  if (!button) return null;

  const handleSave = () => {
    const finalImageUri = backgroundType === 'image' && backgroundUri ? backgroundUri : null;
    onSave(button.id, {
      label: label.trim() || button.label,
      icon,
      iconColor,
      background:
        backgroundType === 'image' && backgroundUri
          ? { type: 'image', uri: backgroundUri }
          : { type: 'color', color: backgroundColor },
      hideIcon: backgroundType === 'image' && hideIcon,
      hideLabel: backgroundType === 'image' && hideLabel,
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
    // Clean up the previously persisted image file once the new state is
    // saved — covers picking a replacement image, and moving away from an
    // image background entirely. Never blocks the save on failure.
    if (initialPersistedUri && initialPersistedUri !== finalImageUri) {
      deletePersistedButtonImage(initialPersistedUri);
    }
    onClose();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      {/* RN's Modal renders into a separate native root (its own Android
          Window / iOS UIWindow), which is not a descendant of App.tsx's
          top-level GestureHandlerRootView — react-native-gesture-handler's
          GestureDetector needs its own GestureHandlerRootView ancestor
          inside that separate root, or drag gestures (the ColorPicker
          sliders) silently receive no touches at all. */}
      <GestureHandlerRootView style={styles.flex}>
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

              <Text style={styles.label}>Fondo</Text>
              <View style={styles.segmentRow}>
                <Pressable
                  testID="editor-background-color"
                  onPress={() => setBackgroundType('color')}
                  style={[styles.segment, backgroundType === 'color' && styles.segmentActive]}>
                  <Text style={backgroundType === 'color' ? styles.segmentTextActive : styles.segmentText}>
                    Color
                  </Text>
                </Pressable>
                <Pressable
                  testID="editor-background-image"
                  onPress={() => setBackgroundType('image')}
                  style={[styles.segment, backgroundType === 'image' && styles.segmentActive]}>
                  <Text style={backgroundType === 'image' ? styles.segmentTextActive : styles.segmentText}>
                    Imagen
                  </Text>
                </Pressable>
              </View>

              {backgroundType === 'color' && (
                <>
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
                  <ColorPicker testID="editor-background-color-picker" value={backgroundColor} onChange={setBackgroundColor} />
                </>
              )}

              <Text style={styles.label}>Color de ícono/texto</Text>
              <ColorPicker testID="editor-icon-color-picker" value={iconColor} onChange={setIconColor} />

              {backgroundType === 'image' && (
                <View style={styles.sceneBox}>
                  <Pressable
                    testID="editor-pick-image"
                    style={styles.pickImageButton}
                    disabled={imagePickerBusy}
                    onPress={handlePickImage}>
                    {imagePickerBusy ? (
                      <ActivityIndicator testID="editor-pick-image-busy" color={color.textSecondary} />
                    ) : (
                      <Text style={styles.pickImageButtonText}>Elegir imagen</Text>
                    )}
                  </Pressable>
                  {backgroundUri && (
                    <Image
                      testID="editor-image-preview"
                      source={{ uri: backgroundUri }}
                      style={styles.imagePreview}
                    />
                  )}
                  {imagePickerError && (
                    <Text testID="editor-image-error" style={styles.errorText}>
                      {imagePickerError}
                    </Text>
                  )}

                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Ocultar ícono</Text>
                    <Switch
                      testID="editor-hide-icon"
                      value={hideIcon}
                      onValueChange={setHideIcon}
                      trackColor={{ false: color.inputBorder, true: color.accent }}
                    />
                  </View>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Ocultar texto</Text>
                    <Switch
                      testID="editor-hide-label"
                      value={hideLabel}
                      onValueChange={setHideLabel}
                      trackColor={{ false: color.inputBorder, true: color.accent }}
                    />
                  </View>
                </View>
              )}

              {categories.length > 0 && (
                <>
                  <Text style={styles.label}>Categoría</Text>
                  <View style={styles.commandWrap}>
                    {categories.map(category => (
                      <Pressable
                        key={category.id}
                        testID={`category-chip-${category.id}`}
                        onPress={() => onMoveCategory?.(category.id)}
                        style={[
                          styles.commandChip,
                          currentCategoryId === category.id && styles.commandChipActive,
                        ]}>
                        <Text
                          style={
                            currentCategoryId === category.id
                              ? styles.commandChipTextActive
                              : styles.commandChipText
                          }>
                          {category.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

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
                    <>
                      {existingCommands.length === 0 && !creatingCommand && (
                        <Text style={styles.emptyText}>No hay comandos en el server todavía.</Text>
                      )}
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
                        {!creatingCommand && (
                          <Pressable
                            testID="editor-new-command"
                            onPress={() => setCreatingCommand(true)}
                            style={[styles.commandChip, styles.commandChipNew]}>
                            <Text style={styles.commandChipText}>+ Nuevo</Text>
                          </Pressable>
                        )}
                      </View>

                      {creatingCommand && (
                        <View style={styles.newCommandForm}>
                          <View style={styles.segmentRow}>
                            <Pressable
                              testID="new-command-kind-media_key"
                              onPress={() => {
                                setNewCommandKind('media_key');
                                setNewCommandTarget('');
                              }}
                              style={[styles.segment, newCommandKind === 'media_key' && styles.segmentActive]}>
                              <Text
                                style={
                                  newCommandKind === 'media_key' ? styles.segmentTextActive : styles.segmentText
                                }>
                                Tecla multimedia
                              </Text>
                            </Pressable>
                            <Pressable
                              testID="new-command-kind-launch_app"
                              onPress={() => {
                                setNewCommandKind('launch_app');
                                setNewCommandTarget('');
                              }}
                              style={[styles.segment, newCommandKind === 'launch_app' && styles.segmentActive]}>
                              <Text
                                style={
                                  newCommandKind === 'launch_app' ? styles.segmentTextActive : styles.segmentText
                                }>
                                Abrir app
                              </Text>
                            </Pressable>
                          </View>

                          {newCommandKind === 'media_key' ? (
                            <View style={styles.commandWrap}>
                              {MEDIA_KEY_OPTIONS.map(option => (
                                <Pressable
                                  key={option.target}
                                  testID={`new-command-media-key-${option.target}`}
                                  onPress={() => setNewCommandTarget(option.target)}
                                  style={[
                                    styles.commandChip,
                                    newCommandTarget === option.target && styles.commandChipActive,
                                  ]}>
                                  <Text
                                    style={
                                      newCommandTarget === option.target
                                        ? styles.commandChipTextActive
                                        : styles.commandChipText
                                    }>
                                    {option.label}
                                  </Text>
                                </Pressable>
                              ))}
                            </View>
                          ) : (
                            <TextInput
                              testID="new-command-target"
                              style={styles.input}
                              placeholder="Comando a ejecutar, ej: firefox"
                              placeholderTextColor={color.textMuted}
                              autoCapitalize="none"
                              autoCorrect={false}
                              value={newCommandTarget}
                              onChangeText={setNewCommandTarget}
                            />
                          )}

                          <TextInput
                            testID="new-command-label"
                            style={styles.input}
                            placeholder="Nombre (opcional)"
                            placeholderTextColor={color.textMuted}
                            value={newCommandLabel}
                            onChangeText={setNewCommandLabel}
                          />

                          {createCommandError && (
                            <Text testID="new-command-error" style={styles.errorText}>
                              {createCommandError}
                            </Text>
                          )}

                          <View style={styles.buttonRow}>
                            <Pressable
                              testID="new-command-cancel"
                              style={styles.cancelButton}
                              onPress={() => setCreatingCommand(false)}>
                              <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </Pressable>
                            <Pressable
                              testID="new-command-create"
                              style={styles.saveButton}
                              disabled={createCommandBusy || (newCommandKind === 'media_key' && !newCommandTarget)}
                              onPress={handleCreateCommand}>
                              {createCommandBusy ? (
                                <ActivityIndicator color="#ffffff" />
                              ) : (
                                <Text style={styles.saveButtonText}>Crear comando</Text>
                              )}
                            </Pressable>
                          </View>
                        </View>
                      )}
                    </>
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
      </GestureHandlerRootView>
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
  pickImageButton: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: color.inputBorder,
    backgroundColor: color.inputFill,
    alignSelf: 'flex-start',
  },
  pickImageButtonText: {
    ...type.label,
    color: color.textSecondary,
  },
  imagePreview: {
    width: 72,
    height: 72,
    borderRadius: radius.chip,
    marginTop: space.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.sm,
  },
  switchLabel: {
    ...type.label,
    color: color.textSecondary,
  },
  emptyText: {
    ...type.caption,
    color: color.textMuted,
    marginBottom: space.sm,
  },
  commandChipNew: {
    borderStyle: 'dashed',
  },
  newCommandForm: {
    marginTop: space.sm,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: color.inputBorder,
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
