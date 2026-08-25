import React from 'react';
import { StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import { color } from './glass';

export function GlassBackground({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[color.voidTop, color.voidBottom]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.glow, styles.glowBlue]} />
        <View style={[styles.glow, styles.glowViolet]} />
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="dark"
          blurAmount={80}
          reducedTransparencyFallbackColor={color.voidTop}
        />
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const GLOW_SIZE = 420;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.voidTop,
  },
  content: {
    flex: 1,
  },
  glow: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    opacity: 0.28,
  },
  glowBlue: {
    backgroundColor: color.glowBlue,
    top: -GLOW_SIZE * 0.45,
    right: -GLOW_SIZE * 0.35,
  },
  glowViolet: {
    backgroundColor: color.glowViolet,
    bottom: -GLOW_SIZE * 0.5,
    left: -GLOW_SIZE * 0.4,
    opacity: 0.22,
  },
});
