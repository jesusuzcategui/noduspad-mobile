import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { color, radius, space, type } from '../theme/glass';

export function TapFeedbackBanner({ message }: { message: string | null }) {
  if (message === null) {
    return null;
  }

  return (
    <Text testID="tap-feedback-banner" style={styles.banner}>
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
    backgroundColor: color.panelFillPressed,
    color: color.textPrimary,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
});
