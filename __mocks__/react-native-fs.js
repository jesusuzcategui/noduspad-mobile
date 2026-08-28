// react-native-fs's native module isn't linked in the test environment (no
// real build here) — its JS entrypoint (FS.common.js) constructs a
// NativeEventEmitter at import time unconditionally, which throws without a
// real native module present. Mirrors the react-native-linear-gradient mock
// convention in this folder: any node_modules package placed here is
// auto-mocked for every test file, no per-file jest.mock() call needed.
module.exports = {
  DocumentDirectoryPath: '/mock/documents',
  mkdir: jest.fn().mockResolvedValue(undefined),
  copyFile: jest.fn().mockResolvedValue(undefined),
  moveFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
  exists: jest.fn().mockResolvedValue(true),
};
