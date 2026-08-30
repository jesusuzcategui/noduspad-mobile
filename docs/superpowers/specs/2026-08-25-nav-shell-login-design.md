# Nav Shell + Login — Design

> Sub-project 1 of the NativeStreamDeck build (see `docs/specs/main.md` for full app spec). Scope: authentication screen and the adaptive navigation shell (drawer on tablet landscape, bottom appbar otherwise) that houses Home, Settings, and About. No OBS integration, no Stream Deck grid content, no persistence — those are later sub-projects.

## Context

- App: NativeStreamDeck, React Native 0.87, React 19, TypeScript, no nav/UI libs installed yet.
- Repo currently has only the default RN scaffold (`App.tsx`).
- Prior session established: UI-mock phase, no real backend yet; test login credential is `test@example.com` / `test-password-123`.
- This pass narrows the app's command scope to **OBS-websocket only** — no companion server / arbitrary OS command execution (that remains a separate future sub-project, out of scope here and not built in this pass).

## Decisions

- **Navigation library:** React Navigation (`@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/drawer`), backed by `react-native-reanimated` + `react-native-gesture-handler`. Chosen over a custom router because native-stack transitions and drawer gestures/animations come built in, and Reanimated/gesture-handler double as the animation engine for later features (Stream Deck cards, button-creation drawer, drag-drop) without adding a separate animation lib.
- **Auth constants:** `src/config/authConfig.ts` — plain TS constants (`AUTH_EMAIL`, `AUTH_PASSWORD_HASH`), not `react-native-config`. Avoids native `android/app/build.gradle` changes this early; swap to real env loading later if needed.
- **Password check:** SHA-256 via `crypto-js` (no bcrypt — avoids native module for a mock-phase check). Entered password is hashed and compared to `AUTH_PASSWORD_HASH`.
- **Session state:** In-memory only via React Context. No persistence (no AsyncStorage) in this pass — app returns to Login on reload/relaunch.
- **Adaptive breakpoint:** `useWindowDimensions` + orientation. `width >= 768` → tablet layout (drawer). Below that, or portrait, → appbar layout. Single Drawer navigator underneath both presentations — no duplicated route trees.

## Navigation structure

```
RootStack (native-stack, no header)
 ├─ Login
 └─ Dashboard (Drawer navigator)
     ├─ Home      (placeholder screen — content is sub-project 2)
     ├─ Settings  (placeholder screen — content is sub-project 4)
     └─ About     (placeholder screen — content is sub-project 5)
```

- `RootStack` swaps `Login` → `Dashboard` on successful auth (`navigation.reset`, so back button can't return to Login).
- `Dashboard`'s Drawer navigator is always the underlying router. On tablet landscape (`width >= 768`, landscape), the drawer renders permanently open (`drawerType: 'permanent'`). Otherwise, the drawer is hidden (`drawerType: 'front'`, closed) and a custom `AppBar` component renders at the bottom of the screen, calling `navigation.navigate(routeName)` for Home/Settings/About.
- Screen switch logic lives in a single `DashboardShell` component wrapping the Drawer navigator; it does not fork into two separate navigators.

## Login screen

- Fields: email (required, email format), password (required). Inline validation errors on blur/submit.
- Title: "Native Stream Deck".
- On submit: hash entered password with `crypto-js` SHA-256, compare email against `AUTH_EMAIL` and hash against `AUTH_PASSWORD_HASH` (both from `src/config/authConfig.ts`). Match → set auth context, `navigation.reset` to Dashboard. Mismatch → inline error, no field clearing.
- No "remember me" / persistence in this pass.

## Dashboard shell

- `Home`, `Settings`, `About` are placeholder screens (screen title only) — real content is out of scope for this sub-project.
- `AppBar` (portrait/mobile) renders 3 icon buttons (Home, Settings, About) pinned to the bottom, active route highlighted.
- Drawer (tablet landscape) renders the same 3 items as a permanent side list.
- Transition/entry animations rely on React Navigation defaults (native-stack + drawer) — no custom animation code in this pass.

## Testing

- Unit test: password-hash comparison logic (valid/invalid email, valid/invalid password).
- Unit test: breakpoint logic (`width`/orientation → tablet vs mobile layout decision), as a pure function extracted from the component.
- Manual: verify Login → Dashboard flow and drawer/appbar swap on device/emulator, both orientations.

## Out of scope (future sub-projects)

- Stream Deck grid, categories/carousel, button CRUD, drag-drop reorder.
- OBS-websocket connection (Settings will get real config fields later; this pass is placeholder only).
- Any persistence (session, buttons, settings).
- Custom OS command execution / companion server.
