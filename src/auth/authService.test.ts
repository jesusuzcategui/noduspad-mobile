import { generateSalt, hashPasswordWithSalt, verifyCredentials } from './authService';

describe('generateSalt', () => {
  it('returns a non-empty hex string', () => {
    const salt = generateSalt();
    expect(salt.length).toBeGreaterThan(0);
    expect(salt).toMatch(/^[0-9a-f]+$/);
  });

  it('returns different values on successive calls', () => {
    const a = generateSalt();
    const b = generateSalt();
    expect(a).not.toBe(b);
  });
});

describe('hashPasswordWithSalt', () => {
  it('produces different hashes for different salts', () => {
    const hashA = hashPasswordWithSalt('correct-password', 'salt-a');
    const hashB = hashPasswordWithSalt('correct-password', 'salt-b');
    expect(hashA).not.toBe(hashB);
  });

  it('is deterministic for the same password and salt', () => {
    expect(hashPasswordWithSalt('correct-password', 'salt-a')).toBe(
      hashPasswordWithSalt('correct-password', 'salt-a'),
    );
  });
});

describe('verifyCredentials', () => {
  const salt = 'test-salt';
  const account = {
    email: 'test@example.com',
    passwordHash: hashPasswordWithSalt('correct-password', salt),
    salt,
  };

  it('returns true for matching email and password', () => {
    expect(verifyCredentials('test@example.com', 'correct-password', account)).toBe(true);
  });

  it('returns false for a wrong password', () => {
    expect(verifyCredentials('test@example.com', 'wrong-password', account)).toBe(false);
  });

  it('returns false for a wrong email', () => {
    expect(verifyCredentials('other@example.com', 'correct-password', account)).toBe(false);
  });

  it('is case-insensitive on email (stored email is expected pre-lowercased)', () => {
    expect(verifyCredentials('Test@Example.com', 'correct-password', account)).toBe(true);
    expect(verifyCredentials('  TEST@EXAMPLE.COM  ', 'correct-password', account)).toBe(true);
  });
});

// Regression coverage for a real bug: CryptoJS's WordArray.random() throws
// 'Native crypto module could not be used to get secure random number.' when
// no global crypto is present. Hermes (React Native's JS engine) has no
// WebCrypto, so without the react-native-get-random-values polyfill,
// generateSalt() — and therefore registration — throws on a real device.
//
// A runtime test that deletes globalThis.crypto and re-requires authService
// CANNOT catch a regression here: crypto-js's own core.js falls back to
// Node's `require('crypto')` whenever it's available (core.js:51), and
// under Jest it always is — so generateSalt() keeps working even with the
// polyfill import removed entirely. That fallback path doesn't exist under
// Hermes (Metro has no `crypto` module to resolve), which is exactly the
// gap that breaks real devices, so a passing runtime test here would prove
// nothing. These structural checks guard the two things that actually
// matter instead: the polyfill is a real dependency, and it's imported
// before anything else in the app's entry point.
describe('generateSalt without a native crypto global (Hermes parity)', () => {
  it('lists react-native-get-random-values as a real dependency', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require('../../package.json');
    expect(pkg.dependencies['react-native-get-random-values']).toBeDefined();
  });

  it("imports react-native-get-random-values as index.js's very first import", () => {
    const fs = require('fs');
    // Read as plain text (never `require`/execute it — index.js registers
    // the RN app as a side effect, which we don't want here). Jest's cwd
    // is the project root, so this relative path resolves without needing
    // __dirname (not typed in this tsconfig) or require.resolve (not on
    // NodeRequire's type here either).
    const indexSource = fs.readFileSync('index.js', 'utf8');
    const importLines = indexSource
      .split('\n')
      .filter((line: string) => /^\s*import\s/.test(line));

    expect(importLines[0]).toContain('react-native-get-random-values');
  });
});
