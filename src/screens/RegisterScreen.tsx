import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { EMAIL_PATTERN } from '../auth/emailPattern';
import { GlassPanel } from '../theme/GlassPanel';
import { useThemeColors } from '../theme/ThemeContext';
import { radius, shadow, space, type } from '../theme/glass';

const MIN_PASSWORD_LENGTH = 6;

export function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const color = useThemeColors();
  const styles = createStyles(color);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) {
      setError('Nombre es requerido');
      return;
    }
    if (!trimmedEmail) {
      setError('Email es requerido');
      return;
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError('Email inválido');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    const ok = await register(trimmedName, trimmedEmail, password);
    if (!ok) {
      setError('No se pudo crear la cuenta');
      return;
    }
    setError(null);
  };

  return (
    <View style={styles.container}>
      <GlassPanel style={styles.card}>
        <Text style={styles.title}>Native Stream Deck</Text>
        <TextInput
          testID="register-name"
          style={styles.input}
          placeholder="Nombre"
          placeholderTextColor={color.textMuted}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          testID="register-email"
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={color.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          testID="register-password"
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={color.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          testID="register-confirm-password"
          style={styles.input}
          placeholder="Confirmar password"
          placeholderTextColor={color.textMuted}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        {error !== null && (
          <Text testID="register-error" style={styles.error}>
            {error}
          </Text>
        )}
        <Pressable
          testID="register-submit"
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={handleSubmit}>
          <Text style={styles.buttonText}>Crear cuenta</Text>
        </Pressable>
      </GlassPanel>
    </View>
  );
}

function createStyles(color: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: space.lg,
    },
    card: {
      paddingHorizontal: space.xl,
      paddingVertical: space.xxl,
    },
    title: {
      ...type.display,
      fontSize: 26,
      color: color.textPrimary,
      marginBottom: space.xxl,
      textAlign: 'center',
    },
    input: {
      borderWidth: 1,
      borderColor: color.inputBorder,
      borderRadius: radius.input,
      backgroundColor: color.inputFill,
      color: color.textPrimary,
      paddingHorizontal: space.lg,
      paddingVertical: space.md + 2,
      marginBottom: space.md,
      ...type.body,
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
}
