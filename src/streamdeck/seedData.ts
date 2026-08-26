import type { StreamDeckState } from './types';

export const SEED_STATE: StreamDeckState = {
  categoryOrder: ['cat-obs', 'cat-system'],
  categories: {
    'cat-obs': { id: 'cat-obs', name: 'OBS', buttonIds: ['btn-scene-1', 'btn-scene-2', 'btn-mute-mic', 'btn-toggle-cam'] },
    'cat-system': { id: 'cat-system', name: 'Sistema', buttonIds: ['btn-lock-screen', 'btn-open-terminal'] },
  },
  buttons: {
    'btn-scene-1': {
      id: 'btn-scene-1',
      label: 'Escena 1',
      icon: 'movie-outline',
      iconColor: '#ffffff',
      background: { type: 'color', color: '#3a7bfd' },
      action: { type: 'obs', label: 'Cambiar a Escena 1' },
    },
    'btn-scene-2': {
      id: 'btn-scene-2',
      label: 'Escena 2',
      icon: 'movie-outline',
      iconColor: '#ffffff',
      background: { type: 'color', color: '#2f9e6f' },
      action: { type: 'obs', label: 'Cambiar a Escena 2' },
    },
    'btn-mute-mic': {
      id: 'btn-mute-mic',
      label: 'Mic',
      icon: 'microphone',
      iconColor: '#ffffff',
      background: { type: 'color', color: '#d9534f' },
      action: { type: 'obs', label: 'Silenciar micrófono' },
    },
    'btn-toggle-cam': {
      id: 'btn-toggle-cam',
      label: 'Cámara',
      icon: 'camera',
      iconColor: '#ffffff',
      background: { type: 'color', color: '#9b59b6' },
      action: { type: 'obs', label: 'Alternar cámara' },
    },
    'btn-lock-screen': {
      id: 'btn-lock-screen',
      label: 'Bloquear',
      icon: 'lock-outline',
      iconColor: '#ffffff',
      background: { type: 'color', color: '#5a6270' },
      action: { type: 'command', label: 'Bloquear pantalla' },
    },
    'btn-open-terminal': {
      id: 'btn-open-terminal',
      label: 'Terminal',
      icon: 'console',
      iconColor: '#ffffff',
      background: { type: 'color', color: '#1a1a1a' },
      action: { type: 'command', label: 'Abrir terminal' },
    },
  },
};
