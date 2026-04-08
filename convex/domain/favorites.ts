/**
 * Favorites Facade
 *
 * Thin facade delegating to the user-prefs component.
 * Preserves api.domain.favorites.* for SDK compatibility.
 * Enriches favorites with resource data from core tables.
 */

import { mutation, query } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";
import { withAudit } from "../lib/auditHelpers";
import { rateLimit, rateLimitKeys } from "../lib/rateLimits";
import { emitEvent } from "../lib/eventBus";

// =============================================================================
// QUERY FACADES
// =============================================================================

export const list = query({
    args: {
        userId: v.id("users"),
        tags: v.optional(v.array(v.string())),
    },
    handler: async (ctx, { userId, tags }) => {
        const favorites = await ctx.runQuery(
            components.userPrefs.functions.listFavorites,
            { userId: userId as string, tags }
        );

        // Batch fetch resources from resources component
        const resourceIds = [...new Set(favorites.map((f: any) => f.resourceId).filter(Boolean))];
        const resources = await Promise.all(
            resourceIds.map((id: string) =>
                ctx.runQuery(components.resources.queries.get, { id }).catch(() => null)
            )
        );
        const resourceMap = new Map(resources.filter(Boolean).map((r: any) => [r._id, r]));

        const withResources = favorites.map((fav: any) => ({
            ...fav,
            resource: fav.resourceId ? resourceMap.get(fav.resourceId) : null,
        }));

        return withResources.filter((f: any) => f.resource);
    },
});

export const isFavorite = query({
    args: {
        userId: v.id("users"),
        resourceId: v.string(),
    },
    handler: async (ctx, { userId, resourceId }) => {
        return ctx.runQuery(components.userPrefs.functions.isFavorite, {
            userId: userId as string,
            resourceId,
        });
    },
});

// =============================================================================
// MUTATION FACADES
// =============================================================================

export const add = mutation({
    args: {
        tenantId: v.id("tenants"),
        userId: v.id("users"),
        resourceId: v.string(),
        notes: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        await rateLimit(ctx, { name: "mutateFavorite", key: rateLimitKeys.user(args.userId as string), throws: true });
        const result = await ctx.runMutation(components.userPrefs.functions.addFavorite, {
            tenantId: args.tenantId as string,
            userId: args.userId as string,
            resourceId: args.resourceId,
            notes: args.notes,
            tags: args.tags,
            metadata: args.metadata,
        });

        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: args.userId as string,
            entityType: "favorite",
            entityId: args.resourceId,
            action: "favorite_added",
            sourceComponent: "favorites",
        });

        await emitEvent(ctx, "favorites.favorite.added", args.tenantId as string, "favorites", {
            userId: args.userId as string, resourceId: args.resourceId,
        });

        return result;
    },
});

export const update = mutation({
    args: {
        id: v.string(),
        notes: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, { id, ...updates }) => {
        await rateLimit(ctx, { name: "mutateFavorite", key: rateLimitKeys.user("system"), throws: true });
        const result = await ctx.runMutation(components.userPrefs.functions.updateFavorite, {
            id,
            ...updates,
        });
        // tenantId not available in this arg set — audit scoped to entity only
        await withAudit(ctx, {
            tenantId: "system",
            entityType: "favorite",
            entityId: id,
            action: "favorite_updated",
            sourceComponent: "favorites",
        });

        await emitEvent(ctx, "favorites.favorite.updated", (result as any)?.tenantId ?? "system", "favorites", {
            favoriteId: id,
        });

        return result;
    },
});

export const remove = mutation({
    args: {
        userId: v.id("users"),
        resourceId: v.string(),
    },
    handler: async (ctx, { userId, resourceId }) => {
        await rateLimit(ctx, { name: "mutateFavorite", key: rateLimitKeys.user(userId as string), throws: true });
        const result = await ctx.runMutation(components.userPrefs.functions.removeFavorite, {
            userId: userId as string,
            resourceId,
        });

        await withAudit(ctx, {
            tenantId: "system",
            userId: userId as string,
            entityType: "favorite",
            entityId: resourceId,
            action: "favorite_removed",
            sourceComponent: "favorites",
        });

        await emitEvent(ctx, "favorites.favorite.removed", (result as any)?.tenantId ?? "system", "favorites", {
            userId: userId as string, resourceId,
        });

        return result;
    },
});

export const toggle = mutation({
    args: {
        tenantId: v.id("tenants"),
        userId: v.id("users"),
        resourceId: v.string(),
    },
    handler: async (ctx, { tenantId, userId, resourceId }) => {
        await rateLimit(ctx, { name: "mutateFavorite", key: rateLimitKeys.user(userId as string), throws: true });
        const result = await ctx.runMutation(components.userPrefs.functions.toggleFavorite, {
            tenantId: tenantId as string,
            userId: userId as string,
            resourceId,
        });

        await withAudit(ctx, {
            tenantId: tenantId as string,
            userId: userId as string,
            entityType: "favorite",
            entityId: resourceId,
            action: "favorite_toggled",
            sourceComponent: "favorites",
        });

        await emitEvent(ctx, "favorites.favorite.toggled", tenantId as string, "favorites", {
            userId: userId as string, resourceId,
        });

        return result;
    },
});
