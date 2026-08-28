import { hexToHsl, hexToRgb, hslToHex, hslToRgb, hueToHex, normalizeHex, rgbToHex, rgbToHsl } from './colorUtils';

describe('normalizeHex', () => {
  it('normalizes 6-digit hex with a leading #', () => {
    expect(normalizeHex('#3A7BFD')).toBe('#3a7bfd');
  });

  it('normalizes 6-digit hex without a leading #', () => {
    expect(normalizeHex('3a7bfd')).toBe('#3a7bfd');
  });

  it('expands 3-digit shorthand hex', () => {
    expect(normalizeHex('#abc')).toBe('#aabbcc');
  });

  it('returns null for invalid input', () => {
    expect(normalizeHex('not-a-color')).toBeNull();
    expect(normalizeHex('#12345')).toBeNull();
    expect(normalizeHex('#gggggg')).toBeNull();
    expect(normalizeHex('')).toBeNull();
  });
});

describe('hexToRgb / rgbToHex', () => {
  it('round-trips known colors', () => {
    expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    expect(rgbToHex({ r: 255, g: 0, b: 0 })).toBe('#ff0000');
    expect(rgbToHex({ r: 0, g: 255, b: 0 })).toBe('#00ff00');
    expect(rgbToHex({ r: 0, g: 0, b: 255 })).toBe('#0000ff');
  });

  it('returns null for invalid hex', () => {
    expect(hexToRgb('nope')).toBeNull();
  });
});

describe('rgbToHsl / hslToRgb', () => {
  const cases: { rgb: { r: number; g: number; b: number }; hsl: { h: number; s: number; l: number } }[] = [
    { rgb: { r: 255, g: 0, b: 0 }, hsl: { h: 0, s: 100, l: 50 } },
    { rgb: { r: 0, g: 255, b: 0 }, hsl: { h: 120, s: 100, l: 50 } },
    { rgb: { r: 0, g: 0, b: 255 }, hsl: { h: 240, s: 100, l: 50 } },
    { rgb: { r: 255, g: 255, b: 255 }, hsl: { h: 0, s: 0, l: 100 } },
    { rgb: { r: 0, g: 0, b: 0 }, hsl: { h: 0, s: 0, l: 0 } },
  ];

  it.each(cases)('converts rgb -> hsl for known colors', ({ rgb, hsl }) => {
    const result = rgbToHsl(rgb);
    expect(result.h).toBeCloseTo(hsl.h, 0);
    expect(result.s).toBeCloseTo(hsl.s, 0);
    expect(result.l).toBeCloseTo(hsl.l, 0);
  });

  it.each(cases)('converts hsl -> rgb for known colors', ({ rgb, hsl }) => {
    const result = hslToRgb(hsl);
    expect(result.r).toBeCloseTo(rgb.r, 0);
    expect(result.g).toBeCloseTo(rgb.g, 0);
    expect(result.b).toBeCloseTo(rgb.b, 0);
  });

  it('round-trips an arbitrary color within rounding tolerance', () => {
    const original = { r: 58, g: 123, b: 253 }; // #3a7bfd
    const hsl = rgbToHsl(original);
    const roundTripped = hslToRgb(hsl);
    expect(roundTripped.r).toBeCloseTo(original.r, 0);
    expect(roundTripped.g).toBeCloseTo(original.g, 0);
    expect(roundTripped.b).toBeCloseTo(original.b, 0);
  });
});

describe('hexToHsl / hslToHex', () => {
  it('round-trips hex through hsl within rounding tolerance', () => {
    const hexes = ['#3a7bfd', '#2f9e6f', '#d9534f', '#9b59b6', '#5a6270', '#1a1a1a', '#ffffff', '#000000'];
    for (const hex of hexes) {
      const hsl = hexToHsl(hex);
      expect(hsl).not.toBeNull();
      const roundTripped = hslToHex(hsl!);
      const original = hexToRgb(hex)!;
      const result = hexToRgb(roundTripped)!;
      // Allow +/-2 per channel for rounding through HSL space.
      expect(Math.abs(result.r - original.r)).toBeLessThanOrEqual(2);
      expect(Math.abs(result.g - original.g)).toBeLessThanOrEqual(2);
      expect(Math.abs(result.b - original.b)).toBeLessThanOrEqual(2);
    }
  });

  it('returns null for invalid hex', () => {
    expect(hexToHsl('nope')).toBeNull();
  });
});

describe('hueToHex', () => {
  it('returns full-saturation, mid-lightness colors for known hues', () => {
    expect(hueToHex(0)).toBe('#ff0000');
    expect(hueToHex(120)).toBe('#00ff00');
    expect(hueToHex(240)).toBe('#0000ff');
  });
});
