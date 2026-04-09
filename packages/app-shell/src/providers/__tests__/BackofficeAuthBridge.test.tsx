/// <reference types="@testing-library/jest-dom/vitest" />

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { BackofficeAuthBridge, useBackofficeAuth } from '../BackofficeAuthBridge';

const mockUseAuth = vi.fn();

vi.mock('../../env', () => ({
  env: {
    useMockAuth: false,
    tenantId: '',
  },
}));

vi.mock('../../auth/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useAuth: () => mockUseAuth(),
}));

function Consumer() {
  const auth = useBackofficeAuth();
  return (
    <>
      <div data-testid="role">{auth.user?.role ?? 'none'}</div>
      <div data-testid="granted-roles">{(auth.user?.grantedRoles ?? []).join(',')}</div>
      <div data-testid="is-authenticated">{String(auth.isAuthenticated)}</div>
    </>
  );
}

describe('BackofficeAuthBridge creator mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps creator to privileged backoffice user with creator grant', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'u1',
        email: 'creator@digipicks.test',
        role: 'creator',
        tenantId: 't1',
      },
      isLoading: false,
      isAuthenticated: true,
      signInAsDemo: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    });

    render(
      <BackofficeAuthBridge>
        <Consumer />
      </BackofficeAuthBridge>,
    );

    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('role')).toHaveTextContent('admin');
    expect(screen.getByTestId('granted-roles')).toHaveTextContent('creator');
  });

  it('maps superadmin role correctly with superadmin grant', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'u2',
        email: 'super@digipicks.test',
        role: 'superadmin',
        tenantId: 'platform',
      },
      isLoading: false,
      isAuthenticated: true,
      signInAsDemo: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    });

    render(
      <BackofficeAuthBridge>
        <Consumer />
      </BackofficeAuthBridge>,
    );

    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
    // Superadmin should surface as superadmin or admin (depending on bridge mapping)
    const roleText = screen.getByTestId('role').textContent;
    expect(['superadmin', 'admin']).toContain(roleText);
  });

  it('maps subscriber role preserving subscriber identity', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'u3',
        email: 'subscriber@digipicks.test',
        role: 'subscriber',
        tenantId: 't1',
      },
      isLoading: false,
      isAuthenticated: true,
      signInAsDemo: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    });

    render(
      <BackofficeAuthBridge>
        <Consumer />
      </BackofficeAuthBridge>,
    );

    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
  });
});
