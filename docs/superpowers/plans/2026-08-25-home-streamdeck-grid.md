# Home — Stream Deck Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `HomeScreen` placeholder with the real Stream Deck grid: categories of buttons, each category a horizontal draggable/reorderable carousel with a spec-accurate peek ratio, categories themselves vertically reorderable, all backed by `AsyncStorage`-persisted state seeded with example data on first launch.

**Architecture:** Normalized state (`categories`/`buttons` maps + explicit order arrays) owned by a `useStreamDeckState` hook that loads/persists via `AsyncStorage` and falls back to hardcoded seed data on first launch. `react-native-draggable-flatlist` renders both the vertical category list and each category's horizontal button list, reusing the reanimated/gesture-handler stack already installed. A new `useCarouselItemWidth` hook computes per-item width from the current breakpoint so the next item always peeks, per the spec's exact visible-count targets.

**Tech Stack:** React Native 0.87, React 19, TypeScript, `react-native-draggable-flatlist`, `@react-native-async-storage/async-storage`, existing `react-native-reanimated` + `react-native-gesture-handler` (already installed), Jest, `@testing-library/react-native`.

**Spec:** `docs/superpowers/specs/2026-08-25-home-streamdeck-grid-design.md`

## Global Constraints

- No button-creation/editing UI in this pass — ships with hardcoded seed data (`src/streamdeck/seedData.ts`). Sub-project 3 adds creation/editing against the same persisted state shape.
- No real OBS/command execution — tapping a button gives mock feedback only (transient on-screen text + `console.log`), never a real network/OBS call.
- Persistence: `@react-native-async-storage/async-storage`, single JSON blob under key `streamdeck-state-v1`. Missing key (first launch) → load seed data → persist it immediately.
- Carousel peek targets (exact, from `docs/specs/main.md`): tablet-landscape 6.4 visible, tablet-portrait 4.5, mobile-portrait 2.4, mobile-landscape 3.5.
- Buttons are solid color (or background image) — no glass/blur on buttons themselves; this is a deliberate contrast with the glass chrome elsewhere in the app (`src/theme/glass.ts` tokens still apply to category name labels, spacing, etc., just not to the button tiles).
- Dark theme colors from `src/theme/glass.ts` — reuse existing tokens (`color`, `space`, `radius`, `type`), don't invent new ones for chrome/labels.
- `@testing-library/react-native` v14 async API still applies: `render`/`renderHook` must be awaited, `act`/`fireEvent` calls too, test callbacks `async`. (Confirmed in sub-project 1; still true here.)
- Drag-gesture interactions themselves are not unit-testable in Jest (no real gesture simulation) — test the pure reorder logic (`reorderCategories`, `reorderButtonsInCategory` in `useStreamDeckState`) directly, and verify actual drag behavior manually on device. This mirrors the accepted pattern from sub-project 1's `DashboardShell` drawer testing.

---

### Task 1: Install dependencies and wire AsyncStorage's Jest mock

**Files:**
- Modify: `package.json` (dependencies)
- Modify: `jest.setup.js`

**Interfaces:**
- Produces: `react-native-draggable-flatlist` and `@react-native-async-storage/async-storage` importable; `@react-native-async-storage/async-storage` mocked in Jest via its own shipped mock module (no native runtime needed under test).

- [ ] **Step 1: Install dependencies**

```bash
npm install react-native-draggable-flatlist @react-native-async-storage/async-storage
```

- [ ] **Step 2: Wire AsyncStorage's official Jest mock**

Read `jest.setup.js` first (it already mocks `react-native-safe-area-context`). Add this mock alongside the existing one:

```js
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
```

- [ ] **Step 3: Verify the app still boots and tests still pass**

Run: `npx tsc --noEmit`
Expected: no new type errors.

