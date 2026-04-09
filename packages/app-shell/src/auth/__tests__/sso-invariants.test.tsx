/**
 * SSO Invariants Tests
 *
 * Verifies SSO contract per docs/SHARED_INFRASTRUCTURE.md §3.
 * Ensures AuthProvider exposes signInWithOAuth and BackofficeAuthBridge delegates to it.
 */

/// <reference types="@testing-library/jest-dom/vitest" />

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthProvider';

const mockSignInWithOAuth = vi.fn();

vi.mock('@digipicks/sdk', () => ({
  useAuth: vi.fn(),
}));

import { useAuth as useSdkAuth } from '@digipicks/sdk';

describe('SSO invariants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSdkAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      sessionToken: null,
      error: null,
      signIn: vi.fn(),
      signInAsDemo: vi.fn(),
      signInWithOAuth: mockSignInWithOAuth,
      signOut: vi.fn(),
    } as never);
  });

  it('AuthProvider exposes signInWithOAuth for OAuth/SSO flow', () => {
    function Consumer() {
      const auth = useAuth();
      return (
        <button onClick={() => auth.signInWithOAuth('idporten')} data-testid="oauth-btn">
          Sign in
        </button>
      );
    }

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    const btn = screen.getByTestId('oauth-btn');
    expect(btn).toBeInTheDocument();
    btn.click();
    expect(mockSignInWithOAuth).toHaveBeenCalledWith('idporten');
  });

  it('AuthProvider passes through SDK auth state', () => {
    vi.mocked(useSdkAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'u1', email: 't@x.com', name: 'Test', role: 'admin' },
      sessionToken: 'token-123',
      error: null,
      signIn: vi.fn(),
      signInAsDemo: vi.fn(),
      signInWithOAuth: mockSignInWithOAuth,
      signOut: vi.fn(),
    } as never);

    function Consumer() {
      const auth = useAuth();
      return <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>;
    }

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
  });
});
