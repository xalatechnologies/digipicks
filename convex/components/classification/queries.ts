/**
 * Classification Component — Query Functions
 *
 * Read-only operations for categories, tags, and attribute definitions.
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// CATEGORY QUERIES
// =============================================================================

export const listCategories = query({
    args: {
        tenantId: v.string(),
        parentId: v.optional(v.id("categories")),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, parentId }) => {
        if (parentId !== undefined) {
            return ctx.db
                .query("categories")
                .withIndex("by_tenant_parent", (q) =>
                    q.eq("tenantId", tenantId).eq("parentId", parentId)
                )
                .collect();
        }

        // Return root categories (parentId undefined)
        const all = await ctx.db
            .query("categories")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .collect();

        return all.filter((c) => c.parentId === undefined);
    },
});

export const getCategoryById = query({
    args: { id: v.id("categories") },
    returns: v.any(),
    handler: async (ctx, { id }) => {
        return await ctx.db.get(id);
    },
});

export const getCategory = query({
    args: {
        tenantId: v.string(),
        slug: v.string(),
    },
    returns: v.any(),
    handler: async (ctx, { tenantId, slug }) => {
        return await ctx.db
            .query("categories")
            .withIndex("by_tenant_slug", (q) =>
                q.eq("tenantId", tenantId).eq("slug", slug)
            )
            .unique();
    },
});

export const getCategoryTree = query({
    args: { tenantId: v.string() },
    returns: v.any(),
    handler: async (ctx, { tenantId }) => {
        const all = await ctx.db
            .query("categories")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .collect();

        // Build a lookup map by _id
        const byId = new Map<string, any>();
        for (const cat of all) {
            byId.set(cat._id as string, { ...cat, children: [] });
        }

        // Assemble tree
        const roots: any[] = [];
        for (const node of byId.values()) {
            if (node.parentId && byId.has(node.parentId as string)) {
                byId.get(node.parentId as string).children.push(node);
            } else {
                roots.push(node);
            }
        }

        return roots;
    },
});

// =============================================================================
// TAG QUERIES
// =============================================================================

export const listTags = query({
    args: { tenantId: v.string() },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId }) => {
        return ctx.db
            .query("tags")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .collect();
    },
});

export const getTag = query({
    args: {
        tenantId: v.string(),
        slug: v.string(),
    },
    returns: v.any(),
    handler: async (ctx, { tenantId, slug }) => {
        return await ctx.db
            .query("tags")
            .withIndex("by_tenant_slug", (q) =>
                q.eq("tenantId", tenantId).eq("slug", slug)
            )
            .unique();
    },
});

// =============================================================================
// ATTRIBUTE DEFINITION QUERIES
// =============================================================================

export const listAttributeDefinitions = query({
    args: {
        tenantId: v.string(),
        categoryId: v.optional(v.id("categories")),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, categoryId }) => {
        if (categoryId !== undefined) {
            return ctx.db
                .query("attributeDefinitions")
                .withIndex("by_category", (q) => q.eq("categoryId", categoryId))
                .collect();
        }

        return ctx.db
            .query("attributeDefinitions")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .collect();
    },
});

export const getAttributeDefinition = query({
    args: {
        tenantId: v.string(),
        key: v.string(),
    },
    returns: v.any(),
    handler: async (ctx, { tenantId, key }) => {
        return await ctx.db
            .query("attributeDefinitions")
            .withIndex("by_tenant_key", (q) =>
                q.eq("tenantId", tenantId).eq("key", key)
            )
            .unique();
    },
});
