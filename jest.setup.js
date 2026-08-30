/* eslint-env jest */
// authService's PBKDF2 (100k iterations, SHA256, via crypto-js's pure-JS
// implementation — no native acceleration) takes multiple seconds per call.
// Several auth-flow tests hash a password more than once (seed + login,
// register + login, etc.), which can exceed Jest's default 5s per-test
// timeout on a loaded machine. Raise it suite-wide rather than patch every
// affected test file individually.
jest.setTimeout(30000);

// The real react-native-get-random-values package can't be loaded verbatim
// under Jest: its `let module = null` top-level declaration collides with
// Jest's own script-wrapper `module` binding and throws a SyntaxError — a
// Jest-runtime incompatibility, unrelated to what the package actually does.
// This mock reproduces the one observable contract authService.ts depends on:
// after "importing" it, `global.crypto.getRandomValues` exists and works,
// without needing a native TurboModule — mirroring the real package's own
// documented fallback path for environments without native crypto (e.g.
// remote JS debugging). It only installs anything when crypto is missing, so
// under Node (which already ships a real crypto.getRandomValues) this is a
// no-op — day-to-day tests still exercise Node's own crypto. This mock
// exists so `require('react-native-get-random-values')` doesn't throw under
// Jest at all (see the comment above it); it can't be used to prove the
// polyfill is what saves generateSalt() on a real device, because crypto-js
// itself falls back to Node's `require('crypto')` whenever that's
// available — which it always is under Jest, unlike Hermes. See
// authService.test.ts's structural checks (package.json dependency +
// index.js import order) for how that gap is actually guarded.
jest.mock('react-native-get-random-values', () => {
  if (typeof global.crypto !== 'object' || global.crypto === null) {
    global.crypto = {};
  }
  if (typeof global.crypto.getRandomValues !== 'function') {
    global.crypto.getRandomValues = function getRandomValues(array) {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    };
  }
  return {};
});
require('react-native-get-random-values');

jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  // The mock module is emitted with __esModule interop (`exports.default = {...}`);
  // unwrap `.default` so named imports (SafeAreaProvider, useSafeAreaInsets, etc.)
  // resolve directly on the mocked module.
  return mock.default ?? mock;
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);

// react-native-reanimated 4.x (new architecture / react-native-worklets) has no
// working Jest mock yet — its own `mock.js` still pulls in real native TurboModule
// code at import time and crashes outside a device/simulator. `react-native-draggable-flatlist`
// is the only consumer in this codebase, so it is mocked directly with a plain
// (non-animated, non-native) stand-in that renders every item by calling `renderItem`
// (with `keyExtractor` and `ItemSeparatorComponent` honored) so components using it can
// be rendered and tested with RTL.
//
// A real drag GESTURE can't be simulated without a real gesture/animation runtime —
// that part is still only verifiable manually on device. But the `onDragEnd` CALLBACK
// WIRING (does the right data/categoryId flow through to state) is plain JS and is
// testable: this mock renders a hidden `testID="mock-drag-end-{listId}"` Pressable that,
// when pressed, calls `onDragEnd` with a reversed copy of `data`. `listId` defaults to
// the list's `testID` prop if provided, otherwise a per-render-call incrementing index,
// so multiple lists rendered at once (e.g. one row per category) get distinct triggers.
jest.mock('react-native-draggable-flatlist', () => {
  const React = require('react');
  const { View, Pressable } = require('react-native');

  let mockListCounter = 0;

  const DraggableFlatList = ({
    data,
    renderItem,
    keyExtractor,
    contentContainerStyle,
    ItemSeparatorComponent,
    ListFooterComponent,
    onDragEnd,
    testID,
  }) => {
    const listId = testID ?? `list-${mockListCounter++}`;

    return React.createElement(
      View,
      { style: contentContainerStyle },
      React.createElement(Pressable, {
        testID: `mock-drag-end-${listId}`,
        onPress: () =>
          onDragEnd &&
          onDragEnd({
            data: [...data].reverse(),
            from: 0,
            to: data.length - 1,
          }),
      }),
      data.map((item, index) =>
        React.createElement(
          React.Fragment,
          { key: keyExtractor(item, index) },
          index > 0 && ItemSeparatorComponent
            ? React.createElement(ItemSeparatorComponent)
            : null,
          renderItem({ item, index, drag: () => {}, isActive: false, getIndex: () => index }),
        ),
      ),
      ListFooterComponent
        ? React.isValidElement(ListFooterComponent)
          ? ListFooterComponent
          : React.createElement(ListFooterComponent)
        : null,
    );
  };

  return { __esModule: true, default: DraggableFlatList };
});
