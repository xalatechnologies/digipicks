/**
 * AuthProvider — Canonical auth for all apps (SSO).
 *
 * SSO invariants (docs/SHARED_INFRASTRUCTURE.md §3):
 * - Same session/identity across web, minside, backoffice
 * - OAuth (IdPorten, Microsoft, Vipps) via signInWithOAuth
 * - Wraps SDK useAuth; do not add app-local auth
 */
import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useAuth as useSdkAuth } from '@digilist-saas/sdk';
import type { AuthState, User } from '../types';

interface AuthContextValue extends AuthState {
    signIn: (email: string, password: string) => Promise<void>;
    signInAsDemo: (options?: { role?: string; tenantId?: string }) => Promise<void>;
    signInWithOAuth: (provider: string) => Promise<void>;
    signOut: () => Promise<void>;
    refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
    children: ReactNode;
    appId?: string;
}

export function AuthProvider({ children, appId = 'default' }: AuthProviderProps) {
    const sdk = useSdkAuth({ appId });

    const user: User | null = sdk.user
        ? {
            id: sdk.user.id,
            email: sdk.user.email,
            name: sdk.user.name,
            avatarUrl: sdk.user.avatarUrl,
            tenantId: sdk.user.tenantId,
            role: sdk.user.role,
        }
        : null;

    const value = useMemo<AuthContextValue>(
        () => ({
            isAuthenticated: sdk.isAuthenticated,
            isLoading: sdk.isLoading,
            user,
            accessToken: sdk.sessionToken,
            error: sdk.error,
            signIn: sdk.signIn,
            signInAsDemo: sdk.signInAsDemo,
            signInWithOAuth: sdk.signInWithOAuth,
            signOut: sdk.signOut,
            refreshToken: async () => {
                // No-op: Convex manages session lifetime automatically.
            },
        }),
        [sdk.isAuthenticated, sdk.isLoading, user, sdk.sessionToken, sdk.error, sdk.signIn, sdk.signInAsDemo, sdk.signInWithOAuth, sdk.signOut]
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
