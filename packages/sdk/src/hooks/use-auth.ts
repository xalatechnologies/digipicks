/**
 * DigilistSaaS SDK - Auth Hook
 *
 * Unified authentication hook using Convex mutations + session validation.
 * Supports password sign-in, demo sign-in, and OAuth redirect flow.
 */

import { useState, useCallback, useEffect } from "react";
import { useMutationAdapter } from "./utils";
import { useMutation, useAction, useQuery } from "./convex-utils";
import { api } from "../convex-api";
import type { AuthUser } from "../types";

// ============================================================================
// Storage key helpers — session groups for cross-app SSO
// ============================================================================

/**
 * Apps sharing a session group use the same localStorage keys,
 * enabling seamless SSO across e.g. web (5190) and minside (5174).
 */
const SESSION_GROUP: Record<string, string> = {
    web: "digilist",
    minside: "digilist",
    backoffice: "digilist",  // Shared SSO with web + minside (unified portal)
};

function storageKeys(appId: string) {
    const group = SESSION_GROUP[appId] || appId;
    return {
        user: `digilist_saas_${group}_user`,
        token: `digilist_saas_${group}_session_token`,
        tenant: `digilist_saas_${group}_tenant_id`,
    };
}

// ============================================================================
// Cross-origin session cookie helpers
// ============================================================================

/**
 * Session cookie for cross-port/cross-subdomain SSO.
 * Cookies are shared across ports on the same domain (unlike localStorage).
 */
const SESSION_COOKIE_PREFIX = "digilist_saas_session_";

function getSessionCookieName(appId: string): string {
    const group = SESSION_GROUP[appId] || appId;
    return `${SESSION_COOKIE_PREFIX}${group}`;
}

function getSharedCookieDomain(): string {
    // Use parent domain for cross-subdomain SSO
    const host = window.location.hostname;
    const parts = host.split(".");
    if (parts.length >= 2 && !host.match(/^(\d+\.){3}\d+$/)) {
        return `.${parts.slice(-2).join(".")}`;
    }
    return ""; // localhost or IP — no domain attribute
}

function setSessionCookie(appId: string, token: string) {
    const name = getSessionCookieName(appId);
    const maxAge = 30 * 24 * 60 * 60;
    const domain = getSharedCookieDomain();
    const domainAttr = domain ? `; domain=${domain}` : "";
    document.cookie = `${name}=${encodeURIComponent(token)}; path=/${domainAttr}; max-age=${maxAge}; SameSite=Lax`;
}

function getSessionCookie(appId: string): string | null {
    const name = getSessionCookieName(appId);
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
}

function clearSessionCookie(appId: string) {
    const name = getSessionCookieName(appId);
    const domain = getSharedCookieDomain();
    const domainAttr = domain ? `; domain=${domain}` : "";
    document.cookie = `${name}=; path=/${domainAttr}; max-age=0`;
    // Also clear any old host-only cookie (without domain attribute)
    document.cookie = `${name}=; path=/; max-age=0`;
}

// Legacy keys for backward compat
const LEGACY_STORAGE_KEY_USER = "digilist_saas_user";
const LEGACY_STORAGE_KEY_TOKEN = "digilist_saas_session_token";
const LEGACY_STORAGE_KEY_TENANT = "digilist_saas_tenant_id";

// ============================================================================
// Types
// ============================================================================

interface UseAuthOptions {
    appId?: string;
}

