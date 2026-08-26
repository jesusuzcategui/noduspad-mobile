import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useThemeColors } from '../theme/ThemeContext';
import { radius, space, type } from '../theme/glass';

export function TapFeedbackBanner({ message }: { message: string | null }) {
  const color = useThemeColors();

  if (message === null) {
    return null;
  }

  return (
    <Text
      testID="tap-feedback-banner"
      style={[styles.banner, { backgroundColor: color.panelFillPressed, color: color.textPrimary }]}>
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  banner: {
    ...type.caption,
    position: 'absolute',
    bottom: space.xl,
    alignSelf: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
});
