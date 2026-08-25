import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { StreamDeckButton } from './types';
import { radius, type } from '../theme/glass';

type StreamDeckButtonTileProps = {
  button: StreamDeckButton;
  width: number;
  onPress: (button: StreamDeckButton) => void;
};

export function StreamDeckButtonTile({ button, width, onPress }: StreamDeckButtonTileProps) {
  const backgroundStyle =
    button.background.type === 'color' ? { backgroundColor: button.background.color } : undefined;

  return (
    <Pressable
      testID={`streamdeck-button-${button.id}`}
      onPress={() => onPress(button)}
      style={({ pressed }) => [
        styles.tile,
        { width, height: width },
        backgroundStyle,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.label, { color: button.iconColor }]} numberOfLines={2}>
        {button.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: radius.chip,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  label: {
    ...type.label,
    textAlign: 'center',
  },
});
