export const color = {
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
} as const;

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
  panelType: 'dark' as const,
  drawerAmount: 55,
  drawerType: 'dark' as const,
  appBarAmount: 48,
  appBarType: 'dark' as const,
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
