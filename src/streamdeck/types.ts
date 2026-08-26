import type { StreamDeckIconName } from './StreamDeckIcon';
import type { OBSCommandKey } from '../obs/obsCommands';

export type StreamDeckButton = {
  id: string;
  label: string;
  icon: StreamDeckIconName;
  iconColor: string;
  background: { type: 'color'; color: string } | { type: 'image'; uri: string };
  action: {
    type: 'obs' | 'command';
    label: string;
    // Only set for type 'obs' buttons saved through the OBS command picker —
    // what actually runs on press. Buttons saved before this existed (or plain
    // 'command' buttons) have no `command` and only show the descriptive label.
    command?: OBSCommandKey;
    sceneName?: string;
  };
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
