# Nav Shell + Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Login screen and the adaptive Dashboard navigation shell (drawer on tablet landscape, bottom appbar otherwise) for NativeStreamDeck, with mock auth and placeholder Home/Settings/About screens.

**Architecture:** React Navigation (native-stack for Login↔Dashboard, drawer navigator for Home/Settings/About) driven by a mock `AuthContext`. A single `useDashboardLayout` hook decides `'drawer' | 'appbar'` from window dimensions; the drawer navigator is always mounted, but in `'appbar'` mode it's locked closed (`drawerType: 'front'`, zero-width) and each screen renders a bottom `AppBar` that calls `navigation.navigate`. This avoids two parallel route trees.

**Tech Stack:** React Native 0.87, React 19, TypeScript, `@react-navigation/native` + `native-stack` + `drawer`, `react-native-screens`, `react-native-gesture-handler`, `react-native-reanimated`, `crypto-js`, `@testing-library/react-native`, Jest.

**Spec:** `docs/superpowers/specs/2026-08-25-nav-shell-login-design.md`

## Global Constraints

- UI-mock phase only: no persistence (no AsyncStorage), no OBS connection code, no custom OS command exec — those are separate future sub-projects.
- Auth credentials are hardcoded constants (not `react-native-config`): `src/config/authConfig.ts`.
- Password check: SHA-256 via `crypto-js`, no bcrypt/native crypto module.
- Breakpoint: tablet-landscape (`width >= 768` AND `width > height`) → drawer layout. Everything else → appbar layout.
- No custom animation code — rely on React Navigation's built-in stack/drawer transitions.
- Dark theme colors throughout (background `#0d0d0d`/`#161616`, text `#ffffff`, muted `#8a8a8a`).
- Package versions: install latest available versions of the libraries below via npm; if a library's own setup docs (babel plugin name, jest mock path) differ from what's shown here for the installed version, follow the library's current docs instead — treat the exact plugin/mock paths below as the common-practice default, not gospel.
- **`@testing-library/react-native` v14 async API (confirmed during execution, Task 3):** `render(...)` and `renderHook(...)` return Promises and MUST be awaited (`const view = await render(<X />)`, `const { result } = await renderHook(() => useX())`). Any `act(...)` or `fireEvent.press(...)`/`fireEvent.changeText(...)` call must also be awaited, and the enclosing `test`/`it` callback must be `async`. Every test snippet elsewhere in this plan that calls these synchronously is stale — apply `await` per this note when implementing Tasks 3, 5, 6, 7, 8, 9.

---

### Task 1: Install dependencies and wire native/test setup

**Files:**
- Modify: `package.json` (dependencies)
- Modify: `babel.config.js`
- Modify: `index.js`
- Modify: `jest.config.js`

**Interfaces:**
- Produces: working `react-native-gesture-handler`, `react-native-reanimated`, `@react-navigation/*`, `react-native-screens`, `crypto-js` available to import; Jest able to render components that use these libs via `@testing-library/react-native`.

- [ ] **Step 1: Install runtime dependencies**

```bash
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/drawer react-native-screens react-native-gesture-handler react-native-reanimated crypto-js
```

- [ ] **Step 2: Install dev dependency for component testing**

```bash
npm install --save-dev @testing-library/react-native @types/crypto-js
```

- [ ] **Step 3: Add the Reanimated Babel plugin**

Read `babel.config.js` first. It currently looks like:

```js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
};
```

Change it to:

```js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: ['react-native-reanimated/plugin'],
};
```

`react-native-reanimated/plugin` must be the **last** entry in `plugins` if more are added later.

- [ ] **Step 4: Import gesture-handler at the top of the entry point**

Read `index.js` first. Add this as the very first line of the file (before any other import):

```js
import 'react-native-gesture-handler';
```

- [ ] **Step 5: Wire gesture-handler's Jest setup**

Read `jest.config.js` first. Add a `setupFiles` entry:

```js
module.exports = {
  preset: 'react-native',
  setupFiles: ['./node_modules/react-native-gesture-handler/jestSetup.js'],
};
```

(Keep any existing keys already in the file — only add/merge the `setupFiles` array.)

