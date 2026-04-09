/**
 * AuthBridge — Auth provider for the unified dashboard portal.
 *
 * SSO invariants (docs/SHARED_INFRASTRUCTURE.md §3):
 * - Wraps AuthProvider; login() delegates to auth.signInWithOAuth('idporten' | 'microsoft')
 * - Do not bypass AuthProvider; SSO must flow through app-shell
 *
 * @formerly BackofficeAuthBridge (renamed during app consolidation)
 */

import { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '@digipicks/sdk';
import { AuthProvider, useAuth } from '../auth/AuthProvider';
import { env } from '../env';
import type { PlatformRole } from '../capabilities';
import { SUPERADMIN_ROLES } from '../capabilities';

const USE_MOCK_AUTH = env.useMockAuth;
const ROLE_STORAGE_KEYS = {
  EFFECTIVE_ROLE: 'backoffice_effective_role',
  REMEMBER_CHOICE: 'backoffice_remember_role_choice',
} as const;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  tenantId?: string;
  role: 'superadmin' | 'owner' | 'admin' | 'saksbehandler' | 'manager' | 'arranger' | 'user' | 'member';
  grantedRoles?: PlatformRole[];
}
/** @deprecated Use AuthUser */
export type BackofficeAuthUser = AuthUser;

export interface AuthValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSaksbehandler: boolean;
  isArranger: boolean;
  login: (provider?: string) => void;
  logout: () => Promise<void>;
  checkRole: (role: 'admin' | 'saksbehandler' | 'user') => boolean;
}
/** @deprecated Use AuthValue */
export type BackofficeAuthValue = AuthValue;

const MOCK_TENANT_ID = env.tenantId || '';

const MOCK_USERS: Record<string, AuthUser> = {
  superadmin: {
    id: 'mock-superadmin-001',
    name: 'Platform Admin',
    email: 'superadmin@example.com',
    role: 'superadmin',
    grantedRoles: ['superadmin'],
    tenantId: MOCK_TENANT_ID,
  },
  admin: {
    id: 'mock-admin-001',
    name: 'Tenant Admin',
    email: 'admin@example.com',
    role: 'admin',
    grantedRoles: ['admin'],
    tenantId: MOCK_TENANT_ID,
  },
  user: {
    id: 'mock-user-001',
    name: 'Tenant Owner',
    email: 'owner@example.com',
    role: 'user',
    grantedRoles: ['user'],
    tenantId: MOCK_TENANT_ID,
  },
};

const AuthContext = createContext<AuthValue | null>(null);

function mapAppShellUser(
  appUser: { id: string; name?: string; email: string; avatarUrl?: string; tenantId?: string; role?: string } | null,
): AuthUser | null {
  if (!appUser) return null;

  // Detect superadmin from various role strings
  if (appUser.role && SUPERADMIN_ROLES.has(appUser.role)) {
    return {
      id: appUser.id,
      name: appUser.name || appUser.email,
      email: appUser.email,
      avatarUrl: appUser.avatarUrl,
      tenantId: appUser.tenantId,
      role: 'admin', // legacy role field
      grantedRoles: ['superadmin'],
    };
  }

  const role = appUser.role === 'admin' ? 'admin' : appUser.role === 'owner' ? 'user' : 'user';
  const grantedRoles: PlatformRole[] =
    appUser.role === 'admin' ? ['admin'] : appUser.role === 'owner' ? ['user'] : ['user'];
  return {
    id: appUser.id,
    name: appUser.name || appUser.email,
    email: appUser.email,
    avatarUrl: appUser.avatarUrl,
    tenantId: appUser.tenantId,
    role,
    grantedRoles,
  };
}

