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

// Reused across calls so each button press / editor open doesn't pay the
// connect + auth handshake cost again — mirrors src/obs/obsCommands.ts's
// sharedSocket pattern, reset to null on close so the next call reconnects.
let sharedSocket: WebSocket | null = null;
let authPromise: Promise<void> | null = null;
let pendingByType: Partial<Record<string, PendingResolver[]>> = {};
let pendingExecute: Map<string, PendingResolver> = new Map();

export function __resetSharedSocketForTests(): void {
  sharedSocket = null;
  authPromise = null;
  pendingByType = {};
  pendingExecute = new Map();
}

// Rejects every in-flight request (both the FIFO-matched pendingByType
// waiters and the id-keyed pendingExecute entries) and clears them. Used
// whenever the shared connection goes away — closed or errored — so a
// dropped connection surfaces as a rejection instead of hanging callers
// forever.
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

async function getAuthenticatedSocket(): Promise<WebSocket> {
  if (sharedSocket && authPromise) {
    await authPromise;
    return sharedSocket;
  }

  const config = await loadCommandServerConfig();
  const socket = new WebSocket(`ws://${config.host}:${config.port}`);
  sharedSocket = socket;

  authPromise = new Promise<void>((resolve, reject) => {
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'auth', password: config.password }));
    };
    // A rejected authPromise must not be left cached: if we left
    // sharedSocket/authPromise assigned, every subsequent call would take
    // the fast path at the top of this function and keep re-awaiting the
    // same already-rejected promise forever — even after the user fixes
    // the password in Settings. Closing + nulling here forces the next
    // call to open a fresh connection with the current config.
    const rejectAndReset = (error: Error) => {
      sharedSocket = null;
      authPromise = null;
      socket.close();
      reject(error);
    };
    socket.onmessage = event => handleMessage(event.data, resolve, rejectAndReset);
    socket.onerror = () => rejectAndReset(new Error('No se pudo conectar al server de comandos'));
    socket.onclose = () => {
      sharedSocket = null;
      authPromise = null;
      // The connection can drop mid-request (realistic on a home network
      // talking to the companion PC) — without this, any in-flight call
      // would hang forever with no rejection and no timeout.
      rejectAllPending(new Error('Conexión cerrada'));
    };
  });

  await authPromise;
  return socket;
}

function handleMessage(
  raw: string,
  resolveAuth: () => void,
  rejectAuth: (error: Error) => void,
): void {
  const message = JSON.parse(raw) as Record<string, unknown>;
  const type = message.type as string;

  if (type === 'auth_ok') {
    resolveAuth();
    return;
  }
  if (type === 'auth_error') {
    rejectAuth(new Error(String(message.message ?? 'Autenticación fallida')));
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
    const list = pendingByType[type] ?? [];
    list.push({ resolve: resolve as (value: unknown) => void, reject });
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
    pendingExecute.set(commandId, { resolve: resolve as (value: unknown) => void, reject });
  });
  socket.send(JSON.stringify({ type: 'execute', command_id: commandId }));
  await promise;
}
