# Design

<!-- impeccable:design-schema 1 -->

## Direction

Dark acrylic glassmorphism. Every surface (Login card, Dashboard drawer, floating AppBar, placeholder screen cards) is a real frosted-glass panel — native blur (`@react-native-community/blur`) over translucent white fills, sitting on a dark gradient backdrop with two soft colored glow blobs (blue, violet) that bleed through the blur to give it something to actually refract. This is the "dark, acrylic design" called for in the original product spec (`docs/specs/main.md`), fully realized rather than left as a flat dark theme.

## Palette

Restrained-plus-accent: near-black gradient ground (`#050508` → `#0c0c16`), translucent white glass fills (`rgba(255,255,255,0.07)` panel tint, `0.14` border, `0.22` top highlight), one accent blue carried over from the pre-glass build (`#3a7bfd`, kept per explicit user instruction), one secondary violet glow (`#6a4cff`) used only in the ambient background blobs — never on interactive elements, so the accent blue stays the single actionable color. Text: `#f4f5f9` primary, `#b7bccb` secondary, `#7a7f92` muted.

Token source: `src/theme/glass.ts` (`color`, `radius`, `space`, `blur`, `type`, `shadow`).

## Components

- **`GlassBackground`** (`src/theme/GlassBackground.tsx`) — mounted once in `App.tsx`, above `AuthProvider`/`NavigationContainer`. Paints the base gradient, two glow blobs, and a full-screen `BlurView` that softens the blobs into ambient light. Every screen sits on this; no screen paints its own background.
- **`GlassPanel`** (`src/theme/GlassPanel.tsx`) — the reusable frosted card: `BlurView` + tint + top-highlight border, `overflow: hidden`, sized by its content (the `style` prop lands on the content view, not the decorative wrapper — see Gotchas). Used by `LoginScreen`, `PlaceholderScreen`, and `AppBar`.
- **`AppBar`** (`src/navigation/AppBar.tsx`) — floating glass pill anchored above the safe-area bottom inset, shown only in `'appbar'` layout. Active route gets an `accentGlow` pill behind its label.
- **`GlassDrawerContent`** (`src/navigation/GlassDrawerContent.tsx`) — custom `drawerContent` for the permanent tablet-landscape drawer; frosted panel with a right border, active item gets a filled/bordered chip.

## Layout

Unchanged from the nav-shell-login sub-project: `useDashboardLayout()` still decides `'drawer'` (tablet, `width ≥ 768dp` AND landscape) vs `'appbar'` (everything else). The glass system reads that same signal — `GlassDrawerContent` returns `null` outside `'drawer'` layout (see Gotchas) and `AppBar` only renders in `'appbar'` layout, unchanged from before.

## Gotchas (load-bearing — read before touching these files)

- **`GlassPanel`'s `style` prop must land on the content view, not the decorative wrapper.** The wrapper (`BlurView` + tint + highlight) has no intrinsic size of its own; it sizes to whatever the content view resolves to. Passing a caller's layout style (padding, `flexDirection`, `height`) to the wrapper instead of the content view collapses the panel to zero height — this exact bug shipped once and was caught only by screenshotting a physical device, not by the Jest suite (Jest's `render()` doesn't fail on an RN Yoga layout collapse). If you add a new `GlassPanel` consumer, verify it visually.
- **`@react-native-community/blur` on Android does not reliably respect a zero-width parent.** `GlassDrawerContent` mounted inside a `drawerStyle: { width: 0 }` drawer painted at full size anyway, appearing as a stuck-open drawer over the appbar layout. Fixed by having `GlassDrawerContent` call `useDashboardLayout()` itself and return `null` outside `'drawer'` layout, rather than trusting RN layout to clip the native blur view. Any future `BlurView` usage inside a conditionally-zero-size container needs the same guard — don't rely on width:0 alone to hide it.
- Jest cannot exercise either of the above — both are native rendering behaviors invisible to `@testing-library/react-native`. New `GlassPanel`/blur consumers need a real device or emulator check, not just a green test suite.

## Testing

Manual mocks at `__mocks__/@react-native-community/blur.js` and `__mocks__/react-native-linear-gradient.js` (Jest's automatic node_modules mock convention — no `jest.mock()` calls needed per test file) render both as a plain `View` under test, so component tests can render screens using `GlassPanel`/`GlassBackground` without a native blur runtime. These mocks intentionally do nothing visual; they exist only to keep the render tree mountable in Jest.
