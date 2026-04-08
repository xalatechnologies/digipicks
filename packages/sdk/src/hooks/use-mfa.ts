/**
 * DigilistSaaS SDK — MFA Hook
 *
 * React hooks for Multi-Factor Authentication setup and login challenge.
 * Wraps the public API at api.domain.verifyApi.
 *
 * Usage:
 *   const { mfaEnabled, mfaMethod, phoneVerified, emailVerified } = useMfaStatus(userId);
 *   const { enableMfa, disableMfa } = useMfaSetup(userId);
 *   const { sendChallenge, verifyChallenge } = useMfaChallenge();
 */

import { useState, useCallback } from "react";
import { useQuery, useAction } from "./convex-utils";
import { useMutation } from "convex/react";
import { api, type UserId } from "../convex-api";

// =============================================================================
// MFA STATUS (real-time reactive query)
// =============================================================================

export interface MfaStatus {
    mfaEnabled: boolean;
    mfaMethod: "sms" | "email" | null;
    phoneVerified: boolean;
    emailVerified: boolean;
}

export function useMfaStatus(userId: UserId | undefined) {
    const data = useQuery(
        api.domain.verifyApi.getMfaStatus,
        userId ? { userId } : "skip"
    );

    return {
        mfaEnabled: (data as MfaStatus | undefined)?.mfaEnabled ?? false,
        mfaMethod: (data as MfaStatus | undefined)?.mfaMethod ?? null,
        phoneVerified: (data as MfaStatus | undefined)?.phoneVerified ?? false,
        emailVerified: (data as MfaStatus | undefined)?.emailVerified ?? false,
        isLoading: userId !== undefined && data === undefined,
    };
}

// =============================================================================
// MFA SETUP (enable/disable, set method)
// =============================================================================

export function useMfaSetup(userId: UserId | undefined) {
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateMutation = useMutation(api.domain.verifyApi.updateMfaSettings);

    const enableMfa = useCallback(
        async (method: "sms" | "email") => {
            if (!userId) return { success: false, error: "No user ID" };
            setIsUpdating(true);
            setError(null);
            try {
                await updateMutation({
                    userId,
                    mfaEnabled: true,
                    mfaMethod: method,
                });
                return { success: true };
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Failed to enable MFA";
                setError(msg);
                return { success: false, error: msg };
            } finally {
                setIsUpdating(false);
            }
        },
        [userId, updateMutation]
    );

    const disableMfa = useCallback(async () => {
        if (!userId) return { success: false, error: "No user ID" };
        setIsUpdating(true);
        setError(null);
        try {
            await updateMutation({
                userId,
                mfaEnabled: false,
            });
            return { success: true };
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to disable MFA";
            setError(msg);
            return { success: false, error: msg };
        } finally {
            setIsUpdating(false);
        }
    }, [userId, updateMutation]);

    return { enableMfa, disableMfa, isUpdating, error };
}

// =============================================================================
// MFA CHALLENGE (login flow)
// =============================================================================

export interface MfaChallengeResult {
    success: boolean;
    verificationId?: string;
    sessionId?: string;
    reason?: string;
    error?: string;
}

export function useMfaChallenge() {
    const [isSending, setIsSending] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationId, setVerificationId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [codeSent, setCodeSent] = useState(false);

    const sendAction = useAction(api.domain.verifyApi.sendMfaChallenge);
    const confirmAction = useAction(api.domain.verifyApi.confirmMfaChallenge);

    const sendChallenge = useCallback(
        async (opts: {
            userId: string;
            target: string;
            channel: "sms" | "email";
        }): Promise<MfaChallengeResult> => {
            setIsSending(true);
            setError(null);
            try {
                const result = await sendAction({
                    userId: opts.userId,
                    target: opts.target,
                    channel: opts.channel,
                });
                if (result?.verificationId) {
                    setVerificationId(result.verificationId);
                    setCodeSent(true);
                }
                return result as MfaChallengeResult;
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Failed to send MFA code";
                setError(msg);
                return { success: false, error: msg };
            } finally {
                setIsSending(false);
            }
        },
        [sendAction]
    );

    const verifyChallenge = useCallback(
        async (opts: {
            code: string;
            target: string;
            channel: "sms" | "email";
            userId: string;
            sessionToken: string;
            provider: string;
            appId?: string;
        }): Promise<MfaChallengeResult> => {
            if (!verificationId) {
                return { success: false, reason: "no_verification_id" };
            }
            setIsVerifying(true);
            setError(null);
            try {
                const result = await confirmAction({
                    verificationId,
                    code: opts.code,
                    target: opts.target,
                    channel: opts.channel,
                    userId: opts.userId,
                    sessionToken: opts.sessionToken,
                    provider: opts.provider,
                    appId: opts.appId,
                });
                return result as MfaChallengeResult;
            } catch (err) {
                const msg = err instanceof Error ? err.message : "MFA verification failed";
                setError(msg);
                return { success: false, error: msg };
            } finally {
                setIsVerifying(false);
            }
        },
        [verificationId, confirmAction]
    );

    const reset = useCallback(() => {
        setVerificationId(null);
        setCodeSent(false);
        setError(null);
    }, []);

    return {
        sendChallenge,
        verifyChallenge,
        reset,
        isSending,
        isVerifying,
        codeSent,
        verificationId,
        error,
    };
}
