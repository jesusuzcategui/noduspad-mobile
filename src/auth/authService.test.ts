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
