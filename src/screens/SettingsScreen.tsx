import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ScreenWithAppBar } from '../navigation/ScreenWithAppBar';
import { GlassPanel } from '../theme/GlassPanel';
import { useOBSConnection } from '../obs/useOBSConnection';
import { useThemeColors, useTheme, type ThemeMode } from '../theme/ThemeContext';
import {
  useGridAppearance,
  GRID_GAP_MIN,
  GRID_GAP_MAX,
  GRID_RADIUS_MIN,
  GRID_RADIUS_MAX,
} from '../theme/GridAppearanceContext';
import { radius, shadow, space, type } from '../theme/glass';
import {
  DEFAULT_COMMAND_SERVER_CONFIG,
  loadCommandServerConfig,
  saveCommandServerConfig,
  type CommandServerConfig,
} from '../commandServer/commandServerStorage';

const STEP = 2;

type SettingsTab = 'obs' | 'appearance' | 'commands';

export function SettingsScreen() {
  const [tab, setTab] = useState<SettingsTab>('obs');
  const color = useThemeColors();
  const styles = createStyles(color);

  return (
    <ScreenWithAppBar>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -100}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.tabRow}>
            <Pressable
              testID="settings-tab-obs"
              onPress={() => setTab('obs')}
              style={[styles.tab, tab === 'obs' && styles.tabActive]}>
              <Text style={tab === 'obs' ? styles.tabTextActive : styles.tabText}>OBS</Text>
            </Pressable>
            <Pressable
              testID="settings-tab-appearance"
              onPress={() => setTab('appearance')}
              style={[styles.tab, tab === 'appearance' && styles.tabActive]}>
              <Text style={tab === 'appearance' ? styles.tabTextActive : styles.tabText}>Apariencia</Text>
            </Pressable>
            <Pressable
              testID="settings-tab-commands"
              onPress={() => setTab('commands')}
              style={[styles.tab, tab === 'commands' && styles.tabActive]}>
              <Text style={tab === 'commands' ? styles.tabTextActive : styles.tabText}>Comandos</Text>
            </Pressable>
          </View>

          {tab === 'obs' ? <OBSSettingsTab /> : tab === 'appearance' ? <AppearanceSettingsTab /> : <CommandServerSettingsTab />}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWithAppBar>
  );
}

const STATUS_LABEL: Record<string, string> = {
  idle: 'Sin conexión',
  connecting: 'Conectando…',
  connected: 'Conectado',
  error: 'Error de conexión',
};

function OBSSettingsTab() {
  const { config, setConfig, isLoadingConfig, status, errorMessage, connect, disconnect } = useOBSConnection();
  const color = useThemeColors();
  const styles = createStyles(color);
  const statusColor: Record<string, string> = {
    idle: color.textMuted,
    connecting: color.textSecondary,
    connected: '#2f9e6f',
    error: color.danger,
  };

  if (isLoadingConfig) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={color.accent} />
      </View>
    );
  }

  return (
    <GlassPanel style={styles.card}>
      <Text style={styles.title}>Conexión con OBS</Text>

      <Text style={styles.label}>Host</Text>
      <TextInput
        testID="obs-host"
        style={styles.input}
        placeholder="localhost"
        placeholderTextColor={color.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        value={config.host}
        onChangeText={host => setConfig({ ...config, host })}
      />

      <Text style={styles.label}>Puerto</Text>
      <TextInput
        testID="obs-port"
        style={styles.input}
        placeholder="4455"
        placeholderTextColor={color.textMuted}
        keyboardType="number-pad"
        value={config.port}
        onChangeText={port => setConfig({ ...config, port })}
      />

      <Text style={styles.label}>Contraseña</Text>
      <TextInput
        testID="obs-password"
        style={styles.input}
        placeholder="Contraseña del servidor WebSocket"
        placeholderTextColor={color.textMuted}
        secureTextEntry
        value={config.password}
        onChangeText={password => setConfig({ ...config, password })}
      />

      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: statusColor[status] }]} />
        <Text style={[styles.statusText, { color: statusColor[status] }]}>{STATUS_LABEL[status]}</Text>
      </View>

      {errorMessage !== null && (
        <Text testID="obs-error" style={styles.error}>
          {errorMessage}
        </Text>
      )}

      <Pressable
        testID="obs-connect"
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        disabled={status === 'connecting'}
        onPress={() => (status === 'connected' ? disconnect() : connect())}>
        {status === 'connecting' ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>{status === 'connected' ? 'Desconectar' : 'Probar conexión'}</Text>
        )}
      </Pressable>
    </GlassPanel>
  );
}

const MODE_OPTIONS: { key: ThemeMode; label: string }[] = [
  { key: 'system', label: 'Sistema' },
  { key: 'light', label: 'Claro' },
  { key: 'dark', label: 'Oscuro' },
];

