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
