/**
 * DigilistSaaS SDK - OAuth Callback Hook
 *
 * Used on the /auth/callback route in each app.
 * Reads sessionToken from URL params, validates, stores, and redirects.
 */

import { useEffect, useState, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex-api";
import type { AuthUser } from "../types";

interface UseOAuthCallbackOptions {
    appId?: string;
    /** Called with the returnPath after successful auth */
    onSuccess?: (returnPath: string) => void;
    /** Called with an error message on failure */
    onError?: (error: string) => void;
}

interface UseOAuthCallbackResult {
    isProcessing: boolean;
    error: string | null;
}

export function useOAuthCallback(
    options?: UseOAuthCallbackOptions
): UseOAuthCallbackResult {
    const appId = options?.appId || "default";
    const [isProcessing, setIsProcessing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const processedRef = useRef(false);

    // Read URL params
    const urlParams =
        typeof window !== "undefined"
            ? new URLSearchParams(window.location.search)
            : null;
    const sessionToken = urlParams?.get("sessionToken") || null;
    const returnPath = urlParams?.get("returnPath") || "/";
    const urlError = urlParams?.get("error") || null;

    // Validate the session token via Convex query
    const sessionValidation = useQuery(
        api.auth.sessions.validateSessionByToken,
        sessionToken ? { token: sessionToken } : "skip"
    );

    useEffect(() => {
        // Prevent double-processing in StrictMode
        if (processedRef.current) return;

        // Handle URL error from OAuth flow
        if (urlError) {
            processedRef.current = true;
            setError(urlError);
            setIsProcessing(false);
            options?.onError?.(urlError);
            return;
        }

        // No session token in URL
        if (!sessionToken) {
            processedRef.current = true;
            setError("No session token received");
            setIsProcessing(false);
            options?.onError?.("No session token received");
            return;
        }

        // Wait for session validation query
        if (sessionValidation === undefined) {
            return; // Still loading
        }

        processedRef.current = true;

        if (sessionValidation === null) {
            setError("Invalid session token");
            setIsProcessing(false);
            options?.onError?.("Invalid session token");
            return;
        }

        // Valid session — store in localStorage + cookie (cross-port SSO)
        const SESSION_GROUP: Record<string, string> = {
            web: "digilist",
            minside: "digilist",
            backoffice: "digilist",
        };
        const group = SESSION_GROUP[appId] || appId;
        const keys = {
            user: `digilist_saas_${group}_user`,
            token: `digilist_saas_${group}_session_token`,
            tenant: `digilist_saas_${group}_tenant_id`,
        };

        const authUser: AuthUser = {
            id: String(sessionValidation.user.id),
            email: sessionValidation.user.email,
            name:
                sessionValidation.user.name ||
                sessionValidation.user.displayName,
            avatarUrl: sessionValidation.user.avatarUrl,
            tenantId: sessionValidation.tenant?.id
                ? String(sessionValidation.tenant.id)
                : undefined,
            role: sessionValidation.user.role,
        };

        localStorage.setItem(keys.user, JSON.stringify(authUser));
        localStorage.setItem(keys.token, sessionToken);
        // Set cross-port SSO cookie
        const cookieName = `digilist_saas_session_${group}`;
        const maxAge = 30 * 24 * 60 * 60;
        document.cookie = `${cookieName}=${encodeURIComponent(sessionToken)}; path=/; max-age=${maxAge}; SameSite=Lax`;
        if (sessionValidation.tenant?.id) {
            localStorage.setItem(
                keys.tenant,
                String(sessionValidation.tenant.id)
            );
        }

        // Clean the URL
        window.history.replaceState(
            {},
            document.title,
            window.location.pathname
        );

        setIsProcessing(false);
        options?.onSuccess?.(returnPath);
    }, [sessionValidation, sessionToken, urlError, appId, returnPath, options]);

    return {
        isProcessing,
        error,
    };
}
