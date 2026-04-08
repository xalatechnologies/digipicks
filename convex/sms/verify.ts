/**
 * Verification & MFA Layer
 *
 * High-level verification flows built on the SMS/email gateway.
 * Handles: phone verification, email verification, login MFA, password reset.
 *
 * Each flow:
 *   1. Creates a verification record in the auth component
 *   2. Sends OTP via Twilio Verify API (SMS or email channel)
 *   3. Validates OTP and updates user record
 *
 * Usage:
 *   await ctx.scheduler.runAfter(0, internal.sms.verify.sendPhoneVerification, {
 *     userId, phone, tenantId
 *   });
 */

import { internalAction } from "../_generated/server";
import { internal, components } from "../_generated/api";
import { v } from "convex/values";

/** OTP expiry in ms */
const VERIFY_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MFA_EXPIRY_MS = 5 * 60 * 1000;     // 5 minutes
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_MFA_ATTEMPTS = 3;

// =============================================================================
// PHONE VERIFICATION
// =============================================================================

/**
 * Send a phone verification OTP.
 * Creates a verification record and dispatches via Twilio Verify API.
 */
export const sendPhoneVerification = internalAction({
    args: {
        userId: v.string(),
        phone: v.string(),
        tenantId: v.string(),
    },
    returns: v.any(),
    handler: async (ctx, args): Promise<any> => {
        // Create verification record
        const record = await ctx.runMutation(
            components.auth.mutations.createVerification,
            {
                userId: args.userId,
                target: args.phone,
                channel: "sms",
                purpose: "phone_verify",
                maxAttempts: MAX_VERIFY_ATTEMPTS,
                expiresAt: Date.now() + VERIFY_EXPIRY_MS,
            }
        );

        // Send OTP via Twilio Verify
        const result = await ctx.runAction(
            internal.sms.gateway.startVerification,
            { to: args.phone, channel: "sms" }
        );

        if (!result.success) {
            // Mark verification as failed
            await ctx.runMutation(
                components.auth.mutations.updateVerification,
                { id: record.id, status: "failed" }
            );
        }

        return { verificationId: record.id, ...result };
    },
});

// =============================================================================
// EMAIL VERIFICATION
// =============================================================================

/**
 * Send an email verification OTP.
 * Creates a verification record and dispatches via Twilio Verify API (email channel).
 */
export const sendEmailVerification = internalAction({
    args: {
        userId: v.string(),
        email: v.string(),
        tenantId: v.string(),
    },
    returns: v.any(),
    handler: async (ctx, args): Promise<any> => {
        const record = await ctx.runMutation(
            components.auth.mutations.createVerification,
            {
                userId: args.userId,
                target: args.email,
                channel: "email",
                purpose: "email_verify",
                maxAttempts: MAX_VERIFY_ATTEMPTS,
                expiresAt: Date.now() + VERIFY_EXPIRY_MS,
            }
        );

        const result = await ctx.runAction(
            internal.sms.gateway.startVerification,
            { to: args.email, channel: "email" }
        );

        if (!result.success) {
            await ctx.runMutation(
                components.auth.mutations.updateVerification,
                { id: record.id, status: "failed" }
            );
        }

        return { verificationId: record.id, ...result };
    },
});

// =============================================================================
// CONFIRM VERIFICATION (Phone or Email)
// =============================================================================

/**
 * Confirm a verification code.
 * Updates user record (phoneVerified/emailVerified) on success.
 */
export const confirmVerification = internalAction({
    args: {
        verificationId: v.string(),
        code: v.string(),
        target: v.string(),
        channel: v.union(v.literal("sms"), v.literal("email")),
        userId: v.string(),
    },
    returns: v.any(),
    handler: async (ctx, args): Promise<any> => {
        // Increment attempt counter
        const attemptResult = await ctx.runMutation(
            components.auth.mutations.updateVerification,
            { id: args.verificationId as any, incrementAttempts: true }
        );

        if (attemptResult.exceeded) {
            return {
                success: false,
                reason: "max_attempts_exceeded",
            };
        }

        // Check code via Twilio Verify
        const check = await ctx.runAction(
            internal.sms.gateway.checkVerification,
            { to: args.target, code: args.code, channel: args.channel }
        );

        if (!check.success || !check.valid) {
            return {
                success: false,
                reason: check.reason ?? "invalid_code",
            };
        }

        // Mark verification as verified
        await ctx.runMutation(
            components.auth.mutations.updateVerification,
            { id: args.verificationId as any, status: "verified" }
        );

        // Update user record
        await ctx.runMutation(
            internal.domain.userLookup.markUserVerified,
            {
                userId: args.userId,
                field: args.channel === "sms" ? "phoneVerified" : "emailVerified",
            }
        );

        return { success: true };
    },
});


