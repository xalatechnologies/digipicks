/**
 * Audit Component Lifecycle Hooks
 *
 * Called by the component registry during install/uninstall/enable/disable.
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Called when the audit component is installed for a tenant.
 * Initializes any required state.
 */
export const onInstall = mutation({
    args: {
        tenantId: v.string(),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (_ctx, _args) => {
        // Audit component has no special install requirements.
        // The schema is automatically created by Convex.
        return { success: true };
    },
});

/**
 * Called when the audit component is uninstalled for a tenant.
 * Core module — should not be uninstalled, but handle gracefully.
 */
export const onUninstall = mutation({
    args: {
        tenantId: v.string(),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (_ctx, _args) => {
        // Audit data is retained even after uninstall for compliance.
        return { success: true };
    },
});

/**
 * Called when the audit component is enabled for a tenant.
 */
export const onEnable = mutation({
    args: {
        tenantId: v.string(),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (_ctx, _args) => {
        return { success: true };
    },
});

/**
 * Called when the audit component is disabled for a tenant.
 */
export const onDisable = mutation({
    args: {
        tenantId: v.string(),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (_ctx, _args) => {
        return { success: true };
    },
});
