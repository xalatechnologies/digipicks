/**
 * SMS Gateway — Twilio Transport Layer
 *
 * Low-level transport for SMS via two Twilio APIs:
 *   1. Twilio Messages API — Direct SMS for notifications
 *   2. Twilio Verify API — OTP verification (phone + email channels)
 *
 * All higher-level logic (MFA, templates, channel routing) lives in
 * verify.ts and messaging/send.ts — this file is transport only.
 *
 * Env vars:
 *   TWILIO_ACCOUNT_SID          — Twilio account SID
 *   TWILIO_AUTH_TOKEN            — Twilio auth token
 *   TWILIO_FROM_NUMBER           — Sender phone number (E.164)
 *   TWILIO_VERIFY_SERVICE_SID    — Twilio Verify service SID (VA...)
 */

import { internalAction } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";

// =============================================================================
// TWILIO MESSAGES API — Direct SMS
// =============================================================================

/**
 * Send a raw SMS message via Twilio Messages API.
 * Used for transactional notifications (order confirmations, reminders, etc.).
 *
 * Checks GDPR notification preferences before sending.
 */
export const sendMessage = internalAction({
    args: {
        tenantId: v.string(),
        to: v.string(),
        body: v.string(),
        userId: v.optional(v.string()),
        category: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // GDPR opt-out check
        if (args.userId && args.category) {
            try {
                const prefs = await ctx.runQuery(
                    components.notifications.functions.getPreferences,
                    { userId: args.userId }
                );
                const smsPref = (prefs as any[]).find(
                    (p: any) =>
                        p.channel === "sms" &&
                        p.category === args.category
                );
                if (smsPref && !smsPref.enabled) {
                    return { success: false, reason: "user_opted_out" };
                }
            } catch {
                // No preferences found — proceed (default: opted in)
            }
        }

        // Normalize phone
        const phone = normalizeNorwegianPhone(args.to);
        if (!phone) {
            console.warn(`SMS Gateway: invalid phone "${args.to}"`);
            return { success: false, reason: "invalid_phone" };
        }

        // Credentials
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromNumber = process.env.TWILIO_FROM_NUMBER;

        // Dev mode fallback
        if (!accountSid || !authToken || !fromNumber) {
            console.log("=== SMS (dev mode) ===");
            console.log(`To: ${phone}`);
            console.log(`Body: ${args.body}`);
            console.log("======================");
            return { success: true, devMode: true };
        }

        // Send via Twilio REST API
        const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        const credentials = btoa(`${accountSid}:${authToken}`);

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    Authorization: `Basic ${credentials}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    To: phone,
                    From: fromNumber,
                    Body: args.body,
                }).toString(),
            });

            if (!response.ok) {
                const error = await response.text();
                console.error("SMS Gateway send failed:", error);
                return { success: false, reason: "api_error", error };
            }

            const result = await response.json();
            return { success: true, messageSid: result?.sid };
        } catch (error) {
            console.error(
                "SMS Gateway network error:",
                error instanceof Error ? error.message : String(error)
            );
            return {
                success: false,
                reason: "network_error",
                error: error instanceof Error ? error.message : String(error),
            };
        }
    },
});

// =============================================================================
// TWILIO VERIFY API — OTP Verification
// =============================================================================

/**
 * Start a verification via Twilio Verify API.
 * Supports both SMS and email channels.
 *
 * @param channel — "sms" or "email"
 * @param to — Phone number (for SMS) or email address (for email)
 */
export const startVerification = internalAction({
    args: {
        to: v.string(),
        channel: v.union(v.literal("sms"), v.literal("email")),
    },
    handler: async (_ctx, args) => {
        // Normalize phone if SMS channel
        const target =
            args.channel === "sms"
                ? normalizeNorwegianPhone(args.to)
                : args.to;

        if (!target) {
            return { success: false, reason: "invalid_target" };
        }

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

        // Dev mode fallback — generate a test code
        if (!accountSid || !authToken || !serviceSid) {
            const devCode = String(Math.floor(100000 + Math.random() * 900000));
            console.log("=== VERIFY (dev mode) ===");
            console.log(`Channel: ${args.channel}`);
            console.log(`To: ${target}`);
            console.log(`Code: ${devCode}`);
            console.log("=========================");
            return { success: true, devMode: true, devCode };
        }

        const url = `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`;
        const credentials = btoa(`${accountSid}:${authToken}`);

        try {
            const params = new URLSearchParams({
                To: target,
                Channel: args.channel,
            });

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    Authorization: `Basic ${credentials}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: params.toString(),
            });

            if (!response.ok) {
                const error = await response.text();
                console.error("Verify API start failed:", error);
                return { success: false, reason: "api_error", error };
            }

            const result = await response.json();
            return {
                success: true,
                status: result?.status, // "pending"
                sid: result?.sid,
            };
        } catch (error) {
            console.error(
                "Verify API network error:",
                error instanceof Error ? error.message : String(error)
            );
            return {
                success: false,
                reason: "network_error",
                error: error instanceof Error ? error.message : String(error),
            };
        }
    },
});

