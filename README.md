<p align="center">
  <img src="src/assets/logo.png" width="140" alt="Native Stream Deck logo" />
</p>

<h1 align="center">Native Stream Deck</h1>

<p align="center">
  A DIY Stream Deck: trigger OBS actions from a spare Android tablet instead of buying dedicated hardware.
</p>

## What it does

Native Stream Deck turns any Android tablet into a control surface for OBS. Buttons are
organized into categories, each rendered as a horizontal carousel, and are fully
customizable: icon (searchable Lucide picker with 2000+ icons), color, and action.

Pressing a button in normal mode executes its action for real over `obs-websocket` — change
scene, start/stop recording, start/stop streaming. Enabling **edit mode** (visible only on
the Home screen) lets you rename buttons, restyle them, reassign their action, drag-reorder
buttons and categories, and add new buttons on the fly.

## Features

- **Adaptive layout** — permanent drawer on tablet landscape, floating bottom app bar
  everywhere else (phone, tablet portrait).
- **Light / dark theme** — follows the system by default, or pin it manually in
  Settings → Apariencia.
- **Configurable button grid** — gap and border radius are user-adjustable, not hardcoded.
- **Real OBS control** — `obs-websocket-js` (protocol v5), with the button editor pulling
  live scene names straight from the connected OBS instance.
- **Drag-and-drop** — reorder buttons within a category and categories within the grid.
- **Persisted locally** — button layout, OBS connection, theme, and grid appearance all
  survive app restarts via AsyncStorage.

## Stack

React Native · TypeScript · React Navigation (drawer + native-stack) · `obs-websocket-js` ·
`react-native-draggable-flatlist` · `lucide-react-native` · Jest + Testing Library

## Getting started

```sh
npm install

# Metro (JS bundler)
npm start

# Android
npm run android
```

Requires the [React Native environment](https://reactnative.dev/docs/set-up-your-environment)
set up for Android. OBS connection settings live in Settings → OBS once the app is running
(defaults to `localhost:4455`, matching `obs-websocket`'s default port).

### Release build (no dev server needed)

```sh
cd android
./gradlew assembleRelease
```

The signed APK lands at `android/app/build/outputs/apk/release/app-release.apk` and runs
standalone — no Metro, no USB tether required after install.

## Project structure

```
src/
  auth/        mock login (single hardcoded user, no backend)
  navigation/  drawer/app-bar shell, adaptive layout switch
  obs/         obs-websocket connection, commands, scene fetching
  screens/     Login, Home, Settings, About
  streamdeck/  button grid, categories, editor, icon picker
  theme/       light/dark tokens, glass panel, grid appearance settings
```

## Status

Personal project, single confirmed user. Custom OS-level command execution (beyond OBS
actions) is a planned sub-project — see `docs/specs/main.md`.