Run: `npm test`
Expected: all existing tests (25) still pass — this task adds no new test files, just dependencies and mock wiring.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json jest.setup.js
git commit -m "chore: install draggable-flatlist and async-storage for the Stream Deck grid"
```

---

### Task 2: Data model, seed data, and item-width breakpoint logic

**Files:**
- Create: `src/streamdeck/types.ts`
- Create: `src/streamdeck/seedData.ts`
- Test: `src/streamdeck/seedData.test.ts`
- Create: `src/streamdeck/useCarouselItemWidth.ts`
- Test: `src/streamdeck/useCarouselItemWidth.test.ts`

**Interfaces:**
- Produces: `StreamDeckButton`, `StreamDeckCategory`, `StreamDeckState` types (`types.ts`); `SEED_STATE: StreamDeckState` (`seedData.ts`); `computeItemWidth(width: number, height: number, gap: number): number` (pure function) and `useCarouselItemWidth(gap: number): number` (hook) from `useCarouselItemWidth.ts`.

- [ ] **Step 1: Write the types**

Create `src/streamdeck/types.ts`:

```ts
export type StreamDeckButton = {
  id: string;
  label: string;
  iconColor: string;
  background: { type: 'color'; color: string } | { type: 'image'; uri: string };
  action: { type: 'obs' | 'command'; label: string };
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

- [ ] **Step 2: Write the failing seed-data test**

Create `src/streamdeck/seedData.test.ts`:

```ts
import { SEED_STATE } from './seedData';

describe('SEED_STATE', () => {
  it('includes the spec-mandated default "OBS" category', () => {
    const obsCategory = SEED_STATE.categoryOrder
      .map(id => SEED_STATE.categories[id])
      .find(category => category.name === 'OBS');
    expect(obsCategory).toBeDefined();
  });

  it('has at least two categories', () => {
    expect(SEED_STATE.categoryOrder.length).toBeGreaterThanOrEqual(2);
  });

  it('every category.buttonIds entry resolves to a real button', () => {
    for (const categoryId of SEED_STATE.categoryOrder) {
      const category = SEED_STATE.categories[categoryId];
      for (const buttonId of category.buttonIds) {
        expect(SEED_STATE.buttons[buttonId]).toBeDefined();
      }
    }
  });

  it('every category in categoryOrder exists in categories', () => {
    for (const categoryId of SEED_STATE.categoryOrder) {
      expect(SEED_STATE.categories[categoryId]).toBeDefined();
    }
  });

  it('has at least 4 buttons total, split across categories', () => {
    expect(Object.keys(SEED_STATE.buttons).length).toBeGreaterThanOrEqual(4);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest src/streamdeck/seedData.test.ts`
Expected: FAIL — `Cannot find module './seedData'`

- [ ] **Step 4: Write the seed data**

Create `src/streamdeck/seedData.ts`:

```ts
import type { StreamDeckState } from './types';

export const SEED_STATE: StreamDeckState = {
  categoryOrder: ['cat-obs', 'cat-system'],
  categories: {
    'cat-obs': { id: 'cat-obs', name: 'OBS', buttonIds: ['btn-scene-1', 'btn-scene-2', 'btn-mute-mic', 'btn-toggle-cam'] },
    'cat-system': { id: 'cat-system', name: 'Sistema', buttonIds: ['btn-lock-screen', 'btn-open-terminal'] },
  },
  buttons: {
    'btn-scene-1': {
      id: 'btn-scene-1',
      label: 'Escena 1',
      iconColor: '#ffffff',
      background: { type: 'color', color: '#3a7bfd' },
      action: { type: 'obs', label: 'Cambiar a Escena 1' },
    },
    'btn-scene-2': {
      id: 'btn-scene-2',
      label: 'Escena 2',
      iconColor: '#ffffff',
      background: { type: 'color', color: '#2f9e6f' },
      action: { type: 'obs', label: 'Cambiar a Escena 2' },
    },
    'btn-mute-mic': {
      id: 'btn-mute-mic',
      label: 'Mic',
      iconColor: '#ffffff',
      background: { type: 'color', color: '#d9534f' },
      action: { type: 'obs', label: 'Silenciar micrófono' },
    },
    'btn-toggle-cam': {
      id: 'btn-toggle-cam',
      label: 'Cámara',
      iconColor: '#ffffff',
      background: { type: 'color', color: '#9b59b6' },
      action: { type: 'obs', label: 'Alternar cámara' },
    },
    'btn-lock-screen': {
      id: 'btn-lock-screen',
      label: 'Bloquear',
      iconColor: '#ffffff',
      background: { type: 'color', color: '#5a6270' },
      action: { type: 'command', label: 'Bloquear pantalla' },
    },
    'btn-open-terminal': {
      id: 'btn-open-terminal',
      label: 'Terminal',
      iconColor: '#ffffff',
      background: { type: 'color', color: '#1a1a1a' },
      action: { type: 'command', label: 'Abrir terminal' },
    },
  },
};
```

- [ ] **Step 5: Run seed-data test to verify it passes**

Run: `npx jest src/streamdeck/seedData.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: Write the failing item-width test**

Create `src/streamdeck/useCarouselItemWidth.test.ts`:

```ts
import { computeItemWidth } from './useCarouselItemWidth';

describe('computeItemWidth', () => {
  it('tablet landscape targets 6.4 visible items', () => {
    // width=1280, height=800 (tablet landscape), gap=12
    const width = computeItemWidth(1280, 800, 12);
    const expected = (1280 - 12) / 6.4;
    expect(width).toBeCloseTo(expected, 5);
  });

  it('tablet portrait targets 4.5 visible items', () => {
    const width = computeItemWidth(800, 1280, 12);
    const expected = (800 - 12) / 4.5;
    expect(width).toBeCloseTo(expected, 5);
  });

  it('mobile portrait targets 2.4 visible items', () => {
    const width = computeItemWidth(375, 667, 12);
    const expected = (375 - 12) / 2.4;
    expect(width).toBeCloseTo(expected, 5);
  });

  it('mobile landscape targets 3.5 visible items', () => {
    const width = computeItemWidth(667, 375, 12);
    const expected = (667 - 12) / 3.5;
    expect(width).toBeCloseTo(expected, 5);
  });

  it('boundary: width exactly 768 in landscape counts as tablet', () => {
    const width = computeItemWidth(768, 500, 12);
    const expected = (768 - 12) / 6.4;
    expect(width).toBeCloseTo(expected, 5);
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npx jest src/streamdeck/useCarouselItemWidth.test.ts`
Expected: FAIL — `Cannot find module './useCarouselItemWidth'`

- [ ] **Step 8: Write the minimal implementation**

Create `src/streamdeck/useCarouselItemWidth.ts`:

```ts
import { useWindowDimensions } from 'react-native';

const TABLET_WIDTH_THRESHOLD = 768;

function targetVisibleCount(width: number, height: number): number {
  const isLandscape = width > height;
  const isTablet = width >= TABLET_WIDTH_THRESHOLD;

  if (isTablet && isLandscape) return 6.4;
  if (isTablet && !isLandscape) return 4.5;
  if (!isTablet && !isLandscape) return 2.4;
  return 3.5; // mobile landscape
}

export function computeItemWidth(width: number, height: number, gap: number): number {
  return (width - gap) / targetVisibleCount(width, height);
}

export function useCarouselItemWidth(gap: number): number {
  const { width, height } = useWindowDimensions();
  return computeItemWidth(width, height, gap);
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npx jest src/streamdeck/useCarouselItemWidth.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 10: Full suite + typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: all pass, no type errors.

- [ ] **Step 11: Commit**

```bash
git add src/streamdeck/types.ts src/streamdeck/seedData.ts src/streamdeck/seedData.test.ts src/streamdeck/useCarouselItemWidth.ts src/streamdeck/useCarouselItemWidth.test.ts
git commit -m "feat: add Stream Deck data model, seed data, and carousel item-width logic"
```

---

### Task 3: `useStreamDeckState` — load, persist, seed-fallback, reorder mutations

**Files:**
- Create: `src/streamdeck/useStreamDeckState.ts`
- Test: `src/streamdeck/useStreamDeckState.test.ts`

**Interfaces:**
- Consumes: `SEED_STATE` from `./seedData`; `StreamDeckState` from `./types`; `AsyncStorage` from `@react-native-async-storage/async-storage`.
- Produces: `useStreamDeckState(): { state: StreamDeckState | null; isLoading: boolean; reorderCategories: (newOrder: string[]) => void; reorderButtonsInCategory: (categoryId: string, newButtonOrder: string[]) => void; }`. `state` is `null` while `isLoading` is `true`.

- [ ] **Step 1: Write the failing test**

Create `src/streamdeck/useStreamDeckState.test.ts`:

```tsx
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStreamDeckState } from './useStreamDeckState';
import { SEED_STATE } from './seedData';

const STORAGE_KEY = 'streamdeck-state-v1';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('useStreamDeckState', () => {
  it('falls back to seed data and persists it when storage is empty', async () => {
    const { result } = await renderHook(() => useStreamDeckState());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.state).toEqual(SEED_STATE);

    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    expect(JSON.parse(stored as string)).toEqual(SEED_STATE);
  });

  it('loads persisted state instead of seed data when storage has a value', async () => {
    const customState = {
      ...SEED_STATE,
      categoryOrder: [...SEED_STATE.categoryOrder].reverse(),
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(customState));

    const { result } = await renderHook(() => useStreamDeckState());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.state).toEqual(customState);
  });

  it('reorderCategories updates state and persists the new order', async () => {
    const { result } = await renderHook(() => useStreamDeckState());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const reversed = [...SEED_STATE.categoryOrder].reverse();

    await act(async () => {
      result.current.reorderCategories(reversed);
    });

    expect(result.current.state?.categoryOrder).toEqual(reversed);

    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    expect(JSON.parse(stored as string).categoryOrder).toEqual(reversed);
  });

  it('reorderButtonsInCategory updates that category\'s buttonIds and persists it', async () => {
    const { result } = await renderHook(() => useStreamDeckState());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const categoryId = SEED_STATE.categoryOrder[0];
    const reversed = [...SEED_STATE.categories[categoryId].buttonIds].reverse();

    await act(async () => {
      result.current.reorderButtonsInCategory(categoryId, reversed);
    });

    expect(result.current.state?.categories[categoryId].buttonIds).toEqual(reversed);

    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    expect(JSON.parse(stored as string).categories[categoryId].buttonIds).toEqual(reversed);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/streamdeck/useStreamDeckState.test.ts`
Expected: FAIL — `Cannot find module './useStreamDeckState'`

- [ ] **Step 3: Write the minimal implementation**

Create `src/streamdeck/useStreamDeckState.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SEED_STATE } from './seedData';
import type { StreamDeckState } from './types';

const STORAGE_KEY = 'streamdeck-state-v1';

async function persist(state: StreamDeckState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useStreamDeckState() {
  const [state, setState] = useState<StreamDeckState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (cancelled) return;

      if (stored) {
        setState(JSON.parse(stored));
      } else {
        setState(SEED_STATE);
        await persist(SEED_STATE);
      }
      setIsLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const reorderCategories = useCallback((newOrder: string[]) => {
    setState(prev => {
      if (!prev) return prev;
      const next = { ...prev, categoryOrder: newOrder };
      persist(next);
      return next;
    });
  }, []);

  const reorderButtonsInCategory = useCallback((categoryId: string, newButtonOrder: string[]) => {
    setState(prev => {
      if (!prev) return prev;
      const next = {
        ...prev,
        categories: {
          ...prev.categories,
          [categoryId]: { ...prev.categories[categoryId], buttonIds: newButtonOrder },
        },
      };
      persist(next);
      return next;
    });
  }, []);

  return { state, isLoading, reorderCategories, reorderButtonsInCategory };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/streamdeck/useStreamDeckState.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Full suite + typecheck**

Run: `npm test && npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add src/streamdeck/useStreamDeckState.ts src/streamdeck/useStreamDeckState.test.ts
git commit -m "feat: add useStreamDeckState with AsyncStorage persistence and reorder mutations"
```

---

### Task 4: `StreamDeckButtonTile`

**Files:**
- Create: `src/streamdeck/StreamDeckButtonTile.tsx`
- Test: `src/streamdeck/StreamDeckButtonTile.test.tsx`

**Interfaces:**
- Consumes: `StreamDeckButton` from `./types`.
- Produces: `StreamDeckButtonTile({ button: StreamDeckButton, width: number, onPress: (button: StreamDeckButton) => void })`. Renders `testID={`streamdeck-button-${button.id}`}`.

- [ ] **Step 1: Write the failing test**

Create `src/streamdeck/StreamDeckButtonTile.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StreamDeckButtonTile } from './StreamDeckButtonTile';
import { SEED_STATE } from './seedData';

const sampleButton = SEED_STATE.buttons['btn-scene-1'];

describe('StreamDeckButtonTile', () => {
  it('renders the button label', async () => {
    const { getByText } = await render(
      <StreamDeckButtonTile button={sampleButton} width={100} onPress={() => {}} />,
    );
    expect(getByText('Escena 1')).toBeTruthy();
  });

  it('applies the solid background color from the button', async () => {
    const { getByTestId } = await render(
      <StreamDeckButtonTile button={sampleButton} width={100} onPress={() => {}} />,
    );
    const tile = getByTestId('streamdeck-button-btn-scene-1');
    const flatStyle = Array.isArray(tile.props.style) ? Object.assign({}, ...tile.props.style) : tile.props.style;
    expect(flatStyle.backgroundColor).toBe('#3a7bfd');
  });

  it('calls onPress with the button when tapped', async () => {
    const onPress = jest.fn();
    const { getByTestId } = await render(
      <StreamDeckButtonTile button={sampleButton} width={100} onPress={onPress} />,
    );
    await fireEvent.press(getByTestId('streamdeck-button-btn-scene-1'));
    expect(onPress).toHaveBeenCalledWith(sampleButton);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/streamdeck/StreamDeckButtonTile.test.tsx`
Expected: FAIL — `Cannot find module './StreamDeckButtonTile'`

- [ ] **Step 3: Write the minimal implementation**

Create `src/streamdeck/StreamDeckButtonTile.tsx`:

```tsx
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { StreamDeckButton } from './types';
import { radius, type } from '../theme/glass';

type StreamDeckButtonTileProps = {
  button: StreamDeckButton;
  width: number;
  onPress: (button: StreamDeckButton) => void;
};

export function StreamDeckButtonTile({ button, width, onPress }: StreamDeckButtonTileProps) {
  const backgroundStyle =
    button.background.type === 'color' ? { backgroundColor: button.background.color } : undefined;

  return (
    <Pressable
      testID={`streamdeck-button-${button.id}`}
      onPress={() => onPress(button)}
      style={({ pressed }) => [
        styles.tile,
        { width, height: width },
        backgroundStyle,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.label, { color: button.iconColor }]} numberOfLines={2}>
        {button.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: radius.chip,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  label: {
    ...type.label,
    textAlign: 'center',
  },
});
```

Note: `background.type === 'image'` is intentionally not rendered yet (no `ImageBackground` wired) — the type exists in the model for sub-project 3 to populate, but this task only needs the `'color'` path to satisfy the current seed data and tests. If you want to fill in the image path now, use `ImageBackground` from `react-native` wrapping the same content — but do not expand scope beyond what the tests below require.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/streamdeck/StreamDeckButtonTile.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Full suite + typecheck**

Run: `npm test && npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add src/streamdeck/StreamDeckButtonTile.tsx src/streamdeck/StreamDeckButtonTile.test.tsx
git commit -m "feat: add StreamDeckButtonTile with solid background and pressed effect"
```

---

### Task 5: Tap feedback (transient mock-execution banner)

**Files:**
- Create: `src/streamdeck/TapFeedbackBanner.tsx`
- Test: `src/streamdeck/TapFeedbackBanner.test.tsx`

**Interfaces:**
- Produces: `TapFeedbackBanner({ message: string | null })` — renders nothing when `message` is `null`, otherwise renders the message text. Auto-hide timing is owned by the PARENT (the component that sets/clears `message`), not by this component — keeps this component a pure presentational piece, easy to test without fake timers.

- [ ] **Step 1: Write the failing test**

Create `src/streamdeck/TapFeedbackBanner.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { TapFeedbackBanner } from './TapFeedbackBanner';

describe('TapFeedbackBanner', () => {
  it('renders nothing when message is null', async () => {
    const { queryByTestId } = await render(<TapFeedbackBanner message={null} />);
    expect(queryByTestId('tap-feedback-banner')).toBeNull();
  });

  it('renders the message when present', async () => {
    const { getByTestId } = await render(<TapFeedbackBanner message="Ejecutaría: Cambiar a Escena 1" />);
    expect(getByTestId('tap-feedback-banner').props.children).toBe('Ejecutaría: Cambiar a Escena 1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/streamdeck/TapFeedbackBanner.test.tsx`
Expected: FAIL — `Cannot find module './TapFeedbackBanner'`

- [ ] **Step 3: Write the minimal implementation**

Create `src/streamdeck/TapFeedbackBanner.tsx`:

```tsx
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { color, radius, space, type } from '../theme/glass';

export function TapFeedbackBanner({ message }: { message: string | null }) {
  if (message === null) {
    return null;
  }

  return (
    <Text testID="tap-feedback-banner" style={styles.banner}>
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  banner: {
    ...type.caption,
    position: 'absolute',
    bottom: space.xl,
    alignSelf: 'center',
    backgroundColor: color.panelFillPressed,
    color: color.textPrimary,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/streamdeck/TapFeedbackBanner.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/streamdeck/TapFeedbackBanner.tsx src/streamdeck/TapFeedbackBanner.test.tsx
git commit -m "feat: add TapFeedbackBanner for mock button-press feedback"
```

---

### Task 6: `CategoryRow` — horizontal draggable button carousel

**Files:**
- Create: `src/streamdeck/CategoryRow.tsx`
- Test: `src/streamdeck/CategoryRow.test.tsx`

**Interfaces:**
- Consumes: `StreamDeckCategory`, `StreamDeckButton` from `./types`; `StreamDeckButtonTile` from `./StreamDeckButtonTile`; `useCarouselItemWidth` from `./useCarouselItemWidth`; `DraggableFlatList` from `react-native-draggable-flatlist`.
- Produces: `CategoryRow({ category: StreamDeckCategory, buttons: Record<string, StreamDeckButton>, onReorder: (newButtonIds: string[]) => void, onButtonPress: (button: StreamDeckButton) => void })`. Renders category name with `testID="category-name-{category.id}"`, and each button via `StreamDeckButtonTile`.

- [ ] **Step 1: Write the failing test**

Create `src/streamdeck/CategoryRow.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { CategoryRow } from './CategoryRow';
import { SEED_STATE } from './seedData';

const category = SEED_STATE.categories['cat-obs'];

describe('CategoryRow', () => {
  it('renders the category name', async () => {
    const { getByTestId } = await render(
      <CategoryRow category={category} buttons={SEED_STATE.buttons} onReorder={() => {}} onButtonPress={() => {}} />,
    );
    expect(getByTestId('category-name-cat-obs').props.children).toBe('OBS');
  });

  it('renders every button in the category', async () => {
    const { getByTestId } = await render(
      <CategoryRow category={category} buttons={SEED_STATE.buttons} onReorder={() => {}} onButtonPress={() => {}} />,
    );
    for (const buttonId of category.buttonIds) {
      expect(getByTestId(`streamdeck-button-${buttonId}`)).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/streamdeck/CategoryRow.test.tsx`
Expected: FAIL — `Cannot find module './CategoryRow'`

- [ ] **Step 3: Write the minimal implementation**

Create `src/streamdeck/CategoryRow.tsx`:

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import type { StreamDeckButton, StreamDeckCategory } from './types';
import { StreamDeckButtonTile } from './StreamDeckButtonTile';
import { useCarouselItemWidth } from './useCarouselItemWidth';
import { color, space, type } from '../theme/glass';

const ITEM_GAP = space.md;

type CategoryRowProps = {
  category: StreamDeckCategory;
  buttons: Record<string, StreamDeckButton>;
  onReorder: (newButtonIds: string[]) => void;
  onButtonPress: (button: StreamDeckButton) => void;
};

export function CategoryRow({ category, buttons, onReorder, onButtonPress }: CategoryRowProps) {
  const itemWidth = useCarouselItemWidth(ITEM_GAP);

  return (
    <View style={styles.container}>
      <Text testID={`category-name-${category.id}`} style={styles.name}>
        {category.name}
      </Text>
      <DraggableFlatList
        horizontal
        data={category.buttonIds}
        keyExtractor={id => id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ width: ITEM_GAP }} />}
        onDragEnd={({ data }) => onReorder(data)}
        renderItem={({ item: buttonId, drag }: RenderItemParams<string>) => (
          <StreamDeckButtonTile
            button={buttons[buttonId]}
            width={itemWidth}
            onPress={onButtonPress}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: space.lg,
  },
  name: {
    ...type.title,
    fontSize: 16,
    color: color.textSecondary,
    marginBottom: space.sm,
    paddingHorizontal: space.lg,
  },
  list: {
    paddingHorizontal: space.lg,
  },
});
```

Note: `drag` from `RenderItemParams` is intentionally not wired to a long-press handler in this task's minimal implementation — `react-native-draggable-flatlist`'s default item wrapper already handles long-press-to-drag when the render function returns a plain component; if the library requires an explicit `onLongPress={drag}` on a `Pressable`/`TouchableOpacity` wrapper for drag to activate (check the installed version's README — API details can shift between versions), add that wrapper around `StreamDeckButtonTile` here rather than modifying `StreamDeckButtonTile` itself (keep the tile a dumb presentational component).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/streamdeck/CategoryRow.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Full suite + typecheck**

Run: `npm test && npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add src/streamdeck/CategoryRow.tsx src/streamdeck/CategoryRow.test.tsx
git commit -m "feat: add CategoryRow with draggable horizontal button carousel"
```

---

### Task 7: `StreamDeckGrid` — vertical draggable category list, wired to state

**Files:**
- Create: `src/streamdeck/StreamDeckGrid.tsx`
- Test: `src/streamdeck/StreamDeckGrid.test.tsx`

**Interfaces:**
- Consumes: `useStreamDeckState` from `./useStreamDeckState`; `CategoryRow` from `./CategoryRow`; `TapFeedbackBanner` from `./TapFeedbackBanner`; `DraggableFlatList` from `react-native-draggable-flatlist`.
- Produces: `StreamDeckGrid()` — no props, owns loading state, tap-feedback state (message + timeout), and renders the full grid.

- [ ] **Step 1: Write the failing test**

Create `src/streamdeck/StreamDeckGrid.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StreamDeckGrid } from './StreamDeckGrid';
import { SEED_STATE } from './seedData';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('StreamDeckGrid', () => {
  it('renders every seeded category once loaded', async () => {
    await render(<StreamDeckGrid />);

    await waitFor(() => {
      expect(screen.getByTestId('category-name-cat-obs')).toBeTruthy();
    });
    expect(screen.getByTestId('category-name-cat-system')).toBeTruthy();
  });

  it('shows tap feedback with the action label when a button is pressed', async () => {
    await render(<StreamDeckGrid />);

    await waitFor(() => {
      expect(screen.getByTestId('streamdeck-button-btn-scene-1')).toBeTruthy();
    });

    await fireEvent.press(screen.getByTestId('streamdeck-button-btn-scene-1'));

    await waitFor(() => {
      expect(screen.getByTestId('tap-feedback-banner').props.children).toBe(
        'Ejecutaría: Cambiar a Escena 1',
      );
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/streamdeck/StreamDeckGrid.test.tsx`
Expected: FAIL — `Cannot find module './StreamDeckGrid'`

- [ ] **Step 3: Write the minimal implementation**

Create `src/streamdeck/StreamDeckGrid.tsx`:

```tsx
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { useStreamDeckState } from './useStreamDeckState';
import { CategoryRow } from './CategoryRow';
import { TapFeedbackBanner } from './TapFeedbackBanner';
import type { StreamDeckButton } from './types';
import { color, space } from '../theme/glass';

const FEEDBACK_DURATION_MS = 1500;

export function StreamDeckGrid() {
  const { state, isLoading, reorderCategories, reorderButtonsInCategory } = useStreamDeckState();
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const feedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleButtonPress = useCallback((button: StreamDeckButton) => {
    const message = `Ejecutaría: ${button.action.label}`;
    // eslint-disable-next-line no-console
    console.log(message);
    setFeedbackMessage(message);

    if (feedbackTimeout.current) {
      clearTimeout(feedbackTimeout.current);
    }
    feedbackTimeout.current = setTimeout(() => setFeedbackMessage(null), FEEDBACK_DURATION_MS);
  }, []);

  if (isLoading || !state) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={color.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DraggableFlatList
        data={state.categoryOrder}
        keyExtractor={id => id}
        onDragEnd={({ data }) => reorderCategories(data)}
        contentContainerStyle={styles.list}
        renderItem={({ item: categoryId, drag }: RenderItemParams<string>) => (
          <CategoryRow
            category={state.categories[categoryId]}
            buttons={state.buttons}
            onReorder={newButtonIds => reorderButtonsInCategory(categoryId, newButtonIds)}
            onButtonPress={handleButtonPress}
          />
        )}
      />
      <TapFeedbackBanner message={feedbackMessage} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingVertical: space.lg,
  },
});
```

Note on drag activation: same as Task 6 — if the installed `react-native-draggable-flatlist` version needs the category row wrapped in a long-press handler for the category-level drag to activate, wire `drag` onto a wrapper around `CategoryRow` here (e.g. a `Pressable onLongPress={drag}` around it), not inside `CategoryRow` itself.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/streamdeck/StreamDeckGrid.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Full suite + typecheck**

Run: `npm test && npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add src/streamdeck/StreamDeckGrid.tsx src/streamdeck/StreamDeckGrid.test.tsx
git commit -m "feat: add StreamDeckGrid wiring state, categories, and tap feedback together"
```

---

### Task 8: Wire into `HomeScreen`

**Files:**
- Modify: `src/screens/HomeScreen.tsx`
- Test: `src/screens/HomeScreen.test.tsx` (new)

**Interfaces:**
- Consumes: `StreamDeckGrid` from `../streamdeck/StreamDeckGrid`; `ScreenWithAppBar` from `../navigation/ScreenWithAppBar` (unchanged from sub-project 1).

- [ ] **Step 1: Write the failing test**

Create `src/screens/HomeScreen.test.tsx`:

```tsx
import React from 'react';
import { render, waitFor, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HomeScreen } from './HomeScreen';

const Stack = createNativeStackNavigator();

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('HomeScreen', () => {
  it('renders the Stream Deck grid with seeded categories', async () => {
    await render(
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Home">{() => <HomeScreen />}</Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('category-name-cat-obs')).toBeTruthy();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/screens/HomeScreen.test.tsx`
Expected: FAIL — `HomeScreen` still renders `PlaceholderScreen` with title "Home", no `category-name-cat-obs` testID exists yet.

- [ ] **Step 3: Wire the real implementation**

Replace `src/screens/HomeScreen.tsx`:

```tsx
import React from 'react';
import { ScreenWithAppBar } from '../navigation/ScreenWithAppBar';
import { StreamDeckGrid } from '../streamdeck/StreamDeckGrid';

export function HomeScreen() {
  return (
    <ScreenWithAppBar>
      <StreamDeckGrid />
    </ScreenWithAppBar>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/screens/HomeScreen.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 5: Full suite + typecheck + lint**

Run: `npm test && npx tsc --noEmit && npx eslint .`
Expected: all pass; no new lint errors (pre-existing `App.tsx` inline-style warning is fine, unrelated to this task).

- [ ] **Step 6: Commit**

```bash
git add src/screens/HomeScreen.tsx src/screens/HomeScreen.test.tsx
git commit -m "feat: wire StreamDeckGrid into HomeScreen"
```

---

### Task 9: Manual device verification

**Files:** none (manual QA pass, no code changes)

- [ ] **Step 1: Build and run on the physical tablet**

```bash
npm run android
```

- [ ] **Step 2: Verify the grid renders**

Log in, land on Home. Both seeded categories ("OBS", "Sistema") visible, each with its buttons in a horizontal row.

- [ ] **Step 3: Verify carousel peek on both tablet orientations**

Landscape: roughly 6.4 buttons' worth of width visible per row (the 7th button partially cut off). Portrait: roughly 4.5 visible. Rotate the device to confirm both.

- [ ] **Step 4: Verify drag-to-reorder**

Long-press and drag a button within a category — order changes and persists (kill and relaunch the app, order should still be changed). Long-press and drag a whole category row — category order changes and persists the same way.

- [ ] **Step 5: Verify tap feedback**

Tap a button (not drag) — pressed effect visible, then a transient "Ejecutaría: {action label}" banner appears and disappears after ~1.5s. Check `adb logcat` for the matching `console.log` line.

- [ ] **Step 6: Report findings**

If any step fails, note exact device/orientation/behavior. Do not silently patch outside this plan's scope — report back for a ruling.

---

## Self-Review Notes

- **Spec coverage:** normalized data model + AsyncStorage persistence + seed fallback ✓ (Tasks 2-3), carousel peek ratios per exact spec breakpoints ✓ (Task 2), drag-to-reorder both axes ✓ (Tasks 6-7, mechanism installed and wired; gesture behavior itself is manual-QA per Global Constraints), solid-color button visuals with pressed effect ✓ (Task 4), tap mock-feedback ✓ (Tasks 5, 7), Home wired to the real grid ✓ (Task 8). Button creation UI, Settings, and real OBS execution correctly out of scope per spec.
- **Type consistency:** `StreamDeckButton`/`StreamDeckCategory`/`StreamDeckState` (Task 2) used identically by `useStreamDeckState` (Task 3), `StreamDeckButtonTile` (Task 4), `CategoryRow` (Task 6), and `StreamDeckGrid` (Task 7) — checked field names (`buttonIds`, `categoryOrder`, `background.type`, `action.label`) match across all task code blocks.
- **Ambiguity flagged inline:** `react-native-draggable-flatlist`'s exact drag-activation API (whether `RenderItemParams.drag` needs manual wiring to a long-press handler, or the library's default wrapper already provides it) can differ by installed version — Tasks 6 and 7 both flag this as something the implementer must verify against the actually-installed version's docs/types rather than assume, since the plan was written without the package pinned yet.
