import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { EMAIL_PATTERN } from '../auth/emailPattern';
import { GlassPanel } from '../theme/GlassPanel';
import { useThemeColors } from '../theme/ThemeContext';
import { radius, shadow, space, type } from '../theme/glass';

export function LoginScreen() {
  const { login, resetAccount } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const color = useThemeColors();
  const styles = createStyles(color);

  const handleSubmit = () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Email es requerido');
      return;
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError('Email inválido');
      return;
    }
    if (!password) {
      setError('Password es requerido');
      return;
    }
    const ok = login(trimmedEmail, password);
    if (!ok) {
      setError('Credenciales inválidas');
      return;
    }
    setError(null);
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Olvidaste tu contraseña',
      'Esto borrará la cuenta local y vas a tener que registrarte de nuevo. No hay forma de recuperar la cuenta actual. ¿Querés continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar cuenta',
          style: 'destructive',
          onPress: async () => {
            const ok = await resetAccount();
            if (!ok) {
              setError('No se pudo borrar la cuenta. Intentá de nuevo.');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <GlassPanel style={styles.card}>
        <Text style={styles.title}>Native Stream Deck</Text>
        <TextInput
          testID="login-email"
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={color.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          testID="login-password"
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={color.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {error !== null && (
          <Text testID="login-error" style={styles.error}>
            {error}
          </Text>
        )}
        <Pressable
          testID="login-submit"
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={handleSubmit}>
          <Text style={styles.buttonText}>Ingresar</Text>
        </Pressable>
        <Pressable testID="login-forgot-password" onPress={handleForgotPassword}>
          <Text style={styles.forgotPassword}>¿Olvidaste tu contraseña?</Text>
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
    forgotPassword: {
      ...type.caption,
      color: color.textSecondary,
      textAlign: 'center',
      marginTop: space.lg,
    },
  });
}
