# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Single confirmed user: Jesus Uzcategui, the app's own developer, running it on a spare Android tablet (Xiaomi Redmi Pad 2) while streaming or recording. Personal-use only — not intended for distribution to other streamers.

## Product Purpose

NativeStreamDeck is a DIY software Stream Deck: a tablet app that lets the user trigger OBS actions (scene switches, source toggles, mute, etc.) and — in a later phase — arbitrary OS commands, by tapping custom buttons organized into categories, without buying dedicated Stream Deck hardware.

## Positioning

*[Inferred from `docs/specs/main.md` and session history — not directly interviewed.]* A spare Android tablet plus this app replaces a physical Elgato Stream Deck: same "grid of custom buttons triggers an action" mechanism, but free, reusing hardware already owned, and adaptive to whatever screen the user has on hand (tablet or phone, portrait or landscape).

## Operating Context

The user runs OBS on a separate PC while streaming/recording, and keeps the tablet running this app next to their setup as a physical control surface. Two connection modes are planned:
- **OBS actions** — direct WebSocket connection to OBS's built-in server (obs-websocket protocol v5), no extra software.
- **Custom OS commands** *(future sub-project, not yet built)* — requires a companion server on the target PC, since neither the tablet nor OBS's own WebSocket can execute arbitrary shell commands.

## Capabilities and Constraints

- **Current implemented scope:** Login (mock credentials) → adaptive Dashboard shell (permanent drawer on tablet-landscape ≥768dp, bottom AppBar otherwise) → Home/Settings/About placeholders. No Stream Deck grid, no OBS connection, no persistence yet — those are the next sub-projects on the roadmap.
- **Planned Home screen:** a Stream Deck grid of custom buttons, grouped into categories, each category shown as its own horizontal carousel (tablet-landscape: ~6.4 buttons visible; tablet-portrait: ~4.5; mobile-portrait: ~2.4; mobile-landscape: ~3.5). Categories and buttons within them are drag-and-drop reorderable.
- **Button creation/editing:** a drawer lets the user set icon, background color (or background image instead of color), icon color (default white), label, and the action (OBS action or custom command), grouped by category (default category: OBS).
- **Settings:** OBS connection config, plus border-radius and gap values for the button grid.
- **Constraint — command scope:** custom OS command execution is explicitly out of scope until the companion-server sub-project is built; only OBS-websocket actions are planned for the near term.
- **Constraint — auth:** mock/hardcoded credentials for this phase (`src/config/authConfig.ts`), no real backend, no persistence (AsyncStorage or otherwise) yet.
- **Tech stack (confirmed from the codebase):** React Native 0.87, React 19, TypeScript, React Navigation (native-stack + drawer), react-native-reanimated + gesture-handler, crypto-js for the mock auth hash.

## Evidence on Hand

- `docs/specs/main.md` — the original hand-written product spec (screens, appbar behavior, categories/carousel sizing per device, button design, settings fields).
- `docs/superpowers/specs/2026-08-25-nav-shell-login-design.md` and `docs/superpowers/plans/2026-08-25-nav-shell-login.md` — the design/implementation record for the Login + Dashboard shell sub-project, already built and merged to `main`.
- Working, tested code for Login + adaptive Dashboard shell (25 passing tests) — this is the current incumbent visual/interaction system, not a mockup.
- No logos, brand assets, or third-party proof/testimonials exist or are needed — this is a single-user personal tool.

## Product Principles

1. **Hardware you already own beats hardware you'd have to buy.** The whole premise is replacing a physical Stream Deck with a spare tablet — cost and reuse matter more than matching every dedicated-hardware feature.
2. **Adaptive by construction, not by afterthought.** The same screens must work sensibly on whatever device is at hand (tablet landscape with a permanent drawer, tablet portrait or phone with a bottom bar) — this shaped the architecture from the first sub-project and should keep shaping new screens.
3. **Ship the mock, then the real thing.** Sub-projects intentionally build UI against mock data/auth first (already the pattern for Login + Dashboard) before wiring real OBS/backend integration — validate the interaction and layout before the plumbing.
4. **One user, no compromises for hypothetical others.** Because this is personal-use only, decisions can optimize for exactly this user's one tablet and one workflow rather than generalizing for an audience that doesn't exist yet.
5. **The button grid is the product.** Everything else (login, settings, about) is scaffolding around the Home screen's category carousels of custom buttons — that screen is where craft effort should concentrate once it's built.
