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

// Tracks which profile's connection config the next connection attempt
// should load. Set by ProfileContext/useProfiles whenever the active
// profile changes (on initial load and on every switch/create), BEFORE the
// shared socket is reset — mirrors commandServerClient.ts's currentProfileId.
let currentProfileId = 'default';

export function setActiveProfileId(profileId: string): void {
  currentProfileId = profileId;
}

// Bumped every time resetOBSSharedConnection() runs so an in-flight connect
// attempt started under the PREVIOUS profile can recognize it's stale once
// its awaits resolve — see the generation check in getSharedSocket() below.
// Mirrors commandServerClient.ts's connectionGeneration.
let connectionGeneration = 0;

export async function fetchOBSScenes(): Promise<string[]> {
  const config = await loadOBSConfig(currentProfileId);
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

  // Captured BEFORE the async config load + connect below, which read
  // whatever currentProfileId is at that instant. If a profile switch (and
  // its resetOBSSharedConnection() call) happens while this attempt is
  // in-flight, the generation check right after `connect()` catches it —
  // this attempt was started for the OLD profile and must not become the
  // shared connection for the new one.
  const generation = connectionGeneration;
  const config = await loadOBSConfig(currentProfileId);
  const socket = new OBSWebSocket();
  await socket.connect(`ws://${config.host}:${config.port}`, config.password || undefined);

  if (generation !== connectionGeneration) {
    // A profile switch happened mid-connect. This socket is authenticated
    // against the OLD profile's OBS instance — discard it instead of
    // leaving it dangling or letting it become the shared connection; the
    // next real command will connect fresh under the now-current profile.
    try {
      await socket.disconnect();
    } catch {
      // Already disconnected/disconnecting — ignore.
    }
    throw new Error('Perfil cambiado — reintentando conexión');
  }

  // Identity guard mirrors commandServerClient.ts's own close/error
  // handlers (`if (sharedSocket === socket) { resetConnection(error); }`):
  // resetOBSSharedConnection() may disconnect an OLD socket whose
  // 'ConnectionClosed' event then fires asynchronously AFTER a new
  // profile's socket has already been assigned to sharedSocket — without
  // this check, that stale event would incorrectly null out the NEW,
  // healthy connection.
  socket.on('ConnectionClosed', () => {
    if (sharedSocket === socket) sharedSocket = null;
  });
  sharedSocket = socket;
  return socket;
}

// Tears down the current shared OBS connection so the next command opens a
// fresh one — used when switching the active profile, since each profile has
// its own OBS host/port/password. Mirrors commandServerClient.ts's
// resetSharedConnection/__resetSharedSocketForTests pattern.
export function resetOBSSharedConnection(): void {
  connectionGeneration += 1;
  const socket = sharedSocket;
  sharedSocket = null;
  if (socket) {
    try {
      socket.disconnect();
    } catch {
      // Socket may already be closing/closed — disconnecting twice is a no-op.
    }
  }
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
