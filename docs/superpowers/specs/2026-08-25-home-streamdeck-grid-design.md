# Home — Stream Deck Grid — Design

> Sub-project 2 of the NativeStreamDeck build (see `docs/specs/main.md` for full app spec). Scope: the Home screen's Stream Deck grid — categories of buttons, each category a horizontal draggable carousel, categories themselves vertically reorderable, backed by local persisted state with seed data. Button creation/editing UI (sub-project 3), Settings (sub-project 4), and real OBS/command execution (sub-project 6, future) are explicitly out of scope here.

## Context

- Nav shell + Login (sub-project 1) is done and merged: adaptive Dashboard shell (permanent drawer tablet-landscape / floating glass AppBar elsewhere), dark acrylic glass theme (`src/theme/glass.ts`, `GlassPanel`, `GlassBackground`), `HomeScreen` is currently a `PlaceholderScreen` stub.
- This pass replaces `HomeScreen`'s placeholder body with the real Stream Deck grid.
- No button-creation UI exists yet — this pass ships with hardcoded seed data so the grid has real content and the drag-drop can be exercised; sub-project 3 adds the creation/editing drawer that will read and write the same persisted state.
- No real OBS/command execution exists yet (that's sub-project 6) — tapping a button gives mock feedback only.

## Decisions

- **State shape:** normalized — `categories: Record<string, Category>`, `buttons: Record<string, Button>`, `categoryOrder: string[]`, each category holding its own `buttonIds: string[]`. Chosen over a flat array so reorder operations are array splices, not full-object copies.
- **Persistence:** `@react-native-async-storage/async-storage`, single JSON blob under key `streamdeck-state-v1`. On boot: load from storage; if absent (first launch, or storage cleared), fall back to hardcoded seed data and persist it immediately so the key exists from then on. Every successful reorder (button-within-category or category-order) writes the full state back — dataset is small, no debounce needed.
- **Carousel + drag-drop library:** `react-native-draggable-flatlist` for both axes — vertical draggable list of categories (each row renders a category section: name + horizontal button list), and inside each category a horizontal draggable list of its buttons. One library covers the carousel-peek rendering and both reorder interactions; it's built on `react-native-reanimated` + `react-native-gesture-handler`, both already installed (sub-project 1) — no new gesture dependency, only the list library itself.
- **Carousel peek width:** a new hook, `useCarouselItemWidth()` (`src/streamdeck/useCarouselItemWidth.ts`), separate from the existing `useDashboardLayout()` — that hook is a binary drawer/appbar signal; this one needs a continuous target-visible-count per the spec's exact breakpoints:
  - tablet-landscape (`width ≥ 768` AND landscape): 6.4 buttons visible
  - tablet-portrait (`width ≥ 768` AND portrait): 4.5 visible
  - mobile-portrait (`width < 768` AND portrait): 2.4 visible
  - mobile-landscape (`width < 768` AND landscape): 3.5 visible
  Item width = `(availableWidth - totalGaps) / targetVisibleCount`, so the next item is always partially visible (the "peek" the spec calls for).
- **Button visuals:** solid color or background image, no glass — deliberate contrast with the glass chrome around them (the spec calls for solid colors explicitly; this is the one part of the UI that stays flat). Pressed effect via opacity/scale on press, matching the spec's "pressed effect when tapped."
- **Tap feedback (mock phase):** a transient on-screen text ("Ejecutaría: {label}") that auto-hides after ~1.5s, plus a `console.log` — no toast library, no new dependency. No real OBS/command call.
- **Category creation/deletion, button creation/editing:** out of scope. The grid renders and reorders what's in the seed/persisted state; there is no in-Home UI to add/remove categories or buttons this pass (sub-project 3 owns that).

## Data model

```ts
type StreamDeckButton = {
  id: string;
  label: string;
  iconColor: string; // default '#ffffff' per spec
  background: { type: 'color'; color: string } | { type: 'image'; uri: string };
  action: { type: 'obs' | 'command'; label: string }; // mock identifier, not executed
};

type StreamDeckCategory = {
  id: string;
  name: string;
  buttonIds: string[]; // order = display/carousel order
};

type StreamDeckState = {
  categoryOrder: string[]; // order = vertical display order
  categories: Record<string, StreamDeckCategory>;
  buttons: Record<string, StreamDeckButton>;
};
```

## Seed data

Ships in code (`src/streamdeck/seedData.ts`). At minimum: the spec's default category **"OBS"** plus 4-5 example buttons (mix of `type: 'color'` backgrounds, at least one plausible OBS action label like "Cambiar escena", "Silenciar mic") so the grid has enough content to visibly demonstrate carousel peek and drag-drop on all four breakpoints. A second category (e.g. "Sistema" with 2-3 buttons) to prove category-level reorder actually has something to reorder against.

## Screen structure

- `HomeScreen` (`src/screens/HomeScreen.tsx`) replaces its `PlaceholderScreen` body with the new `StreamDeckGrid` component, still wrapped in `ScreenWithAppBar` (unchanged from sub-project 1 — Home keeps its AppBar/drawer chrome).
- `StreamDeckGrid` (`src/streamdeck/StreamDeckGrid.tsx`) — top-level vertical `DraggableFlatList` of categories, owns loading state from `AsyncStorage` and the reorder handlers.
- `CategoryRow` (`src/streamdeck/CategoryRow.tsx`) — renders one category: name label + horizontal `DraggableFlatList` of its buttons.
- `StreamDeckButtonTile` (`src/streamdeck/StreamDeckButtonTile.tsx`) — the individual button: solid color/image background, label, pressed effect, tap handler (mock feedback).
- `useStreamDeckState` (`src/streamdeck/useStreamDeckState.ts`) — hook owning load/save/seed-fallback and the two reorder mutations (`reorderCategories`, `reorderButtonsInCategory`), backed by `AsyncStorage`.

## Testing

- `useStreamDeckState` unit tests: loads persisted state when present; falls back to seed + persists it when absent; `reorderCategories` and `reorderButtonsInCategory` produce the correct new order and persist it.
- `useCarouselItemWidth` unit tests: pure function mapping `(width, height) → itemWidth`, covering the four breakpoint cases against known screen sizes.
- `StreamDeckButtonTile` component test: renders label, background style reflects `background` prop, tap triggers the mock feedback path (not a real action call).
- Manual: verify drag-to-reorder (categories and buttons) on device, and carousel peek ratio looks right in both tablet orientations (already-established manual-QA pattern from sub-project 1).

## Out of scope (future sub-projects)

- Button creation/editing drawer (icon picker, background image picker, action picker) — sub-project 3.
- Settings screen (OBS connection, border-radius/gap config) — sub-project 4.
- Real OBS-websocket connection and real command execution — sub-project 6.
- Category creation/deletion UI.
