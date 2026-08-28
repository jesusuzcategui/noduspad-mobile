# noduspad-pc Command Server — Design

## Goal

Let NativeStreamDeck's "Comando" button type actually execute on the user's PC — opening apps and sending media keys (play/pause, next/prev, volume, mute) — the way a physical Elgato Stream Deck does. Today these buttons are visual-only ("No configurado" / no execution path).

Companion server, new repo: `/home/jesusu/Workspace/jesusuzcategui/golang/noduspad-pc/`, written in Go, cross-platform (Linux/Windows/Mac).

## Scope

**In scope:**
- Standalone Go WebSocket server running on the user's PC.
- Command types: `launch_app` (open an installed application), `media_key` (play_pause, next, prev, vol_up, vol_down, mute).
- Commands created, edited, and deleted from the NativeStreamDeck app — never hardcoded in the server.
- Server lists apps actually installed on its host OS, so the app's picker shows real options, not free-text paths.
- Cross-platform from day one: Linux, Windows, macOS.
- Connection over WiFi/LAN, manual host + port + password entry in the app (same UX pattern as the existing OBS Settings tab).

**Out of scope (not this spec):**
- USB transport (discussed, rejected for now — WiFi confirmed as the only transport).
- Auto-discovery (mDNS/broadcast) — manual entry only.
- Real user-account auth system — a single shared password is enough for a personal, single-user tool.
- Arbitrary shell command execution beyond `launch_app` / `media_key` (no general-purpose remote shell).

## Architecture

Single Go binary, one process, runs on the PC, listens for WebSocket connections on a configurable port (default `7070`). The NativeStreamDeck app connects as a WS client using the same shared-connection pattern already used for `obs-websocket-js` (`src/obs/obsCommands.ts`: lazily-instantiated `sharedSocket`, reset to `null` on `ConnectionClosed`).

Commands are persisted server-side as JSON (`~/.config/noduspad-pc/commands.json` on Linux, OS-appropriate config dir elsewhere via Go's `os.UserConfigDir()`). All CRUD happens over the WebSocket connection — the app is the only editor; the JSON file is not meant to be hand-edited, though nothing prevents it.

## Components (Go)

- `main.go` — starts the WS server; loads config (port, password, path to `commands.json`) from flags/env with sane defaults.
- `ws/` — WebSocket handshake, password auth, message loop (`{type, payload}` JSON envelope).
- `commands/` — CRUD over `commands.json`: list, create, update, delete. Corrupt/missing file → start with an empty list and log the error, never crash on boot.
- `exec/` — executes a resolved command:
  - `launch_app` → `exec.Command(path)`.
  - `media_key` → `github.com/micmonay/keybd_event` (cross-platform virtual key press for play/pause, next, prev, vol up/down, mute).
- `applister/` — `AppLister` interface, one implementation per OS via Go build tags:
  - `applister_linux.go` — parses `.desktop` files in `/usr/share/applications` and `~/.local/share/applications` (freedesktop spec).
  - `applister_windows.go` — enumerates Start Menu shortcuts (`.lnk`).
  - `applister_darwin.go` — enumerates `/Applications` and `~/Applications` `.app` bundles.
  - Returns `[]App{ID, Name, Path, Icon}`.

## Client side (NativeStreamDeck app)

- New Settings tab (alongside existing OBS / Apariencia tabs in `src/screens/SettingsScreen.tsx`) — host, **port** (user-configurable, default `7070`), password. Same form pattern as `OBSSettingsTab`.
- `ButtonEditorModal` — "Comando" action type gets a real picker: fetches `list_commands` (and `list_apps` when creating a new `launch_app` command) from the server instead of accepting free text.
- `StreamDeckGrid.handleButtonPress` — `command`-type buttons call `execute` for real, mirroring how `obs`-type buttons already call `executeOBSCommand`; success/error banners follow the same `TapFeedbackBanner` pattern already established for OBS.

## Data Flow (WebSocket messages, JSON)

Handshake:
```
→ {"type":"auth","password":"..."}
← {"type":"auth_ok"}
← {"type":"auth_error","message":"..."}
```

List installed apps (for the button-editor picker):
```
→ {"type":"list_apps"}
← {"type":"apps","apps":[{"id":"...","name":"Discord","icon":"base64|null"}]}
```

CRUD on custom commands:
```
→ {"type":"list_commands"}
← {"type":"commands","commands":[
    {"id":"...","label":"Abrir Discord","kind":"launch_app","target":"appId"},
    {"id":"...","label":"Play/Pause","kind":"media_key","target":"play_pause"}
  ]}

→ {"type":"create_command","label":"...","kind":"launch_app"|"media_key","target":"..."}
← {"type":"command_created","command":{...}}

→ {"type":"update_command","id":"...","label":"...","target":"..."}
← {"type":"command_updated","command":{...}}

→ {"type":"delete_command","id":"..."}
← {"type":"command_deleted","id":"..."}
```

Execute (button press outside edit mode):
```
→ {"type":"execute","command_id":"..."}
← {"type":"execute_ok","command_id":"..."}
← {"type":"execute_error","command_id":"...","message":"..."}
```

`media_key` fixed target values: `play_pause`, `next`, `prev`, `vol_up`, `vol_down`, `mute`.

## Error Handling

- **Auth failure:** server sends `auth_error`, closes the socket. App shows "Password incorrecto" in Settings; no automatic retry loop.
- **Server unreachable** (down, wrong IP, firewalled): client WS connection times out. Same pattern as OBS — shared socket resets to `null` on `ConnectionClosed`, retried on next button press. Button press with no connection → "Error: no se pudo conectar al server" banner.
- **`launch_app` with a path that no longer exists** (app uninstalled on the PC side): `exec.Command` fails → `execute_error` with message, shown as a banner. The saved command is not auto-deleted — user edits or removes it manually.
- **`media_key` unsupported by the OS/session** (e.g., a Wayland session without the needed permissions): `execute_error` with the underlying `keybd_event` error message.
- **Corrupt `commands.json` on server boot:** logged, server starts with an empty command list rather than crashing.
- **Button references a command deleted on the PC side:** `execute` returns `execute_error` "comando no encontrado" — same visual treatment as "No configurado".

## Testing

**Go (`noduspad-pc`):**
- `commands/` — CRUD against a temp-file JSON store; create/read/update/delete; corrupt file → empty list, no panic.
- `ws/` — auth success/failure, malformed messages, `execute` against a nonexistent `command_id`.
- `applister/` — tested on the OS the CI runs on (Linux); `.desktop` parsing against fixture files.
- `exec/` — `launch_app` and `media_key` executed against interfaces/mocks, never launching real apps or firing real key events in tests.

**RN (NativeStreamDeck, Jest + Testing Library):**
- New Settings tab — persists host/port/password, mirrors `OBSSettingsTab` test coverage.
- `ButtonEditorModal` — "Comando" action type with the real command/app picker.
- `StreamDeckGrid.handleButtonPress` — `command`-type branch executes for real, success/error banners.
- Live verification on the physical tablet against the server running on the user's actual CachyOS machine, per the user's established habit of confirming every UI-facing feature on-device before calling it done.

## Open Items for Implementation Planning

- Exact CLI flags / env var names for the Go server config (port, password, commands-file path).
- Where `keybd_event` needs elevated permissions per OS (notably Linux input group / Wayland) — document setup steps for the user, since this is a personal tool they'll run themselves.
- Icon encoding for `list_apps` (base64 PNG vs. omitted for v1) — can default to `icon: null` and defer real icon extraction if it adds too much scope.
