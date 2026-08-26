import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useTheme } from './ThemeContext';
import { blur, blurTypeForScheme, radius, shadow } from './glass';

type GlassPanelProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  blurAmount?: number;
};

export function GlassPanel({
  children,
  style,
  radius: cornerRadius = radius.panel,
  blurAmount = blur.panelAmount,
}: GlassPanelProps) {
  const { scheme, colors } = useTheme();

  return (
    <View style={[styles.wrapper, shadow.panel, { borderRadius: cornerRadius, borderColor: colors.panelBorder }]}>
      {/* @react-native-community/blur has no true native blur on Android — it falls
          back to compositing a near-opaque dark layer over content. iOS has a real
          backdrop blur, so keep it there only; Android keeps the solid `tint` below. */}
      {Platform.OS === 'ios' && (
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType={blurTypeForScheme(scheme)}
          blurAmount={blurAmount}
          reducedTransparencyFallbackColor={colors.voidBottom}
        />
      )}
      <View
        style={[StyleSheet.absoluteFill, { borderRadius: cornerRadius, backgroundColor: colors.panelFill }]}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.highlight,
          { borderRadius: cornerRadius, borderTopColor: colors.panelHighlight },
        ]}
      />
      <View style={style}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    borderWidth: 1,
  },
  highlight: {
    borderTopWidth: 1,
    borderColor: 'transparent',
  },
});
