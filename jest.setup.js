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
// (non-animated, non-native) stand-in that still calls `renderItem`/`keyExtractor`/
// `onDragEnd` so components using it can be rendered and tested with RTL.
jest.mock('react-native-draggable-flatlist', () => {
  const React = require('react');
  const { View } = require('react-native');

  const DraggableFlatList = ({
    data,
    renderItem,
    keyExtractor,
    contentContainerStyle,
    ItemSeparatorComponent,
  }) =>
    React.createElement(
      View,
      { style: contentContainerStyle },
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

  return { __esModule: true, default: DraggableFlatList };
});
