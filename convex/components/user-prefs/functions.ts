/**
 * User Preferences Component Functions
 *
 * Covers favorites and saved filters.
 * Pure component — operates only on its own tables.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// FAVORITES
// =============================================================================

export const listFavorites = query({
    args: {
        userId: v.string(),
        tags: v.optional(v.array(v.string())),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { userId, tags }) => {
        let favorites = await ctx.db
            .query("favorites")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        if (tags && tags.length > 0) {
            favorites = favorites.filter((f) =>
                tags.some((tag) => f.tags.includes(tag))
            );
        }

        return favorites;
    },
});

export const isFavorite = query({
    args: {
        userId: v.string(),
        resourceId: v.string(),
    },
    returns: v.object({ isFavorite: v.boolean(), favorite: v.any() }),
    handler: async (ctx, { userId, resourceId }) => {
        const favorite = await ctx.db
            .query("favorites")
            .withIndex("by_user_resource", (q) =>
                q.eq("userId", userId).eq("resourceId", resourceId)
            )
            .first();

        return { isFavorite: !!favorite, favorite: favorite ?? null };
    },
});

export const addFavorite = mutation({
    args: {
        tenantId: v.string(),
        userId: v.string(),
        resourceId: v.string(),
        notes: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("favorites")
            .withIndex("by_user_resource", (q) =>
                q.eq("userId", args.userId).eq("resourceId", args.resourceId)
            )
            .first();

        if (existing) {
            throw new Error("Resource already in favorites");
        }

        const id = await ctx.db.insert("favorites", {
            tenantId: args.tenantId,
            userId: args.userId,
            resourceId: args.resourceId,
            notes: args.notes,
            tags: args.tags || [],
            metadata: args.metadata || {},
        });

        return { id: id as string };
    },
});

export const updateFavorite = mutation({
    args: {
        id: v.id("favorites"),
        notes: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, ...updates }) => {
        const favorite = await ctx.db.get(id);
        if (!favorite) {
            throw new Error("Favorite not found");
        }

        const filteredUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );

        await ctx.db.patch(id, filteredUpdates);
        return { success: true };
    },
});

export const removeFavorite = mutation({
    args: {
        userId: v.string(),
        resourceId: v.string(),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { userId, resourceId }) => {
        const favorite = await ctx.db
            .query("favorites")
            .withIndex("by_user_resource", (q) =>
                q.eq("userId", userId).eq("resourceId", resourceId)
            )
            .first();

        if (!favorite) {
            throw new Error("Favorite not found");
        }

        await ctx.db.delete(favorite._id);
        return { success: true };
    },
});

export const toggleFavorite = mutation({
    args: {
        tenantId: v.string(),
        userId: v.string(),
        resourceId: v.string(),
    },
    returns: v.object({ isFavorite: v.boolean() }),
    handler: async (ctx, { tenantId, userId, resourceId }) => {
        const existing = await ctx.db
            .query("favorites")
            .withIndex("by_user_resource", (q) =>
                q.eq("userId", userId).eq("resourceId", resourceId)
            )
            .first();

        if (existing) {
            await ctx.db.delete(existing._id);
            return { isFavorite: false };
        } else {
            await ctx.db.insert("favorites", {
                tenantId,
                userId,
                resourceId,
                tags: [],
                metadata: {},
            });
            return { isFavorite: true };
        }
    },
});

// =============================================================================
// SAVED FILTERS
// =============================================================================

export const listFilters = query({
    args: {
        userId: v.string(),
        type: v.optional(v.string()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { userId, type }) => {
        let filters = await ctx.db
            .query("savedFilters")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        if (type) {
            filters = filters.filter((f) => f.type === type);
        }

        return filters;
    },
});

export const createFilter = mutation({
    args: {
        tenantId: v.string(),
        userId: v.string(),
        name: v.string(),
        type: v.string(),
        filters: v.any(),
        isDefault: v.optional(v.boolean()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("savedFilters", {
            tenantId: args.tenantId,
            userId: args.userId,
            name: args.name,
            type: args.type,
            filters: args.filters,
            isDefault: args.isDefault,
        });

        return { id: id as string };
    },
});

export const updateFilter = mutation({
    args: {
        id: v.id("savedFilters"),
        name: v.optional(v.string()),
        filters: v.optional(v.any()),
        isDefault: v.optional(v.boolean()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, ...updates }) => {
        const filter = await ctx.db.get(id);
        if (!filter) {
            throw new Error("Filter not found");
        }

        const filteredUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );

        await ctx.db.patch(id, filteredUpdates);
        return { success: true };
    },
});

export const removeFilter = mutation({
    args: {
        id: v.id("savedFilters"),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        await ctx.db.delete(id);
        return { success: true };
    },
});

// =============================================================================
// IMPORT FUNCTIONS (data migration)
// =============================================================================

/**
 * Import a favorite record from the legacy table.
 * Used during data migration.
 */
export const importFavorite = mutation({
    args: {
        tenantId: v.string(),
        userId: v.string(),
        resourceId: v.string(),
        notes: v.optional(v.string()),
        tags: v.array(v.string()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("favorites", { ...args, metadata: args.metadata ?? {} });
        return { id: id as string };
    },
});

/**
 * Import a saved filter record from the legacy table.
 * Used during data migration.
 */
export const importSavedFilter = mutation({
    args: {
        tenantId: v.string(),
        userId: v.string(),
        name: v.string(),
        type: v.string(),
        filters: v.optional(v.any()),
        isDefault: v.optional(v.boolean()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("savedFilters", { ...args, filters: args.filters ?? {} });
        return { id: id as string };
    },
});
