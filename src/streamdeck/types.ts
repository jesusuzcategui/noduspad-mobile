import type { StreamDeckIconName } from './StreamDeckIcon';

export type StreamDeckButton = {
  id: string;
  label: string;
  icon: StreamDeckIconName;
  iconColor: string;
  background: { type: 'color'; color: string } | { type: 'image'; uri: string };
  action: { type: 'obs' | 'command'; label: string };
};

export type StreamDeckCategory = {
  id: string;
  name: string;
  buttonIds: string[];
};

export type StreamDeckState = {
  categoryOrder: string[];
  categories: Record<string, StreamDeckCategory>;
  buttons: Record<string, StreamDeckButton>;
};
