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
