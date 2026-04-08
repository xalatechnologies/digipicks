/**
 * RBAC Component — Mutation Functions
 *
 * Write operations for roles and user-role assignments.
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// ROLE MUTATIONS
// =============================================================================

/**
 * Create a new role for a tenant.
 */
export const createRole = mutation({
    args: {
        tenantId: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        permissions: v.array(v.string()),
        isDefault: v.optional(v.boolean()),
        isSystem: v.optional(v.boolean()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        // Check for duplicate name within tenant
        const existing = await ctx.db
            .query("roles")
            .withIndex("by_name", (q) =>
                q.eq("tenantId", args.tenantId).eq("name", args.name)
            )
            .first();

        if (existing) {
            throw new Error(`Role "${args.name}" already exists for this tenant`);
        }

        const id = await ctx.db.insert("roles", {
            tenantId: args.tenantId,
            name: args.name,
            description: args.description,
            permissions: args.permissions,
            isDefault: args.isDefault ?? false,
            isSystem: args.isSystem ?? false,
        });

        return { id: id as string };
    },
});

/**
 * Update a role's properties.
 */
export const updateRole = mutation({
    args: {
        id: v.id("roles"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        permissions: v.optional(v.array(v.string())),
        isDefault: v.optional(v.boolean()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, ...updates }) => {
        const role = await ctx.db.get(id);
        if (!role) throw new Error("Role not found");
        if (role.isSystem) throw new Error("Cannot modify system roles");

        // If renaming, check for duplicates
        if (updates.name && updates.name !== role.name) {
            const existing = await ctx.db
                .query("roles")
                .withIndex("by_name", (q) =>
                    q.eq("tenantId", role.tenantId).eq("name", updates.name!)
                )
                .first();

            if (existing) {
                throw new Error(`Role "${updates.name}" already exists for this tenant`);
            }
        }

        const filteredUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );
        await ctx.db.patch(id, filteredUpdates);
        return { success: true };
    },
});

/**
 * Delete a role. Cannot delete system roles or roles with active assignments.
 */
export const deleteRole = mutation({
    args: {
        id: v.id("roles"),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        const role = await ctx.db.get(id);
        if (!role) throw new Error("Role not found");
        if (role.isSystem) throw new Error("Cannot delete system roles");

        // Check for active user-role assignments
        const assignment = await ctx.db
            .query("userRoles")
            .withIndex("by_role", (q) => q.eq("roleId", id))
            .first();

        if (assignment) {
            throw new Error("Cannot delete role with active user assignments");
        }

        await ctx.db.delete(id);
        return { success: true };
    },
});

// =============================================================================
// USER-ROLE MUTATIONS
// =============================================================================

/**
 * Assign a role to a user in a tenant.
 */
export const assignRole = mutation({
    args: {
        userId: v.string(),
        roleId: v.id("roles"),
        tenantId: v.string(),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        // Verify role exists
        const role = await ctx.db.get(args.roleId);
        if (!role) throw new Error("Role not found");

        // Check if this user-role assignment already exists in this tenant
        const existing = await ctx.db
            .query("userRoles")
            .withIndex("by_tenant_user", (q) =>
                q.eq("tenantId", args.tenantId).eq("userId", args.userId)
            )
            .filter((q) => q.eq(q.field("roleId"), args.roleId))
            .first();

        if (existing) {
            throw new Error("User already has this role in this tenant");
        }

        const id = await ctx.db.insert("userRoles", {
            userId: args.userId,
            roleId: args.roleId,
            tenantId: args.tenantId,
            assignedAt: Date.now(),
        });

        return { id: id as string };
    },
});

/**
 * Revoke a role from a user.
 */
export const revokeRole = mutation({
    args: {
        userId: v.string(),
        roleId: v.id("roles"),
        tenantId: v.string(),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { userId, roleId, tenantId }) => {
        const assignment = await ctx.db
            .query("userRoles")
            .withIndex("by_tenant_user", (q) =>
                q.eq("tenantId", tenantId).eq("userId", userId)
            )
            .filter((q) => q.eq(q.field("roleId"), roleId))
            .first();

        if (!assignment) {
            throw new Error("User does not have this role in this tenant");
        }

        await ctx.db.delete(assignment._id);
        return { success: true };
    },
});
