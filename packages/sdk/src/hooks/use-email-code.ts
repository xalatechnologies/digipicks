/**
 * DigilistSaaS SDK - Email Code Login Hook
 *
 * Provides Vend/FINN-style code-based authentication:
 *   Step 1: Enter email → send 6-digit code
 *   Step 2: Enter code → verify and create session
 *
 * Also manages remembered emails via localStorage.
 */

import { useState, useCallback, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "../convex-api";

const REMEMBERED_EMAILS_KEY = "digilist_remembered_emails";
const MAX_REMEMBERED = 5;

/**
 * Session group mapping — must match use-auth.ts SESSION_GROUP
 * to ensure localStorage keys are identical across hooks.
 */
const SESSION_GROUP: Record<string, string> = {
    web: "digilist",
    minside: "digilist",
    backoffice: "digilist",
};

// Storage key helpers — use session group for SSO compat with useAuth
function storageKeys(appId: string) {
    const group = SESSION_GROUP[appId] || appId;
    return {
        user: `digilist_saas_${group}_user`,
        token: `digilist_saas_${group}_session_token`,
        tenant: `digilist_saas_${group}_tenant_id`,
    };
}

// Cross-port session cookie (same as use-auth.ts)
const SESSION_COOKIE_PREFIX = "digilist_saas_session_";

function setSessionCookie(appId: string, token: string) {
    const group = SESSION_GROUP[appId] || appId;
    const name = `${SESSION_COOKIE_PREFIX}${group}`;
    const maxAge = 30 * 24 * 60 * 60;
    const host = window.location.hostname;
    const parts = host.split(".");
    let domainAttr = "";
    if (parts.length >= 2 && !host.match(/^(\d+\.){3}\d+$/)) {
        domainAttr = `; domain=.${parts.slice(-2).join(".")}`;
    }
    document.cookie = `${name}=${encodeURIComponent(token)}; path=/${domainAttr}; max-age=${maxAge}; SameSite=Lax`;
}

type LoginStep = "email" | "code" | "success";

interface UseEmailCodeOptions {
    appId?: string;
    onSuccess?: (user: { id: string; email: string; name?: string }) => void;
    onError?: (error: Error) => void;
}

interface UseEmailCodeResult {
    // Current step
    step: LoginStep;

    // Email step
    email: string;
    setEmail: (email: string) => void;
    requestCode: (email?: string) => Promise<void>;
    isRequesting: boolean;

    // Code step
    verifyCode: (code: string) => Promise<void>;
    isVerifying: boolean;
    resendCode: () => Promise<void>;

    // Error handling
    error: string | null;
    clearError: () => void;

    // Navigation
    goBack: () => void;

    // Remembered emails
    rememberedEmails: string[];
    removeRememberedEmail: (email: string) => void;
    clearRememberedEmails: () => void;
}

export function useEmailCode(options?: UseEmailCodeOptions): UseEmailCodeResult {
    const appId = options?.appId || "web";
    const keys = storageKeys(appId);

    const [step, setStep] = useState<LoginStep>("email");
    const [email, setEmail] = useState("");
    const [verificationId, setVerificationId] = useState<string | null>(null);
    const [isRequesting, setIsRequesting] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [rememberedEmails, setRememberedEmails] = useState<string[]>([]);

    const requestCodeAction = useAction(api.auth.emailCode.requestEmailCode);
    const verifyCodeAction = useAction(api.auth.emailCode.verifyEmailCode);

    // Load remembered emails from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(REMEMBERED_EMAILS_KEY);
            if (stored) {
                setRememberedEmails(JSON.parse(stored));
            }
        } catch {
            // Ignore parse errors
        }
    }, []);

    // Save email to remembered list
    const rememberEmail = useCallback((emailToRemember: string) => {
        try {
            const normalized = emailToRemember.toLowerCase().trim();
            const stored = localStorage.getItem(REMEMBERED_EMAILS_KEY);
            let emails: string[] = stored ? JSON.parse(stored) : [];
            // Remove if already exists, add to front
            emails = emails.filter((e) => e !== normalized);
            emails.unshift(normalized);
            // Keep max
            emails = emails.slice(0, MAX_REMEMBERED);
            localStorage.setItem(REMEMBERED_EMAILS_KEY, JSON.stringify(emails));
            setRememberedEmails(emails);
        } catch {
            // Ignore storage errors
        }
    }, []);

    const removeRememberedEmail = useCallback((emailToRemove: string) => {
        try {
            const stored = localStorage.getItem(REMEMBERED_EMAILS_KEY);
            let emails: string[] = stored ? JSON.parse(stored) : [];
            emails = emails.filter((e) => e !== emailToRemove);
            localStorage.setItem(REMEMBERED_EMAILS_KEY, JSON.stringify(emails));
            setRememberedEmails(emails);
        } catch {
            // Ignore
        }
    }, []);

    const clearRememberedEmails = useCallback(() => {
        localStorage.removeItem(REMEMBERED_EMAILS_KEY);
        setRememberedEmails([]);
    }, []);

    // Request a code
    const requestCode = useCallback(
        async (overrideEmail?: string) => {
            const targetEmail = overrideEmail || email;
            if (!targetEmail) {
                setError("Skriv inn e-postadressen din");
                return;
            }

            setIsRequesting(true);
            setError(null);

            try {
                const result = await requestCodeAction({
                    email: targetEmail,
                    appId,
                });

                if (result.success) {
                    setVerificationId(result.verificationId);
                    if (overrideEmail) setEmail(overrideEmail);
                    setStep("code");
                }
            } catch (err) {
                const message =
                    err instanceof Error
                        ? err.message
                        : "Kunne ikke sende kode. Prøv igjen.";
                setError(message);
                options?.onError?.(
                    err instanceof Error ? err : new Error(message)
                );
            } finally {
                setIsRequesting(false);
            }
        },
        [email, requestCodeAction, appId, options]
    );

    // Verify a code
    const verifyCode = useCallback(
        async (code: string) => {
            if (!verificationId || !email) {
                setError("Mangler verifiserings-ID");
                return;
            }

            setIsVerifying(true);
            setError(null);

            try {
                const result = await verifyCodeAction({
                    verificationId,
                    code,
                    email,
                    appId,
                });

                if (!result.success) {
                    setError(result.error || "Feil kode");
                    return;
                }

                // Store session (keys match useAuth's SESSION_GROUP)
                const user = {
                    id: String(result.user?.id ?? ""),
                    email: result.user?.email || email,
                    name:
                        result.user?.name ||
                        (result.user?.email || email).split("@")[0],
                    tenantId: result.user?.tenantId,
                    role: result.user?.role,
                };

                localStorage.setItem(keys.user, JSON.stringify(user));
                localStorage.setItem(keys.token, result.sessionToken!);
                setSessionCookie(appId, result.sessionToken!); // Cross-port SSO

                if (result.user?.tenantId) {
                    localStorage.setItem(keys.tenant, result.user.tenantId);
                }

                // Remember this email
                rememberEmail(email);

                // Success
                setStep("success");
                options?.onSuccess?.(user);
            } catch (err) {
                const message =
                    err instanceof Error
                        ? err.message
                        : "Verifisering feilet";
                setError(message);
                options?.onError?.(
                    err instanceof Error ? err : new Error(message)
                );
            } finally {
                setIsVerifying(false);
            }
        },
        [verificationId, email, verifyCodeAction, appId, keys, rememberEmail, options]
    );

    // Resend code
    const resendCode = useCallback(async () => {
        if (!email) return;
        setError(null);
        await requestCode(email);
    }, [email, requestCode]);

    const goBack = useCallback(() => {
        setStep("email");
        setError(null);
        setVerificationId(null);
    }, []);

    const clearError = useCallback(() => setError(null), []);

    return {
        step,
        email,
        setEmail,
        requestCode,
        isRequesting,
        verifyCode,
        isVerifying,
        resendCode,
        error,
        clearError,
        goBack,
        rememberedEmails,
        removeRememberedEmail,
        clearRememberedEmails,
    };
}
