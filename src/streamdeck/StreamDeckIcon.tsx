import React from 'react';
import * as LucideIcons from 'lucide-react-native';
import { HelpCircle, LucideProps } from 'lucide-react-native';
import { Svg, Path } from 'react-native-svg';
import { BRAND_ICONS, type BrandIconDef } from './brandIcons';

export type StreamDeckIconName = string;

// Brand/logo icons (from simple-icons) are namespaced with this prefix so
// persisted buttons using plain Lucide names (no prefix) keep resolving
// exactly as before — no storage migration needed. Example: `brand:discord`.
const BRAND_PREFIX = 'brand:';

const BRAND_ICON_MAP: Record<string, BrandIconDef> = Object.fromEntries(
  BRAND_ICONS.map(icon => [icon.slug, icon]),
);

export const ALL_BRAND_ICON_NAMES: string[] = BRAND_ICONS.map(icon => `${BRAND_PREFIX}${icon.slug}`);

function isBrandIconName(name: StreamDeckIconName): boolean {
  return name.startsWith(BRAND_PREFIX);
}

function resolveBrandIcon(name: StreamDeckIconName): BrandIconDef | undefined {
  const slug = name.slice(BRAND_PREFIX.length);
  return BRAND_ICON_MAP[slug];
}

// Old semantic names used by seeded/persisted buttons before the full Lucide
// picker existed — kept so existing state doesn't need a storage migration.
const LEGACY_ALIASES: Record<string, string> = {
  'movie-outline': 'Clapperboard',
  microphone: 'Mic',
  camera: 'Camera',
  'lock-outline': 'Lock',
  console: 'Terminal',
};

export const QUICK_ICON_NAMES: StreamDeckIconName[] = [
  'movie-outline',
  'microphone',
  'camera',
  'lock-outline',
  'console',
];

// lucide-react-native has no aggregate `icons` map export, so the full
// library is exposed via `import *`. Each icon ships 3 aliases (Foo,
// FooIcon, LucideFoo); this keeps only the plain PascalCase one.
export const ALL_ICON_NAMES: string[] = Object.keys(LucideIcons).filter(
  key => /^[A-Z]/.test(key) && !key.startsWith('Lucide') && !key.endsWith('Icon'),
);

function resolveIcon(name: StreamDeckIconName): React.ComponentType<LucideProps> {
  const realName = LEGACY_ALIASES[name] ?? name;
  return (LucideIcons as unknown as Record<string, React.ComponentType<LucideProps>>)[realName] ?? HelpCircle;
}

type StreamDeckIconProps = {
  name: StreamDeckIconName;
  size: number;
  color: string;
};

export function StreamDeckIcon({ name, size, color }: StreamDeckIconProps) {
  if (isBrandIconName(name)) {
    const brandIcon = resolveBrandIcon(name);
    if (!brandIcon) {
      return <HelpCircle color={color} size={size} strokeWidth={2} />;
    }
    // Brand icons render in the button's chosen `iconColor` (same as Lucide
    // icons) rather than the brand's own official `hex`, for UI consistency
    // with the existing per-button color picker.
    return (
      <Svg testID="streamdeck-icon-brand-svg" width={size} height={size} viewBox="0 0 24 24">
        <Path testID="streamdeck-icon-brand-path" d={brandIcon.path} fill={color} />
      </Svg>
    );
  }

  const Icon = resolveIcon(name);
  return <Icon color={color} size={size} strokeWidth={2} />;
}
