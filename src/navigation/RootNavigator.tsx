import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { DashboardShell } from './DashboardShell';
import { useThemeColors } from '../theme/ThemeContext';

export type RootStackParamList = {
  Register: undefined;
  Login: undefined;
  Dashboard: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function LoadingScreen() {
  const color = useThemeColors();
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={color.accent} />
    </View>
  );
}

export function RootNavigator() {
  const { hasAccount, isAuthenticated } = useAuth();

  if (hasAccount === null) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!hasAccount ? (
        <Stack.Screen name="Register" component={RegisterScreen} />
      ) : !isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <Stack.Screen name="Dashboard" component={DashboardShell} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
