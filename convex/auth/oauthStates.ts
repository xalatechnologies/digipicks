import { internalMutation } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";

const STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Create an OAuth state record for CSRF protection.
 */
export const createState = internalMutation({
    args: {
        state: v.string(),
        provider: v.string(),
        appOrigin: v.string(),
        returnPath: v.string(),
        appId: v.string(),
        signicatSessionId: v.optional(v.string()),
    },
    handler: async (ctx, { state, provider, appOrigin, returnPath, appId, signicatSessionId }) => {
        const now = Date.now();
        await ctx.runMutation(components.auth.mutations.createOAuthState, {
            state,
            provider,
            appOrigin,
            returnPath,
            appId,
            signicatSessionId,
            expiresAt: now + STATE_EXPIRY_MS,
        });
    },
});

/**
 * Consume an OAuth state — validates, marks consumed, returns provider/appOrigin/returnPath.
 * Returns null if invalid or already consumed.
 */
export const consumeState = internalMutation({
    args: {
        state: v.string(),
    },
    handler: async (ctx, { state }) => {
        const result = await ctx.runMutation(components.auth.mutations.consumeOAuthState, { state });
        return result;
    },
});
