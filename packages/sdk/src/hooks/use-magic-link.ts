/**
 * DigilistSaaS SDK - Magic Link Hook
 *
 * Provides magic link (passwordless) authentication functionality.
 */

import { useState, useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "../convex-api";

// Storage key helpers
function storageKeys(appId: string) {
    return {
        user: `digilist_saas_${appId}_user`,
        token: `digilist_saas_${appId}_session_token`,
        tenant: `digilist_saas_${appId}_tenant_id`,
    };
}

interface UseMagicLinkOptions {
    appId?: string;
    onSuccess?: (user: { id: string; email: string; name?: string }) => void;
    onError?: (error: Error) => void;
}

interface UseMagicLinkResult {
    // Request a magic link
    requestMagicLink: (email: string) => Promise<void>;
    isRequesting: boolean;
    requestError: Error | null;
    requestSuccess: boolean;

    // Verify a magic link token
    verifyMagicLink: (token: string) => Promise<{
        success: boolean;
        returnPath?: string;
    }>;
    isVerifying: boolean;
    verifyError: Error | null;
}

export function useMagicLink(options?: UseMagicLinkOptions): UseMagicLinkResult {
    const appId = options?.appId || "default";
    const keys = storageKeys(appId);

    const [isRequesting, setIsRequesting] = useState(false);
    const [requestError, setRequestError] = useState<Error | null>(null);
    const [requestSuccess, setRequestSuccess] = useState(false);

    const [isVerifying, setIsVerifying] = useState(false);
    const [verifyError, setVerifyError] = useState<Error | null>(null);

    const requestMagicLinkAction = useAction(api.auth.magicLink.requestMagicLink);
    const verifyMagicLinkAction = useAction(api.auth.magicLink.verifyMagicLink);

    const requestMagicLink = useCallback(
        async (email: string) => {
            setIsRequesting(true);
            setRequestError(null);
            setRequestSuccess(false);

            try {
                const appOrigin = window.location.origin;
                const returnPath = window.location.pathname;

                await requestMagicLinkAction({
                    email,
                    appOrigin,
                    returnPath,
                    appId,
                });

                setRequestSuccess(true);
            } catch (err) {
                const error =
                    err instanceof Error
                        ? err
                        : new Error("Failed to send magic link");
                setRequestError(error);
                options?.onError?.(error);
                throw error;
            } finally {
                setIsRequesting(false);
            }
        },
        [requestMagicLinkAction, appId, options]
    );

    const verifyMagicLink = useCallback(
        async (token: string) => {
            setIsVerifying(true);
            setVerifyError(null);

            try {
                const result = await verifyMagicLinkAction({ token });

                if (!result.success) {
                    throw new Error(result.error || "Invalid or expired magic link");
                }

                // Store session
                const email = result.user?.email || "";
                const user = {
                    id: String(result.user?.id ?? ""),
                    email,
                    // Use name if available, otherwise derive from email
                    name: result.user?.name || email.split('@')[0] || email,
                    tenantId: result.user?.tenantId,
                };

                localStorage.setItem(keys.user, JSON.stringify(user));
                localStorage.setItem(keys.token, result.sessionToken!);

                // Store tenantId for query resolution
                if (result.user?.tenantId) {
                    localStorage.setItem(keys.tenant, result.user.tenantId);
                }

                options?.onSuccess?.(user);

                return {
                    success: true,
                    returnPath: result.returnPath,
                };
            } catch (err) {
                const error =
                    err instanceof Error
                        ? err
                        : new Error("Failed to verify magic link");
                setVerifyError(error);
                options?.onError?.(error);
                return { success: false };
            } finally {
                setIsVerifying(false);
            }
        },
        [verifyMagicLinkAction, keys.user, keys.token, options]
    );

    return {
        requestMagicLink,
        isRequesting,
        requestError,
        requestSuccess,
        verifyMagicLink,
        isVerifying,
        verifyError,
    };
}
