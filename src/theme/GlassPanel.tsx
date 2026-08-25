import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { blur, color, radius, shadow } from './glass';

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
  return (
    <View style={[styles.wrapper, shadow.panel, { borderRadius: cornerRadius }]}>
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType={blur.panelType}
        blurAmount={blurAmount}
        reducedTransparencyFallbackColor={color.voidBottom}
      />
      <View style={[StyleSheet.absoluteFill, styles.tint, { borderRadius: cornerRadius }]} />
      <View style={[StyleSheet.absoluteFill, styles.highlight, { borderRadius: cornerRadius }]} />
      <View style={style}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: color.panelBorder,
  },
  tint: {
    backgroundColor: color.panelFill,
  },
  highlight: {
    borderTopWidth: 1,
    borderColor: 'transparent',
    borderTopColor: color.panelHighlight,
  },
});
