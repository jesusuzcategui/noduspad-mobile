import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { AuthProvider, useAuth } from './AuthContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth', () => {
  it('starts unauthenticated', async () => {
    const { result } = await renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('login with correct credentials returns true and sets isAuthenticated', async () => {
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await act(() => {
      const ok = result.current.login('uzcateguijesusdev@gmail.com', '1238022');
      expect(ok).toBe(true);
    });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('login with wrong credentials returns false and keeps isAuthenticated false', async () => {
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await act(() => {
      const ok = result.current.login('wrong@example.com', 'nope');
      expect(ok).toBe(false);
    });
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('logout resets isAuthenticated to false', async () => {
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await act(() => {
      result.current.login('uzcateguijesusdev@gmail.com', '1238022');
    });
    expect(result.current.isAuthenticated).toBe(true);
    await act(() => {
      result.current.logout();
    });
    expect(result.current.isAuthenticated).toBe(false);
  });
});
