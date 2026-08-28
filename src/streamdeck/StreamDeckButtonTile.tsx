import React from 'react';
import { Image, Pressable, StyleSheet, Text } from 'react-native';
import { StreamDeckIcon } from './StreamDeckIcon';
import type { StreamDeckButton } from './types';
import { useGridAppearance } from '../theme/GridAppearanceContext';
import { space, type } from '../theme/glass';

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
  const { borderRadius } = useGridAppearance();
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
        { width, height: width, borderRadius, overflow: 'hidden' },
        backgroundStyle,
        pressed && styles.pressed,
      ]}>
      {button.background.type === 'image' && (
        <Image
          testID={`streamdeck-button-${button.id}-image`}
          source={{ uri: button.background.uri }}
          style={[styles.backgroundImage, { borderRadius }]}
          resizeMode="cover"
          resizeMethod="resize"
        />
      )}
      {!button.hideIcon && <StreamDeckIcon name={button.icon} size={84} color={button.iconColor} />}
      {!button.hideLabel && (
        <Text
          style={[styles.label, { color: button.iconColor }, button.hideIcon && styles.labelNoIcon]}
          numberOfLines={2}>
          {button.label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  label: {
    ...type.label,
    textAlign: 'center',
    marginTop: space.xs,
  },
  labelNoIcon: {
    marginTop: 0,
  },
});
