import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenWithAppBar } from '../navigation/ScreenWithAppBar';
import { GlassPanel } from '../theme/GlassPanel';
import { useThemeColors } from '../theme/ThemeContext';
import { space, type } from '../theme/glass';
import packageInfo from '../../package.json';

export function AboutScreen() {
  const color = useThemeColors();
  const styles = createStyles(color);

  return (
    <ScreenWithAppBar>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <GlassPanel style={styles.card}>
          <Image
            testID="about-logo"
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Native Stream Deck</Text>
          <Text style={styles.version}>Versión {packageInfo.version}</Text>
          <Text style={styles.body}>
            Un Stream Deck casero: controla OBS y ejecuta acciones personalizadas tocando botones
            organizados por categorías, desde una tablet Android en lugar de comprar hardware dedicado.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>Stack</Text>
          <Text style={styles.body}>React Native · TypeScript · obs-websocket-js</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>Autor</Text>
          <Text style={styles.body}>Jesús Uzcátegui — uso personal.</Text>
        </GlassPanel>
      </ScrollView>
    </ScreenWithAppBar>
  );
}

function createStyles(color: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: space.xl,
      paddingVertical: space.xxl,
    },
    card: {
      paddingHorizontal: space.xxl,
      paddingVertical: space.xl,
      alignItems: 'center',
      maxWidth: 420,
      width: '100%',
    },
    logo: {
      width: 88,
      height: 76,
      marginBottom: space.lg,
    },
    title: {
      ...type.title,
      fontSize: 22,
      color: color.textPrimary,
      textAlign: 'center',
    },
    version: {
      ...type.caption,
      color: color.textMuted,
      marginTop: space.xs,
      marginBottom: space.lg,
    },
    body: {
      ...type.body,
      color: color.textSecondary,
      textAlign: 'center',
    },
    divider: {
      alignSelf: 'stretch',
      height: 1,
      backgroundColor: color.panelBorder,
      marginVertical: space.lg,
    },
    sectionLabel: {
      ...type.label,
      color: color.textMuted,
      marginBottom: space.xs,
    },
  });
}
