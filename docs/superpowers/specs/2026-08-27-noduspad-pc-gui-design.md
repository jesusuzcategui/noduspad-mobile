# noduspad-pc GUI — Design

## Goal

Turn `noduspad-pc` from a terminal-only binary into something a non-developer can run: a single-window desktop app with a Start/Stop button, live status, an event log, and simple port/password fields — no config file editing, no terminal required. Cross-platform (Linux/Windows/macOS), matching NativeStreamDeck's visual identity.

## Scope

**In scope:**

- New Fyne-based GUI (`cmd/gui/`), single window, no menus/tabs.
- Reuses the existing `internal/{config,store,exec,ws,applister}` packages — the GUI starts/stops the same in-process `http.Server`, it does not spawn a subprocess.
- Port + password fields directly on the main window; "Iniciar servidor" / "Detener servidor" toggle button; live status (idle/running/error).
- A scrolling recent-events panel (last ~20 lines) mirroring the log file.
- Persistent event log at `~/.config/noduspad-pc/logs/server.log` — every connection, auth failure, and executed command (with result), one line per event, timestamped.
- Config persistence at `~/.config/noduspad-pc/config.json` (`{port, password}`), written automatically when "Iniciar" is pressed. CLI flags (`--port`/`--password`) still work on the existing `main.go` binary and take precedence over the config file when given.
- Light/dark theme matching NativeStreamDeck's exact palette (see Theme below), following the OS theme with no manual override needed for v1 (Fyne's theme variant already reacts to the OS setting).
- English/Spanish UI strings, following system locale.

**Out of scope (this spec):**

- A "Settings" section/screen — deliberately rejected; everything lives on the one window.
- Manual light/dark toggle inside the GUI (system-follows only, matches how Fyne apps conventionally behave — can be added later if wanted).
- The equivalent NativeStreamDeck (RN app) feature the user mentioned wanting eventually — explicitly deferred to a separate conversation after this GUI ships.
- Packaging/installers (`.deb`, `.msi`, `.dmg`) — build-and-run from source is the v1 target; packaging is a follow-up.

## Architecture

`cmd/gui/main.go` is a new entry point alongside the existing `main.go` (CLI). Both share the same `internal/` packages. The GUI:

1. On launch, loads `~/.config/noduspad-pc/config.json` if present (falls back to empty port/password fields if not) and pre-fills the two inputs.
2. On "Iniciar": validates password is non-empty (button is disabled otherwise), writes `{port, password}` to `config.json`, constructs `store.New` → `exec.New` → `applister.New` → `ws.NewServer` → an `*http.Server`, starts it in a goroutine, flips to "Detener servidor" + "Escuchando en :puerto" status.
3. On "Detener": calls `server.Shutdown(ctx)` (graceful), flips back to "Iniciar servidor" + "Detenido" status.
4. On window close while running: same graceful shutdown before the process exits (Fyne's `SetCloseIntercept`).
5. The `ws.Server` gains an optional event-sink hook (a `func(Event)` passed into `NewServer` or set afterward) that both the log-file writer and the GUI's recent-events panel subscribe to — one event stream, two consumers.

## Log

New `internal/applog` package:

```go
type Event struct {
	Time    time.Time
	Kind    string // "connection", "auth_failure", "command_executed"
	Detail  string
}

type Logger struct { /* wraps a file handle, appends one JSON or plain-text line per Event */ }

func New(path string) (*Logger, error)
func (l *Logger) Log(e Event)
func (l *Logger) Close() error
```

Path: `~/.config/noduspad-pc/logs/server.log` (via `os.UserConfigDir()`, same base directory `commands.json` already uses — no new top-level folder). The directory is created if missing, same as the store's existing `MkdirAll` pattern. Plain-text lines, e.g.:

```
2026-08-27T20:14:03-05:00 connection client=192.168.1.42:51322
2026-08-27T20:14:03-05:00 auth_failure client=192.168.1.42:51322
2026-08-27T20:14:10-05:00 command_executed id=e0b84658d890cd86 kind=media_key target=play_pause result=ok
2026-08-27T20:15:02-05:00 command_executed id=a1995234da2e5246 kind=launch_app target=brave result=error message="exec: \"brave\": executable file not found in $PATH"
```

`internal/ws.Server` calls into this hook at exactly the points it already has the relevant information: right after a connection is accepted (before auth), right after an `auth_error` is sent, and at the end of `handleExecute` (success or failure).

## Config

New `internal/guiconfig` package (separate from `internal/config`, which stays CLI-flag-focused):

```go
type Config struct {
	Port     int    `json:"port"`
	Password string `json:"password"`
}

func Load(path string) (Config, error)  // missing file → zero-value Config, no error
func Save(path string, cfg Config) error
```

`main.go` (CLI) is extended so that when `--password`/`--port` are NOT explicitly given, it falls back to reading this same `config.json` before falling back to the hardcoded defaults — this is what "both CLI and GUI, and they agree" means in practice: the GUI's saved config becomes the CLI's default too.

## Theme

Fyne custom `fyne.Theme` implementation, both variants sourced directly from NativeStreamDeck's `src/theme/glass.ts`:

**Dark** (`darkColor`): background `#0c0c16`, accent `#3a7bfd`, text primary `#f4f5f9`, text secondary `#b7bccb`, danger `#ff6b6b`, input fill `rgba(255,255,255,0.05)`, input border `rgba(255,255,255,0.12)`.

**Light** (`lightColor`): background `#e1e4ef`, accent `#3a7bfd` (same accent both modes), text primary `#16171d`, text secondary `#4c505c`, danger `#d9534f`, input fill `rgba(20,20,35,0.035)`, input border `rgba(20,20,35,0.12)`.

Fyne's `fyne.CurrentApp().Settings().ThemeVariant()` reports the OS-detected light/dark preference; the custom theme's `Color()` method switches between the two palettes above based on it — no manual toggle needed for v1 (per Out of Scope).

## i18n

Two string tables (`en`, `es`) as Go maps, selected once at startup from `os.Getenv("LANG")`/OS locale (falls back to `en` if neither `es`-prefixed). Every user-facing string in the window (labels, button text, status messages, placeholder text) goes through this table — no hardcoded Spanish or English strings in the widget-construction code.

## Icon

Same pink paint-splash Stream Deck icon already used for NativeStreamDeck's launcher icon and About page (`src/assets/logo.png` in the RN repo). Copied to `noduspad-pc/icon.png`. Fyne apps set their window/taskbar icon via `app.SetIcon(fyne.NewStaticResource(...))`, loaded from this PNG at startup (or bundled at build time with `fyne bundle` — implementer's call, whichever is less fragile for a cross-platform build).

