export type ColorTokens = {
  voidTop: string;
  voidBottom: string;
  glowBlue: string;
  glowViolet: string;
  panelFill: string;
  panelFillPressed: string;
  panelBorder: string;
  panelHighlight: string;
  panelShadow: string;
  accent: string;
  accentPressed: string;
  accentGlow: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  danger: string;
  inputFill: string;
  inputBorder: string;
  inputBorderFocused: string;
};

export const darkColor: ColorTokens = {
  voidTop: '#050508',
  voidBottom: '#0c0c16',
  glowBlue: '#3a7bfd',
  glowViolet: '#6a4cff',
  panelFill: 'rgba(255,255,255,0.07)',
  panelFillPressed: 'rgba(255,255,255,0.12)',
  panelBorder: 'rgba(255,255,255,0.14)',
  panelHighlight: 'rgba(255,255,255,0.22)',
  panelShadow: 'rgba(0,0,0,0.55)',
  accent: '#3a7bfd',
  accentPressed: '#2f68d9',
  accentGlow: 'rgba(58,123,253,0.45)',
  textPrimary: '#f4f5f9',
  textSecondary: '#b7bccb',
  textMuted: '#7a7f92',
  danger: '#ff6b6b',
  inputFill: 'rgba(255,255,255,0.05)',
  inputBorder: 'rgba(255,255,255,0.12)',
  inputBorderFocused: 'rgba(58,123,253,0.65)',
};

export const lightColor: ColorTokens = {
  voidTop: '#eef0f6',
  voidBottom: '#e1e4ef',
  glowBlue: '#3a7bfd',
  glowViolet: '#6a4cff',
  panelFill: 'rgba(20,20,35,0.045)',
  panelFillPressed: 'rgba(20,20,35,0.09)',
  panelBorder: 'rgba(20,20,35,0.10)',
  panelHighlight: 'rgba(255,255,255,0.7)',
  panelShadow: 'rgba(20,20,45,0.18)',
  accent: '#3a7bfd',
  accentPressed: '#2f68d9',
  accentGlow: 'rgba(58,123,253,0.28)',
  textPrimary: '#16171d',
  textSecondary: '#4c505c',
  textMuted: '#888ca0',
  danger: '#d9534f',
  inputFill: 'rgba(20,20,35,0.035)',
  inputBorder: 'rgba(20,20,35,0.12)',
  inputBorderFocused: 'rgba(58,123,253,0.55)',
};

export type ColorScheme = 'light' | 'dark';

// Kept as a fallback/default export so any straggling import of `color` still
// resolves to something sane — theme-aware code should use useThemeColors().
export const color = darkColor;

export function blurTypeForScheme(scheme: ColorScheme): 'dark' | 'light' {
  return scheme === 'dark' ? 'dark' : 'light';
}

export const radius = {
  panel: 28,
  card: 22,
  input: 16,
  pill: 999,
  chip: 12,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 32,
  xxl: 48,
} as const;

export const blur = {
  panelAmount: 42,
  drawerAmount: 55,
  appBarAmount: 48,
} as const;

export const type = {
  display: { fontSize: 34, fontWeight: '700' as const, letterSpacing: -0.4 },
  title: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.2 },
  body: { fontSize: 16, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.2 },
  caption: { fontSize: 12, fontWeight: '500' as const, letterSpacing: 0.3 },
} as const;

export const shadow = {
  panel: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 14,
  },
  floating: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// Defaults for the button grid's user-configurable gap and corner radius
// (Settings > Apariencia) — kept separate from the fixed `radius`/`space`
// scale above, which drives the rest of the chrome.
export const DEFAULT_GRID_GAP = space.md;
export const DEFAULT_GRID_RADIUS = radius.chip;
