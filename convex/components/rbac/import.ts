/**
 * RBAC Component — Import Functions
 *
 * Data migration helpers for roles and user-role assignments.
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Import a role record from the legacy table.
 * Used during data migration.
 */
export const importRole = mutation({
    args: {
        tenantId: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        permissions: v.array(v.string()),
        isDefault: v.boolean(),
        isSystem: v.boolean(),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("roles", { ...args });
        return { id: id as string };
    },
});

/**
 * Import a user-role assignment from the legacy table.
 * Used during data migration.
 */
export const importUserRole = mutation({
    args: {
        userId: v.string(),
        roleId: v.id("roles"),
        tenantId: v.string(),
        assignedAt: v.number(),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("userRoles", { ...args });
        return { id: id as string };
    },
});