## Error Handling

- **Port already in use** on "Iniciar": `http.Server.ListenAndServe`'s bind error is caught, status flips to "Error: puerto en uso" / "Error: port in use", button reverts to "Iniciar servidor", nothing crashes.
- **Empty password**: "Iniciar servidor" button is disabled (not just validated on click) whenever the password field is empty — mirrors the CLI's `config.Load` rejecting an empty password, but surfaced as a disabled button instead of a startup crash, since this GUI is meant for non-developers.
- **`config.json` write failure** (permissions, disk full): status shows an error inline, but the server still starts with the in-memory port/password — a failed _save_ doesn't block _starting_.
- **Window closed while server is running**: `SetCloseIntercept` triggers a graceful `server.Shutdown(ctx)` (short timeout, e.g. 3s) before the app actually exits — no orphaned listener like we hit today with the podman container.
- **Log file unwritable** (permissions, disk full): the `applog.Logger` silently no-ops per event rather than crashing the server or the GUI — event log is a convenience, not load-bearing for the server's actual function.

## Testing

- `internal/guiconfig`: `Load`/`Save` roundtrip, missing-file → zero-value, corrupt-file → zero-value (same resilience pattern as `internal/store`).
- `internal/applog`: `Log` writes the expected line format; directory auto-created; logging after `Close()` doesn't panic; write failure (e.g. read-only path in a test) doesn't return an error to the caller (the no-op-on-failure contract above).
- `internal/ws.Server`'s new event-sink hook: a test double sink receiving exactly the expected `Event`s for connection/auth-failure/execute paths — extending the existing `internal/ws` test suite, not a new package.
- The Fyne window itself: manual verification only, on your actual desktop (Linux first, since that's the dev machine) — same "live verification" habit already established for the RN app. Windows/macOS builds are compiled but visually unverified here, same caveat as the server's platform-specific executor code.

## Open Items for Implementation Planning

- Exact Fyne widget layout (which container/layout type keeps "one screen, no scrolling except the event panel" true at a reasonable minimum window size).
- Whether `go.mod`'s existing `github.com/micmonay/keybd_event` (cgo, Linux uinput) creates any friction bundling with Fyne's own cgo requirements (Fyne needs a C compiler + OpenGL/GLFW deps to build) — worth a smoke build early in the implementation plan rather than discovering it late.
- Exact list of Spanish/English strings needed, enumerated once the widget layout is drawn out, so the plan's tasks have literal strings to write instead of placeholders.
