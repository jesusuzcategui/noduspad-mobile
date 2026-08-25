import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

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
      <Text style={styles.title}>Native Stream Deck</Text>
      <TextInput
        testID="login-email"
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#8a8a8a"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        testID="login-password"
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#8a8a8a"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error !== null && (
        <Text testID="login-error" style={styles.error}>
          {error}
        </Text>
      )}
      <Pressable testID="login-submit" style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Ingresar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#0d0d0d',
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 8,
    color: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  error: {
    color: '#ff5c5c',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#3a7bfd',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
