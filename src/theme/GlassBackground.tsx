import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import { useTheme } from './ThemeContext';
import { blurTypeForScheme } from './glass';

const GLOW_SIZE = 420;

export function GlassBackground({ children }: { children: React.ReactNode }) {
  const { scheme, colors } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.voidTop }]}>
      <LinearGradient
        colors={[colors.voidTop, colors.voidBottom]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.glow, styles.glowBlue, { backgroundColor: colors.glowBlue }]} />
        <View style={[styles.glow, styles.glowViolet, { backgroundColor: colors.glowViolet }]} />
        {/* @react-native-community/blur has no true native blur on Android — it falls
            back to compositing a near-opaque dark layer that renders on top of the
            content below (not just the gradient behind it), washing out every screen.
            iOS has a real backdrop blur, so keep it there only. */}
        {Platform.OS === 'ios' && (
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType={blurTypeForScheme(scheme)}
            blurAmount={80}
            reducedTransparencyFallbackColor={colors.voidTop}
          />
        )}
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
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
    top: -GLOW_SIZE * 0.45,
    right: -GLOW_SIZE * 0.35,
  },
  glowViolet: {
    bottom: -GLOW_SIZE * 0.5,
    left: -GLOW_SIZE * 0.4,
    opacity: 0.22,
  },
});
