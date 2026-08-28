import { loadCommandServerConfig } from './commandServerStorage';

export type CommandKind = 'launch_app' | 'media_key';

export type CommandDTO = {
  id: string;
  label: string;
  kind: CommandKind;
  target: string;
};

export type AppDTO = {
  id: string;
  name: string;
  icon?: string;
};

type PendingResolver = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

// A half-open TCP connection (phone roams WiFi APs, PC sleeps mid-request,
// wrong port pointing at some other service) never fires onclose/onerror —
// without a timeout, both the auth handshake and any request would hang
// forever with no user feedback.
const REQUEST_TIMEOUT_MS = 10000;
const TIMEOUT_MESSAGE = 'Tiempo de espera agotado — verificá la conexión al server';
const PROFILE_CHANGED_MESSAGE = 'Perfil cambiado — conexión reiniciada';

// Reused across calls so each button press / editor open doesn't pay the
// connect + auth handshake cost again — mirrors src/obs/obsCommands.ts's
// sharedSocket pattern, reset to null on close so the next call reconnects.
let sharedSocket: WebSocket | null = null;
let authPromise: Promise<void> | null = null;
let pendingByType: Partial<Record<string, PendingResolver[]>> = {};
let pendingExecute: Map<string, PendingResolver> = new Map();

// Memoizes the in-flight connection ATTEMPT itself (synchronously, before
// any await). Without this, two calls entering getAuthenticatedSocket()
// before loadCommandServerConfig() resolves both see sharedSocket === null
// and each open their own socket — the second overwrites sharedSocket,
// leaking the first (open) connection, whose later close/error handlers
// would then clobber the state of the OTHER, still-healthy connection.
let connecting: Promise<WebSocket> | null = null;

// Tracks which profile's connection config the next connection attempt
// should load. Set by ProfileContext/useProfiles whenever the active
// profile changes (on initial load and on every switch/create), BEFORE the
// shared socket is reset — so the next reconnect picks up the new profile's
// host/port/password instead of the previous profile's.
let currentProfileId = 'default';

export function setActiveProfileId(profileId: string): void {
  currentProfileId = profileId;
}

// Bumped every time resetSharedConnection() runs so an in-flight connect
// attempt that started under the PREVIOUS profile can recognize it's stale
// once its awaits resolve — see the generation check in openSocket() below.
let connectionGeneration = 0;

// Public name for resetting the shared connection — used by profile
// switching (see useProfiles.ts) so the next command reconnects under the
// newly active profile instead of reusing a socket authenticated against
// the previous profile's server.
//
// This must behave like a REAL reset, not just clear references: it closes
// the actual socket that was live at the moment of the switch and rejects
// every pending request, the same way resetConnection() does for a real
// close/error. Otherwise the old socket is leaked (never closed) and any
// pending request's 10s timeout timer is left dangling — when it later
// fires, it would call resetConnection() against whatever sharedSocket
// happens to be by then, which could be the NEW profile's healthy
// connection, incorrectly tearing it down.
//
// `__resetSharedSocketForTests` is kept as an alias so existing tests
// importing that name keep working unchanged.
export function resetSharedConnection(): void {
  connectionGeneration += 1;
  connecting = null;
  if (sharedSocket) {
    // Reuse the existing per-socket-identity reset so it closes the socket
    // that was actually live at switch time and rejects its pending
    // requests — not whatever sharedSocket happens to be by the time this
    // runs.
    resetConnection(new Error(PROFILE_CHANGED_MESSAGE));
  } else {
    // No live socket yet (still connecting, or nothing ever opened) — still
    // clear stale auth state and reject anything pending.
    authPromise = null;
    rejectAllPending(new Error(PROFILE_CHANGED_MESSAGE));
  }
}

export const __resetSharedSocketForTests = resetSharedConnection;

