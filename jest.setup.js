/* eslint-env jest */
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
    );
  };

  return { __esModule: true, default: DraggableFlatList };
});
