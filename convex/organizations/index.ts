import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Organization Functions
 * Full CRUD operations for organization management within tenants.
 */

// List organizations for a tenant
export const list = query({
    args: {
        tenantId: v.id("tenants"),
        status: v.optional(v.string()),
        parentId: v.optional(v.id("organizations")),
    },
    handler: async (ctx, { tenantId, status, parentId }) => {
        let orgs = await ctx.db
            .query("organizations")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .collect();

        if (status) {
            orgs = orgs.filter((o) => o.status === status);
        }

        if (parentId !== undefined) {
            orgs = orgs.filter((o) => o.parentId === parentId);
        }

        return orgs;
    },
});

// Get organization by ID
export const get = query({
    args: {
        id: v.id("organizations"),
    },
    handler: async (ctx, { id }) => {
        const org = await ctx.db.get(id);
        if (!org) {
            throw new Error("Organization not found");
        }

        // Get parent if exists
        const parent = org.parentId ? await ctx.db.get(org.parentId) : null;

        // Get children
        const children = await ctx.db
            .query("organizations")
            .withIndex("by_parent", (q) => q.eq("parentId", id))
            .collect();

        return {
            ...org,
            parent,
            children,
        };
    },
});

// Get organization by slug
export const getBySlug = query({
    args: {
        tenantId: v.id("tenants"),
        slug: v.string(),
    },
    handler: async (ctx, { tenantId, slug }) => {
        return await ctx.db
            .query("organizations")
            .withIndex("by_slug", (q) => q.eq("tenantId", tenantId).eq("slug", slug))
            .first();
    },
});

// Create organization
export const create = mutation({
    args: {
        tenantId: v.id("tenants"),
        name: v.string(),
        slug: v.string(),
        description: v.optional(v.string()),
        type: v.string(),
        parentId: v.optional(v.id("organizations")),
        settings: v.optional(v.any()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        // Check slug uniqueness within tenant
        const existing = await ctx.db
            .query("organizations")
            .withIndex("by_slug", (q) =>
                q.eq("tenantId", args.tenantId).eq("slug", args.slug)
            )
            .first();

        if (existing) {
            throw new Error(`Organization with slug "${args.slug}" already exists`);
        }

        // Verify parent exists if provided
        if (args.parentId) {
            const parent = await ctx.db.get(args.parentId);
            if (!parent || parent.tenantId !== args.tenantId) {
                throw new Error("Parent organization not found");
            }
        }

        const orgId = await ctx.db.insert("organizations", {
            tenantId: args.tenantId,
            name: args.name,
            slug: args.slug,
            description: args.description,
            type: args.type,
            parentId: args.parentId,
            settings: args.settings || {},
            metadata: args.metadata || {},
            status: "active",
        });

        return { id: orgId };
    },
});

// Update organization
export const update = mutation({
    args: {
        id: v.id("organizations"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        type: v.optional(v.string()),
        parentId: v.optional(v.id("organizations")),
        settings: v.optional(v.any()),
        metadata: v.optional(v.any()),
        status: v.optional(v.string()),
    },
    handler: async (ctx, { id, ...updates }) => {
        const org = await ctx.db.get(id);
        if (!org) {
            throw new Error("Organization not found");
        }

        // Prevent circular parent reference
        if (updates.parentId === id) {
            throw new Error("Organization cannot be its own parent");
        }

        const filteredUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );

        await ctx.db.patch(id, filteredUpdates);

        return { success: true };
    },
});

// Delete organization (soft delete)
export const remove = mutation({
    args: {
        id: v.id("organizations"),
    },
    handler: async (ctx, { id }) => {
        const org = await ctx.db.get(id);
        if (!org) {
            throw new Error("Organization not found");
        }

        // Check for children
        const children = await ctx.db
            .query("organizations")
            .withIndex("by_parent", (q) => q.eq("parentId", id))
            .first();

        if (children) {
            throw new Error("Cannot delete organization with children");
        }

        await ctx.db.patch(id, {
            status: "deleted",
            deletedAt: Date.now(),
        });

        return { success: true };
    },
});

// List members of an organization
export const listMembers = query({
    args: {
        organizationId: v.id("organizations"),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { organizationId, status, limit }) => {
        let users = await ctx.db
            .query("users")
            .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
            .collect();

        // Filter out deleted users by default
        users = users.filter((u) => u.status !== "deleted");

        if (status) {
            users = users.filter((u) => u.status === status);
        }

        if (limit) {
            users = users.slice(0, limit);
        }

        return users;
    },
});

// Get organization tree (hierarchical structure)
export const getTree = query({
    args: {
        tenantId: v.id("tenants"),
    },
    handler: async (ctx, { tenantId }) => {
        const allOrgs = await ctx.db
            .query("organizations")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .filter((q) => q.neq(q.field("status"), "deleted"))
            .collect();

        // Build tree structure
        const orgMap = new Map(allOrgs.map((o) => [o._id, { ...o, children: [] as typeof allOrgs }]));

        const roots: (typeof allOrgs[0] & { children: typeof allOrgs })[] = [];

        for (const org of orgMap.values()) {
            if (org.parentId && orgMap.has(org.parentId)) {
                orgMap.get(org.parentId)!.children.push(org);
            } else {
                roots.push(org);
            }
        }

        return roots;
    },
});
