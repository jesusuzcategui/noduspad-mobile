import OBSWebSocket from 'obs-websocket-js';
import { loadOBSConfig } from './obsConnectionStorage';

export type OBSCommandKey =
  | 'change-scene'
  | 'change-vertical-scene'
  | 'start-record'
  | 'stop-record'
  | 'start-vertical-record'
  | 'stop-vertical-record'
  | 'start-stream'
  | 'stop-stream'
  | 'toggle-mute';

export const OBS_COMMANDS: { key: OBSCommandKey; label: string; needsScene: boolean }[] = [
  { key: 'change-scene', label: 'Cambiar de escena', needsScene: true },
  { key: 'change-vertical-scene', label: 'Cambiar de escena vertical (Aitum)', needsScene: true },
  { key: 'start-record', label: 'Iniciar grabación', needsScene: false },
  { key: 'stop-record', label: 'Detener grabación', needsScene: false },
  { key: 'start-vertical-record', label: 'Iniciar grabación vertical (Aitum)', needsScene: false },
  { key: 'stop-vertical-record', label: 'Detener grabación vertical (Aitum)', needsScene: false },
  { key: 'start-stream', label: 'Iniciar transmisión', needsScene: false },
  { key: 'stop-stream', label: 'Detener transmisión', needsScene: false },
  { key: 'toggle-mute', label: 'Silenciar/activar micrófono', needsScene: false },
];

// Vendor name exposed by the "Aitum Vertical" OBS plugin
// (github.com/Aitum/obs-vertical-canvas), confirmed from its source
// (vertical-canvas.cpp). It manages a SEPARATE vertical-canvas scene
// collection, reached only through obs-websocket's generic vendor-request
// mechanism (CallVendorRequest) — not through standard OBS requests.
const AITUM_VERTICAL_VENDOR = 'aitum-vertical-canvas';

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

export async function fetchVerticalScenes(): Promise<string[]> {
  const config = await loadOBSConfig(currentProfileId);
  const socket = new OBSWebSocket();
  try {
    await socket.connect(`ws://${config.host}:${config.port}`, config.password || undefined);
    // `width`/`height` identify which vertical canvas to target (for
    // multi-canvas setups) — omitted here (both effectively 0), so the
    // plugin's dock-matching filter never matches and it falls back across
    // all configured vertical-canvas docks. Harmless for the common
    // single-vertical-canvas setup (only one dock to match). See the
    // switch_scene comment below for the confirmed same behavior there.
    const { responseData } = await socket.call('CallVendorRequest', {
      vendorName: AITUM_VERTICAL_VENDOR,
      requestType: 'get_scenes',
      requestData: {},
    });
    const scenes = (responseData as { scenes?: unknown }).scenes;
    // Plugin returns an array of objects `{ name: "SceneName" }`, not plain
    // strings — confirmed from vertical-canvas.cpp's vendor_request_get_scenes.
    return Array.isArray(scenes)
      ? scenes.map(scene => String((scene as { name?: unknown })?.name))
      : [];
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
    case 'change-vertical-scene':
      if (!sceneName) throw new Error('Este botón no tiene una escena seleccionada');
      // NOTE: confirmed from vertical-canvas.cpp that switch_scene, unlike
      // get_scenes/current_scene, takes no `width`/`height` at all — it
      // unconditionally broadcasts to every configured vertical-canvas
      // dock. Harmless for the common single-vertical-canvas setup (only
      // one dock to switch), but if the user ever runs multiple vertical
      // canvases with different scene names, this will switch all of them
      // to `sceneName` — there's no way to target just one via this
      // request type as currently implemented by the plugin.
      await socket.call('CallVendorRequest', {
        vendorName: AITUM_VERTICAL_VENDOR,
        requestType: 'switch_scene',
        requestData: { scene: sceneName },
      });
      return;
    case 'start-record':
      await socket.call('StartRecord');
      return;
    case 'stop-record':
      await socket.call('StopRecord');
      return;
    case 'start-vertical-record':
    case 'stop-vertical-record': {
      // NOTE: confirmed from vertical-canvas.cpp's vendor_request_invoke —
      // start_recording/stop_recording read width/height to pick a dock,
      // but (unlike switch_scene) stop scanning at the FIRST matching dock
      // rather than broadcasting to all. Omitted here (both 0, matches the
      // first dock unconditionally) — correct for the common
      // single-vertical-canvas setup; a multi-canvas setup would need
      // width/height to target a specific one. Response is `{success}`
      // only, no error field, so a false success is surfaced as a generic
      // error rather than a specific message from the plugin.
      const requestType = command === 'start-vertical-record' ? 'start_recording' : 'stop_recording';
      const { responseData } = await socket.call('CallVendorRequest', {
        vendorName: AITUM_VERTICAL_VENDOR,
        requestType,
        requestData: {},
      });
      if (!(responseData as { success?: unknown })?.success) {
        throw new Error('No se pudo controlar la grabación vertical (Aitum)');
      }
      return;
    }
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