// Rejects every in-flight request (both the FIFO-matched pendingByType
// waiters and the id-keyed pendingExecute entries) and clears them. Used
// whenever the shared connection goes away — closed, errored, timed out, or
// received a malformed frame — so a dropped connection surfaces as a
// rejection instead of hanging callers forever.
function rejectAllPending(error: Error): void {
  for (const type of Object.keys(pendingByType)) {
    const waiters = pendingByType[type];
    if (!waiters) continue;
    for (const waiter of waiters) waiter.reject(error);
  }
  pendingByType = {};

  for (const pending of pendingExecute.values()) {
    pending.reject(error);
  }
  pendingExecute.clear();
}

function closeSocket(socket: WebSocket): void {
  try {
    socket.close();
  } catch {
    // Socket may already be closing/closed — closing twice is a no-op.
  }
}

// Tears down the CURRENT shared connection: clears the cached socket/auth
// state, closes the socket, and rejects every pending request. Safe to call
// more than once — a no-op close on an already-closing socket is harmless.
//
// sharedSocket must be nulled out BEFORE calling socket.close(): some
// WebSocket implementations (and this file's own test double) invoke
// onclose synchronously from close(), and that handler re-enters this
// function guarded by `sharedSocket === socket` — if the identity hasn't
// been cleared yet, that guard passes again and recurses forever.
function resetConnection(error: Error): void {
  const socket = sharedSocket;
  sharedSocket = null;
  authPromise = null;
  if (socket) closeSocket(socket);
  rejectAllPending(error);
}

async function getAuthenticatedSocket(): Promise<WebSocket> {
  if (sharedSocket && authPromise) {
    await authPromise;
    return sharedSocket;
  }
  if (connecting) return connecting;
  connecting = openSocket();
  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}

async function openSocket(): Promise<WebSocket> {
  // Captured BEFORE the async config load below, which reads whatever
  // currentProfileId is at that instant. If a profile switch (and its
  // resetSharedConnection() call) happens while we're awaiting that load,
  // the generation check right after catches it — this attempt was started
  // for the OLD profile and must not become the shared connection for the
  // new one.
  const generation = connectionGeneration;
  const config = await loadCommandServerConfig(currentProfileId);

  if (generation !== connectionGeneration) {
    // A profile switch happened mid-load. Never create/assign a socket for
    // this stale attempt — bail out so the caller's next real command
    // triggers a fresh connect under the now-current profile's config.
    throw new Error(PROFILE_CHANGED_MESSAGE);
  }

  const socket = new WebSocket(`ws://${config.host}:${config.port}`);
  sharedSocket = socket;

  authPromise = new Promise<void>((resolve, reject) => {
    let authSettled = false;

    const timeoutId = setTimeout(() => {
      failConnection(new Error(TIMEOUT_MESSAGE));
    }, REQUEST_TIMEOUT_MS);

    const resolveAuth = () => {
      if (authSettled) return;
      authSettled = true;
      clearTimeout(timeoutId);
      resolve();
    };

    // A rejected/failed authPromise must not be left cached: if we left
    // sharedSocket/authPromise assigned, every subsequent call would take
    // the fast path at the top of getAuthenticatedSocket and keep
    // re-awaiting the same already-settled promise forever — even after the
    // user fixes the password in Settings. Resetting here forces the next
    // call to open a fresh connection with the current config.
    //
    // This is called for failures both before AND after auth succeeds (e.g.
    // a malformed frame arriving mid-session), so rejecting the authPromise
    // itself only happens once (authSettled guard) while the connection
    // reset/close always runs — a stale/superseded socket can never touch
    // this state once it's no longer sharedSocket.
    const failConnection = (error: Error) => {
      if (!authSettled) {
        authSettled = true;
        clearTimeout(timeoutId);
        reject(error);
      }
      if (sharedSocket === socket) {
        resetConnection(error);
      } else {
        closeSocket(socket);
      }
    };

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'auth', password: config.password }));
    };
    socket.onmessage = event => handleMessage(event.data, resolveAuth, failConnection);
    socket.onerror = () => {
      if (sharedSocket !== socket) return;
      failConnection(new Error('No se pudo conectar al server de comandos'));
    };
    socket.onclose = () => {
      if (sharedSocket !== socket) return;
      failConnection(new Error('Conexión cerrada'));
    };
  });

  await authPromise;
  return socket;
}

