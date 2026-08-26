import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { StreamDeckIcon } from './StreamDeckIcon';
import type { StreamDeckButton } from './types';
import { radius, space, type } from '../theme/glass';

type StreamDeckButtonTileProps = {
  button: StreamDeckButton;
  width: number;
  onPress: (button: StreamDeckButton) => void;
  onLongPress?: () => void;
  disabled?: boolean;
};

export function StreamDeckButtonTile({
  button,
  width,
  onPress,
  onLongPress,
  disabled,
}: StreamDeckButtonTileProps) {
  const backgroundStyle =
    button.background.type === 'color' ? { backgroundColor: button.background.color } : undefined;

  return (
    <Pressable
      testID={`streamdeck-button-${button.id}`}
      onPress={() => onPress(button)}
      onLongPress={onLongPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.tile,
        { width, height: width },
        backgroundStyle,
        pressed && styles.pressed,
      ]}>
      <StreamDeckIcon name={button.icon} size={84} color={button.iconColor} />
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
    marginTop: space.xs,
  },
});
