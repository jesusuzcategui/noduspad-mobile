# noduspad-pc Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the standalone Go WebSocket server (`noduspad-pc`) that lets the NativeStreamDeck app open apps and send media keys on the user's PC over WiFi.

**Architecture:** One Go binary. `internal/ws` owns the WebSocket connection, auth, and message dispatch. `internal/store` persists custom commands as JSON. `internal/exec` runs a command (launch an app / press a media key). `internal/applister` lists apps installed on the host OS, one implementation per OS via Go build tags. `main.go` wires config → store → executor → applister → WS server → `http.ListenAndServe`.

**Tech Stack:** Go 1.26, `github.com/gorilla/websocket` (WS transport), `github.com/micmonay/keybd_event` (cross-platform virtual media-key press), stdlib only otherwise (no uuid lib, no ini-parsing lib).

**Spec:** `docs/superpowers/specs/2026-08-27-noduspad-pc-command-server-design.md` (in the `noduspadv1` repo — this plan implements the "Components (Go)" section of that spec in a separate repo).

**Target repo:** `/home/jesusu/Workspace/jesusuzcategui/golang/noduspad-pc/` (new, currently empty except a stray `.directory` file).

## Global Constraints

- Cross-platform from day one: Linux, Windows, macOS. Only Linux is testable/runnable in this environment — Windows/macOS code is written to the best of documented OS behavior but not exercised by CI here (per spec: "applister/ tested on the OS CI runs on (Linux)").
- No shell-command-injection surface: `launch_app` targets come only from what `applister` discovered or what the app explicitly saved — never raw user-typed shell strings executed via `sh -c` with untrusted input from the network. Treat `execute` payloads as untrusted input from the LAN; validate `kind`/`target` against the stored command, don't trust the WS message body for anything beyond `command_id`.
- Auth: single shared password, `subtle.ConstantTimeCompare`, no session tokens, no per-user accounts (per spec, out of scope).
- Commands persisted in `~/.config/noduspad-pc/commands.json` (Linux; `os.UserConfigDir()`-based path on other OSes) — corrupt/missing file boots with an empty list, never crashes.
- Stdlib-first: don't add a dependency for something `encoding/json`, `flag`, `crypto/rand`, `bufio` already cover.

---

### Task 1: Module scaffold + config

**Files:**
- Create: `go.mod`
- Create: `internal/config/config.go`
- Test: `internal/config/config_test.go`

**Interfaces:**
- Produces: `config.Config{Port int, Password string, CommandsPath string}` and `config.Load(args []string, getenv func(string) string) (Config, error)` — every later task that needs port/password/commands-path consumes this.

- [ ] **Step 1: Init the module**

```bash
cd /home/jesusu/Workspace/jesusuzcategui/golang/noduspad-pc
go mod init noduspad-pc
go get github.com/gorilla/websocket
go get github.com/micmonay/keybd_event
```

- [ ] **Step 2: Write the failing test**

```go
// internal/config/config_test.go
package config

import "testing"

func TestLoad_Defaults(t *testing.T) {
	cfg, err := Load([]string{"--password", "secret"}, func(string) string { return "" })
	if err != nil {
		t.Fatalf("Load returned error: %v", err)
	}
	if cfg.Port != 7070 {
		t.Errorf("Port = %d, want 7070", cfg.Port)
	}
	if cfg.Password != "secret" {
		t.Errorf("Password = %q, want %q", cfg.Password, "secret")
	}
	if cfg.CommandsPath == "" {
		t.Error("CommandsPath should default to a non-empty path")
	}
}

func TestLoad_PortOverride(t *testing.T) {
	cfg, err := Load([]string{"--port", "8080", "--password", "secret"}, func(string) string { return "" })
	if err != nil {
		t.Fatalf("Load returned error: %v", err)
	}
	if cfg.Port != 8080 {
		t.Errorf("Port = %d, want 8080", cfg.Port)
	}
}

func TestLoad_PasswordFromEnv(t *testing.T) {
	getenv := func(key string) string {
		if key == "NODUSPAD_PASSWORD" {
			return "envsecret"
		}
		return ""
	}
	cfg, err := Load([]string{}, getenv)
	if err != nil {
		t.Fatalf("Load returned error: %v", err)
	}
	if cfg.Password != "envsecret" {
		t.Errorf("Password = %q, want %q", cfg.Password, "envsecret")
	}
}

func TestLoad_MissingPassword(t *testing.T) {
	_, err := Load([]string{}, func(string) string { return "" })
	if err == nil {
		t.Fatal("expected error when no password is provided")
	}
}

func TestLoad_CommandsPathOverride(t *testing.T) {
	cfg, err := Load([]string{"--password", "x", "--commands-file", "/tmp/custom.json"}, func(string) string { return "" })
	if err != nil {
		t.Fatalf("Load returned error: %v", err)
	}
	if cfg.CommandsPath != "/tmp/custom.json" {
		t.Errorf("CommandsPath = %q, want %q", cfg.CommandsPath, "/tmp/custom.json")
	}
}
```

- [ ] **Step 2b: Run test to verify it fails**