function handleMessage(
  raw: string,
  resolveAuth: () => void,
  failConnection: (error: Error) => void,
): void {
  let message: Record<string, unknown>;
  try {
    message = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // A non-JSON frame (wrong port hitting an unrelated service, a proxy
    // error page) means we're not actually talking to the command server —
    // treat it as a connection-level failure so every pending request is
    // rejected instead of hanging, rather than letting the exception
    // escape this handler.
    failConnection(new Error('Respuesta inválida del server de comandos'));
    return;
  }
  const type = message.type as string;

  if (type === 'auth_ok') {
    resolveAuth();
    return;
  }
  if (type === 'auth_error') {
    failConnection(new Error(String(message.message ?? 'Autenticación fallida')));
    return;
  }
  if (type === 'execute_ok' || type === 'execute_error') {
    const commandId = String(message.command_id);
    const pending = pendingExecute.get(commandId);
    if (!pending) return;
    pendingExecute.delete(commandId);
    if (type === 'execute_ok') pending.resolve(undefined);
    else pending.reject(new Error(String(message.message ?? 'Error al ejecutar el comando')));
    return;
  }

  const waiters = pendingByType[type];
  if (!waiters || waiters.length === 0) return;
  const { resolve } = waiters.shift()!;
  resolve(message);
}

function waitFor<T>(type: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    // If nothing ever answers this request (half-open connection), the
    // whole shared connection is presumably dead — reset it so every other
    // in-flight/future request rejects/reconnects instead of staying stuck
    // on a socket that looks alive but never responds.
    const timeoutId = setTimeout(() => {
      resetConnection(new Error(TIMEOUT_MESSAGE));
    }, REQUEST_TIMEOUT_MS);

    const list = pendingByType[type] ?? [];
    list.push({
      resolve: value => {
        clearTimeout(timeoutId);
        resolve(value as T);
      },
      reject: error => {
        clearTimeout(timeoutId);
        reject(error);
      },
    });
    pendingByType[type] = list;
  });
}

export async function listApps(): Promise<AppDTO[]> {
  const socket = await getAuthenticatedSocket();
  const promise = waitFor<{ apps: AppDTO[] }>('apps');
  socket.send(JSON.stringify({ type: 'list_apps' }));
  return (await promise).apps;
}

export async function listCommands(): Promise<CommandDTO[]> {
  const socket = await getAuthenticatedSocket();
  const promise = waitFor<{ commands: CommandDTO[] }>('commands');
  socket.send(JSON.stringify({ type: 'list_commands' }));
  return (await promise).commands;
}

export async function createCommand(label: string, kind: CommandKind, target: string): Promise<CommandDTO> {
  const socket = await getAuthenticatedSocket();
  const promise = waitFor<{ command: CommandDTO }>('command_created');
  socket.send(JSON.stringify({ type: 'create_command', label, kind, target }));
  return (await promise).command;
}

export async function updateCommand(id: string, label: string, target: string): Promise<CommandDTO> {
  const socket = await getAuthenticatedSocket();
  const promise = waitFor<{ command: CommandDTO }>('command_updated');
  socket.send(JSON.stringify({ type: 'update_command', id, label, target }));
  return (await promise).command;
}

export async function deleteCommand(id: string): Promise<void> {
  const socket = await getAuthenticatedSocket();
  const promise = waitFor<unknown>('command_deleted');
  socket.send(JSON.stringify({ type: 'delete_command', id }));
  await promise;
}

export async function executeCommand(commandId: string): Promise<void> {
  const socket = await getAuthenticatedSocket();
  const promise = new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      resetConnection(new Error(TIMEOUT_MESSAGE));
    }, REQUEST_TIMEOUT_MS);
    pendingExecute.set(commandId, {
      resolve: value => {
        clearTimeout(timeoutId);
        resolve(value as void);
      },
      reject: error => {
        clearTimeout(timeoutId);
        reject(error);
      },
    });
  });
  socket.send(JSON.stringify({ type: 'execute', command_id: commandId }));
  await promise;
}
