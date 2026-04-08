/**
 * User Lookup — Internal Mutation
 *
 * Resolves user contact info for messaging dispatch.
 * Separated into its own file to avoid Convex circular type inference
 * when referenced via internal.* from internalAction handlers.
 */

import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

/**
 * Resolve user contact info for messaging dispatch.
 * Returns email, phone, name, and MFA settings.
 */
export const resolveUser = internalMutation({
    args: { userId: v.string() },
    handler: async (ctx, { userId }) => {
        const user = await ctx.db.get(userId as Id<"users">);
        if (!user) return null;
        return {
            email: user.email,
            phoneNumber: user.phoneNumber ?? null,
            name: user.name ?? null,
            mfaEnabled: user.mfaEnabled ?? false,
            mfaMethod: user.mfaMethod ?? null,
        };
    },
});

/**
 * Mark a user's phone or email as verified.
 * Called after successful OTP check.
 */
export const markUserVerified = internalMutation({
    args: {
        userId: v.string(),
        field: v.union(v.literal("phoneVerified"), v.literal("emailVerified")),
    },
    handler: async (ctx, { userId, field }) => {
        await ctx.db.patch(userId as Id<"users">, { [field]: true });
        return { success: true };
    },
});