// =============================================================================
// LOGIN MFA
// =============================================================================

/**
 * Send MFA code during login.
 * The channel (sms/email) is determined by user's mfaMethod.
 */
export const sendLoginMfa = internalAction({
    args: {
        userId: v.string(),
        target: v.string(),
        channel: v.union(v.literal("sms"), v.literal("email")),
    },
    returns: v.any(),
    handler: async (ctx, args): Promise<any> => {
        const record = await ctx.runMutation(
            components.auth.mutations.createVerification,
            {
                userId: args.userId,
                target: args.target,
                channel: args.channel,
                purpose: "login_mfa",
                maxAttempts: MAX_MFA_ATTEMPTS,
                expiresAt: Date.now() + MFA_EXPIRY_MS,
            }
        );

        const result = await ctx.runAction(
            internal.sms.gateway.startVerification,
            { to: args.target, channel: args.channel }
        );

        if (!result.success) {
            await ctx.runMutation(
                components.auth.mutations.updateVerification,
                { id: record.id, status: "failed" }
            );
        }

        return { verificationId: record.id, ...result };
    },
});

/**
 * Confirm MFA code during login.
 * On success, creates a session via the auth component.
 */
export const confirmLoginMfa = internalAction({
    args: {
        verificationId: v.string(),
        code: v.string(),
        target: v.string(),
        channel: v.union(v.literal("sms"), v.literal("email")),
        userId: v.string(),
        sessionToken: v.string(),
        provider: v.string(),
        appId: v.optional(v.string()),
    },
    returns: v.any(),
    handler: async (ctx, args): Promise<any> => {
        // Increment attempt
        const attemptResult = await ctx.runMutation(
            components.auth.mutations.updateVerification,
            { id: args.verificationId as any, incrementAttempts: true }
        );

        if (attemptResult.exceeded) {
            return { success: false, reason: "max_attempts_exceeded" };
        }

        // Verify code
        const check = await ctx.runAction(
            internal.sms.gateway.checkVerification,
            { to: args.target, code: args.code, channel: args.channel }
        );

        if (!check.success || !check.valid) {
            return { success: false, reason: check.reason ?? "invalid_code" };
        }

        // Mark verification complete
        await ctx.runMutation(
            components.auth.mutations.updateVerification,
            { id: args.verificationId as any, status: "verified" }
        );

        // Create session
        const sessionExpiry = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
        const session = await ctx.runMutation(
            components.auth.mutations.createSession,
            {
                userId: args.userId,
                token: args.sessionToken,
                appId: args.appId,
                provider: args.provider,
                expiresAt: sessionExpiry,
            }
        );

        return { success: true, sessionId: session.id };
    },
});

// =============================================================================
// PASSWORD RESET
// =============================================================================

/**
 * Send password reset verification code via SMS or email.
 */
export const sendPasswordReset = internalAction({
    args: {
        target: v.string(),
        channel: v.union(v.literal("sms"), v.literal("email")),
        userId: v.optional(v.string()),
    },
    returns: v.any(),
    handler: async (ctx, args): Promise<any> => {
        const record = await ctx.runMutation(
            components.auth.mutations.createVerification,
            {
                userId: args.userId,
                target: args.target,
                channel: args.channel,
                purpose: "password_reset",
                maxAttempts: MAX_VERIFY_ATTEMPTS,
                expiresAt: Date.now() + VERIFY_EXPIRY_MS,
            }
        );

        const result = await ctx.runAction(
            internal.sms.gateway.startVerification,
            { to: args.target, channel: args.channel }
        );

        if (!result.success) {
            await ctx.runMutation(
                components.auth.mutations.updateVerification,
                { id: record.id, status: "failed" }
            );
        }

        return { verificationId: record.id, ...result };
    },
});
