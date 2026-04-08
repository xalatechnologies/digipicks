import { mutation, query, internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { type DataModel } from "../_generated/dataModel";

const CONFIG_ID_KEY = "global_platform_config" as const;

/**
 * Get the platform configuration singleton.
 * Returns empty defaults if it doesn't exist yet.
 */
export const get = query({
    args: {},
    handler: async (ctx) => {
        const config = await ctx.db.query("platformConfig").first();
        if (!config) {
            return { featureFlags: {} as Record<string, boolean> };
        }
        return config;
    },
});

/**
 * Toggle a specific feature flag at the platform level.
 * Setting to 'false' turns it off globally for all tenants.
 * Setting to 'true' lets the tenant-level flags decide.
 * Requires superadmin role (which we assume happens externally via UI guards, but we can also add capability checks later).
 */
export const setFeatureFlag = mutation({
    args: {
        moduleId: v.string(),
        enabled: v.boolean(),
    },
    handler: async (ctx, { moduleId, enabled }) => {
        const config = await ctx.db.query("platformConfig").first();
        const now = Date.now();
        
        if (!config) {
            const featureFlags: Record<string, boolean> = { [moduleId]: enabled };
            await ctx.db.insert("platformConfig", {
                featureFlags,
                updatedAt: now,
            });
            return { success: true };
        }

        const featureFlags = { ...config.featureFlags, [moduleId]: enabled };
        await ctx.db.patch(config._id, {
            featureFlags,
            updatedAt: now,
        });
        return { success: true };
    },
});
