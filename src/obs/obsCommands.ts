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

// Reused across button presses so each tap doesn't pay the connect handshake
// cost again; reconnects lazily the next time a command is executed.
let sharedSocket: OBSWebSocket | null = null;

async function getSharedSocket(): Promise<OBSWebSocket> {
  if (sharedSocket) return sharedSocket;
  const config = await loadOBSConfig();
  const socket = new OBSWebSocket();
  await socket.connect(`ws://${config.host}:${config.port}`, config.password || undefined);
  socket.on('ConnectionClosed', () => {
    sharedSocket = null;
  });
  sharedSocket = socket;
  return socket;
}

export async function executeOBSCommand(command: OBSCommandKey, sceneName?: string): Promise<void> {
  const socket = await getSharedSocket();
  switch (command) {
    case 'change-scene':
      if (!sceneName) throw new Error('Este botón no tiene una escena seleccionada');
      await socket.call('SetCurrentProgramScene', { sceneName });
      return;
    case 'start-record':
      await socket.call('StartRecord');
      return;
    case 'stop-record':
      await socket.call('StopRecord');
      return;
    case 'start-stream':
      await socket.call('StartStream');
      return;
    case 'stop-stream':
      await socket.call('StopStream');
      return;
    case 'toggle-mute':
      throw new Error('Silenciar micrófono todavía no está soportado');
  }
}
