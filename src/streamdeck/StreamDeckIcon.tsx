import React from 'react';
import * as LucideIcons from 'lucide-react-native';
import { HelpCircle, LucideProps } from 'lucide-react-native';

export type StreamDeckIconName = string;

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
  const Icon = resolveIcon(name);
  return <Icon color={color} size={size} strokeWidth={2} />;
}
