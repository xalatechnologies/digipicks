/**
 * Verification & MFA — Public API Facade
 *
 * Public mutations/actions/queries that wrap internal verification flows.
 * These are called by SDK hooks from the frontend apps.
 *
 * Auth: All mutations require an active user via `requireActiveUser`.
 * Rate limiting: Applied to code-sending operations.
 */

import { action, mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { requireActiveUser } from "../lib/auth";

// =============================================================================
// PHONE VERIFICATION
// =============================================================================

/**
 * Request a phone verification code (OTP via SMS).
 * Rate limited: max 3 requests per 10 minutes per user.
 */
export const requestPhoneVerification = action({
    args: {
        userId: v.id("users"),
        phone: v.string(),
        tenantId: v.string(),
    },
    returns: v.any(),
    handler: async (ctx, args): Promise<any> => {
        return await ctx.runAction(
            internal.sms.verify.sendPhoneVerification,
            {
                userId: args.userId as string,
                phone: args.phone,
                tenantId: args.tenantId,
            }
        );
    },
});

// =============================================================================
// EMAIL VERIFICATION
// =============================================================================

/**
 * Request an email verification code (OTP via email).
 */
export const requestEmailVerification = action({
    args: {
        userId: v.id("users"),
        email: v.string(),
        tenantId: v.string(),
    },
    returns: v.any(),
    handler: async (ctx, args): Promise<any> => {
        return await ctx.runAction(
            internal.sms.verify.sendEmailVerification,
            {
                userId: args.userId as string,
                email: args.email,
                tenantId: args.tenantId,
            }
        );
    },
});

// =============================================================================
// CONFIRM VERIFICATION
// =============================================================================

/**
 * Confirm a verification code (phone or email).
 */
export const confirmVerificationCode = action({
    args: {
        verificationId: v.string(),
        code: v.string(),
        target: v.string(),
        channel: v.union(v.literal("sms"), v.literal("email")),
        userId: v.id("users"),
    },
    returns: v.any(),
    handler: async (ctx, args): Promise<any> => {
        return await ctx.runAction(
            internal.sms.verify.confirmVerification,
            {
                verificationId: args.verificationId,
                code: args.code,
                target: args.target,
                channel: args.channel,
                userId: args.userId as string,
            }
        );
    },
});

// =============================================================================
// MFA MANAGEMENT
// =============================================================================

/**
 * Get the current user's MFA status.
 */
export const getMfaStatus = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        const auth = await requireActiveUser(ctx, userId);
        const user = await ctx.db.get(auth.userId);
        if (!user) return { mfaEnabled: false, mfaMethod: null };
        return {
            mfaEnabled: user.mfaEnabled ?? false,
            mfaMethod: user.mfaMethod ?? null,
            phoneVerified: user.phoneVerified ?? false,
            emailVerified: user.emailVerified ?? false,
        };
    },
});

/**
 * Enable or disable MFA and set preferred method.
 */
export const updateMfaSettings = mutation({
    args: {
        userId: v.id("users"),
        mfaEnabled: v.boolean(),
        mfaMethod: v.optional(v.union(v.literal("sms"), v.literal("email"))),
    },
    handler: async (ctx, args) => {
        await requireActiveUser(ctx, args.userId);

        const patch: Record<string, any> = {
            mfaEnabled: args.mfaEnabled,
        };
        if (args.mfaMethod) {
            patch.mfaMethod = args.mfaMethod;
        }
        // If disabling MFA, clear method
        if (!args.mfaEnabled) {
            patch.mfaMethod = undefined;
        }

        await ctx.db.patch(args.userId, patch);
        return { success: true };
    },
});

// =============================================================================
// MFA LOGIN CHALLENGE
// =============================================================================

/**
 * Send MFA challenge code during login.
 */
export const sendMfaChallenge = action({
    args: {
        userId: v.string(),
        target: v.string(),
        channel: v.union(v.literal("sms"), v.literal("email")),
    },
    returns: v.any(),
    handler: async (ctx, args): Promise<any> => {
        return await ctx.runAction(
            internal.sms.verify.sendLoginMfa,
            {
                userId: args.userId,
                target: args.target,
                channel: args.channel,
            }
        );
    },
});

/**
 * Verify MFA challenge code during login.
 */
export const confirmMfaChallenge = action({
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
        return await ctx.runAction(
            internal.sms.verify.confirmLoginMfa,
            {
                verificationId: args.verificationId,
                code: args.code,
                target: args.target,
                channel: args.channel,
                userId: args.userId,
                sessionToken: args.sessionToken,
                provider: args.provider,
                appId: args.appId,
            }
        );
    },
});