- [ ] **Step 6: Verify the app still boots**

Run: `npx tsc --noEmit`
Expected: no new type errors introduced by the dependency install (existing `App.tsx` is untouched so far).

Run: `npm test`
Expected: existing `__tests__/App.test.tsx` still passes.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json babel.config.js index.js jest.config.js
git commit -m "chore: install navigation, gesture, reanimated, and testing deps"
```

---

### Task 2: Auth config and credential-verification logic

**Files:**
- Create: `src/config/authConfig.ts`
- Create: `src/auth/authService.ts`
- Test: `src/auth/authService.test.ts`

**Interfaces:**
- Produces: `AUTH_EMAIL: string`, `AUTH_PASSWORD_HASH: string` (from `authConfig.ts`); `hashPassword(password: string): string` and `verifyCredentials(email: string, password: string, config: { AUTH_EMAIL: string; AUTH_PASSWORD_HASH: string }): boolean` (from `authService.ts`).

- [ ] **Step 1: Write the failing test**

Create `src/auth/authService.test.ts`:

```ts
import { hashPassword, verifyCredentials } from './authService';

describe('verifyCredentials', () => {
  const config = {
    AUTH_EMAIL: 'test@example.com',
    AUTH_PASSWORD_HASH: hashPassword('correct-password'),
  };

  it('returns true for matching email and password', () => {
    expect(verifyCredentials('test@example.com', 'correct-password', config)).toBe(true);
  });

  it('returns false for a wrong password', () => {
    expect(verifyCredentials('test@example.com', 'wrong-password', config)).toBe(false);
  });

  it('returns false for a wrong email', () => {
    expect(verifyCredentials('other@example.com', 'correct-password', config)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/auth/authService.test.ts`
Expected: FAIL — `Cannot find module './authService'`

- [ ] **Step 3: Write the auth config constants**

Create `src/config/authConfig.ts`:

```ts
export const AUTH_EMAIL = 'test@example.com';
export const AUTH_PASSWORD_HASH =
  '0eb21b7509b5e98f7d13611b6533c525f3642fab78b2b6676fc5a804577c1220';
```

(This hash is SHA-256 of `test-password-123` — the mock login password from the spec.)

- [ ] **Step 4: Write the minimal implementation**

Create `src/auth/authService.ts`:

```ts
import CryptoJS from 'crypto-js';

export function hashPassword(password: string): string {
  return CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex);
}

export function verifyCredentials(
  email: string,
  password: string,
  config: { AUTH_EMAIL: string; AUTH_PASSWORD_HASH: string },
): boolean {
  return email === config.AUTH_EMAIL && hashPassword(password) === config.AUTH_PASSWORD_HASH;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/auth/authService.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/config/authConfig.ts src/auth/authService.ts src/auth/authService.test.ts
git commit -m "feat: add mock auth config and credential verification"
```

---

### Task 3: AuthContext (session state)

**Files:**
- Create: `src/auth/AuthContext.tsx`
- Test: `src/auth/AuthContext.test.tsx`

**Interfaces:**
- Consumes: `AUTH_EMAIL`, `AUTH_PASSWORD_HASH` from `src/config/authConfig.ts`; `verifyCredentials` from `src/auth/authService.ts`.
- Produces: `AuthProvider` (component), `useAuth(): { isAuthenticated: boolean; login: (email: string, password: string) => boolean; logout: () => void }`.

- [ ] **Step 1: Write the failing test**

Create `src/auth/AuthContext.test.tsx`:

```tsx
import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { AuthProvider, useAuth } from './AuthContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth', () => {
  it('starts unauthenticated', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('login with correct credentials returns true and sets isAuthenticated', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => {
      const ok = result.current.login('test@example.com', 'test-password-123');
      expect(ok).toBe(true);
    });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('login with wrong credentials returns false and keeps isAuthenticated false', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => {
      const ok = result.current.login('wrong@example.com', 'nope');
      expect(ok).toBe(false);
    });
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('logout resets isAuthenticated to false', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => {
      result.current.login('test@example.com', 'test-password-123');
    });
    act(() => {
      result.current.logout();
    });
    expect(result.current.isAuthenticated).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/auth/AuthContext.test.tsx`
Expected: FAIL — `Cannot find module './AuthContext'`

- [ ] **Step 3: Write the minimal implementation**

Create `src/auth/AuthContext.tsx`:

```tsx
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AUTH_EMAIL, AUTH_PASSWORD_HASH } from '../config/authConfig';
import { verifyCredentials } from './authService';

type AuthContextValue = {
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = useCallback((email: string, password: string) => {
    const ok = verifyCredentials(email, password, { AUTH_EMAIL, AUTH_PASSWORD_HASH });
    if (ok) {
      setIsAuthenticated(true);
    }
    return ok;
  }, []);

  const logout = useCallback(() => setIsAuthenticated(false), []);

  const value = useMemo(
    () => ({ isAuthenticated, login, logout }),
    [isAuthenticated, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/auth/AuthContext.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/auth/AuthContext.tsx src/auth/AuthContext.test.tsx
git commit -m "feat: add AuthContext for mock session state"
```

---

### Task 4: Breakpoint logic (drawer vs appbar)

**Files:**
- Create: `src/navigation/useBreakpoint.ts`
- Test: `src/navigation/useBreakpoint.test.ts`

**Interfaces:**
- Produces: `type DashboardLayout = 'drawer' | 'appbar'`; `computeLayout(width: number, height: number): DashboardLayout` (pure function); `useDashboardLayout(): DashboardLayout` (hook wrapping `useWindowDimensions`).

- [ ] **Step 1: Write the failing test**

Create `src/navigation/useBreakpoint.test.ts`:

```ts
import { computeLayout } from './useBreakpoint';

describe('computeLayout', () => {
  it('returns drawer for tablet landscape', () => {
    expect(computeLayout(1280, 800)).toBe('drawer');
  });

  it('returns appbar for tablet portrait', () => {
    expect(computeLayout(800, 1280)).toBe('appbar');
  });

  it('returns appbar for mobile landscape', () => {
    expect(computeLayout(667, 375)).toBe('appbar');
  });

  it('returns appbar for mobile portrait', () => {
    expect(computeLayout(375, 667)).toBe('appbar');
  });

  it('returns drawer exactly at the 768 width threshold in landscape', () => {
    expect(computeLayout(768, 500)).toBe('drawer');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/navigation/useBreakpoint.test.ts`
Expected: FAIL — `Cannot find module './useBreakpoint'`

- [ ] **Step 3: Write the minimal implementation**

Create `src/navigation/useBreakpoint.ts`:

```ts
import { useWindowDimensions } from 'react-native';

export type DashboardLayout = 'drawer' | 'appbar';

const TABLET_WIDTH_THRESHOLD = 768;

export function computeLayout(width: number, height: number): DashboardLayout {
  const isLandscape = width > height;
  return width >= TABLET_WIDTH_THRESHOLD && isLandscape ? 'drawer' : 'appbar';
}

export function useDashboardLayout(): DashboardLayout {
  const { width, height } = useWindowDimensions();
  return computeLayout(width, height);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/navigation/useBreakpoint.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/navigation/useBreakpoint.ts src/navigation/useBreakpoint.test.ts
git commit -m "feat: add tablet/mobile breakpoint logic for dashboard layout"
```

---

### Task 5: AppBar component

**Files:**
- Create: `src/navigation/AppBar.tsx`
- Test: `src/navigation/AppBar.test.tsx`

**Interfaces:**
- Produces: `type DashboardRouteName = 'Home' | 'Settings' | 'About'`; `AppBar({ activeRoute: DashboardRouteName, onNavigate: (route: DashboardRouteName) => void })` component. Renders `testID="appbar-Home"`, `"appbar-Settings"`, `"appbar-About"`.

- [ ] **Step 1: Write the failing test**

Create `src/navigation/AppBar.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AppBar } from './AppBar';

describe('AppBar', () => {
  it('renders all three routes', () => {
    const { getByTestId } = render(<AppBar activeRoute="Home" onNavigate={() => {}} />);
    expect(getByTestId('appbar-Home')).toBeTruthy();
    expect(getByTestId('appbar-Settings')).toBeTruthy();
    expect(getByTestId('appbar-About')).toBeTruthy();
  });

  it('calls onNavigate with the pressed route', () => {
    const onNavigate = jest.fn();
    const { getByTestId } = render(<AppBar activeRoute="Home" onNavigate={onNavigate} />);
    fireEvent.press(getByTestId('appbar-Settings'));
    expect(onNavigate).toHaveBeenCalledWith('Settings');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/navigation/AppBar.test.tsx`
Expected: FAIL — `Cannot find module './AppBar'`

- [ ] **Step 3: Write the minimal implementation**

Create `src/navigation/AppBar.tsx`:

```tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type DashboardRouteName = 'Home' | 'Settings' | 'About';

const ROUTES: DashboardRouteName[] = ['Home', 'Settings', 'About'];

type AppBarProps = {
  activeRoute: DashboardRouteName;
  onNavigate: (route: DashboardRouteName) => void;
};

export function AppBar({ activeRoute, onNavigate }: AppBarProps) {
  return (
    <View style={styles.container}>
      {ROUTES.map(route => (
        <Pressable
          key={route}
          testID={`appbar-${route}`}
          style={styles.item}
          onPress={() => onNavigate(route)}>
          <Text style={activeRoute === route ? styles.activeLabel : styles.label}>{route}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 56,
    backgroundColor: '#161616',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#8a8a8a',
    fontSize: 12,
  },
  activeLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/navigation/AppBar.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/navigation/AppBar.tsx src/navigation/AppBar.test.tsx
git commit -m "feat: add AppBar component for mobile/portrait navigation"
```

---

### Task 6: Screen chrome + placeholder screens

**Files:**
- Create: `src/navigation/ScreenWithAppBar.tsx`
- Create: `src/screens/PlaceholderScreen.tsx`
- Create: `src/screens/HomeScreen.tsx`
- Create: `src/screens/SettingsScreen.tsx`
- Create: `src/screens/AboutScreen.tsx`
- Test: `src/screens/PlaceholderScreen.test.tsx`

**Interfaces:**
- Consumes: `useDashboardLayout` from `src/navigation/useBreakpoint.ts`; `AppBar`, `DashboardRouteName` from `src/navigation/AppBar.tsx`; `DashboardDrawerParamList` type from `src/navigation/DashboardShell.tsx` (defined in Task 7 — declare it there first if sequencing differently, or inline the param list type here and re-export from `DashboardShell.tsx` in Task 7 to match).
- Produces: `ScreenWithAppBar({ children })`; `PlaceholderScreen({ title })`; `HomeScreen`, `SettingsScreen`, `AboutScreen` (all no-prop components usable directly as `Drawer.Screen component={...}`).

- [ ] **Step 1: Write the failing test**

Create `src/screens/PlaceholderScreen.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { PlaceholderScreen } from './PlaceholderScreen';

describe('PlaceholderScreen', () => {
  it('renders the given title', () => {
    const { getByText } = render(
      <NavigationContainer>
        <PlaceholderScreen title="Home" />
      </NavigationContainer>,
    );
    expect(getByText('Home')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/screens/PlaceholderScreen.test.tsx`
Expected: FAIL — `Cannot find module './PlaceholderScreen'`

- [ ] **Step 3: Write the route param list type (shared)**

Create `src/navigation/DashboardShell.tsx` with just the type for now (the navigator itself is completed in Task 7):

```tsx
export type DashboardDrawerParamList = {
  Home: undefined;
  Settings: undefined;
  About: undefined;
};
```

- [ ] **Step 4: Write ScreenWithAppBar**

Create `src/navigation/ScreenWithAppBar.tsx`:

```tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { useDashboardLayout } from './useBreakpoint';
import { AppBar, DashboardRouteName } from './AppBar';
import type { DashboardDrawerParamList } from './DashboardShell';

export function ScreenWithAppBar({ children }: { children: React.ReactNode }) {
  const layout = useDashboardLayout();
  const navigation = useNavigation<DrawerNavigationProp<DashboardDrawerParamList>>();
  const route = useRoute();

  return (
    <View style={styles.container}>
      <View style={styles.content}>{children}</View>
      {layout === 'appbar' && (
        <AppBar
          activeRoute={route.name as DashboardRouteName}
          onNavigate={(name: DashboardRouteName) => navigation.navigate(name)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
});
```

- [ ] **Step 5: Write PlaceholderScreen and the three screens**

Create `src/screens/PlaceholderScreen.tsx`:

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenWithAppBar } from '../navigation/ScreenWithAppBar';

export function PlaceholderScreen({ title }: { title: string }) {
  return (
    <ScreenWithAppBar>
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
      </View>
    </ScreenWithAppBar>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d0d0d',
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
});
```

Create `src/screens/HomeScreen.tsx`:

```tsx
import React from 'react';
import { PlaceholderScreen } from './PlaceholderScreen';

export function HomeScreen() {
  return <PlaceholderScreen title="Home" />;
}
```

Create `src/screens/SettingsScreen.tsx`:

```tsx
import React from 'react';
import { PlaceholderScreen } from './PlaceholderScreen';

export function SettingsScreen() {
  return <PlaceholderScreen title="Settings" />;
}
```

Create `src/screens/AboutScreen.tsx`:

```tsx
import React from 'react';
import { PlaceholderScreen } from './PlaceholderScreen';

export function AboutScreen() {
  return <PlaceholderScreen title="About" />;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx jest src/screens/PlaceholderScreen.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 7: Commit**

```bash
git add src/navigation/ScreenWithAppBar.tsx src/navigation/DashboardShell.tsx src/screens/PlaceholderScreen.tsx src/screens/HomeScreen.tsx src/screens/SettingsScreen.tsx src/screens/AboutScreen.tsx src/screens/PlaceholderScreen.test.tsx
git commit -m "feat: add screen chrome and placeholder Home/Settings/About screens"
```

---

### Task 7: DashboardShell (drawer navigator, layout-driven)

**Files:**
- Modify: `src/navigation/DashboardShell.tsx` (add the navigator; keep the `DashboardDrawerParamList` type from Task 6)
- Test: `src/navigation/DashboardShell.test.tsx`

**Interfaces:**
- Consumes: `useDashboardLayout` from `./useBreakpoint`; `HomeScreen`, `SettingsScreen`, `AboutScreen` from `../screens/*`.
- Produces: `DashboardShell` component (no props) — a `Drawer.Navigator` with `Home`/`Settings`/`About` screens, `drawerType: 'permanent'` when layout is `'drawer'`, `drawerType: 'front'` + zero-width when `'appbar'`.

- [ ] **Step 1: Write the failing test**

Create `src/navigation/DashboardShell.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { DashboardShell } from './DashboardShell';

jest.mock('./useBreakpoint', () => ({
  useDashboardLayout: jest.fn(),
}));

import { useDashboardLayout } from './useBreakpoint';

describe('DashboardShell', () => {
  it('shows the AppBar when layout is appbar', () => {
    (useDashboardLayout as jest.Mock).mockReturnValue('appbar');
    render(
      <NavigationContainer>
        <DashboardShell />
      </NavigationContainer>,
    );
    expect(screen.getByTestId('appbar-Home')).toBeTruthy();
  });

  it('hides the AppBar when layout is drawer', () => {
    (useDashboardLayout as jest.Mock).mockReturnValue('drawer');
    render(
      <NavigationContainer>
        <DashboardShell />
      </NavigationContainer>,
    );
    expect(screen.queryByTestId('appbar-Home')).toBeNull();
  });

  it('renders the Home screen by default', () => {
    (useDashboardLayout as jest.Mock).mockReturnValue('appbar');
    render(
      <NavigationContainer>
        <DashboardShell />
      </NavigationContainer>,
    );
    expect(screen.getByText('Home')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/navigation/DashboardShell.test.tsx`
Expected: FAIL — `Drawer.Navigator` / `DashboardShell` component not exported yet.

- [ ] **Step 3: Write the minimal implementation**

Replace `src/navigation/DashboardShell.tsx` with:

```tsx
import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useDashboardLayout } from './useBreakpoint';
import { HomeScreen } from '../screens/HomeScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AboutScreen } from '../screens/AboutScreen';

export type DashboardDrawerParamList = {
  Home: undefined;
  Settings: undefined;
  About: undefined;
};

const Drawer = createDrawerNavigator<DashboardDrawerParamList>();

export function DashboardShell() {
  const layout = useDashboardLayout();
  const isDrawerLayout = layout === 'drawer';

  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerType: isDrawerLayout ? 'permanent' : 'front',
        drawerStyle: isDrawerLayout ? undefined : { width: 0 },
        swipeEnabled: isDrawerLayout,
      }}>
      <Drawer.Screen name="Home" component={HomeScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
      <Drawer.Screen name="About" component={AboutScreen} />
    </Drawer.Navigator>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/navigation/DashboardShell.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/navigation/DashboardShell.tsx src/navigation/DashboardShell.test.tsx
git commit -m "feat: add DashboardShell drawer navigator with layout-driven presentation"
```

---

### Task 8: LoginScreen

**Files:**
- Create: `src/screens/LoginScreen.tsx`
- Test: `src/screens/LoginScreen.test.tsx`

**Interfaces:**
- Consumes: `useAuth` from `../auth/AuthContext`.
- Produces: `LoginScreen` component (no props). `testID`s: `login-email`, `login-password`, `login-submit`, `login-error`.

- [ ] **Step 1: Write the failing test**

Create `src/screens/LoginScreen.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AuthProvider } from '../auth/AuthContext';
import { LoginScreen } from './LoginScreen';

function renderLogin() {
  return render(
    <AuthProvider>
      <LoginScreen />
    </AuthProvider>,
  );
}

describe('LoginScreen', () => {
  it('shows an error when submitting empty fields', () => {
    const { getByTestId } = renderLogin();
    fireEvent.press(getByTestId('login-submit'));
    expect(getByTestId('login-error').props.children).toBe('Email es requerido');
  });

  it('shows an error for invalid email format', () => {
    const { getByTestId } = renderLogin();
    fireEvent.changeText(getByTestId('login-email'), 'not-an-email');
    fireEvent.changeText(getByTestId('login-password'), 'whatever');
    fireEvent.press(getByTestId('login-submit'));
    expect(getByTestId('login-error').props.children).toBe('Email inválido');
  });

  it('shows an error for wrong credentials', () => {
    const { getByTestId } = renderLogin();
    fireEvent.changeText(getByTestId('login-email'), 'wrong@example.com');
    fireEvent.changeText(getByTestId('login-password'), 'wrong-pass');
    fireEvent.press(getByTestId('login-submit'));
    expect(getByTestId('login-error').props.children).toBe('Credenciales inválidas');
  });

  it('clears the error on correct credentials', () => {
    const { getByTestId, queryByTestId } = renderLogin();
    fireEvent.changeText(getByTestId('login-email'), 'test@example.com');
    fireEvent.changeText(getByTestId('login-password'), 'test-password-123');
    fireEvent.press(getByTestId('login-submit'));
    expect(queryByTestId('login-error')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/screens/LoginScreen.test.tsx`
Expected: FAIL — `Cannot find module './LoginScreen'`

- [ ] **Step 3: Write the minimal implementation**

Create `src/screens/LoginScreen.tsx`:

```tsx
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Email es requerido');
      return;
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError('Email inválido');
      return;
    }
    if (!password) {
      setError('Password es requerido');
      return;
    }
    const ok = login(trimmedEmail, password);
    if (!ok) {
      setError('Credenciales inválidas');
      return;
    }
    setError(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Native Stream Deck</Text>
      <TextInput
        testID="login-email"
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#8a8a8a"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        testID="login-password"
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#8a8a8a"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error !== null && (
        <Text testID="login-error" style={styles.error}>
          {error}
        </Text>
      )}
      <Pressable testID="login-submit" style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Ingresar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#0d0d0d',
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 8,
    color: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  error: {
    color: '#ff5c5c',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#3a7bfd',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
```

Note: `login()` flipping `isAuthenticated` in `AuthContext` is what actually moves the app to the Dashboard (Task 9's `RootNavigator` conditionally renders based on `isAuthenticated`) — `LoginScreen` itself does not navigate.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/screens/LoginScreen.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/screens/LoginScreen.tsx src/screens/LoginScreen.test.tsx
git commit -m "feat: add LoginScreen with mock credential validation"
```

---

### Task 9: RootNavigator + App.tsx integration

**Files:**
- Create: `src/navigation/RootNavigator.tsx`
- Modify: `App.tsx`
- Modify: `__tests__/App.test.tsx`

**Interfaces:**
- Consumes: `useAuth` from `../auth/AuthContext`; `LoginScreen` from `../screens/LoginScreen`; `DashboardShell` from `./DashboardShell`.
- Produces: `RootNavigator` component (no props) — native-stack that shows `Login` when `!isAuthenticated`, `Dashboard` when `isAuthenticated`.

- [ ] **Step 1: Write RootNavigator**

Create `src/navigation/RootNavigator.tsx`:

```tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { DashboardShell } from './DashboardShell';

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="Dashboard" component={DashboardShell} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
```

(Conditional screen rendering — not `navigation.reset` — is React Navigation's documented auth pattern: only one of `Login`/`Dashboard` is ever mounted, so there is no back-navigation path to Login after authenticating.)

- [ ] **Step 2: Write the failing App test**

Replace `__tests__/App.test.tsx` with:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../App';

test('renders the Login screen on launch', () => {
  const { getByText } = render(<App />);
  expect(getByText('Native Stream Deck')).toBeTruthy();
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest __tests__/App.test.tsx`
Expected: FAIL — current `App.tsx` renders "Welcome to React Native!", not "Native Stream Deck".

- [ ] **Step 4: Wire App.tsx**

Replace `App.tsx` with:

```tsx
/**
 * NativeStreamDeck
 * @format
 */

import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/auth/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest __tests__/App.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 6: Run the full test suite**

Run: `npm test`
Expected: all tests across all tasks PASS.

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/navigation/RootNavigator.tsx App.tsx __tests__/App.test.tsx
git commit -m "feat: wire RootNavigator and App entry point for Login/Dashboard flow"
```

---

### Task 10: Manual device verification

**Files:** none (manual QA pass, no code changes)

- [ ] **Step 1: Run on Android tablet or emulator**

```bash
npm run android
```

- [ ] **Step 2: Verify Login**

Enter `test@example.com` / `test-password-123` → should land on Dashboard, Home screen visible.

Enter wrong credentials → inline error shown, stays on Login.

- [ ] **Step 3: Verify layout swap on a tablet**

Rotate to landscape with width ≥ 768dp (e.g. Xiaomi Redmi Pad 2 in landscape) → permanent drawer visible on the left, no bottom AppBar.

Rotate to portrait → drawer hidden, bottom AppBar visible with Home/Settings/About.

- [ ] **Step 4: Verify layout on a phone-sized viewport**

Run on a phone emulator (or resize window if testing via a small device) → bottom AppBar visible in both orientations (never meets the 768dp threshold), tapping each item switches the screen.

- [ ] **Step 5: Report findings**

If any step fails, note exact device/orientation/behavior and file it as a follow-up — do not silently patch outside this plan's scope.

---

## Self-Review Notes

- **Spec coverage:** Login form + title ✓ (Task 8), mock credential validation via hashed constant ✓ (Tasks 2–3, 8), adaptive drawer/appbar shell ✓ (Tasks 4, 6, 7), Home/Settings/About placeholders ✓ (Task 6), React Navigation default animations ✓ (no custom animation code anywhere in this plan), OBS/custom-command execution correctly excluded (out of scope per spec).
- **Type consistency:** `DashboardRouteName` (AppBar) matches `DashboardDrawerParamList` keys (`Home`/`Settings`/`About`) used in `DashboardShell`. `useAuth()` return shape (`isAuthenticated`, `login`, `logout`) is identical between `AuthContext.tsx` (Task 3) and its consumers (`LoginScreen` Task 8, `RootNavigator` Task 9).
- **Sequencing note:** Task 6 creates `DashboardShell.tsx` with only the `DashboardDrawerParamList` type exported (screens need it to type their navigation prop); Task 7 fills in the actual `Drawer.Navigator`. This is intentional — avoids a forward reference to an undefined navigator.
