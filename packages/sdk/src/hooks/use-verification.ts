/**
 * DigilistSaaS SDK — Verification Hook
 *
 * React hooks for phone and email verification via OTP.
 * Wraps the public API at api.domain.verifyApi.
 *
 * Usage:
 *   const { sendCode, confirmCode, isSending, isConfirming } = usePhoneVerification();
 *   await sendCode("+4791234567");
 *   await confirmCode("123456", "+4791234567");
 */

import { useState, useCallback } from "react";
import { useAction } from "./convex-utils";
import { api, type UserId } from "../convex-api";

// =============================================================================
// TYPES
// =============================================================================

export interface VerificationResult {
    verificationId?: string;
    success: boolean;
    reason?: string;
    error?: string;
}

// =============================================================================
// PHONE VERIFICATION
// =============================================================================

export function usePhoneVerification(userId: UserId | undefined, tenantId: string | undefined) {
    const [isSending, setIsSending] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [verificationId, setVerificationId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [codeSent, setCodeSent] = useState(false);

    const sendAction = useAction(api.domain.verifyApi.requestPhoneVerification);
    const confirmAction = useAction(api.domain.verifyApi.confirmVerificationCode);

    const sendCode = useCallback(
        async (phone: string): Promise<VerificationResult> => {
            if (!userId || !tenantId) {
                return { success: false, error: "User ID or tenant ID missing" };
            }
            setIsSending(true);
            setError(null);
            try {
                const result = await sendAction({
                    userId,
                    phone,
                    tenantId,
                });
                if (result?.verificationId) {
                    setVerificationId(result.verificationId);
                    setCodeSent(true);
                }
                return result as VerificationResult;
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Failed to send code";
                setError(msg);
                return { success: false, error: msg };
            } finally {
                setIsSending(false);
            }
        },
        [userId, tenantId, sendAction]
    );

    const confirmCode = useCallback(
        async (code: string, phone: string): Promise<VerificationResult> => {
            if (!verificationId || !userId) {
                return { success: false, reason: "no_verification_id" };
            }
            setIsConfirming(true);
            setError(null);
            try {
                const result = await confirmAction({
                    verificationId,
                    code,
                    target: phone,
                    channel: "sms" as const,
                    userId,
                });
                return result as VerificationResult;
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Verification failed";
                setError(msg);
                return { success: false, error: msg };
            } finally {
                setIsConfirming(false);
            }
        },
        [verificationId, userId, confirmAction]
    );

    const reset = useCallback(() => {
        setVerificationId(null);
        setCodeSent(false);
        setError(null);
    }, []);

    return {
        sendCode,
        confirmCode,
        reset,
        isSending,
        isConfirming,
        codeSent,
        verificationId,
        error,
    };
}

// =============================================================================
// EMAIL VERIFICATION
// =============================================================================

export function useEmailVerification(userId: UserId | undefined, tenantId: string | undefined) {
    const [isSending, setIsSending] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [verificationId, setVerificationId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [codeSent, setCodeSent] = useState(false);

    const sendAction = useAction(api.domain.verifyApi.requestEmailVerification);
    const confirmAction = useAction(api.domain.verifyApi.confirmVerificationCode);

    const sendCode = useCallback(
        async (email: string): Promise<VerificationResult> => {
            if (!userId || !tenantId) {
                return { success: false, error: "User ID or tenant ID missing" };
            }
            setIsSending(true);
            setError(null);
            try {
                const result = await sendAction({
                    userId,
                    email,
                    tenantId,
                });
                if (result?.verificationId) {
                    setVerificationId(result.verificationId);
                    setCodeSent(true);
                }
                return result as VerificationResult;
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Failed to send code";
                setError(msg);
                return { success: false, error: msg };
            } finally {
                setIsSending(false);
            }
        },
        [userId, tenantId, sendAction]
    );

    const confirmCode = useCallback(
        async (code: string, email: string): Promise<VerificationResult> => {
            if (!verificationId || !userId) {
                return { success: false, reason: "no_verification_id" };
            }
            setIsConfirming(true);
            setError(null);
            try {
                const result = await confirmAction({
                    verificationId,
                    code,
                    target: email,
                    channel: "email" as const,
                    userId,
                });
                return result as VerificationResult;
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Verification failed";
                setError(msg);
                return { success: false, error: msg };
            } finally {
                setIsConfirming(false);
            }
        },
        [verificationId, userId, confirmAction]
    );

    const reset = useCallback(() => {
        setVerificationId(null);
        setCodeSent(false);
        setError(null);
    }, []);

    return {
        sendCode,
        confirmCode,
        reset,
        isSending,
        isConfirming,
        codeSent,
        verificationId,
        error,
    };
}
