import React from 'react';
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
import { color, radius, shadow, space, type } from '../theme/glass';

const STATUS_LABEL: Record<string, string> = {
  idle: 'Sin conexión',
  connecting: 'Conectando…',
  connected: 'Conectado',
  error: 'Error de conexión',
};

const STATUS_COLOR: Record<string, string> = {
  idle: color.textMuted,
  connecting: color.textSecondary,
  connected: '#2f9e6f',
  error: color.danger,
};

export function SettingsScreen() {
  const { config, setConfig, isLoadingConfig, status, errorMessage, connect, disconnect } = useOBSConnection();

  if (isLoadingConfig) {
    return (
      <ScreenWithAppBar>
        <View style={styles.loading}>
          <ActivityIndicator color={color.accent} />
        </View>
      </ScreenWithAppBar>
    );
  }

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
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[status] }]} />
              <Text style={[styles.statusText, { color: STATUS_COLOR[status] }]}>{STATUS_LABEL[status]}</Text>
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
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWithAppBar>
  );
}

const styles = StyleSheet.create({
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
});
