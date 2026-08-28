# NativeStreamDeck ↔ noduspad-pc Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the "Comando" button type in NativeStreamDeck actually execute — open apps, send media keys — against a running `noduspad-pc` server, the same way "OBS" buttons already execute for real against `obs-websocket-js`.

**Architecture:** Mirror the existing OBS integration end to end: a connection-config context/storage module, a WS client module with a lazily-instantiated shared socket, a new Settings tab for host/port/password, a real picker in `ButtonEditorModal` (backed by `list_commands`/`list_apps`), and `StreamDeckGrid.handleButtonPress` executing for real.

**Tech Stack:** React Native, TypeScript, native `WebSocket` (no new dependency — the protocol is plain JSON over WS, unlike OBS which needed `obs-websocket-js` for its RPC semantics), AsyncStorage, Jest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-27-noduspad-pc-command-server-design.md`.

**Depends on:** the WS protocol defined in `docs/superpowers/plans/2026-08-27-noduspad-pc-server.md` (Plan A) — this plan can be implemented against that protocol document without the Go binary actually running; end-to-end live verification (Task 6) needs the real server.

## Global Constraints

- Follow the theme-aware pattern already established across the codebase: `const color = useThemeColors(); const styles = createStyles(color);` inside the component, `StyleSheet.create` wrapped in a `createStyles` factory.
- Persist connection config via AsyncStorage using the exact `loadXConfig`/`saveXConfig` pattern in `src/obs/obsConnectionStorage.ts` — don't introduce a different persistence approach for symmetry's sake.
- Reuse the shared-socket-with-reconnect pattern from `src/obs/obsCommands.ts` (`sharedSocket` reset to `null` on close) — don't reconnect on every button press.
- Settings tab, button editor picker, and grid execution all follow the OBS tab's existing testIDs naming convention (`editor-command-*`, `settings-tab-*`, etc.) so tests read the same way across both integrations.
- Never touch `src/obs/**` — this plan adds a parallel `src/commandServer/**` module, it does not modify OBS behavior.

---

### Task 1: Connection config storage + context

**Files:**
- Create: `src/commandServer/commandServerStorage.ts`
- Test: `src/commandServer/commandServerStorage.test.ts`

**Interfaces:**
- Produces: `CommandServerConfig = { host: string; port: string; password: string }`, `DEFAULT_COMMAND_SERVER_CONFIG`, `loadCommandServerConfig(): Promise<CommandServerConfig>`, `saveCommandServerConfig(config): Promise<void>`. Task 2 (WS client) and Task 3 (Settings tab) both consume these.

- [ ] **Step 1: Write the failing test**

```ts
// src/commandServer/commandServerStorage.test.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_COMMAND_SERVER_CONFIG,
  loadCommandServerConfig,
  saveCommandServerConfig,
} from './commandServerStorage';

describe('commandServerStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns defaults when nothing is stored', async () => {
    const config = await loadCommandServerConfig();
    expect(config).toEqual(DEFAULT_COMMAND_SERVER_CONFIG);
  });

  it('persists and reloads a saved config', async () => {
    const config = { host: '192.168.1.16', port: '7070', password: 'secret' };
    await saveCommandServerConfig(config);
    await expect(loadCommandServerConfig()).resolves.toEqual(config);
  });

  it('falls back to defaults on invalid stored data', async () => {
    await AsyncStorage.setItem('command-server-connection-v1', JSON.stringify({ host: 42 }));
    await expect(loadCommandServerConfig()).resolves.toEqual(DEFAULT_COMMAND_SERVER_CONFIG);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- commandServerStorage`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```ts
// src/commandServer/commandServerStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CommandServerConfig = {
  host: string;
  port: string;
  password: string;
};

const STORAGE_KEY = 'command-server-connection-v1';

export const DEFAULT_COMMAND_SERVER_CONFIG: CommandServerConfig = {
  host: 'localhost',
  port: '7070',
  password: '',
};

function isValidCommandServerConfig(value: unknown): value is CommandServerConfig {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<CommandServerConfig>;
  return (
    typeof candidate.host === 'string' &&
    typeof candidate.port === 'string' &&
    typeof candidate.password === 'string'
  );
}

export async function loadCommandServerConfig(): Promise<CommandServerConfig> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_COMMAND_SERVER_CONFIG;
    const parsed: unknown = JSON.parse(stored);
    return isValidCommandServerConfig(parsed) ? parsed : DEFAULT_COMMAND_SERVER_CONFIG;
  } catch (error) {
    console.warn('CommandServer: failed to load connection config', error);
    return DEFAULT_COMMAND_SERVER_CONFIG;
  }
}

export async function saveCommandServerConfig(config: CommandServerConfig): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.warn('CommandServer: failed to save connection config', error);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- commandServerStorage`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/commandServer/commandServerStorage.ts src/commandServer/commandServerStorage.test.ts
git commit -m "feat: add command server connection config storage"
```

---

### Task 2: WS client — connect, CRUD, execute

**Files:**
- Create: `src/commandServer/commandServerClient.ts`
- Test: `src/commandServer/commandServerClient.test.ts`

**Interfaces:**
- Consumes: `loadCommandServerConfig` from Task 1.
- Produces: `CommandDTO = { id: string; label: string; kind: 'launch_app' | 'media_key'; target: string }`, `AppDTO = { id: string; name: string; icon?: string }`, `listApps(): Promise<AppDTO[]>`, `listCommands(): Promise<CommandDTO[]>`, `createCommand(label, kind, target): Promise<CommandDTO>`, `updateCommand(id, label, target): Promise<CommandDTO>`, `deleteCommand(id): Promise<void>`, `executeCommand(commandId: string): Promise<void>`. Task 3 (Settings) doesn't need this; Task 4 (`ButtonEditorModal`) uses `listApps`/`listCommands`/`createCommand`; Task 5 (`StreamDeckGrid`) uses `executeCommand`.

- [ ] **Step 1: Write the failing test**

```ts
// src/commandServer/commandServerClient.test.ts
import { saveCommandServerConfig } from './commandServerStorage';
import { listCommands, createCommand, executeCommand, __resetSharedSocketForTests } from './commandServerClient';

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  sent: string[] = [];

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.onclose?.();
  }

  // Test helper: simulate the server responding.
  emit(message: object) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
}

// @ts-expect-error test double
global.WebSocket = FakeWebSocket;

describe('commandServerClient', () => {
  beforeEach(async () => {
    FakeWebSocket.instances = [];
    __resetSharedSocketForTests();
    await saveCommandServerConfig({ host: '192.168.1.16', port: '7070', password: 'secret' });
  });

  it('authenticates then sends list_commands and resolves on the commands response', async () => {
    const promise = listCommands();
    const socket = FakeWebSocket.instances[0];
    socket.onopen?.();
    socket.emit({ type: 'auth_ok' });
    socket.emit({ type: 'commands', commands: [{ id: '1', label: 'Play/Pause', kind: 'media_key', target: 'play_pause' }] });

    await expect(promise).resolves.toEqual([
      { id: '1', label: 'Play/Pause', kind: 'media_key', target: 'play_pause' },
    ]);
    expect(socket.sent[0]).toContain('"password":"secret"');
  });

  it('rejects when auth fails', async () => {
    const promise = createCommand('X', 'launch_app', 'x');
    const socket = FakeWebSocket.instances[0];
    socket.onopen?.();
    socket.emit({ type: 'auth_error', message: 'incorrect password' });

    await expect(promise).rejects.toThrow('incorrect password');
  });

  it('rejects execute when the server reports execute_error', async () => {
    const promise = executeCommand('abc');
    const socket = FakeWebSocket.instances[0];
    socket.onopen?.();
    socket.emit({ type: 'auth_ok' });
    socket.emit({ type: 'execute_error', command_id: 'abc', message: 'comando no encontrado' });

    await expect(promise).rejects.toThrow('comando no encontrado');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- commandServerClient`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```ts
// src/commandServer/commandServerClient.ts
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
    socket.onmessage = event => handleMessage(event.data, resolve, reject);
    socket.onerror = () => reject(new Error('No se pudo conectar al server de comandos'));
    socket.onclose = () => {
      sharedSocket = null;
      authPromise = null;
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- commandServerClient`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/commandServer/commandServerClient.ts src/commandServer/commandServerClient.test.ts
git commit -m "feat: add command server WS client"
```

---

### Task 3: Settings tab — "Comandos" connection form

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`
- Test: `src/screens/SettingsScreen.test.tsx` (extend)

**Interfaces:**
- Consumes: `loadCommandServerConfig`/`saveCommandServerConfig` from Task 1.
- Produces: nothing new consumed downstream — this is a leaf UI addition.

- [ ] **Step 1: Write the failing test**

Append to `src/screens/SettingsScreen.test.tsx` (adjust the import path/wrapper to match the file's existing setup):

```tsx
it('shows the Comandos tab and persists host/port/password', async () => {
  const { getByTestId } = render(<SettingsScreen />, { wrapper: AllThemeProviders });

  fireEvent.press(getByTestId('settings-tab-commands'));
  fireEvent.changeText(getByTestId('command-server-host'), '192.168.1.16');
  fireEvent.changeText(getByTestId('command-server-port'), '7070');
  fireEvent.changeText(getByTestId('command-server-password'), 'secret');

  await waitFor(async () => {
    const saved = await loadCommandServerConfig();
    expect(saved).toEqual({ host: '192.168.1.16', port: '7070', password: 'secret' });
  });
});
```

(Add `import { loadCommandServerConfig } from '../commandServer/commandServerStorage';` at the top of the test file alongside the existing imports.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- SettingsScreen`
Expected: FAIL — `settings-tab-commands` testID doesn't exist yet.

- [ ] **Step 3: Write the implementation**

In `src/screens/SettingsScreen.tsx`:

Change the tab type and add the import:

```ts
import {
  DEFAULT_COMMAND_SERVER_CONFIG,
  loadCommandServerConfig,
  saveCommandServerConfig,
  type CommandServerConfig,
} from '../commandServer/commandServerStorage';

type SettingsTab = 'obs' | 'appearance' | 'commands';
```

Add a third tab pill inside `styles.tabRow` (after the "Apariencia" `Pressable`):

```tsx
<Pressable
  testID="settings-tab-commands"
  onPress={() => setTab('commands')}
  style={[styles.tab, tab === 'commands' && styles.tabActive]}>
  <Text style={tab === 'commands' ? styles.tabTextActive : styles.tabText}>Comandos</Text>
</Pressable>
```

Change the tab-rendering line:

```tsx
{tab === 'obs' ? <OBSSettingsTab /> : tab === 'appearance' ? <AppearanceSettingsTab /> : <CommandServerSettingsTab />}
```

Add the new tab component (place it after `AppearanceSettingsTab`, before `Stepper`):

```tsx
function CommandServerSettingsTab() {
  const [config, setConfig] = useState<CommandServerConfig>(DEFAULT_COMMAND_SERVER_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const color = useThemeColors();
  const styles = createStyles(color);

  useEffect(() => {
    loadCommandServerConfig().then(loaded => {
      setConfig(loaded);
      setIsLoading(false);
    });
  }, []);

  const update = (next: CommandServerConfig) => {
    setConfig(next);
    saveCommandServerConfig(next);
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={color.accent} />
      </View>
    );
  }

  return (
    <GlassPanel style={styles.card}>
      <Text style={styles.title}>Servidor de comandos</Text>

      <Text style={styles.label}>Host</Text>
      <TextInput
        testID="command-server-host"
        style={styles.input}
        placeholder="localhost"
        placeholderTextColor={color.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        value={config.host}
        onChangeText={host => update({ ...config, host })}
      />

      <Text style={styles.label}>Puerto</Text>
      <TextInput
        testID="command-server-port"
        style={styles.input}
        placeholder="7070"
        placeholderTextColor={color.textMuted}
        keyboardType="number-pad"
        value={config.port}
        onChangeText={port => update({ ...config, port })}
      />

      <Text style={styles.label}>Contraseña</Text>
      <TextInput
        testID="command-server-password"
        style={styles.input}
        placeholder="Contraseña del servidor"
        placeholderTextColor={color.textMuted}
        secureTextEntry
        value={config.password}
        onChangeText={password => update({ ...config, password })}
      />
    </GlassPanel>
  );
}
```

This needs `useState`/`useEffect` from React, both already imported at the top of the file.

- [ ] **Step 4: Add `React.useState`/`useEffect` import check + run test**

`SettingsScreen.tsx` already imports `React, { useState }` — extend that import to include `useEffect`:

```ts
import React, { useEffect, useState } from 'react';
```

Run: `npm test -- SettingsScreen`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/screens/SettingsScreen.tsx src/screens/SettingsScreen.test.tsx
git commit -m "feat: add Comandos settings tab"
```

---

### Task 4: `types.ts` + `ButtonEditorModal` real command/app picker

**Files:**
- Modify: `src/streamdeck/types.ts`
- Modify: `src/streamdeck/ButtonEditorModal.tsx`
- Test: `src/streamdeck/ButtonEditorModal.test.tsx` (extend)

**Interfaces:**
- Consumes: `listCommands`, `listApps`, `createCommand` from Task 2.
- Produces: `StreamDeckButton.action.commandId?: string` — Task 5 (`StreamDeckGrid`) reads this to call `executeCommand`.

- [ ] **Step 1: Extend the type**

```ts
// src/streamdeck/types.ts
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
    // Only set for type 'obs' buttons saved through the OBS command picker.
    command?: OBSCommandKey;
    sceneName?: string;
    // Only set for type 'command' buttons saved through the noduspad-pc
    // command picker — the ID of the command as stored on the server.
    commandId?: string;
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
```

- [ ] **Step 2: Write the failing test**

Append to `src/streamdeck/ButtonEditorModal.test.tsx`:

```tsx
it('lists existing commands and selects one, saving its commandId', async () => {
  jest.spyOn(commandServerClient, 'listCommands').mockResolvedValue([
    { id: 'cmd-1', label: 'Play/Pause', kind: 'media_key', target: 'play_pause' },
  ]);

  const onSave = jest.fn();
  const button = buildButton({ action: { type: 'command', label: '' } });
  const { getByTestId } = render(
    <ButtonEditorModal button={button} onClose={jest.fn()} onSave={onSave} />,
    { wrapper: AllThemeProviders },
  );

  fireEvent.press(getByTestId('editor-action-command'));
  await waitFor(() => getByTestId('editor-existing-command-cmd-1'));
  fireEvent.press(getByTestId('editor-existing-command-cmd-1'));
  fireEvent.press(getByTestId('editor-save'));

  expect(onSave).toHaveBeenCalledWith(
    button.id,
    expect.objectContaining({
      action: expect.objectContaining({ type: 'command', commandId: 'cmd-1' }),
    }),
  );
});
```

(Add `import * as commandServerClient from '../commandServer/commandServerClient';` at the top of the test file. `buildButton` is this test file's existing button-fixture helper — check the file for its exact name/shape before using it; adapt the literal if it's named differently.)

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- ButtonEditorModal`
Expected: FAIL — `editor-existing-command-cmd-1` doesn't exist yet.

- [ ] **Step 4: Write the implementation**

In `src/streamdeck/ButtonEditorModal.tsx`, add imports:

```ts
import { listCommands, type CommandDTO } from '../commandServer/commandServerClient';
```

Add state (alongside the existing `commandKey`/`selectedScene` state):

```ts
const [existingCommands, setExistingCommands] = useState<CommandDTO[] | null>(null);
const [commandsError, setCommandsError] = useState<string | null>(null);
const [selectedCommandId, setSelectedCommandId] = useState<string | null>(null);
```

In the `useEffect` that resets state when `button` changes, add:

```ts
setSelectedCommandId(button.action.commandId ?? null);
setExistingCommands(null);
setCommandsError(null);
```

Add a loader, triggered when the user switches to the "Comando" action type:

```ts
const handleActionTypeChange = (type: 'obs' | 'command') => {
  setActionType(type);
  if (type === 'command' && existingCommands === null) {
    listCommands()
      .then(setExistingCommands)
      .catch(err => setCommandsError(err instanceof Error ? err.message : 'No se pudo conectar al server'));
  }
};
```

Replace the "Comando" segment's `onPress`:

```tsx
<Pressable
  testID="editor-action-command"
  onPress={() => handleActionTypeChange('command')}
  style={[styles.segment, actionType === 'command' && styles.segmentActive]}>
```

(and the "OBS" segment's `onPress={() => setActionType('obs')}` becomes `onPress={() => handleActionTypeChange('obs')}` for symmetry — behavior unchanged since the `command` fetch only fires for `type === 'command'`.)

Add the picker block, mirroring the existing `{actionType === 'obs' && (...)}` block:

```tsx
{actionType === 'command' && (
  <View style={styles.sceneBox}>
    {commandsError && (
      <Text testID="editor-commands-error" style={styles.errorText}>
        {commandsError}
      </Text>
    )}
    {existingCommands === null && !commandsError && <ActivityIndicator color={color.accent} />}
    {existingCommands && (
      <View style={styles.commandWrap}>
        {existingCommands.map(cmd => (
          <Pressable
            key={cmd.id}
            testID={`editor-existing-command-${cmd.id}`}
            onPress={() => {
              setSelectedCommandId(cmd.id);
              setActionLabel(cmd.label);
            }}
            style={[styles.commandChip, selectedCommandId === cmd.id && styles.commandChipActive]}>
            <Text style={selectedCommandId === cmd.id ? styles.commandChipTextActive : styles.commandChipText}>
              {cmd.label}
            </Text>
          </Pressable>
        ))}
      </View>
    )}
  </View>
)}
```

Update `handleSave`:

```ts
const handleSave = () => {
  onSave(button.id, {
    label: label.trim() || button.label,
    icon,
    background: { type: 'color', color: backgroundColor },
    action: {
      type: actionType,
      label: actionLabel.trim() || label.trim() || button.label,
      ...(actionType === 'obs' && commandKey ? { command: commandKey } : {}),
      ...(actionType === 'obs' && commandKey === 'change-scene' && selectedScene
        ? { sceneName: selectedScene }
        : {}),
      ...(actionType === 'command' && selectedCommandId ? { commandId: selectedCommandId } : {}),
    },
  });
  onClose();
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- ButtonEditorModal`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/streamdeck/types.ts src/streamdeck/ButtonEditorModal.tsx src/streamdeck/ButtonEditorModal.test.tsx
git commit -m "feat: add real command picker to button editor"
```

**Note for the implementer:** creating a brand-new `launch_app` command (picking from `listApps()`, not just selecting an existing saved command) was scoped out of this task to keep it reviewable — file a follow-up task if the "create from installed app" flow is wanted before shipping, since right now the editor only lets you attach an already-existing server-side command to a button. `listApps` from Task 2 is unused until that follow-up lands; that's expected, not a defect in this task.

---

### Task 5: `StreamDeckGrid` — execute `command` buttons for real

**Files:**
- Modify: `src/streamdeck/StreamDeckGrid.tsx`
- Test: `src/streamdeck/StreamDeckGrid.test.tsx` (extend)

**Interfaces:**
- Consumes: `executeCommand` from Task 2, `StreamDeckButton.action.commandId` from Task 4.
- Produces: nothing new consumed downstream.

- [ ] **Step 1: Write the failing test**

Append to `src/streamdeck/StreamDeckGrid.test.tsx`:

```tsx
it('executes a command button for real and shows success feedback', async () => {
  jest.spyOn(commandServerClient, 'executeCommand').mockResolvedValue(undefined);
  const { getByTestId, getByText } = renderGrid(); // use this file's existing render helper
  fireEvent.press(getByTestId('button-tile-<id-of-a-command-button-fixture>'));

  await waitFor(() => getByText(/Ejecutando/));
  expect(commandServerClient.executeCommand).toHaveBeenCalledWith('cmd-1');
});

it('shows an error banner when command execution fails', async () => {
  jest.spyOn(commandServerClient, 'executeCommand').mockRejectedValue(new Error('server caído'));
  const { getByTestId, findByText } = renderGrid();
  fireEvent.press(getByTestId('button-tile-<id-of-a-command-button-fixture>'));

  expect(await findByText(/Error: server caído/)).toBeTruthy();
});
```

(Add `import * as commandServerClient from '../commandServer/commandServerClient';` at the top. Adapt the fixture button testID/text queries to match this test file's existing conventions — check how the "executes OBS command for real" test in the same file locates its button and banner text, and mirror that exactly rather than the placeholder testID shown here.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- StreamDeckGrid`
Expected: FAIL — command buttons still show "No configurado", `executeCommand` never called.

- [ ] **Step 3: Write the implementation**

Add the import:

```ts
import { executeCommand } from '../commandServer/commandServerClient';
```

Extend `handleButtonPress`:

```ts
const handleButtonPress = useCallback(
  (button: StreamDeckButton) => {
    if (isEditMode) {
      setEditingButton(button);
      return;
    }

    if (button.action.type === 'obs' && button.action.command) {
      showFeedback(`Ejecutando: ${button.action.label}`);
      executeOBSCommand(button.action.command, button.action.sceneName).catch(err => {
        const message = err instanceof Error ? err.message : 'No se pudo conectar a OBS';
        showFeedback(`Error: ${message}`);
      });
      return;
    }

    if (button.action.type === 'command' && button.action.commandId) {
      showFeedback(`Ejecutando: ${button.action.label}`);
      executeCommand(button.action.commandId).catch(err => {
        const message = err instanceof Error ? err.message : 'No se pudo conectar al server';
        showFeedback(`Error: ${message}`);
      });
      return;
    }

    showFeedback(`No configurado: ${button.action.label}`);
  },
  [isEditMode, showFeedback],
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- StreamDeckGrid`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/streamdeck/StreamDeckGrid.tsx src/streamdeck/StreamDeckGrid.test.tsx
git commit -m "feat: execute command buttons for real"
```

---

### Task 6: Live verification + full suite

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```

Expected: PASS, no regressions in OBS-related tests (Global Constraints forbid touching `src/obs/**`, so this is a sanity check, not expected to catch anything new).

- [ ] **Step 2: Build and install a debug/release APK on the tablet**

Follow the existing device-verification habit: rebuild, install on the Xiaomi Redmi Pad 2 (adb id `9pxknj8xemsgq8hq`), retry `adb install` on `INSTALL_FAILED_USER_RESTRICTED` (routine MIUI behavior).

- [ ] **Step 3: Run `noduspad-pc` on the CachyOS machine**

```bash
cd /home/jesusu/Workspace/jesusuzcategui/golang/noduspad-pc
go run . --password <same password entered in the app's Comandos tab>
```

- [ ] **Step 4: On-device checks**

- Settings → Comandos: enter the CachyOS machine's LAN IP, port `7070`, the password — confirm no error banner.
- Create at least one `media_key` command server-side for now (via a quick manual WS message, e.g. with `websocat`, since Task 4 intentionally doesn't build the "create new command" UI) — e.g. `play_pause`.
- Edit a button, set type "Comando", pick that command, save.
- Outside edit mode, press the button — confirm the media key actually fires on the CachyOS machine (e.g. pause/resume whatever's playing) and the "Ejecutando…" banner shows, not an error.
- Stop the `noduspad-pc` process, press the button again — confirm the "Error: no se pudo conectar al server" banner shows instead of a crash.

- [ ] **Step 5: Update memory**

Once live-verified, update the `nativestreamdeck-status` memory file (`type: project`) to record that "Comando" buttons now execute for real against `noduspad-pc`, same as the OBS entry already does — and note the follow-up scoped out in Task 4 (create-command-from-installed-app UI) as the next open item.
