import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * User Functions
 * Additional user management queries and mutations
 */

// List users for a tenant
export const list = query({
    args: {
        tenantId: v.id("tenants"),
        status: v.optional(v.string()),
        role: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, status, role, limit }) => {
        let users = await ctx.db
            .query("users")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .collect();

        if (status) {
            users = users.filter((u) => u.status === status);
        }

        if (role) {
            users = users.filter((u) => u.role === role);
        }

        if (limit) {
            users = users.slice(0, limit);
        }

        return users;
    },
});

// Get user by ID
export const get = query({
    args: {
        id: v.id("users"),
    },
    handler: async (ctx, { id }) => {
        const user = await ctx.db.get(id);
        if (!user) return null;

        const tenant = user.tenantId ? await ctx.db.get(user.tenantId) : null;
        const organization = user.organizationId
            ? await ctx.db.get(user.organizationId)
            : null;

        return { ...user, tenant, organization };
    },
});

// Get user by email
export const getByEmail = query({
    args: {
        email: v.string(),
    },
    handler: async (ctx, { email }) => {
        return await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", email))
            .first();
    },
});

// Get current user (by auth ID)
export const me = query({
    args: {
        authUserId: v.string(),
    },
    handler: async (ctx, { authUserId }) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
            .first();

        if (!user) {
            return null;
        }

        // Get tenant and org details
        const tenant = user.tenantId ? await ctx.db.get(user.tenantId) : null;
        const organization = user.organizationId
            ? await ctx.db.get(user.organizationId)
            : null;

        return {
            ...user,
            tenant,
            organization,
        };
    },
});
