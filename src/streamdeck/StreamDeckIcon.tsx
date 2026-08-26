import React from 'react';
import { View } from 'react-native';

// Plain RN Views, no icon font or SVG library: both a private-use-area font glyph
// and react-native-svg (Fabric prop setters silently no-op on this device/RN combo)
// rendered invisibly. Views are the one primitive guaranteed to paint.
export type StreamDeckIconName = 'movie-outline' | 'microphone' | 'camera' | 'lock-outline' | 'console';

const BASE_SIZE = 28;
const DIM = 'rgba(0,0,0,0.35)';

function MovieIcon({ color }: { color: string }) {
  return (
    <View
      style={{
        width: 0,
        height: 0,
        borderTopWidth: 7,
        borderBottomWidth: 7,
        borderLeftWidth: 12,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: color,
      }}
    />
  );
}

function MicrophoneIcon({ color }: { color: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: 10, height: 16, borderRadius: 5, backgroundColor: color }} />
      <View style={{ width: 16, height: 2, borderRadius: 1, backgroundColor: color, marginTop: 4 }} />
      <View style={{ width: 2, height: 4, backgroundColor: color, marginTop: 1 }} />
    </View>
  );
}

function CameraIcon({ color }: { color: string }) {
  return (
    <View>
      <View
        style={{
          position: 'absolute',
          top: -3,
          left: 4,
          width: 6,
          height: 3,
          borderRadius: 1,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          width: 22,
          height: 16,
          borderRadius: 3,
          backgroundColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <View style={{ width: 9, height: 9, borderRadius: 5, borderWidth: 2, borderColor: DIM }} />
      </View>
    </View>
  );
}

function LockIcon({ color }: { color: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: 12,
          height: 10,
          borderTopLeftRadius: 6,
          borderTopRightRadius: 6,
          borderWidth: 2,
          borderBottomWidth: 0,
          borderColor: color,
        }}
      />
      <View
        style={{
          width: 16,
          height: 12,
          borderRadius: 2,
          backgroundColor: color,
          marginTop: -1,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: DIM }} />
      </View>
    </View>
  );
}

function ConsoleIcon({ color }: { color: string }) {
  return (
    <View
      style={{
        width: 22,
        height: 18,
        borderRadius: 3,
        borderWidth: 2,
        borderColor: color,
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingLeft: 4,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 0,
            height: 0,
            borderTopWidth: 3,
            borderBottomWidth: 3,
            borderLeftWidth: 4,
            borderTopColor: 'transparent',
            borderBottomColor: 'transparent',
            borderLeftColor: color,
          }}
        />
        <View style={{ width: 6, height: 2, backgroundColor: color, marginLeft: 3 }} />
      </View>
    </View>
  );
}

const ICONS: Record<StreamDeckIconName, React.ComponentType<{ color: string }>> = {
  'movie-outline': MovieIcon,
  microphone: MicrophoneIcon,
  camera: CameraIcon,
  'lock-outline': LockIcon,
  console: ConsoleIcon,
};

type StreamDeckIconProps = {
  name: StreamDeckIconName;
  size: number;
  color: string;
};

export function StreamDeckIcon({ name, size, color }: StreamDeckIconProps) {
  const Icon = ICONS[name];
  return (
    // The scale transform below is visual only — it doesn't resize this View's
    // layout box, so the outer box must be sized to `size` itself or siblings
    // (the button label) would overlap the scaled-up icon instead of leaving
    // room for it.
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: BASE_SIZE,
          height: BASE_SIZE,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: size / BASE_SIZE }],
        }}>
        <Icon color={color} />
      </View>
    </View>
  );
}