Run: `go test ./internal/config/...`
Expected: FAIL — `config.Load` undefined (package doesn't exist yet).

- [ ] **Step 3: Write the implementation**

```go
// internal/config/config.go
package config

import (
	"errors"
	"flag"
	"os"
	"path/filepath"
)

type Config struct {
	Port         int
	Password     string
	CommandsPath string
}

// Load parses server config from CLI args, falling back to the
// NODUSPAD_PASSWORD env var for the password. getenv is injected so tests
// don't depend on process-global environment state.
func Load(args []string, getenv func(string) string) (Config, error) {
	fs := flag.NewFlagSet("noduspad-pc", flag.ContinueOnError)
	port := fs.Int("port", 7070, "WebSocket listen port")
	password := fs.String("password", getenv("NODUSPAD_PASSWORD"), "shared password clients must send on connect")
	commandsPath := fs.String("commands-file", "", "path to commands.json (default: OS config dir)")

	if err := fs.Parse(args); err != nil {
		return Config{}, err
	}

	if *password == "" {
		return Config{}, errors.New("password required: set --password or NODUSPAD_PASSWORD")
	}

	path := *commandsPath
	if path == "" {
		dir, err := os.UserConfigDir()
		if err != nil {
			return Config{}, err
		}
		path = filepath.Join(dir, "noduspad-pc", "commands.json")
	}

	return Config{Port: *port, Password: *password, CommandsPath: path}, nil
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/config/...`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git init
git add go.mod go.sum internal/config
git commit -m "feat: add server config loader"
```

---

### Task 2: Command store (JSON-backed CRUD)

**Files:**
- Create: `internal/store/store.go`
- Test: `internal/store/store_test.go`

**Interfaces:**
- Consumes: nothing new.
- Produces: `store.Command{ID, Label, Kind, Target string}`, `store.KindLaunchApp`/`store.KindMediaKey` constants, `store.New(path string) *Store`, methods `List() ([]Command, error)`, `Create(label string, kind Kind, target string) (Command, error)`, `Update(id, label, target string) (Command, error)`, `Delete(id string) error`, `Get(id string) (Command, bool, error)`. Task 5/6 (WS server) call these directly.

- [ ] **Step 1: Write the failing test**

```go
// internal/store/store_test.go
package store

import (
	"os"
	"path/filepath"
	"testing"
)

func newTestStore(t *testing.T) *Store {
	t.Helper()
	path := filepath.Join(t.TempDir(), "commands.json")
	return New(path)
}

func TestStore_ListEmptyWhenFileMissing(t *testing.T) {
	s := newTestStore(t)
	cmds, err := s.List()
	if err != nil {
		t.Fatalf("List returned error: %v", err)
	}
	if len(cmds) != 0 {
		t.Errorf("List() = %v, want empty", cmds)
	}
}

func TestStore_CreateThenList(t *testing.T) {
	s := newTestStore(t)
	created, err := s.Create("Abrir Discord", KindLaunchApp, "/usr/bin/discord")
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}
	if created.ID == "" {
		t.Error("Create should assign a non-empty ID")
	}

	cmds, err := s.List()
	if err != nil {
		t.Fatalf("List returned error: %v", err)
	}
	if len(cmds) != 1 || cmds[0].Label != "Abrir Discord" {
		t.Errorf("List() = %v, want one command labeled 'Abrir Discord'", cmds)
	}
}

func TestStore_Persists(t *testing.T) {
	path := filepath.Join(t.TempDir(), "commands.json")
	s1 := New(path)
	if _, err := s1.Create("Play/Pause", KindMediaKey, "play_pause"); err != nil {
		t.Fatalf("Create returned error: %v", err)
	}

	s2 := New(path)
	cmds, err := s2.List()
	if err != nil {
		t.Fatalf("List returned error: %v", err)
	}
	if len(cmds) != 1 {
		t.Fatalf("List() after reload = %v, want one command", cmds)
	}
}

func TestStore_UpdateAndDelete(t *testing.T) {
	s := newTestStore(t)
	created, _ := s.Create("Old label", KindLaunchApp, "old-target")

	updated, err := s.Update(created.ID, "New label", "new-target")
	if err != nil {
		t.Fatalf("Update returned error: %v", err)
	}
	if updated.Label != "New label" || updated.Target != "new-target" {
		t.Errorf("Update() = %+v, want label/target updated", updated)
	}

	if err := s.Delete(created.ID); err != nil {
		t.Fatalf("Delete returned error: %v", err)
	}
	cmds, _ := s.List()
	if len(cmds) != 0 {
		t.Errorf("List() after Delete = %v, want empty", cmds)
	}
}

func TestStore_UpdateUnknownID(t *testing.T) {
	s := newTestStore(t)
	if _, err := s.Update("does-not-exist", "x", "y"); err == nil {
		t.Fatal("expected error updating an unknown command ID")
	}
}

func TestStore_ListCorruptFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "commands.json")
	if err := os.WriteFile(path, []byte("not json"), 0o600); err != nil {
		t.Fatalf("failed to write fixture: %v", err)
	}
	s := New(path)
	cmds, err := s.List()
	if err != nil {
		t.Fatalf("List should not error on a corrupt file, got: %v", err)
	}
	if len(cmds) != 0 {
		t.Errorf("List() on corrupt file = %v, want empty", cmds)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/store/...`
Expected: FAIL — package `store` doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```go
// internal/store/store.go
package store

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"os"
	"sync"
)

type Kind string

const (
	KindLaunchApp Kind = "launch_app"
	KindMediaKey  Kind = "media_key"
)

type Command struct {
	ID     string `json:"id"`
	Label  string `json:"label"`
	Kind   Kind   `json:"kind"`
	Target string `json:"target"`
}

type Store struct {
	mu   sync.Mutex
	path string
}

func New(path string) *Store {
	return &Store{path: path}
}

func (s *Store) List() ([]Command, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.readLocked()
}

func (s *Store) Get(id string) (Command, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	cmds, err := s.readLocked()
	if err != nil {
		return Command{}, false, err
	}
	for _, c := range cmds {
		if c.ID == id {
			return c, true, nil
		}
	}
	return Command{}, false, nil
}

