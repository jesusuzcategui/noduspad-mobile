import CryptoJS from 'crypto-js';
import type { Account } from './accountStorage';

const PBKDF2_ITERATIONS = 100_000;

export function generateSalt(): string {
  return CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);
}

export function hashPasswordWithSalt(password: string, salt: string): string {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: PBKDF2_ITERATIONS,
    hasher: CryptoJS.algo.SHA256,
  }).toString(CryptoJS.enc.Hex);
}

export function verifyCredentials(
  email: string,
  password: string,
  account: Pick<Account, 'email' | 'passwordHash' | 'salt'>,
): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  return (
    normalizedEmail === account.email &&
    hashPasswordWithSalt(password, account.salt) === account.passwordHash
  );
}