interface UseAuthResult {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: Error | null;
    sessionToken: string | null;
    /** Derived from user.role === 'admin' (case-insensitive) */
    isAdmin: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signInAsDemo: (options?: { role?: string; tenantId?: string }) => Promise<void>;
    signInWithOAuth: (provider: string) => Promise<void>;
    signOut: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useAuth(options?: UseAuthOptions): UseAuthResult {
    const appId = options?.appId || "default";
    const keys = storageKeys(appId);

    // Old app-scoped key (before session groups)
    const oldAppKeys = {
        user: `digilist_saas_${appId}_user`,
        token: `digilist_saas_${appId}_session_token`,
        tenant: `digilist_saas_${appId}_tenant_id`,
    };

    const [user, setUser] = useState<AuthUser | null>(() => {
        try {
            const stored = localStorage.getItem(keys.user)
                || localStorage.getItem(oldAppKeys.user)
                || localStorage.getItem(LEGACY_STORAGE_KEY_USER);
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });
    const [sessionToken, setSessionToken] = useState<string | null>(() => {
        try {
            // Check: new group keys → old app keys → cookie (cross-port SSO) → legacy keys
            const token = localStorage.getItem(keys.token)
                || localStorage.getItem(oldAppKeys.token)
                || getSessionCookie(appId)
                || localStorage.getItem(LEGACY_STORAGE_KEY_TOKEN);
            if (token) {
                // Migrate to new group keys + set cross-port cookie
                if (!localStorage.getItem(keys.token)) {
                    localStorage.setItem(keys.token, token);
                }
                if (!getSessionCookie(appId)) {
                    setSessionCookie(appId, token);
                }
            }
            return token;
        } catch {
            return null;
        }
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Track whether initial session validation is done (state so it triggers re-render)
    const [sessionValidated, setSessionValidated] = useState(false);

    const signInWithPasswordMutation = useMutation(api.auth.password.signInWithPassword);
    const signInAsDemoMutation = useMutation(api.auth.password.signInAsDemo);
    const deleteSessionMutation = useMutation(api.auth.sessions.deleteSession);
    const startOAuthAction = useAction(api.auth.start.startOAuth);

    // Validate existing session reactively via Convex query
    const sessionValidation = useQuery(
        api.auth.sessions.validateSessionByToken,
        sessionToken ? { token: sessionToken } : "skip"
    );

    // When session validation returns, update user state
    useEffect(() => {
        if (!sessionToken) {
            // No token — nothing to validate
            setSessionValidated(true);
            return;
        }

        if (sessionValidation === undefined) {
            // Query is still loading
            return;
        }

        setSessionValidated(true);

        if (sessionValidation === null) {
            // Session expired or invalid — clear everything
            setUser(null);
            setSessionToken(null);
            localStorage.removeItem(keys.user);
            localStorage.removeItem(keys.token);
            localStorage.removeItem(keys.tenant);
            clearSessionCookie(appId); // Cross-port SSO
            // Also clear legacy keys
            localStorage.removeItem(LEGACY_STORAGE_KEY_USER);
            localStorage.removeItem(LEGACY_STORAGE_KEY_TOKEN);
            localStorage.removeItem(LEGACY_STORAGE_KEY_TENANT);
        } else {
            // Session is valid — update user from server data
            const serverUser: AuthUser = {
                id: String(sessionValidation.user.id),
                email: sessionValidation.user.email,
                name: sessionValidation.user.name || sessionValidation.user.displayName,
                avatarUrl: sessionValidation.user.avatarUrl,
                tenantId: sessionValidation.tenant?.id
                    ? String(sessionValidation.tenant.id)
                    : undefined,
                role: sessionValidation.user.role,
            };
            setUser(serverUser);
            localStorage.setItem(keys.user, JSON.stringify(serverUser));
            // Ensure cross-port SSO cookie is set
            if (sessionToken && !getSessionCookie(appId)) {
                setSessionCookie(appId, sessionToken);
            }
        }
    }, [sessionValidation, sessionToken, keys.user, keys.token, keys.tenant, appId]);

    const persistSession = useCallback(
        (authUser: AuthUser, token: string, tenantId?: string) => {
            setUser(authUser);
            setSessionToken(token);
            setSessionValidated(true); // Fresh login — no validation needed
            localStorage.setItem(keys.user, JSON.stringify(authUser));
            localStorage.setItem(keys.token, token);
            setSessionCookie(appId, token); // Cross-port SSO
            if (tenantId) {
                localStorage.setItem(keys.tenant, tenantId);
            }
        },
        [keys.user, keys.token, keys.tenant, appId]
    );

    const signIn = useCallback(
        async (email: string, password: string) => {
            setIsLoading(true);
            setError(null);
            try {
                const result = await signInWithPasswordMutation({
                    email,
                    password,
                    appId,
                });
                if (!result.success) {
                    throw new Error(result.error || "Invalid email or password");
                }
                const authUser: AuthUser = {
                    id: String(result.user?.id ?? ""),
                    email: result.user?.email || email,
                    name: result.user?.name || result.user?.displayName,
                    tenantId: result.tenant?.id
                        ? String(result.tenant.id)
                        : undefined,
                    role: result.user?.role,
                };
                persistSession(
                    authUser,
                    result.sessionToken!,
                    result.tenant?.id ? String(result.tenant.id) : undefined
                );
            } catch (err) {
                const e = err instanceof Error ? err : new Error("Sign in failed");
                setError(e);
                throw e;
            } finally {
                setIsLoading(false);
            }
        },
        [signInWithPasswordMutation, persistSession, appId]
    );

    const signInAsDemo = useCallback(async (demoOptions?: { role?: string; tenantId?: string }) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await signInAsDemoMutation({
                appId,
                role: demoOptions?.role,
                tenantId: demoOptions?.tenantId,
            });
            if (!result.success) {
                throw new Error(result.error || "No demo users available");
            }
            const authUser: AuthUser = {
                id: String(result.user?.id ?? ""),
                email: result.user?.email || "",
                name: result.user?.name || result.user?.displayName,
                tenantId: result.tenant?.id
                    ? String(result.tenant.id)
                    : undefined,
                role: result.user?.role,
            };
            persistSession(
                authUser,
                result.sessionToken!,
                result.tenant?.id ? String(result.tenant.id) : undefined
            );
        } catch (err) {
            const e = err instanceof Error ? err : new Error("Demo sign in failed");
            setError(e);
            throw e;
        } finally {
            setIsLoading(false);
        }
    }, [signInAsDemoMutation, persistSession, appId]);

    const signInWithOAuth = useCallback(
        async (provider: string) => {
            setIsLoading(true);
            setError(null);
            try {
                const appOrigin = window.location.origin;
                const returnPath = window.location.pathname;

                const result = await startOAuthAction({
                    provider,
                    appOrigin,
                    returnPath,
                    appId,
                });

                // Redirect to OAuth provider
                window.location.href = result.authUrl;
            } catch (err) {
                const e =
                    err instanceof Error ? err : new Error("OAuth start failed");
                setError(e);
                setIsLoading(false);
                throw e;
            }
            // Don't setIsLoading(false) — page is navigating away
        },
        [startOAuthAction, appId]
    );

    const signOut = useCallback(async () => {
        // Delete server session if we have a token
        if (sessionToken) {
            try {
                await deleteSessionMutation({ token: sessionToken });
            } catch {
                // Ignore errors — session might already be expired
            }
        }

        setUser(null);
        setSessionToken(null);
        setError(null);
        localStorage.removeItem(keys.user);
        localStorage.removeItem(keys.token);
        localStorage.removeItem(keys.tenant);
        clearSessionCookie(appId); // Cross-port SSO
        // Also clear legacy keys
        localStorage.removeItem(LEGACY_STORAGE_KEY_USER);
        localStorage.removeItem(LEGACY_STORAGE_KEY_TOKEN);
        localStorage.removeItem(LEGACY_STORAGE_KEY_TENANT);
    }, [deleteSessionMutation, sessionToken, keys.user, keys.token, keys.tenant, appId]);

    // Not authenticated until session validation completes
    const isValidatingSession = !!sessionToken && !sessionValidated;

    const isAdmin = (user?.role?.toLowerCase() ?? '') === 'admin';

    return {
        user,
        isAuthenticated: !!user && !!sessionToken && sessionValidated,
        isLoading: isLoading || isValidatingSession,
        error,
        sessionToken,
        isAdmin,
        signIn,
        signInAsDemo,
        signInWithOAuth,
        signOut,
    };
}

// ============================================================================
// Tier 1 Adapter Hooks — digdir-compatible API surface
// ============================================================================

/**
 * Session query adapter.
 * Returns `{ data: { data: { user, token } } | null, isLoading, error }`.
 */
export function useSession() {
    const { user, isAuthenticated, isLoading, error, sessionToken } = useAuth();

    const data =
        isAuthenticated && user
            ? { data: { user, token: sessionToken ?? "" } }
            : null;

    return { data, isLoading, error };
}


/**
 * Login mutation adapter.
 * Accepts `{ email, password? }` and delegates to the underlying `signIn`.
 */
export function useLogin() {
    const { signIn } = useAuth();

    const loginFn = useCallback(
        async (credentials: { email: string; password?: string }) => {
            await signIn(credentials.email, credentials.password ?? "");
        },
        [signIn]
    );

    return useMutationAdapter(loginFn);
}

/**
 * Email login mutation adapter.
 * Accepts `{ email, password }` and delegates to `signIn`.
 */
export function useEmailLogin() {
    const { signIn } = useAuth();

    const loginFn = useCallback(
        async (credentials: { email: string; password: string }) => {
            await signIn(credentials.email, credentials.password);
        },
        [signIn]
    );

    return useMutationAdapter(loginFn);
}

/**
 * Logout mutation adapter.
 */
export function useLogout() {
    const { signOut } = useAuth();

    const logoutFn = useCallback(async () => {
        await signOut();
    }, [signOut]);

    return useMutationAdapter(logoutFn);
}

/**
 * Refresh-token mutation adapter (stub).
 * Convex sessions don't use refresh tokens — this is a no-op for API compat.
 */
export function useRefreshToken() {
    const noopFn = useCallback(async () => {
        // No-op: Convex manages session lifetime automatically.
    }, []);

    return useMutationAdapter(noopFn);
}

/**
 * Auth providers query adapter.
 * Returns all supported providers.
 */
export function useAuthProviders() {
    return {
        data: {
            data: [
                "password",
                "demo",
                "idporten",
                "vipps",
                "microsoft",
            ] as const,
        },
        isLoading: false,
        error: null,
    };
}