func (s *Store) Create(label string, kind Kind, target string) (Command, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	cmds, err := s.readLocked()
	if err != nil {
		return Command{}, err
	}
	cmd := Command{ID: newID(), Label: label, Kind: kind, Target: target}
	cmds = append(cmds, cmd)
	if err := s.writeLocked(cmds); err != nil {
		return Command{}, err
	}
	return cmd, nil
}

func (s *Store) Update(id, label, target string) (Command, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	cmds, err := s.readLocked()
	if err != nil {
		return Command{}, err
	}
	for i, c := range cmds {
		if c.ID == id {
			cmds[i].Label = label
			cmds[i].Target = target
			if err := s.writeLocked(cmds); err != nil {
				return Command{}, err
			}
			return cmds[i], nil
		}
	}
	return Command{}, errors.New("command not found: " + id)
}

func (s *Store) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cmds, err := s.readLocked()
	if err != nil {
		return err
	}
	out := cmds[:0]
	for _, c := range cmds {
		if c.ID != id {
			out = append(out, c)
		}
	}
	return s.writeLocked(out)
}

func (s *Store) readLocked() ([]Command, error) {
	data, err := os.ReadFile(s.path)
	if os.IsNotExist(err) {
		return []Command{}, nil
	}
	if err != nil {
		return nil, err
	}
	var cmds []Command
	if err := json.Unmarshal(data, &cmds); err != nil {
		// Corrupt file: don't crash the server, start fresh in memory.
		return []Command{}, nil
	}
	return cmds, nil
}

