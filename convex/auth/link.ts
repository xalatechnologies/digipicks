import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Link an external auth provider to an existing user
 * Migrated from: packages/platform/functions/auth-link/index.ts
 */
export const linkProvider = mutation({
    args: {
        userId: v.id("users"),
        provider: v.string(),
        providerId: v.string(),
        providerData: v.optional(v.any()),
    },
    handler: async (ctx, { userId, provider, providerId, providerData }) => {
        const user = await ctx.db.get(userId);
        if (!user) {
            throw new Error("User not found");
        }

        // Update user with provider info
        const metadata = {
            ...user.metadata,
            linkedProviders: {
                ...(user.metadata?.linkedProviders || {}),
                [provider]: {
                    id: providerId,
                    linkedAt: Date.now(),
                    data: providerData,
                },
            },
        };

        await ctx.db.patch(userId, {
            authUserId: providerId, // Use the latest provider ID as primary
            metadata,
        });

        return {
            success: true,
            linkedProvider: provider,
        };
    },
});

/**
 * Unlink an external auth provider from a user
 */
export const unlinkProvider = mutation({
    args: {
        userId: v.id("users"),
        provider: v.string(),
    },
    handler: async (ctx, { userId, provider }) => {
        const user = await ctx.db.get(userId);
        if (!user) {
            throw new Error("User not found");
        }

        const linkedProviders = { ...(user.metadata?.linkedProviders || {}) };
        delete linkedProviders[provider];

        await ctx.db.patch(userId, {
            metadata: {
                ...user.metadata,
                linkedProviders,
            },
        });

        return {
            success: true,
            unlinkedProvider: provider,
        };
    },
});
