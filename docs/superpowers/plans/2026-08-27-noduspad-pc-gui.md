# noduspad-pc GUI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `noduspad-pc` into something a non-developer can run: a single-window Fyne desktop app (Start/Stop button, live status, event log, port/password fields) alongside the existing CLI, sharing the same server internals.

**Architecture:** New `internal/guiconfig` (GUI's `config.json` persistence) and `internal/applog` (event log file) packages. `internal/ws.Server` gains an optional event-sink hook so both the log file and the GUI's on-screen event panel subscribe to the same stream. New `cmd/gui/main.go` wires a Fyne window around the existing `store`/`exec`/`applister`/`ws` packages, starting/stopping the same `http.Server` in-process. The CLI's `main.go` gains a config-file fallback so both entry points agree on saved settings.

**Tech Stack:** Go 1.23 (per this repo's toolchain — see Global Constraints), `fyne.io/fyne/v2` for the GUI, stdlib for config/log persistence.

**Spec:** `docs/superpowers/specs/2026-08-27-noduspad-pc-gui-design.md`.

**Depends on:** the already-implemented `internal/{config,store,exec,ws,applister}` packages (7-task plan `2026-08-27-noduspad-pc-server.md`, complete and merged in this repo).

## Global Constraints

- No "Settings" screen — port, password, Start/Stop, and the event panel all live on the ONE window. No tabs, no menus, no secondary dialogs for this v1.
- No manual light/dark toggle in v1 — theme follows the OS setting only (Fyne's `Settings().ThemeVariant()`).
- Colors come verbatim from `src/theme/glass.ts` in the NativeStreamDeck repo (`darkColor`/`lightColor`) — exact hex/rgba values are in the Theme section below, copy them exactly, don't approximate.
- CLI flags (`--port`/`--password`) still take precedence over `config.json` when explicitly given — the GUI's saved config is a fallback default for the CLI, not a replacement for its flags.
- Log writes must never crash the server or the GUI — a failed log write is a silent no-op (per spec's Error Handling section).
- Go 1.23 toolchain (this repo's `go.mod` — do not bump it as part of this plan; if Fyne requires newer, treat that as a blocking finding to raise, not something to silently work around).
- This repo has no local `go` on some hosts historically — check for `./go-docker.sh` or a real `go` binary first; Fyne needs cgo + a C compiler + GL headers, which the existing `golang:1.23` podman image likely does NOT have preinstalled — Task 1's first step is a smoke-build to confirm the toolchain situation BEFORE writing any GUI code, and to report back if the container path doesn't work (native Go, confirmed available in this repo's history, is the fallback).

---

### Task 1: Fyne toolchain smoke-check + module setup

**Files:**
- Modify: `go.mod`, `go.sum`

**Interfaces:**
- Produces: a confirmed-buildable `fyne.io/fyne/v2` dependency in `go.mod`. Every later task depends on this being real, not assumed.

- [ ] **Step 1: Add the dependency and attempt a trivial build**

```bash
cd /home/jesusu/Workspace/jesusuzcategui/golang/noduspad-pc
go get fyne.io/fyne/v2@latest
```

Write a throwaway smoke file to confirm the toolchain (delete it after, per Step 3):

```go
// /tmp/fyne-smoke/main.go
package main

import (
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/widget"
)

func main() {
	a := app.New()
	w := a.NewWindow("smoke")
	w.SetContent(widget.NewLabel("ok"))
	w.ShowAndRun()
}
```

```bash
cd /tmp/fyne-smoke && go mod init smoke && go mod edit -require fyne.io/fyne/v2@latest && go mod tidy && go build .
```

- [ ] **Step 2: Diagnose based on outcome**

- If it builds cleanly with the native `go` on this host: proceed with all later tasks using `go` directly (this is the expected path if Go 1.23+ is genuinely installed natively, per this repo's own history of getting Go installed on the host during earlier work).
- If it fails on missing cgo/C-compiler/GL headers: this host needs `gcc` + OpenGL/X11 dev headers (on Arch/CachyOS: `sudo pacman -S base-devel libx11 libxcursor libxrandr libxinerama libxi mesa`). Report this as a NEEDS_CONTEXT/BLOCKED finding — installing system packages is outside what an implementer should do unprompted; the controller decides whether to ask the user to install them or defer this plan.
- If `./go-docker.sh` (podman-wrapped Go) is the only available toolchain: Fyne's cgo+GL requirements make headless container builds unreliable for a GUI app specifically (you can compile the binary in theory with the right base image, but you cannot RUN/verify a GUI window inside a headless container at all) — flag this clearly; this plan's later manual-verification steps assume a real native desktop session is available.

- [ ] **Step 3: Clean up and commit**

```bash
rm -rf /tmp/fyne-smoke
git add go.mod go.sum
git commit -m "chore: add fyne dependency, confirm buildable toolchain"
```

---

### Task 2: `internal/guiconfig` — GUI config persistence

**Files:**
- Create: `internal/guiconfig/guiconfig.go`
- Test: `internal/guiconfig/guiconfig_test.go`

**Interfaces:**
- Produces: `guiconfig.Config{Port int, Password string}`, `guiconfig.Load(path string) (Config, error)`, `guiconfig.Save(path string, cfg Config) error`, `guiconfig.DefaultPath() (string, error)` (returns `~/.config/noduspad-pc/config.json` via `os.UserConfigDir()`). Task 5 (GUI) and Task 6 (CLI fallback) both consume these.

- [ ] **Step 1: Write the failing test**

```go
// internal/guiconfig/guiconfig_test.go
package guiconfig

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoad_MissingFileReturnsZeroValue(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.json")
	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("Load returned error: %v", err)
	}
	if cfg != (Config{}) {
		t.Errorf("Load() = %+v, want zero value", cfg)
	}
}

func TestSaveThenLoad_Roundtrips(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.json")
	want := Config{Port: 7099, Password: "secret"}
	if err := Save(path, want); err != nil {
		t.Fatalf("Save returned error: %v", err)
	}
	got, err := Load(path)
	if err != nil {
		t.Fatalf("Load returned error: %v", err)
	}
	if got != want {
		t.Errorf("Load() = %+v, want %+v", got, want)
	}
}

func TestLoad_CorruptFileReturnsZeroValue(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.json")
	if err := os.WriteFile(path, []byte("not json"), 0o600); err != nil {
		t.Fatalf("failed to write fixture: %v", err)
	}
	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("Load should not error on a corrupt file, got: %v", err)
	}
	if cfg != (Config{}) {
		t.Errorf("Load() on corrupt file = %+v, want zero value", cfg)
	}
}

func TestSave_CreatesParentDir(t *testing.T) {
	path := filepath.Join(t.TempDir(), "nested", "dir", "config.json")
	if err := Save(path, Config{Port: 1, Password: "x"}); err != nil {
		t.Fatalf("Save returned error: %v", err)
	}
	if _, err := os.Stat(path); err != nil {
		t.Errorf("expected file to exist at %s: %v", path, err)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/guiconfig/...` (or `./go-docker.sh test ./internal/guiconfig/...` if Task 1 determined the container path)
Expected: FAIL — package doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```go
// internal/guiconfig/guiconfig.go
package guiconfig

import (
	"encoding/json"
	"os"
	"path/filepath"
)

type Config struct {
	Port     int    `json:"port"`
	Password string `json:"password"`
}

// DefaultPath returns ~/.config/noduspad-pc/config.json (or the OS
// equivalent) — the same base directory internal/store already uses for
// commands.json, so this plan doesn't introduce a second config location.
func DefaultPath() (string, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "noduspad-pc", "config.json"), nil
}

// Load returns the zero-value Config (never an error) when the file is
// missing or corrupt — the GUI and CLI both treat "no saved config" the
// same as "config exists but unreadable": start from empty fields.
func Load(path string) (Config, error) {
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return Config{}, nil
	}
	if err != nil {
		return Config{}, err
	}
	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return Config{}, nil
	}
	return cfg, nil
}

func Save(path string, cfg Config) error {
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o600)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/guiconfig/...`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add internal/guiconfig
git commit -m "feat: add GUI config persistence"
```

---

### Task 3: `internal/applog` — event log file

**Files:**
- Create: `internal/applog/applog.go`
- Test: `internal/applog/applog_test.go`

**Interfaces:**
- Produces: `applog.Event{Time time.Time, Kind string, Detail string}`, `applog.Logger`, `applog.New(path string) (*Logger, error)`, methods `Log(e Event)`, `Close() error`. Task 4 (ws event sink) and Task 5 (GUI recent-events panel) both consume `Event`; Task 5 also constructs a `Logger`.

- [ ] **Step 1: Write the failing test**

```go
// internal/applog/applog_test.go
package applog

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestNew_CreatesParentDir(t *testing.T) {
	path := filepath.Join(t.TempDir(), "nested", "server.log")
	l, err := New(path)
	if err != nil {
		t.Fatalf("New returned error: %v", err)
	}
	defer l.Close()
	if _, err := os.Stat(path); err != nil {
		t.Errorf("expected log file to exist at %s: %v", path, err)
	}
}

func TestLog_WritesExpectedLineFormat(t *testing.T) {
	path := filepath.Join(t.TempDir(), "server.log")
	l, err := New(path)
	if err != nil {
		t.Fatalf("New returned error: %v", err)
	}
	fixedTime := time.Date(2026, 8, 27, 20, 14, 3, 0, time.UTC)
	l.Log(Event{Time: fixedTime, Kind: "connection", Detail: "client=1.2.3.4:5"})
	l.Close()

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("failed to read log file: %v", err)
	}
	line := strings.TrimSpace(string(data))
	if !strings.Contains(line, "connection") || !strings.Contains(line, "client=1.2.3.4:5") {
		t.Errorf("log line = %q, want it to contain kind and detail", line)
	}
	if !strings.HasPrefix(line, fixedTime.Format(time.RFC3339)) {
		t.Errorf("log line = %q, want RFC3339 timestamp prefix", line)
	}
}

func TestLog_AppendsMultipleEvents(t *testing.T) {
	path := filepath.Join(t.TempDir(), "server.log")
	l, _ := New(path)
	l.Log(Event{Time: time.Now(), Kind: "connection", Detail: "a"})
	l.Log(Event{Time: time.Now(), Kind: "connection", Detail: "b"})
	l.Close()

	data, _ := os.ReadFile(path)
	lines := strings.Split(strings.TrimSpace(string(data)), "\n")
	if len(lines) != 2 {
		t.Errorf("got %d lines, want 2", len(lines))
	}
}

func TestLog_AfterCloseDoesNotPanic(t *testing.T) {
	path := filepath.Join(t.TempDir(), "server.log")
	l, _ := New(path)
	l.Close()
	l.Log(Event{Time: time.Now(), Kind: "connection", Detail: "after close"})
	// No assertion needed beyond "did not panic" — the test itself failing
	// via panic is the failure mode this guards against.
}

func TestNew_UnwritablePathReturnsError(t *testing.T) {
	// A path under a file (not a directory) can never be created.
	blocker := filepath.Join(t.TempDir(), "blocker")
	if err := os.WriteFile(blocker, []byte("x"), 0o600); err != nil {
		t.Fatalf("failed to write fixture: %v", err)
	}
	_, err := New(filepath.Join(blocker, "server.log"))
	if err == nil {
		t.Fatal("expected an error creating a log file under a non-directory path")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/applog/...`
Expected: FAIL — package doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```go
// internal/applog/applog.go
package applog

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type Event struct {
	Time   time.Time
	Kind   string
	Detail string
}

type Logger struct {
	mu     sync.Mutex
	file   *os.File
	closed bool
}

func New(path string) (*Logger, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, err
	}
	f, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o600)
	if err != nil {
		return nil, err
	}
	return &Logger{file: f}, nil
}

// Log appends one line for e. A write failure (disk full, permissions
// changed after New) is a silent no-op — the event log is a convenience,
// not load-bearing for the server's actual function, per the design spec.
func (l *Logger) Log(e Event) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.closed {
		return
	}
	line := fmt.Sprintf("%s %s %s\n", e.Time.Format(time.RFC3339), e.Kind, e.Detail)
	_, _ = l.file.WriteString(line)
}

func (l *Logger) Close() error {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.closed {
		return nil
	}
	l.closed = true
	return l.file.Close()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/applog/...`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add internal/applog
git commit -m "feat: add event log file writer"
```

---

### Task 4: Wire an event-sink hook into `internal/ws.Server`

**Files:**
- Modify: `internal/ws/server.go`
- Test: `internal/ws/server_test.go` (extend)

**Interfaces:**
- Consumes: `applog.Event` shape (Task 3) — `internal/ws` does NOT import `internal/applog` directly (avoid a dependency from the protocol layer to the logging layer); instead it defines its own minimal event type and the GUI/CLI wiring (Task 5/6) converts between them, OR (simpler, preferred) `internal/ws` accepts a `func(kind, detail string)` callback and Task 5 wraps it into an `applog.Event` at the call site. Use the callback-function approach — it's the smaller interface and keeps `internal/ws` free of a new package dependency.
- Produces: `ws.NewServer(..., onEvent func(kind, detail string))` — an ADDITIVE change to the existing constructor signature. Task 5/6 pass a real callback; existing CLI `main.go` and all existing tests pass `nil` (a nil callback must be a safe no-op, not a required argument).

- [ ] **Step 1: Write the failing test**

Append to `internal/ws/server_test.go`:

```go
func TestEventSink_FiresOnConnectionAuthFailureAndExecute(t *testing.T) {
	st := store.New(t.TempDir() + "/commands.json")
	var events []string
	var mu sync.Mutex
	onEvent := func(kind, detail string) {
		mu.Lock()
		defer mu.Unlock()
		events = append(events, kind+":"+detail)
	}
	srv := NewServer("secret", st, fakeAppLister{}, fakeExecutor{}, onEvent)
	ts := httptest.NewServer(srv)
	defer ts.Close()

	// Wrong password → connection + auth_failure events.
	conn := dial(t, ts)
	_ = conn.WriteJSON(map[string]string{"type": "auth", "password": "wrong"})
	var resp map[string]string
	_ = conn.ReadJSON(&resp)
	conn.Close()

	mu.Lock()
	got := append([]string{}, events...)
	mu.Unlock()

	hasConnection, hasAuthFailure := false, false
	for _, e := range got {
		if strings.HasPrefix(e, "connection:") {
			hasConnection = true
		}
		if strings.HasPrefix(e, "auth_failure:") {
			hasAuthFailure = true
		}
	}
	if !hasConnection || !hasAuthFailure {
		t.Errorf("events = %v, want a connection and an auth_failure event", got)
	}
}

func TestEventSink_NilCallbackIsSafe(t *testing.T) {
	st := store.New(t.TempDir() + "/commands.json")
	srv := NewServer("secret", st, fakeAppLister{}, fakeExecutor{}, nil)
	ts := httptest.NewServer(srv)
	defer ts.Close()
	conn := authedConn(t, ts, "secret")
	defer conn.Close()
	// No assertion beyond "did not panic" with a nil onEvent.
}
```

(Add `"strings"` and `"sync"` to the test file's imports if not already present.)

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/ws/...`
Expected: FAIL — `NewServer` doesn't accept a 5th argument yet.

- [ ] **Step 3: Write the implementation**

In `internal/ws/server.go`, extend the struct and constructor:

```go
type Server struct {
	password string
	store    *store.Store
	apps     applister.AppLister
	exec     exec.Executor
	upgrader websocket.Upgrader
	onEvent  func(kind, detail string)
}

func NewServer(password string, st *store.Store, apps applister.AppLister, ex exec.Executor, onEvent func(kind, detail string)) *Server {
	if onEvent == nil {
		onEvent = func(string, string) {}
	}
	return &Server{
		password: password,
		store:    st,
		apps:     apps,
		exec:     ex,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
		onEvent: onEvent,
	}
}
```

In `ServeHTTP`, fire the connection event right after a successful upgrade:

```go
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	conn, err := s.upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()
	s.onEvent("connection", "client="+r.RemoteAddr)

	if !s.authenticate(conn) {
		return
	}
	s.loop(conn)
}
```

In `authenticate`, fire on the failure path:

```go
func (s *Server) authenticate(conn *websocket.Conn) bool {
	var msg inbound
	if err := conn.ReadJSON(&msg); err != nil || msg.Type != "auth" {
		s.onEvent("auth_failure", "malformed auth message")
		_ = conn.WriteJSON(authError{Type: "auth_error", Message: "expected auth message"})
		return false
	}
	if subtle.ConstantTimeCompare([]byte(msg.Password), []byte(s.password)) != 1 {
		s.onEvent("auth_failure", "incorrect password")
		_ = conn.WriteJSON(authError{Type: "auth_error", Message: "incorrect password"})
		return false
	}
	return conn.WriteJSON(authOK{Type: "auth_ok"}) == nil
}
```

In `handleExecute`, fire on both the success and error paths (find the existing function and add the two `onEvent` calls at its two return points — do not otherwise change its logic):

```go
func (s *Server) handleExecute(conn *websocket.Conn, msg inbound) {
	cmd, found, err := s.store.Get(msg.CommandID)
	if err != nil || !found {
		s.onEvent("command_executed", fmt.Sprintf("id=%s result=error message=%q", msg.CommandID, "comando no encontrado"))
		_ = conn.WriteJSON(executeErrorMsg{Type: "execute_error", CommandID: msg.CommandID, Message: "comando no encontrado"})
		return
	}

	var execErr error
	switch cmd.Kind {
	case store.KindLaunchApp:
		execErr = s.exec.LaunchApp(cmd.Target)
	case store.KindMediaKey:
		execErr = s.exec.MediaKey(cmd.Target)
	default:
		execErr = errUnknownKind
	}

	if execErr != nil {
		s.onEvent("command_executed", fmt.Sprintf("id=%s kind=%s target=%s result=error message=%q", cmd.ID, cmd.Kind, cmd.Target, execErr.Error()))
		_ = conn.WriteJSON(executeErrorMsg{Type: "execute_error", CommandID: msg.CommandID, Message: execErr.Error()})
		return
	}
	s.onEvent("command_executed", fmt.Sprintf("id=%s kind=%s target=%s result=ok", cmd.ID, cmd.Kind, cmd.Target))
	_ = conn.WriteJSON(executeOKMsg{Type: "execute_ok", CommandID: msg.CommandID})
}
```

(Add `"fmt"` to `server.go`'s imports if not already present.)

- [ ] **Step 4: Update every existing `NewServer` call site**

Every existing test's `NewServer(...)` call and `main.go`'s call both need a 5th argument. For existing tests where the event sink is irrelevant, pass `nil`. Grep for `NewServer(` across the repo and update each call site — do not leave any uncompiled call.

- [ ] **Step 5: Run test to verify it passes**

Run: `go build ./... && go test ./...`
Expected: builds clean, all tests pass (existing + 2 new)

- [ ] **Step 6: Commit**

```bash
git add internal/ws main.go
git commit -m "feat: add event-sink hook to ws.Server"
```

---

### Task 5: `cmd/gui/main.go` — the Fyne window

**Files:**
- Create: `cmd/gui/main.go`
- Create: `cmd/gui/i18n.go`
- Create: `cmd/gui/theme.go`

**Interfaces:**
- Consumes: `guiconfig.Load`/`Save` (Task 2), `applog.New`/`Logger.Log` (Task 3), `ws.NewServer(..., onEvent)` (Task 4), plus `store.New`, `exec.New`, `applister.New` (existing).
- Produces: the `noduspad-pc-gui` binary — nothing downstream depends on this task's exports.

- [ ] **Step 1: Write `cmd/gui/i18n.go`**

```go
// cmd/gui/i18n.go
package main

import (
	"os"
	"strings"
)

type strings_ struct {
	Title        string
	Port         string
	Password     string
	Start        string
	Stop         string
	StatusIdle   string
	StatusRunning string
	StatusError  string
	Events       string
}

var stringsEN = strings_{
	Title:         "noduspad-pc",
	Port:          "Port",
	Password:      "Password",
	Start:         "Start server",
	Stop:          "Stop server",
	StatusIdle:    "Stopped",
	StatusRunning: "Listening on :%d",
	StatusError:   "Error: %s",
	Events:        "Recent events",
}

var stringsES = strings_{
	Title:         "noduspad-pc",
	Port:          "Puerto",
	Password:      "Contraseña",
	Start:         "Iniciar servidor",
	Stop:          "Detener servidor",
	StatusIdle:    "Detenido",
	StatusRunning: "Escuchando en :%d",
	StatusError:   "Error: %s",
	Events:        "Eventos recientes",
}

func pickStrings() strings_ {
	lang := os.Getenv("LANG")
	if strings.HasPrefix(strings.ToLower(lang), "es") {
		return stringsES
	}
	return stringsEN
}
```

- [ ] **Step 2: Write `cmd/gui/theme.go`**

```go
// cmd/gui/theme.go
package main

import (
	"image/color"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/theme"
)

// noduspadTheme mirrors the exact color tokens from NativeStreamDeck's
// src/theme/glass.ts (darkColor/lightColor) — copied verbatim, not
// approximated, so the desktop GUI visually matches the mobile app.
type noduspadTheme struct{}

func (noduspadTheme) Color(name fyne.ThemeColorName, variant fyne.ThemeVariant) color.Color {
	dark := variant == theme.VariantDark
	switch name {
	case theme.ColorNameBackground:
		if dark {
			return color.NRGBA{R: 0x0c, G: 0x0c, B: 0x16, A: 0xff}
		}
		return color.NRGBA{R: 0xe1, G: 0xe4, B: 0xef, A: 0xff}
	case theme.ColorNamePrimary:
		return color.NRGBA{R: 0x3a, G: 0x7b, B: 0xfd, A: 0xff} // accent, same both modes
	case theme.ColorNameForeground:
		if dark {
			return color.NRGBA{R: 0xf4, G: 0xf5, B: 0xf9, A: 0xff}
		}
		return color.NRGBA{R: 0x16, G: 0x17, B: 0x1d, A: 0xff}
	case theme.ColorNameError:
		if dark {
			return color.NRGBA{R: 0xff, G: 0x6b, B: 0x6b, A: 0xff}
		}
		return color.NRGBA{R: 0xd9, G: 0x53, B: 0x4f, A: 0xff}
	case theme.ColorNameInputBackground:
		if dark {
			return color.NRGBA{R: 0xff, G: 0xff, B: 0xff, A: 0x0d} // rgba(255,255,255,0.05)
		}
		return color.NRGBA{R: 0x14, G: 0x14, B: 0x23, A: 0x09} // rgba(20,20,35,0.035)
	default:
		return theme.DefaultTheme().Color(name, variant)
	}
}

func (noduspadTheme) Icon(name fyne.ThemeIconName) fyne.Resource {
	return theme.DefaultTheme().Icon(name)
}

func (noduspadTheme) Font(style fyne.TextStyle) fyne.Resource {
	return theme.DefaultTheme().Font(style)
}

func (noduspadTheme) Size(name fyne.ThemeSizeName) float32 {
	return theme.DefaultTheme().Size(name)
}
```

**Note for the implementer:** Fyne's exact `theme.ThemeColorName`/`ThemeVariant` API surface can differ slightly between Fyne versions — verify the constant names above (`ColorNameBackground`, `ColorNamePrimary`, etc., and `theme.VariantDark`) against the actual version `go get` pulled in Task 1 via `go doc fyne.io/fyne/v2/theme` before finalizing this file, the same way Task 3 of the server plan had to verify `keybd_event`'s real constants. Adjust names if they differ; keep the color VALUES exactly as specified.

- [ ] **Step 3: Write `cmd/gui/main.go`**

```go
// cmd/gui/main.go
package main

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/widget"

	"noduspad-pc/internal/applister"
	"noduspad-pc/internal/applog"
	"noduspad-pc/internal/exec"
	"noduspad-pc/internal/guiconfig"
	"noduspad-pc/internal/store"
	"noduspad-pc/internal/ws"
)

func main() {
	s := pickStrings()

	a := app.New()
	a.Settings().SetTheme(noduspadTheme{})
	if icon, err := fyne.LoadResourceFromPath("icon.png"); err == nil {
		a.SetIcon(icon)
	}
	w := a.NewWindow(s.Title)

	cfgPath, _ := guiconfig.DefaultPath()
	cfg, _ := guiconfig.Load(cfgPath)

	portEntry := widget.NewEntry()
	if cfg.Port != 0 {
		portEntry.SetText(strconv.Itoa(cfg.Port))
	} else {
		portEntry.SetPlaceHolder("7070")
	}

	passwordEntry := widget.NewPasswordEntry()
	passwordEntry.SetText(cfg.Password)

	statusLabel := widget.NewLabel(s.StatusIdle)
	eventsList := widget.NewMultiLineEntry()
	eventsList.Disable() // read-only display, not an input

	var httpServer *http.Server
	var logger *applog.Logger

	toggleButton := widget.NewButton(s.Start, nil)

	appendEvent := func(kind, detail string) {
		line := fmt.Sprintf("%s %s %s\n", time.Now().Format("15:04:05"), kind, detail)
		eventsList.SetText(eventsList.Text + line)
		if logger != nil {
			logger.Log(applog.Event{Time: time.Now(), Kind: kind, Detail: detail})
		}
	}

	start := func() {
		password := passwordEntry.Text
		if password == "" {
			return // button is also disabled in this case, this is a defensive no-op
		}
		port, err := strconv.Atoi(portEntry.Text)
		if err != nil || port <= 0 {
			port = 7070
		}

		_ = guiconfig.Save(cfgPath, guiconfig.Config{Port: port, Password: password})

		logPath := "" // resolved below
		if dir, err := guiconfig.DefaultPath(); err == nil {
			logPath = dir // placeholder — see note below
		}
		_ = logPath // implementer: derive the real logs/server.log path per the spec
		// (guiconfig.DefaultPath() returns config.json's path; the logs file
		// lives in a sibling "logs" dir under the same base — build that path
		// here rather than reusing DefaultPath()'s literal return value)

		st := store.New("") // implementer: wire the real commands.json path via internal/config's existing default-path logic, don't hardcode ""
		ex := exec.New()
		apps := applister.New()

		srv := ws.NewServer(password, st, apps, ex, appendEvent)
		httpServer = &http.Server{Addr: ":" + strconv.Itoa(port), Handler: srv, ReadHeaderTimeout: 10 * time.Second}

		go func() {
			if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
				statusLabel.SetText(fmt.Sprintf(s.StatusError, err.Error()))
				toggleButton.SetText(s.Start)
			}
		}()

		statusLabel.SetText(fmt.Sprintf(s.StatusRunning, port))
		toggleButton.SetText(s.Stop)
	}

	stop := func() {
		if httpServer != nil {
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			_ = httpServer.Shutdown(ctx)
			httpServer = nil
		}
		statusLabel.SetText(s.StatusIdle)
		toggleButton.SetText(s.Start)
	}

	toggleButton.OnTapped = func() {
		if httpServer == nil {
			start()
		} else {
			stop()
		}
	}

	updateButtonEnabled := func() {
		if passwordEntry.Text == "" {
			toggleButton.Disable()
		} else {
			toggleButton.Enable()
		}
	}
	passwordEntry.OnChanged = func(string) { updateButtonEnabled() }
	updateButtonEnabled()

	content := container.NewVBox(
		widget.NewLabel(s.Port),
		portEntry,
		widget.NewLabel(s.Password),
		passwordEntry,
		toggleButton,
		statusLabel,
		widget.NewLabel(s.Events),
		container.NewVScroll(eventsList),
	)

	w.SetContent(content)
	w.SetCloseIntercept(func() {
		stop()
		w.Close()
	})
	w.Resize(fyne.NewSize(420, 520))
	w.ShowAndRun()
}
```

**Notes for the implementer (real gaps left deliberately, per the "no placeholders that hide real logic" rule — these are integration details that depend on exact signatures already in the codebase, not missing logic):**
- Replace `store.New("")` with the actual default `commands.json` path — check how `main.go` (the CLI) currently resolves this via `internal/config.Load` and reuse the same `os.UserConfigDir()`-based logic rather than hardcoding a path here.
- Build the real `logs/server.log` path (sibling to `config.json`'s directory, per the spec) and pass it to `applog.New` before the `start()` closure captures `logger` — assign `logger, _ = applog.New(logPath)` once, likely at `main()`'s top level (log file should exist even before the first "Iniciar" press, so early connection/auth events aren't lost) rather than inside `start()`.
- Verify `widget.NewMultiLineEntry()` is the right Fyne widget for a read-only scrolling text panel in the Fyne version pulled — if Fyne's API has a more appropriate read-only text-display widget (e.g. a `RichText` in a `Scroll` container), prefer that; the `.Disable()` call above is a stand-in to prevent user edits on whatever widget is actually used.

- [ ] **Step 4: Build**

```bash
cd /home/jesusu/Workspace/jesusuzcategui/golang/noduspad-pc
cp icon.png cmd/gui/icon.png  # or reference the repo-root icon.png via a relative path — implementer's call on the cleanest layout
go build -o noduspad-pc-gui ./cmd/gui
```

Expected: builds clean (per Task 1's smoke-check having already confirmed the toolchain works).

- [ ] **Step 5: Manual verification**

Run `./noduspad-pc-gui` on the real desktop (not headless). Confirm: window opens with the app icon, port/password fields present, Start button disabled until password is typed, pressing Start shows "Escuchando en :PORT" and flips to Stop, the event panel shows a line when a test WS client connects (reuse the `node -e` WS test scripts from earlier manual verification, or a quick `websocat`/similar), pressing Stop returns to "Detenido", closing the window while running doesn't leave an orphaned process (check `ss -tlnp` afterward — the port must be free).

- [ ] **Step 6: Commit**

```bash
git add cmd/gui icon.png
git commit -m "feat: add Fyne GUI"
```

---

### Task 6: CLI `main.go` — read `config.json` as a fallback default

**Files:**
- Modify: `main.go`

**Interfaces:**
- Consumes: `guiconfig.Load`/`DefaultPath` (Task 2).
- Produces: nothing new consumed downstream.

- [ ] **Step 1: Extend `main.go`**

The existing `config.Load(os.Args[1:], os.Getenv)` already returns an error when no password is given via flag/env. Before treating a missing password as fatal, fall back to `guiconfig`'s saved config — but flags/env still win when explicitly given (this task does NOT change `internal/config`'s own precedence rules, it adds a layer ABOVE them):

```go
func main() {
	cfg, err := config.Load(os.Args[1:], os.Getenv)
	if err != nil {
		// No password via flag/env — try the GUI's saved config before
		// giving up. Flags/env still win when present; this is a fallback
		// default, not a replacement for config.Load's own precedence.
		if guiPath, gerr := guiconfig.DefaultPath(); gerr == nil {
			if guiCfg, lerr := guiconfig.Load(guiPath); lerr == nil && guiCfg.Password != "" {
				cfg = config.Config{
					Port:         guiCfg.Port,
					Password:     guiCfg.Password,
					CommandsPath: cfg.CommandsPath, // still resolved by config.Load's own default logic
				}
				err = nil
			}
		}
	}
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	// ... unchanged from here: store.New, exec.New, applister.New, ws.NewServer, http.ListenAndServe
}
```

**Note for the implementer:** `config.Load`'s current signature returns a zero-value `Config{}` alongside its error (check this against the actual current code — if it returns something else on error, e.g. doesn't populate `CommandsPath` at all, adjust the fallback construction above so `CommandsPath` still gets a real value via the config package's own default-path logic, not left empty). Also update the `ws.NewServer(...)` call site here to pass the same `onEvent` callback wiring pattern established in Task 4/5 if you want CLI runs to also write to the event log — check with the plan's Global Constraints and Task 5's notes on log-path resolution before deciding whether the CLI shares `internal/applog` too (the spec doesn't explicitly require it, but it's a small, consistent addition — implementer's judgment, note the decision in your report).

- [ ] **Step 2: Build and test**

```bash
go build ./... && go vet ./... && go test ./...
```

Expected: clean.

- [ ] **Step 3: Manual verification**

Save a config via the GUI (Task 5), then run the CLI binary with NO `--password` flag and NO `NODUSPAD_PASSWORD` env var — confirm it starts using the GUI-saved password instead of erroring.

- [ ] **Step 4: Commit**

```bash
git add main.go
git commit -m "feat: fall back to GUI-saved config when no CLI password is given"
```