/**
 * Check a verification code via Twilio Verify API.
 *
 * @param to — The phone/email that was verified
 * @param code — The 6-digit code the user entered
 */
export const checkVerification = internalAction({
    args: {
        to: v.string(),
        code: v.string(),
        channel: v.union(v.literal("sms"), v.literal("email")),
    },
    handler: async (_ctx, args) => {
        const target =
            args.channel === "sms"
                ? normalizeNorwegianPhone(args.to)
                : args.to;

        if (!target) {
            return { success: false, reason: "invalid_target" };
        }

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

        // Dev mode — accept any 6-digit code
        if (!accountSid || !authToken || !serviceSid) {
            const valid = /^\d{6}$/.test(args.code);
            console.log("=== VERIFY CHECK (dev mode) ===");
            console.log(`To: ${target} | Code: ${args.code} | Valid: ${valid}`);
            console.log("================================");
            return { success: true, devMode: true, status: valid ? "approved" : "pending" };
        }

        const url = `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`;
        const credentials = btoa(`${accountSid}:${authToken}`);

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    Authorization: `Basic ${credentials}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    To: target,
                    Code: args.code,
                }).toString(),
            });

            if (!response.ok) {
                const error = await response.text();
                console.error("Verify API check failed:", error);
                return { success: false, reason: "api_error", error };
            }

            const result = await response.json();
            return {
                success: true,
                status: result?.status, // "approved" or "pending"
                valid: result?.status === "approved",
            };
        } catch (error) {
            console.error(
                "Verify API check error:",
                error instanceof Error ? error.message : String(error)
            );
            return {
                success: false,
                reason: "network_error",
                error: error instanceof Error ? error.message : String(error),
            };
        }
    },
});

// =============================================================================
// PHONE NORMALIZATION UTILITY
// =============================================================================

/**
 * Normalize a Norwegian phone number to E.164 format.
 * Accepts: "91234567", "+4791234567", "004791234567", "47 912 34 567"
 * Returns: "+4791234567" or null if invalid.
 */
export function normalizeNorwegianPhone(input: string): string | null {
    const cleaned = input.replace(/[\s\-()]/g, "");

    // Already E.164 Norwegian
    if (/^\+47\d{8}$/.test(cleaned)) return cleaned;

    // International prefix without +
    if (/^0047\d{8}$/.test(cleaned)) return `+${cleaned.substring(2)}`;

    // Local 8-digit Norwegian number
    if (/^\d{8}$/.test(cleaned)) return `+47${cleaned}`;

    // Generic E.164 (non-Norwegian)
    if (/^\+\d{10,15}$/.test(cleaned)) return cleaned;

    return null;
}
