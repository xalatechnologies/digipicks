/**
 * RBAC Component — Query Functions
 *
 * Read-only operations for roles, user-role assignments, and permission checks.
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// ROLE QUERIES
// =============================================================================

/**
 * List all roles for a tenant.
 */
export const listRoles = query({
    args: {
        tenantId: v.string(),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, limit = 100 }) => {
        return await ctx.db
            .query("roles")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .take(limit);
    },
});

/**
 * Get a single role by ID.
 */
export const getRole = query({
    args: {
        id: v.id("roles"),
    },
    returns: v.any(),
    handler: async (ctx, { id }) => {
        const role = await ctx.db.get(id);
        if (!role) throw new Error("Role not found");
        return role;
    },
});

// =============================================================================
// USER-ROLE QUERIES
// =============================================================================

/**
 * List user-role assignments, filtered by userId or tenantId.
 */
export const listUserRoles = query({
    args: {
        userId: v.optional(v.string()),
        tenantId: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { userId, tenantId, limit = 100 }) => {
        if (userId) {
            const assignments = await ctx.db
                .query("userRoles")
                .withIndex("by_user", (q) => q.eq("userId", userId))
                .take(limit);

            // Batch fetch roles to avoid N+1
            const roleIds = [...new Set(assignments.map((a) => a.roleId))];
            const roles = await Promise.all(roleIds.map((id) => ctx.db.get(id)));
            const roleMap = new Map(roles.filter(Boolean).map((r: any) => [r._id, r]));

            return assignments.map((a) => ({
                ...a,
                role: roleMap.get(a.roleId) ?? null,
            }));
        }

        if (tenantId) {
            const assignments = await ctx.db
                .query("userRoles")
                .withIndex("by_tenant_user", (q) => q.eq("tenantId", tenantId))
                .take(limit);

            // Batch fetch roles to avoid N+1
            const roleIds = [...new Set(assignments.map((a) => a.roleId))];
            const roles = await Promise.all(roleIds.map((id) => ctx.db.get(id)));
            const roleMap = new Map(roles.filter(Boolean).map((r: any) => [r._id, r]));

            return assignments.map((a) => ({
                ...a,
                role: roleMap.get(a.roleId) ?? null,
            }));
        }

        throw new Error("Either userId or tenantId must be provided");
    },
});

// =============================================================================
// PERMISSION CHECKS
// =============================================================================

/**
 * Check if a user has a specific permission in a tenant.
 */
export const checkPermission = query({
    args: {
        userId: v.string(),
        tenantId: v.string(),
        permission: v.string(),
    },
    returns: v.object({ hasPermission: v.boolean() }),
    handler: async (ctx, { userId, tenantId, permission }) => {
        const assignments = await ctx.db
            .query("userRoles")
            .withIndex("by_tenant_user", (q) =>
                q.eq("tenantId", tenantId).eq("userId", userId)
            )
            .collect();

        for (const assignment of assignments) {
            const role = await ctx.db.get(assignment.roleId);
            if (role && role.permissions.includes(permission)) {
                return { hasPermission: true };
            }
        }

        return { hasPermission: false };
    },
});

/**
 * Get all permissions for a user in a tenant (union of all role permissions).
 */
export const getUserPermissions = query({
    args: {
        userId: v.string(),
        tenantId: v.string(),
    },
    returns: v.object({ permissions: v.array(v.string()) }),
    handler: async (ctx, { userId, tenantId }) => {
        const assignments = await ctx.db
            .query("userRoles")
            .withIndex("by_tenant_user", (q) =>
                q.eq("tenantId", tenantId).eq("userId", userId)
            )
            .collect();

        const permissionSet = new Set<string>();

        for (const assignment of assignments) {
            const role = await ctx.db.get(assignment.roleId);
            if (role) {
                for (const perm of role.permissions) {
                    permissionSet.add(perm);
                }
            }
        }

        return { permissions: Array.from(permissionSet) };
    },
});
