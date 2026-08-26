import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { GlassPanel } from '../theme/GlassPanel';
import { useThemeColors } from '../theme/ThemeContext';
import { radius, shadow, space, type } from '../theme/glass';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginScreen() {
  const { login } = useAuth();
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
