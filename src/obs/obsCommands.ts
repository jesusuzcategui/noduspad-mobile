import OBSWebSocket from 'obs-websocket-js';
import { loadOBSConfig } from './obsConnectionStorage';

export type OBSCommandKey =
  | 'change-scene'
  | 'start-record'
  | 'stop-record'
  | 'start-stream'
  | 'stop-stream'
  | 'toggle-mute';

export const OBS_COMMANDS: { key: OBSCommandKey; label: string; needsScene: boolean }[] = [
  { key: 'change-scene', label: 'Cambiar de escena', needsScene: true },
  { key: 'start-record', label: 'Iniciar grabación', needsScene: false },
  { key: 'stop-record', label: 'Detener grabación', needsScene: false },
  { key: 'start-stream', label: 'Iniciar transmisión', needsScene: false },
  { key: 'stop-stream', label: 'Detener transmisión', needsScene: false },
  { key: 'toggle-mute', label: 'Silenciar/activar micrófono', needsScene: false },
];

export async function fetchOBSScenes(): Promise<string[]> {
  const config = await loadOBSConfig();
  const socket = new OBSWebSocket();
  try {
    await socket.connect(`ws://${config.host}:${config.port}`, config.password || undefined);
    const { scenes } = await socket.call('GetSceneList');
    return scenes.map(scene => String(scene.sceneName));
  } finally {
    await socket.disconnect();
  }
}
