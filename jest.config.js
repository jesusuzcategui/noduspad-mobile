module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: [
    './node_modules/react-native-gesture-handler/jestSetup.js',
    './jest.setup.js',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-async-storage|@react-navigation|react-native-gesture-handler)/)',
  ],
  // Git worktrees for this repo live under .claude/worktrees/<name>, nested inside
  // the main checkout. Without these, running jest from the main checkout also
  // sweeps up each worktree's own src/ and node_modules, producing duplicate
  // haste-map modules and a second copy of React (Invalid hook call errors).
  modulePathIgnorePatterns: ['<rootDir>/.claude/worktrees/'],
  watchPathIgnorePatterns: ['<rootDir>/.claude/worktrees/'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/.claude/worktrees/'],
};