function AppearanceSettingsTab() {
  const { mode, setMode } = useTheme();
  const { gap, borderRadius, setGap, setBorderRadius } = useGridAppearance();
  const color = useThemeColors();
  const styles = createStyles(color);

  return (
    <GlassPanel style={styles.card}>
      <Text style={styles.title}>Apariencia</Text>

      <Text style={styles.label}>Modo de color</Text>
      <View style={styles.segmentRow}>
        {MODE_OPTIONS.map(option => (
          <Pressable
            key={option.key}
            testID={`theme-mode-${option.key}`}
            onPress={() => setMode(option.key)}
            style={[styles.segment, mode === option.key && styles.segmentActive]}>
            <Text style={mode === option.key ? styles.segmentTextActive : styles.segmentText}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Separación entre botones</Text>
      <Stepper
        testID="grid-gap"
        value={gap}
        min={GRID_GAP_MIN}
        max={GRID_GAP_MAX}
        onChange={setGap}
        styles={styles}
      />

      <Text style={styles.label}>Bordes redondeados</Text>
      <Stepper
        testID="grid-radius"
        value={borderRadius}
        min={GRID_RADIUS_MIN}
        max={GRID_RADIUS_MAX}
        onChange={setBorderRadius}
        styles={styles}
      />
    </GlassPanel>
  );
}

function CommandServerSettingsTab() {
  const [config, setConfig] = useState<CommandServerConfig>(DEFAULT_COMMAND_SERVER_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const color = useThemeColors();
  const styles = createStyles(color);

  useEffect(() => {
    loadCommandServerConfig().then(loaded => {
      setConfig(loaded);
      setIsLoading(false);
    });
  }, []);

  const update = (next: CommandServerConfig) => {
    setConfig(next);
    saveCommandServerConfig(next);
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={color.accent} />
      </View>
    );
  }

  return (
    <GlassPanel style={styles.card}>
      <Text style={styles.title}>Servidor de comandos</Text>

      <Text style={styles.label}>Host</Text>
      <TextInput
        testID="command-server-host"
        style={styles.input}
        placeholder="localhost"
        placeholderTextColor={color.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        value={config.host}
        onChangeText={host => update({ ...config, host })}
      />

      <Text style={styles.label}>Puerto</Text>
      <TextInput
        testID="command-server-port"
        style={styles.input}
        placeholder="7070"
        placeholderTextColor={color.textMuted}
        keyboardType="number-pad"
        value={config.port}
        onChangeText={port => update({ ...config, port })}
      />

      <Text style={styles.label}>Contraseña</Text>
      <TextInput
        testID="command-server-password"
        style={styles.input}
        placeholder="Contraseña del servidor"
        placeholderTextColor={color.textMuted}
        secureTextEntry
        value={config.password}
        onChangeText={password => update({ ...config, password })}
      />
    </GlassPanel>
  );
}

function Stepper({
  testID,
  value,
  min,
  max,
  onChange,
  styles,
}: {
  testID: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.stepperRow}>
      <Pressable
        testID={`${testID}-decrement`}
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, value - STEP))}
        style={[styles.stepperButton, value <= min && styles.stepperButtonDisabled]}>
        <Text style={styles.stepperButtonText}>−</Text>
      </Pressable>
      <Text testID={`${testID}-value`} style={styles.stepperValue}>
        {value}
      </Text>
      <Pressable
        testID={`${testID}-increment`}
        disabled={value >= max}
        onPress={() => onChange(Math.min(max, value + STEP))}
        style={[styles.stepperButton, value >= max && styles.stepperButtonDisabled]}>
        <Text style={styles.stepperButtonText}>+</Text>
      </Pressable>
    </View>
  );
}

function createStyles(color: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    flex: {
      flex: 1,
    },
    container: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: space.lg,
      paddingVertical: space.xl,
    },
    tabRow: {
      flexDirection: 'row',
      gap: space.sm,
      marginBottom: space.lg,
    },
    tab: {
      flex: 1,
      paddingVertical: space.sm + 2,
      borderRadius: radius.input,
      borderWidth: 1,
      borderColor: color.inputBorder,
      alignItems: 'center',
    },
    tabActive: {
      backgroundColor: color.accent,
      borderColor: color.accent,
    },
    tabText: {
      ...type.label,
      color: color.textSecondary,
    },
    tabTextActive: {
      ...type.label,
      color: '#ffffff',
    },
    card: {
      paddingHorizontal: space.xl,
      paddingVertical: space.xxl,
    },
    title: {
      ...type.title,
      fontSize: 22,
      color: color.textPrimary,
      marginBottom: space.xl,
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
      marginBottom: space.md,
      ...type.body,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: space.xs,
      marginBottom: space.md,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: space.xs,
    },
    statusText: {
      ...type.caption,
    },
    error: {
      color: color.danger,
      marginBottom: space.md,
      ...type.caption,
    },
    button: {
      backgroundColor: color.accent,
      borderRadius: radius.input,
      paddingVertical: space.md + 2,
      alignItems: 'center',
      marginTop: space.xs,
      ...shadow.floating,
      shadowColor: color.accent,
    },
    buttonPressed: {
      backgroundColor: color.accentPressed,
    },
    buttonText: {
      ...type.label,
      fontSize: 16,
      color: '#ffffff',
    },
    segmentRow: {
      flexDirection: 'row',
      gap: space.sm,
      marginBottom: space.sm,
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
    stepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      marginBottom: space.md,
    },
    stepperButton: {
      width: 40,
      height: 40,
      borderRadius: radius.input,
      borderWidth: 1,
      borderColor: color.inputBorder,
      backgroundColor: color.inputFill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperButtonDisabled: {
      opacity: 0.4,
    },
    stepperButtonText: {
      ...type.title,
      fontSize: 20,
      color: color.textPrimary,
    },
    stepperValue: {
      ...type.body,
      color: color.textPrimary,
      minWidth: 32,
      textAlign: 'center',
    },
  });
}
