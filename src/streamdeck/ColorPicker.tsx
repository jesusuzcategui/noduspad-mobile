import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';
import { useThemeColors } from '../theme/ThemeContext';
import { radius, space, type } from '../theme/glass';
import { hexToHsl, hslToHex, hueToHex, normalizeHex } from './colorUtils';

const TRACK_HEIGHT = 28;
const THUMB_SIZE = 24;

// Stops for a full rainbow sweep (0/60/.../360deg), expressed as hex so
// LinearGradient doesn't need to know about HSL at all.
const HUE_GRADIENT_COLORS = [0, 60, 120, 180, 240, 300, 360].map(hueToHex);

const FALLBACK_HEX = '#3a7bfd';

type ColorPickerProps = {
  value: string;
  onChange: (hex: string) => void;
  testID?: string;
};

// Position (0..1) along a track of `width` px, from an x coordinate that may
// come from a gesture that started outside the track and dragged in —
// clamped so the thumb never flies off either end.
function ratioFromX(x: number, width: number): number {
  if (width <= 0) return 0;
  return Math.min(1, Math.max(0, x / width));
}

export function ColorPicker({ value, onChange, testID }: ColorPickerProps) {
  const color = useThemeColors();
  const styles = createStyles(color);

  // `hex` is the single source of truth for the rendered color — the preview
  // swatch, the thumb colors, and (when valid) the hex text input all derive
  // from it, so they can never disagree with each other. Hue/lightness for
  // the slider thumbs are derived from it on every render rather than kept
  // as separate state, which would otherwise drift out of sync with `hex`
  // whenever the color came in with saturation != 100% (this picker only
  // supports full-saturation colors, so hue+lightness alone can't always
  // reconstruct the original hex exactly — deriving from `hex` keeps the
  // preview/text honest about what's ACTUALLY selected instead of a snapped
  // approximation).
  const [hex, setHex] = useState(normalizeHex(value) ?? FALLBACK_HEX);
  // The raw text field content — allowed to be a temporarily invalid/partial
  // string while the user is mid-edit, unlike `hex`.
  const [hexText, setHexText] = useState(normalizeHex(value) ?? value);

  const hueTrackWidth = useRef(0);
  const lightnessTrackWidth = useRef(0);

  // Keep local state in sync when the value changes from OUTSIDE this
  // component (e.g. the modal resetting on a different button).
  const lastEmitted = useRef(value);
  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    const normalized = normalizeHex(value);
    if (!normalized) return;
    setHex(normalized);
    setHexText(normalized);
  }, [value]);

  const { h: hue, l: lightness } = hexToHsl(hex) ?? { h: 220, s: 100, l: 50 };

  const commit = (nextHex: string) => {
    lastEmitted.current = nextHex;
    setHex(nextHex);
    setHexText(nextHex);
    onChange(nextHex);
  };

  const handleHueUpdate = (x: number) => {
    const ratio = ratioFromX(x, hueTrackWidth.current);
    commit(hslToHex({ h: ratio * 360, s: 100, l: lightness }));
  };

  const handleLightnessUpdate = (x: number) => {
    const ratio = ratioFromX(x, lightnessTrackWidth.current);
    commit(hslToHex({ h: hue, s: 100, l: ratio * 100 }));
  };

  // .runOnJS(true) tells gesture-handler to run this gesture's callbacks
  // directly on the JS thread instead of auto-worklet-ifying them for the
  // UI thread (this app has react-native-worklets installed, which
  // auto-worklet-ifies gesture callbacks by default). handleHueUpdate/
  // handleLightnessUpdate call React state setters and the onChange prop,
  // which only exist on the JS thread — without this flag, calling them
  // from an auto-worklet-ified callback crashes with "Tried to
  // synchronously call a Remote Function" (this picker doesn't need
  // UI-thread performance; it's a plain React-state-driven slider).
  const hueGesture = Gesture.Pan()
    .withTestId(testID ? `${testID}-hue-gesture` : 'colorpicker-hue-gesture')
    .runOnJS(true)
    .onBegin(e => handleHueUpdate(e.x))
    .onUpdate(e => handleHueUpdate(e.x));

  const lightnessGesture = Gesture.Pan()
    .withTestId(testID ? `${testID}-lightness-gesture` : 'colorpicker-lightness-gesture')
    .runOnJS(true)
    .onBegin(e => handleLightnessUpdate(e.x))
    .onUpdate(e => handleLightnessUpdate(e.x));

  const handleHexChange = (text: string) => {
    setHexText(text);
    const normalized = normalizeHex(text);
    if (!normalized) return; // invalid/incomplete — don't propagate garbage
    commit(normalized);
  };

  const hueHex = hueToHex(hue);

  return (
    <View testID={testID} style={styles.container}>
      <View style={styles.previewRow}>
        <View testID={testID ? `${testID}-preview` : undefined} style={[styles.preview, { backgroundColor: hex }]} />
        <TextInput
          testID={testID ? `${testID}-hex-input` : undefined}
          style={styles.hexInput}
          value={hexText}
          onChangeText={handleHexChange}
          placeholder="#3a7bfd"
          placeholderTextColor={color.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={7}
        />
      </View>

      <Text style={styles.sliderLabel}>Tono</Text>
      <GestureDetector gesture={hueGesture}>
        <View
          testID={testID ? `${testID}-hue-track` : undefined}
          style={styles.track}
          onLayout={e => {
            hueTrackWidth.current = e.nativeEvent.layout.width;
          }}>
          <LinearGradient
            colors={HUE_GRADIENT_COLORS}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.trackGradient}
          />
          <View
            pointerEvents="none"
            style={[
              styles.thumb,
              { borderColor: color.textPrimary, backgroundColor: hueHex, left: `${(hue / 360) * 100}%` },
            ]}
          />
        </View>
      </GestureDetector>

      <Text style={styles.sliderLabel}>Luminosidad</Text>
      <GestureDetector gesture={lightnessGesture}>
        <View
          testID={testID ? `${testID}-lightness-track` : undefined}
          style={styles.track}
          onLayout={e => {
            lightnessTrackWidth.current = e.nativeEvent.layout.width;
          }}>
          <LinearGradient
            colors={['#000000', hueHex, '#ffffff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.trackGradient}
          />
          <View
            pointerEvents="none"
            style={[
              styles.thumb,
              { borderColor: color.textPrimary, backgroundColor: hex, left: `${lightness}%` },
            ]}
          />
        </View>
      </GestureDetector>
    </View>
  );
}

function createStyles(color: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: {
      gap: 12,
    },
    previewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      marginBottom: 4,
    },
    preview: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: color.inputBorder,
    },
    hexInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: color.inputBorder,
      borderRadius: radius.input,
      backgroundColor: color.inputFill,
      color: color.textPrimary,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
      ...type.body,
    },
    sliderLabel: {
      ...type.caption,
      color: color.textSecondary,
      marginTop: space.xs,
    },
    track: {
      height: TRACK_HEIGHT,
      borderRadius: TRACK_HEIGHT / 2,
      overflow: 'visible',
      justifyContent: 'center',
    },
    trackGradient: {
      height: TRACK_HEIGHT,
      borderRadius: TRACK_HEIGHT / 2,
    },
    thumb: {
      position: 'absolute',
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: THUMB_SIZE / 2,
      borderWidth: 3,
      marginLeft: -THUMB_SIZE / 2,
      top: (TRACK_HEIGHT - THUMB_SIZE) / 2,
    },
  });
}