function AppShellAuthBridge({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const user = useMemo(() => mapAppShellUser(auth.user), [auth.user]);
  const value = useMemo<AuthValue>(
    () => ({
      user,
      isLoading: auth.isLoading,
      isAuthenticated: auth.isAuthenticated,
      isAdmin: user?.role === 'admin',
      isSaksbehandler: user?.role === 'admin' || user?.role === 'saksbehandler',
      isArranger: user?.role === 'arranger',
      login: (provider = 'idporten') => {
        if (provider.startsWith('dev-')) {
          const roleMap: Record<string, string> = {
            'dev-superadmin': 'superadmin',
            'dev-owner': 'owner',
            'dev-admin': 'admin',
            'dev-arranger': 'arranger',
            'dev-manager': 'manager',
            'dev-member': 'member',
            'dev-dual': 'admin',
          };
          auth.signInAsDemo({ role: roleMap[provider] || 'admin', tenantId: env.tenantId || undefined });
        } else {
          auth.signInWithOAuth(provider);
        }
      },
      logout: async () => {
        localStorage.removeItem(ROLE_STORAGE_KEYS.EFFECTIVE_ROLE);
        localStorage.removeItem(ROLE_STORAGE_KEYS.REMEMBER_CHOICE);
        await auth.signOut();
        window.location.href = '/login?logout=true';
      },
      checkRole: (role) => {
        if (!user) return false;
        if (role === 'admin') return user.role === 'admin';
        return user.role === 'admin' || user.role === 'saksbehandler';
      },
    }),
    [auth, user],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Cookie helpers for cross-port SSO (localStorage is per-origin, cookies are shared)
const MOCK_SSO_COOKIE = 'digilist_saas_mock_sso';

/** Get the root domain for cross-subdomain cookies (e.g. ".example.com") */
function getCookieDomain(): string {
  const host = window.location.hostname;
  // localhost / IP — no domain needed
  if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return '';
  // Use root domain (last 2 segments)
  const parts = host.split('.');
  return parts.length >= 2 ? `; domain=.${parts.slice(-2).join('.')}` : '';
}

function setMockSSOCookie(user: AuthUser) {
  const json = encodeURIComponent(JSON.stringify(user));
  document.cookie = `${MOCK_SSO_COOKIE}=${json}; path=/${getCookieDomain()}; max-age=${30 * 24 * 3600}; SameSite=Lax`;
}

function getMockSSOCookie(): AuthUser | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${MOCK_SSO_COOKIE}=([^;]*)`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

function clearMockSSOCookie() {
  document.cookie = `${MOCK_SSO_COOKIE}=; path=/${getCookieDomain()}; max-age=0`;
}

function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [mockUser, setMockUser] = useState<AuthUser | null>(() => {
    try {
      // Try localStorage first (same origin), then cookie (cross-port SSO)
      const s = localStorage.getItem('digilist_saas_digilist_user') || localStorage.getItem('backoffice_mock_user');
      if (s) {
        const parsed = JSON.parse(s);
        // Also set cookie so other ports can pick it up
        setMockSSOCookie(parsed);
        return parsed;
      }
      // Cross-port SSO: recover from cookie if localStorage is empty
      const fromCookie = getMockSSOCookie();
      if (fromCookie) {
        // Hydrate localStorage so subsequent reads are fast
        localStorage.setItem('digilist_saas_digilist_user', JSON.stringify(fromCookie));
        localStorage.setItem('backoffice_mock_user', JSON.stringify(fromCookie));
        return fromCookie;
      }
      return null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  // Resolve mock user to real Convex user by email
  const convexUser = useQuery(api.users.index.getByEmail, mockUser?.email ? { email: mockUser.email } : 'skip');

  // Merge real Convex user ID into the mock user
  const user = useMemo<AuthUser | null>(() => {
    if (!mockUser) return null;
    if (convexUser?._id) {
      return { ...mockUser, id: convexUser._id };
    }
    return mockUser;
  }, [mockUser, convexUser]);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const login = useCallback(
    (provider: string = 'idporten') => {
      const mockKeyMap: Record<string, keyof typeof MOCK_USERS> = {
        'dev-superadmin': 'superadmin',
        'dev-admin': 'admin',
        'dev-owner': 'user', // legacy key → user (tenant owner)
        'dev-arranger': 'user', // legacy key → user
        'dev-manager': 'user', // legacy key → user
        'dev-dual': 'user', // legacy key → user
        'dev-member': 'user', // legacy key → user
      };
      const mockKey = mockKeyMap[provider];
      const selected = mockKey ? MOCK_USERS[mockKey] : MOCK_USERS.admin;
      localStorage.setItem('backoffice_mock_user', JSON.stringify(selected));
      // Write to shared SSO keys so web app can read the session
      localStorage.setItem('digilist_saas_digilist_user', JSON.stringify(selected));
      localStorage.setItem('digilist_saas_digilist_tenant_id', selected.tenantId || '');
      localStorage.setItem('digilist_saas_digilist_session_token', `mock_${selected.id}`);
      // Legacy keys (backward compat)
      localStorage.setItem('digilist_saas_backoffice_tenant_id', selected.tenantId || '');
      localStorage.setItem('digilist_saas_backoffice_user', JSON.stringify(selected));
      // Cross-port SSO cookie (shared across localhost ports)
      setMockSSOCookie(selected);
      setMockUser(selected);
      navigate('/');
    },
    [navigate],
  );

  const logout = useCallback(async () => {
    localStorage.removeItem('backoffice_mock_user');
    // Clear shared SSO keys
    localStorage.removeItem('digilist_saas_digilist_user');
    localStorage.removeItem('digilist_saas_digilist_tenant_id');
    localStorage.removeItem('digilist_saas_digilist_session_token');
    // Clear legacy keys
    localStorage.removeItem('digilist_saas_backoffice_tenant_id');
    localStorage.removeItem('digilist_saas_backoffice_user');
    localStorage.removeItem(ROLE_STORAGE_KEYS.EFFECTIVE_ROLE);
    localStorage.removeItem(ROLE_STORAGE_KEYS.REMEMBER_CHOICE);
    // Clear cross-port SSO cookie
    clearMockSSOCookie();
    setMockUser(null);
    navigate('/login');
  }, [navigate]);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
      isSaksbehandler: user?.role === 'admin', // legacy compat
      isArranger: false, // legacy compat — no arranger role in 3-role system
      login,
      logout,
      checkRole: (role) => {
        if (!user) return false;
        return user.role === role;
      },
    }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Check if an SDK session cookie exists (set by web app or real OAuth login).
 * Cookie name follows the session group: digilist_saas_session_digilist
 */
function hasSDKSessionCookie(): boolean {
  return document.cookie.includes('digilist_saas_session_digilist');
}

/**
 * Check if this is a logout request. If so, clear all auth state synchronously
 * BEFORE any auth provider reads from localStorage. This prevents stale sessions.
 */
function clearOnLogout(): boolean {
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash;
  if (params.get('logout') === 'true' || window.location.pathname === '/login') {
    // Only aggressively clear on explicit logout, not every /login visit
    if (params.get('logout') === 'true') {
      [
        'digilist_saas_digilist_session_token',
        'digilist_saas_digilist_user',
        'digilist_saas_digilist_tenant_id',
        'backoffice_mock_user',
        'digilist_saas_backoffice_user',
        'digilist_saas_backoffice_tenant_id',
        'backoffice_effective_role',
        'backoffice_remember_role_choice',
        'dashboard_mode',
        'digilist_saas_user',
        'digilist_saas_session_token',
        'digilist_saas_tenant_id',
      ].forEach((k) => localStorage.removeItem(k));
      clearMockSSOCookie();
      // Clear SDK session cookie
      const host = window.location.hostname;
      const parts = host.split('.');
      if (parts.length >= 2) {
        const domain = `.${parts.slice(-2).join('.')}`;
        document.cookie = `digilist_saas_session_digilist=; path=/; domain=${domain}; max-age=0`;
      }
      document.cookie = `digilist_saas_session_digilist=; path=/; max-age=0`;
      return true;
    }
  }
  return false;
}

// Run synchronously on module load — before any component renders
const IS_LOGOUT = clearOnLogout();

export function AuthBridge({ children }: { children: React.ReactNode }) {
  // If there's an SDK session from another app (e.g. web → dashboard SSO),
  // use real auth even in mock mode so the session is validated via Convex
  if (USE_MOCK_AUTH && !hasSDKSessionCookie()) {
    return <MockAuthProvider>{children}</MockAuthProvider>;
  }
  return (
    <AuthProvider appId="backoffice">
      <AppShellAuthBridge>{children}</AppShellAuthBridge>
    </AuthProvider>
  );
}

export function useAuthBridge(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthBridge must be used within AuthBridge');
  return ctx;
}

/** @deprecated Use AuthBridge */
export const BackofficeAuthBridge = AuthBridge;
/** @deprecated Use useAuthBridge */
export const useBackofficeAuth = useAuthBridge;