func (s *Store) writeLocked(cmds []Command) error {
	if cmds == nil {
		cmds = []Command{}
	}
	data, err := json.MarshalIndent(cmds, "", "  ")
	if err != nil {
		return err
	}
	if err := os.MkdirAll(dirOf(s.path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(s.path, data, 0o600)
}

func newID() string {
	buf := make([]byte, 8)
	_, _ = rand.Read(buf)
	return hex.EncodeToString(buf)
}
```

Note: `dirOf` is a tiny helper — add `import "path/filepath"` and:

```go
func dirOf(path string) string {
	return filepath.Dir(path)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/store/...`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add internal/store
git commit -m "feat: add JSON-backed command store"
```

---

### Task 3: Executor — cross-platform media keys + Linux app launch

**Files:**
- Create: `internal/exec/exec.go`
- Create: `internal/exec/exec_linux.go`
- Test: `internal/exec/exec_test.go`

**Interfaces:**
- Consumes: nothing new.
- Produces: `exec.Executor` interface (`LaunchApp(target string) error`, `MediaKey(key string) error`), `exec.New() Executor` (OS-selecting constructor), `exec.ValidMediaKey(key string) bool` (pure, testable without real key presses).

- [ ] **Step 1: Write the failing test**

```go
// internal/exec/exec_test.go
package exec

import "testing"

func TestValidMediaKey(t *testing.T) {
	valid := []string{"play_pause", "next", "prev", "vol_up", "vol_down", "mute"}
	for _, key := range valid {
		if !ValidMediaKey(key) {
			t.Errorf("ValidMediaKey(%q) = false, want true", key)
		}
	}
	if ValidMediaKey("not_a_key") {
		t.Error("ValidMediaKey(\"not_a_key\") = true, want false")
	}
}

func TestLinuxExecutor_LaunchApp_EmptyTarget(t *testing.T) {
	e := linuxExecutor{}
	if err := e.LaunchApp(""); err == nil {
		t.Fatal("expected error launching an empty target")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/exec/...`
Expected: FAIL — package doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```go
// internal/exec/exec.go
package exec

// Executor runs a resolved command on the host machine.
type Executor interface {
	LaunchApp(target string) error
	MediaKey(key string) error
}

var validMediaKeys = map[string]bool{
	"play_pause": true,
	"next":       true,
	"prev":       true,
	"vol_up":     true,
	"vol_down":   true,
	"mute":       true,
}

// ValidMediaKey reports whether key is one of the fixed media_key targets
// the protocol supports. Kept pure/testable separately from the OS-level
// key-press call, which needs real hardware to verify end to end.
func ValidMediaKey(key string) bool {
	return validMediaKeys[key]
}
```

```go
// internal/exec/exec_linux.go
//go:build linux

package exec

import (
	"errors"
	osexec "os/exec"
	"strings"
)

// New returns the Executor for the current OS.
func New() Executor {
	return linuxExecutor{}
}

type linuxExecutor struct{}

func (linuxExecutor) LaunchApp(target string) error {
	// target is the app's Exec= entry with field codes already stripped by
	// applister, split into argv directly — never through a shell. target
	// comes from the WS "execute" payload's resolved command.Target, so it
	// must never reach a shell interpreter: that would turn any shell
	// metacharacter smuggled into a stored command into command injection.
	fields := strings.Fields(target)
	if len(fields) == 0 {
		return errors.New("empty launch target")
	}
	cmd := osexec.Command(fields[0], fields[1:]...)
	return cmd.Start()
}

func (linuxExecutor) MediaKey(key string) error {
	if !ValidMediaKey(key) {
		return errors.New("unknown media key: " + key)
	}
	return pressMediaKey(key)
}
```

```go
// internal/exec/mediakey.go
package exec

import "github.com/micmonay/keybd_event"

// pressMediaKey sends the OS-level virtual key press for key. key is
// guaranteed valid by the caller (ValidMediaKey checked first).
//
// IMPORTANT (verify at implementation time): confirm the exact exported
// constant names in github.com/micmonay/keybd_event via `go doc
// github.com/micmonay/keybd_event` before finalizing this switch — the
// library's VK_MEDIA_* / VK_VOLUME_* names below are the documented API at
// spec-writing time but must be checked against the version `go get` pulls.
func pressMediaKey(key string) error {
	kb, err := keybd_event.NewKeyBonding()
	if err != nil {
		return err
	}

	var vk int
	switch key {
	case "play_pause":
		vk = keybd_event.VK_MEDIA_PLAY_PAUSE
	case "next":
		vk = keybd_event.VK_MEDIA_NEXT_TRACK
	case "prev":
		vk = keybd_event.VK_MEDIA_PREV_TRACK
	case "vol_up":
		vk = keybd_event.VK_VOLUME_UP
	case "vol_down":
		vk = keybd_event.VK_VOLUME_DOWN
	case "mute":
		vk = keybd_event.VK_MUTE
	}

	kb.SetKeys(vk)
	return kb.Launching()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/exec/...`
Expected: PASS (2 tests). If `go doc github.com/micmonay/keybd_event` shows different constant names, update `mediakey.go` to match before this step is considered done — do not leave `pressMediaKey` referencing symbols that don't compile.

- [ ] **Step 5: Commit**

```bash
git add internal/exec
git commit -m "feat: add cross-platform executor (media keys + linux app launch)"
```

---

### Task 4: WS protocol types + auth handshake

**Files:**
- Create: `internal/ws/protocol.go`
- Create: `internal/ws/server.go`
- Test: `internal/ws/server_test.go`

**Interfaces:**
- Consumes: nothing new yet (store/exec/applister get wired in Task 5/6).
- Produces: `ws.NewServer(password string, st *store.Store, apps applister.AppLister, ex exec.Executor) *Server` implementing `http.Handler`. Task 5/6 extend `handleMessage` on this same `Server`.

- [ ] **Step 1: Write the failing test**

```go
// internal/ws/server_test.go
package ws

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gorilla/websocket"

	"noduspad-pc/internal/applister"
	"noduspad-pc/internal/exec"
	"noduspad-pc/internal/store"
)

type fakeAppLister struct{}

func (fakeAppLister) List() ([]applister.App, error) { return nil, nil }

type fakeExecutor struct{}

func (fakeExecutor) LaunchApp(string) error { return nil }
func (fakeExecutor) MediaKey(string) error  { return nil }

func newTestServer(t *testing.T, password string) (*httptest.Server, func()) {
	t.Helper()
	st := store.New(t.TempDir() + "/commands.json")
	srv := NewServer(password, st, fakeAppLister{}, fakeExecutor{})
	ts := httptest.NewServer(srv)
	return ts, ts.Close
}

func dial(t *testing.T, ts *httptest.Server) *websocket.Conn {
	t.Helper()
	url := "ws" + strings.TrimPrefix(ts.URL, "http")
	conn, _, err := websocket.DefaultDialer.Dial(url, nil)
	if err != nil {
		t.Fatalf("dial failed: %v", err)
	}
	return conn
}

func TestAuth_CorrectPassword(t *testing.T) {
	ts, closeFn := newTestServer(t, "secret")
	defer closeFn()
	conn := dial(t, ts)
	defer conn.Close()

	if err := conn.WriteJSON(map[string]string{"type": "auth", "password": "secret"}); err != nil {
		t.Fatalf("write failed: %v", err)
	}
	var resp map[string]string
	if err := conn.ReadJSON(&resp); err != nil {
		t.Fatalf("read failed: %v", err)
	}
	if resp["type"] != "auth_ok" {
		t.Errorf("resp = %v, want type=auth_ok", resp)
	}
}

func TestAuth_WrongPassword(t *testing.T) {
	ts, closeFn := newTestServer(t, "secret")
	defer closeFn()
	conn := dial(t, ts)
	defer conn.Close()

	if err := conn.WriteJSON(map[string]string{"type": "auth", "password": "wrong"}); err != nil {
		t.Fatalf("write failed: %v", err)
	}
	var resp map[string]string
	if err := conn.ReadJSON(&resp); err != nil {
		t.Fatalf("read failed: %v", err)
	}
	if resp["type"] != "auth_error" {
		t.Errorf("resp = %v, want type=auth_error", resp)
	}
}

func TestAuth_MalformedFirstMessage(t *testing.T) {
	ts, closeFn := newTestServer(t, "secret")
	defer closeFn()
	conn := dial(t, ts)
	defer conn.Close()

	if err := conn.WriteMessage(websocket.TextMessage, []byte("not json")); err != nil {
		t.Fatalf("write failed: %v", err)
	}
	var resp map[string]string
	if err := conn.ReadJSON(&resp); err != nil {
		t.Fatalf("read failed: %v", err)
	}
	if resp["type"] != "auth_error" {
		t.Errorf("resp = %v, want type=auth_error for malformed input", resp)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/ws/...`
Expected: FAIL — package doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```go
// internal/ws/protocol.go
package ws

// inbound is a flat envelope covering every client → server message shape.
// Fields are optional per message type; the small overlap is simpler than a
// discriminated-union type per message for a protocol this size.
type inbound struct {
	Type      string `json:"type"`
	Password  string `json:"password,omitempty"`
	Label     string `json:"label,omitempty"`
	Kind      string `json:"kind,omitempty"`
	Target    string `json:"target,omitempty"`
	ID        string `json:"id,omitempty"`
	CommandID string `json:"command_id,omitempty"`
}

type authOK struct {
	Type string `json:"type"`
}

type authError struct {
	Type    string `json:"type"`
	Message string `json:"message"`
}
```

```go
// internal/ws/server.go
package ws

import (
	"crypto/subtle"
	"net/http"

	"github.com/gorilla/websocket"

	"noduspad-pc/internal/applister"
	"noduspad-pc/internal/exec"
	"noduspad-pc/internal/store"
)

type Server struct {
	password string
	store    *store.Store
	apps     applister.AppLister
	exec     exec.Executor
	upgrader websocket.Upgrader
}

func NewServer(password string, st *store.Store, apps applister.AppLister, ex exec.Executor) *Server {
	return &Server{
		password: password,
		store:    st,
		apps:     apps,
		exec:     ex,
		upgrader: websocket.Upgrader{
			// Personal LAN tool, single known client — origin checking adds
			// no real protection here and blocks the RN WebView/native client.
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	conn, err := s.upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	if !s.authenticate(conn) {
		return
	}
	s.loop(conn)
}

func (s *Server) authenticate(conn *websocket.Conn) bool {
	var msg inbound
	if err := conn.ReadJSON(&msg); err != nil || msg.Type != "auth" {
		_ = conn.WriteJSON(authError{Type: "auth_error", Message: "expected auth message"})
		return false
	}
	if subtle.ConstantTimeCompare([]byte(msg.Password), []byte(s.password)) != 1 {
		_ = conn.WriteJSON(authError{Type: "auth_error", Message: "incorrect password"})
		return false
	}
	return conn.WriteJSON(authOK{Type: "auth_ok"}) == nil
}

func (s *Server) loop(conn *websocket.Conn) {
	for {
		var msg inbound
		if err := conn.ReadJSON(&msg); err != nil {
			return
		}
		s.handleMessage(conn, msg)
	}
}

func (s *Server) handleMessage(conn *websocket.Conn, msg inbound) {
	// Task 5/6 add cases here (list_commands, create_command, update_command,
	// delete_command, list_apps, execute). Unknown types are ignored for now.
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/ws/...`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add internal/ws
git commit -m "feat: add WS server with password auth handshake"
```

---

### Task 5: WS command CRUD wired to the store

**Files:**
- Modify: `internal/ws/protocol.go`
- Modify: `internal/ws/server.go` (`handleMessage`)
- Test: `internal/ws/server_test.go` (extend)

**Interfaces:**
- Consumes: `store.Command`, `store.Kind`, `Store.List/Create/Update/Delete` from Task 2.
- Produces: outbound `commands`, `command_created`, `command_updated`, `command_deleted` messages — the RN client (Plan B) matches these shapes exactly.

- [ ] **Step 1: Write the failing test**

Append to `internal/ws/server_test.go`:

```go
func authedConn(t *testing.T, ts *httptest.Server, password string) *websocket.Conn {
	t.Helper()
	conn := dial(t, ts)
	_ = conn.WriteJSON(map[string]string{"type": "auth", "password": password})
	var resp map[string]string
	_ = conn.ReadJSON(&resp)
	return conn
}

func TestCommands_CreateListUpdateDelete(t *testing.T) {
	ts, closeFn := newTestServer(t, "secret")
	defer closeFn()
	conn := authedConn(t, ts, "secret")
	defer conn.Close()

	_ = conn.WriteJSON(map[string]string{
		"type": "create_command", "label": "Abrir Discord", "kind": "launch_app", "target": "discord",
	})
	var created map[string]any
	if err := conn.ReadJSON(&created); err != nil {
		t.Fatalf("read failed: %v", err)
	}
	if created["type"] != "command_created" {
		t.Fatalf("resp = %v, want type=command_created", created)
	}
	cmd := created["command"].(map[string]any)
	id := cmd["id"].(string)

	_ = conn.WriteJSON(map[string]string{"type": "list_commands"})
	var listed map[string]any
	_ = conn.ReadJSON(&listed)
	cmds := listed["commands"].([]any)
	if len(cmds) != 1 {
		t.Fatalf("list_commands = %v, want 1 command", cmds)
	}

	_ = conn.WriteJSON(map[string]string{"type": "update_command", "id": id, "label": "Discord (nuevo)", "target": "discord"})
	var updated map[string]any
	_ = conn.ReadJSON(&updated)
	if updated["type"] != "command_updated" {
		t.Fatalf("resp = %v, want type=command_updated", updated)
	}

	_ = conn.WriteJSON(map[string]string{"type": "delete_command", "id": id})
	var deleted map[string]any
	_ = conn.ReadJSON(&deleted)
	if deleted["type"] != "command_deleted" {
		t.Fatalf("resp = %v, want type=command_deleted", deleted)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/ws/...`
Expected: FAIL — `create_command` etc. not handled yet, test times out reading a response.

- [ ] **Step 3: Write the implementation**

Add to `internal/ws/protocol.go`:

```go
type commandDTO struct {
	ID     string `json:"id"`
	Label  string `json:"label"`
	Kind   string `json:"kind"`
	Target string `json:"target"`
}

type commandsMsg struct {
	Type     string       `json:"type"`
	Commands []commandDTO `json:"commands"`
}

type commandChangedMsg struct {
	Type    string     `json:"type"`
	Command commandDTO `json:"command"`
}

type commandDeletedMsg struct {
	Type string `json:"type"`
	ID   string `json:"id"`
}
```

Replace `handleMessage` in `internal/ws/server.go`:

```go
func (s *Server) handleMessage(conn *websocket.Conn, msg inbound) {
	switch msg.Type {
	case "list_commands":
		s.handleListCommands(conn)
	case "create_command":
		s.handleCreateCommand(conn, msg)
	case "update_command":
		s.handleUpdateCommand(conn, msg)
	case "delete_command":
		s.handleDeleteCommand(conn, msg)
	}
}

func (s *Server) handleListCommands(conn *websocket.Conn) {
	cmds, err := s.store.List()
	if err != nil {
		return
	}
	_ = conn.WriteJSON(commandsMsg{Type: "commands", Commands: toDTOs(cmds)})
}

func (s *Server) handleCreateCommand(conn *websocket.Conn, msg inbound) {
	cmd, err := s.store.Create(msg.Label, store.Kind(msg.Kind), msg.Target)
	if err != nil {
		return
	}
	_ = conn.WriteJSON(commandChangedMsg{Type: "command_created", Command: toDTO(cmd)})
}

func (s *Server) handleUpdateCommand(conn *websocket.Conn, msg inbound) {
	cmd, err := s.store.Update(msg.ID, msg.Label, msg.Target)
	if err != nil {
		return
	}
	_ = conn.WriteJSON(commandChangedMsg{Type: "command_updated", Command: toDTO(cmd)})
}

func (s *Server) handleDeleteCommand(conn *websocket.Conn, msg inbound) {
	if err := s.store.Delete(msg.ID); err != nil {
		return
	}
	_ = conn.WriteJSON(commandDeletedMsg{Type: "command_deleted", ID: msg.ID})
}

func toDTO(c store.Command) commandDTO {
	return commandDTO{ID: c.ID, Label: c.Label, Kind: string(c.Kind), Target: c.Target}
}

func toDTOs(cmds []store.Command) []commandDTO {
	out := make([]commandDTO, len(cmds))
	for i, c := range cmds {
		out[i] = toDTO(c)
	}
	return out
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/ws/...`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add internal/ws
git commit -m "feat: wire command CRUD messages to the store"
```

---

### Task 6: AppLister (Linux) + `list_apps` / `execute` wiring

**Files:**
- Create: `internal/applister/applister.go`
- Create: `internal/applister/applister_linux.go`
- Test: `internal/applister/applister_linux_test.go`
- Create: `internal/applister/testdata/discord.desktop`
- Create: `internal/applister/testdata/hidden.desktop`
- Modify: `internal/ws/protocol.go`
- Modify: `internal/ws/server.go` (`handleMessage`)
- Test: `internal/ws/server_test.go` (extend)

**Interfaces:**
- Consumes: `exec.Executor`, `exec.ValidMediaKey`, `store.Command` from earlier tasks.
- Produces: `applister.App{ID, Name, Icon string}`, `applister.AppLister` interface, `applister.NewLinux() *LinuxAppLister`. Outbound `apps`, `execute_ok`, `execute_error` WS messages — the RN client (Plan B) matches these shapes.

- [ ] **Step 1: Write the failing tests**

```go
// internal/applister/applister.go
package applister

type App struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Icon string `json:"icon,omitempty"`
}

type AppLister interface {
	List() ([]App, error)
}
```

```
# internal/applister/testdata/discord.desktop
[Desktop Entry]
Name=Discord
Exec=discord --start-minimized %U
Type=Application
```

```
# internal/applister/testdata/hidden.desktop
[Desktop Entry]
Name=Hidden Helper
Exec=hidden-helper
NoDisplay=true
```

```go
// internal/applister/applister_linux_test.go
//go:build linux

package applister

import "testing"

func TestLinuxAppLister_ParsesVisibleApps(t *testing.T) {
	l := &LinuxAppLister{Dirs: []string{"testdata"}}
	apps, err := l.List()
	if err != nil {
		t.Fatalf("List returned error: %v", err)
	}
	if len(apps) != 1 {
		t.Fatalf("List() = %v, want exactly 1 visible app", apps)
	}
	if apps[0].Name != "Discord" {
		t.Errorf("Name = %q, want %q", apps[0].Name, "Discord")
	}
	if apps[0].ID != "discord --start-minimized" {
		t.Errorf("ID = %q, want field codes stripped from Exec=", apps[0].ID)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/applister/...`
Expected: FAIL — `LinuxAppLister` undefined.

- [ ] **Step 3: Write the implementation**

```go
// internal/applister/applister_linux.go
//go:build linux

package applister

import (
	"bufio"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

type LinuxAppLister struct {
	Dirs []string
}

func NewLinux() *LinuxAppLister {
	home, _ := os.UserHomeDir()
	return &LinuxAppLister{Dirs: []string{
		"/usr/share/applications",
		filepath.Join(home, ".local/share/applications"),
	}}
}

func (l *LinuxAppLister) List() ([]App, error) {
	seen := map[string]bool{}
	var apps []App
	for _, dir := range l.Dirs {
		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}
		for _, e := range entries {
			if !strings.HasSuffix(e.Name(), ".desktop") {
				continue
			}
			app, ok := parseDesktopFile(filepath.Join(dir, e.Name()))
			if !ok || seen[app.ID] {
				continue
			}
			seen[app.ID] = true
			apps = append(apps, app)
		}
	}
	sort.Slice(apps, func(i, j int) bool { return apps[i].Name < apps[j].Name })
	return apps, nil
}

func parseDesktopFile(path string) (App, bool) {
	f, err := os.Open(path)
	if err != nil {
		return App{}, false
	}
	defer f.Close()

	var name, execLine string
	hidden := false
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := sc.Text()
		switch {
		case strings.HasPrefix(line, "Name=") && name == "":
			name = strings.TrimPrefix(line, "Name=")
		case strings.HasPrefix(line, "Exec=") && execLine == "":
			execLine = stripFieldCodes(strings.TrimPrefix(line, "Exec="))
		case line == "NoDisplay=true" || line == "Hidden=true":
			hidden = true
		}
	}
	if hidden || name == "" || execLine == "" {
		return App{}, false
	}
	return App{ID: execLine, Name: name}, true
}

func stripFieldCodes(execLine string) string {
	fields := strings.Fields(execLine)
	out := fields[:0]
	for _, f := range fields {
		if strings.HasPrefix(f, "%") {
			continue
		}
		out = append(out, f)
	}
	return strings.Join(out, " ")
}
```

Add to `internal/ws/protocol.go`:

```go
type appDTO struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Icon string `json:"icon,omitempty"`
}

type appsMsg struct {
	Type string   `json:"type"`
	Apps []appDTO `json:"apps"`
}

type executeOKMsg struct {
	Type      string `json:"type"`
	CommandID string `json:"command_id"`
}

type executeErrorMsg struct {
	Type      string `json:"type"`
	CommandID string `json:"command_id"`
	Message   string `json:"message"`
}
```

Extend `handleMessage` and add handlers in `internal/ws/server.go`:

```go
func (s *Server) handleMessage(conn *websocket.Conn, msg inbound) {
	switch msg.Type {
	case "list_commands":
		s.handleListCommands(conn)
	case "create_command":
		s.handleCreateCommand(conn, msg)
	case "update_command":
		s.handleUpdateCommand(conn, msg)
	case "delete_command":
		s.handleDeleteCommand(conn, msg)
	case "list_apps":
		s.handleListApps(conn)
	case "execute":
		s.handleExecute(conn, msg)
	}
}

func (s *Server) handleListApps(conn *websocket.Conn) {
	apps, err := s.apps.List()
	if err != nil {
		return
	}
	dtos := make([]appDTO, len(apps))
	for i, a := range apps {
		dtos[i] = appDTO{ID: a.ID, Name: a.Name, Icon: a.Icon}
	}
	_ = conn.WriteJSON(appsMsg{Type: "apps", Apps: dtos})
}

func (s *Server) handleExecute(conn *websocket.Conn, msg inbound) {
	cmd, found, err := s.store.Get(msg.CommandID)
	if err != nil || !found {
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
		_ = conn.WriteJSON(executeErrorMsg{Type: "execute_error", CommandID: msg.CommandID, Message: execErr.Error()})
		return
	}
	_ = conn.WriteJSON(executeOKMsg{Type: "execute_ok", CommandID: msg.CommandID})
}
```

Add near the top of `internal/ws/server.go`:

```go
var errUnknownKind = errors.New("unknown command kind")
```

(add `"errors"` to the import block)

Append to `internal/ws/server_test.go`:

```go
func TestExecute_UnknownCommandID(t *testing.T) {
	ts, closeFn := newTestServer(t, "secret")
	defer closeFn()
	conn := authedConn(t, ts, "secret")
	defer conn.Close()

	_ = conn.WriteJSON(map[string]string{"type": "execute", "command_id": "nope"})
	var resp map[string]any
	_ = conn.ReadJSON(&resp)
	if resp["type"] != "execute_error" {
		t.Errorf("resp = %v, want type=execute_error", resp)
	}
}

func TestExecute_KnownCommandRunsExecutor(t *testing.T) {
	ts, closeFn := newTestServer(t, "secret")
	defer closeFn()
	conn := authedConn(t, ts, "secret")
	defer conn.Close()

	_ = conn.WriteJSON(map[string]string{
		"type": "create_command", "label": "Play/Pause", "kind": "media_key", "target": "play_pause",
	})
	var created map[string]any
	_ = conn.ReadJSON(&created)
	id := created["command"].(map[string]any)["id"].(string)

	_ = conn.WriteJSON(map[string]string{"type": "execute", "command_id": id})
	var resp map[string]any
	_ = conn.ReadJSON(&resp)
	if resp["type"] != "execute_ok" {
		t.Errorf("resp = %v, want type=execute_ok", resp)
	}
}

func TestListApps(t *testing.T) {
	ts, closeFn := newTestServer(t, "secret")
	defer closeFn()
	conn := authedConn(t, ts, "secret")
	defer conn.Close()

	_ = conn.WriteJSON(map[string]string{"type": "list_apps"})
	var resp map[string]any
	_ = conn.ReadJSON(&resp)
	if resp["type"] != "apps" {
		t.Errorf("resp = %v, want type=apps", resp)
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./...`
Expected: PASS (all packages)

- [ ] **Step 5: Commit**

```bash
git add internal/applister internal/ws
git commit -m "feat: add linux app lister, wire list_apps and execute"
```

---

### Task 7: main.go wiring + Windows/macOS stubs

**Files:**
- Create: `main.go`
- Create: `internal/applister/applister_windows.go`
- Create: `internal/applister/applister_darwin.go`
- Create: `internal/exec/exec_windows.go`
- Create: `internal/exec/exec_darwin.go`
- Create: `README.md`

**Interfaces:**
- Consumes: everything from Tasks 1–6.
- Produces: the `noduspad-pc` binary — nothing downstream depends on this task's exports.

- [ ] **Step 1: Write main.go**

```go
// main.go
package main

import (
	"log"
	"net/http"
	"os"
	"strconv"

	"noduspad-pc/internal/applister"
	"noduspad-pc/internal/config"
	"noduspad-pc/internal/exec"
	"noduspad-pc/internal/store"
	"noduspad-pc/internal/ws"
)

func main() {
	cfg, err := config.Load(os.Args[1:], os.Getenv)
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	st := store.New(cfg.CommandsPath)
	ex := exec.New()
	apps := applister.New()

	srv := ws.NewServer(cfg.Password, st, apps, ex)

	addr := ":" + strconv.Itoa(cfg.Port)
	log.Printf("noduspad-pc listening on %s (commands: %s)", addr, cfg.CommandsPath)
	if err := http.ListenAndServe(addr, srv); err != nil {
		log.Fatal(err)
	}
}
```

- [ ] **Step 2: Add Windows/macOS executor stubs (untested here — no Windows/Mac in this environment)**

```go
// internal/exec/exec_windows.go
//go:build windows

package exec

import (
	"errors"
	osexec "os/exec"
	"strings"
)

func New() Executor {
	return windowsExecutor{}
}

type windowsExecutor struct{}

func (windowsExecutor) LaunchApp(target string) error {
	if strings.TrimSpace(target) == "" {
		return errors.New("empty launch target")
	}
	// target is a Start Menu shortcut (.lnk) or exe path from applister,
	// passed as a single argv element — never through cmd.exe/"start",
	// which would shell-interpret metacharacters in target. explorer.exe
	// resolves and runs a .lnk the same way double-clicking it would,
	// without acting as a shell itself.
	cmd := osexec.Command("explorer.exe", target)
	return cmd.Start()
}

func (windowsExecutor) MediaKey(key string) error {
	if !ValidMediaKey(key) {
		return errors.New("unknown media key: " + key)
	}
	return pressMediaKey(key)
}
```

```go
// internal/exec/exec_darwin.go
//go:build darwin

package exec

import (
	"errors"
	osexec "os/exec"
	"strings"
)

func New() Executor {
	return darwinExecutor{}
}

type darwinExecutor struct{}

func (darwinExecutor) LaunchApp(target string) error {
	if strings.TrimSpace(target) == "" {
		return errors.New("empty launch target")
	}
	// target is an .app bundle path from applister; `open` launches it the
	// same way Finder/Launchpad would.
	cmd := osexec.Command("open", target)
	return cmd.Start()
}

func (darwinExecutor) MediaKey(key string) error {
	if !ValidMediaKey(key) {
		return errors.New("unknown media key: " + key)
	}
	return pressMediaKey(key)
}
```

- [ ] **Step 3: Add Windows/macOS app listers (untested here)**

```go
// internal/applister/applister_windows.go
//go:build windows

package applister

import (
	"os"
	"path/filepath"
	"sort"
	"strings"
)

func New() AppLister {
	return &WindowsAppLister{}
}

type WindowsAppLister struct{}

func (WindowsAppLister) List() ([]App, error) {
	var dirs []string
	if pd := os.Getenv("ProgramData"); pd != "" {
		dirs = append(dirs, filepath.Join(pd, `Microsoft\Windows\Start Menu\Programs`))
	}
	if ad := os.Getenv("AppData"); ad != "" {
		dirs = append(dirs, filepath.Join(ad, `Microsoft\Windows\Start Menu\Programs`))
	}

	var apps []App
	for _, dir := range dirs {
		_ = filepath.WalkDir(dir, func(path string, d os.DirEntry, err error) error {
			if err != nil || d.IsDir() || !strings.HasSuffix(strings.ToLower(d.Name()), ".lnk") {
				return nil
			}
			name := strings.TrimSuffix(d.Name(), filepath.Ext(d.Name()))
			apps = append(apps, App{ID: path, Name: name})
			return nil
		})
	}
	sort.Slice(apps, func(i, j int) bool { return apps[i].Name < apps[j].Name })
	return apps, nil
}
```

```go
// internal/applister/applister_darwin.go
//go:build darwin

package applister

import (
	"os"
	"path/filepath"
	"sort"
	"strings"
)

func New() AppLister {
	return &DarwinAppLister{Dirs: []string{"/Applications", homeApplications()}}
}

func homeApplications() string {
	home, _ := os.UserHomeDir()
	return filepath.Join(home, "Applications")
}

type DarwinAppLister struct {
	Dirs []string
}

func (l *DarwinAppLister) List() ([]App, error) {
	var apps []App
	for _, dir := range l.Dirs {
		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}
		for _, e := range entries {
			if !strings.HasSuffix(e.Name(), ".app") {
				continue
			}
			name := strings.TrimSuffix(e.Name(), ".app")
			apps = append(apps, App{ID: filepath.Join(dir, e.Name()), Name: name})
		}
	}
	sort.Slice(apps, func(i, j int) bool { return apps[i].Name < apps[j].Name })
	return apps, nil
}
```

Also add the matching Linux constructor alias so `main.go`'s `applister.New()` compiles on Linux too — append to `internal/applister/applister_linux.go`:

```go
func New() AppLister {
	return NewLinux()
}
```

- [ ] **Step 4: Build and run on Linux**

```bash
go build ./...
go vet ./...
go test ./...
```

Expected: builds clean, `go vet` clean, all tests pass (Linux-tagged files only — Windows/macOS files are excluded from this build automatically by the `//go:build` tags).

- [ ] **Step 5: Write README.md**

```markdown
# noduspad-pc

Companion server for [NativeStreamDeck](../../../react_native/noduspadv1) — lets
the app open apps and send media keys on this machine over WiFi.

## Run

    go run . --password yourpassword

Or set `NODUSPAD_PASSWORD` instead of `--password`. Defaults to port `7070`;
override with `--port`. Commands are stored at your OS's config dir
(`~/.config/noduspad-pc/commands.json` on Linux).

## Protocol

WebSocket, JSON messages. See
`docs/superpowers/specs/2026-08-27-noduspad-pc-command-server-design.md` in
the `noduspadv1` repo for the full message reference.

## Platforms

Linux is the actively developed/tested target. Windows and macOS
implementations exist (app listing, app launch, media keys) but are
unverified — check `internal/exec/exec_windows.go`,
`internal/exec/exec_darwin.go`, `internal/applister/applister_windows.go`,
`internal/applister/applister_darwin.go` for known rough edges before relying
on them.
```

- [ ] **Step 6: Commit**

```bash
git add main.go internal/exec internal/applister README.md
git commit -m "feat: wire main.go, add windows/macos executor and app lister stubs"
```
