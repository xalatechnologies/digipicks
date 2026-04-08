/**
 * External Reviews Component Functions
 *
 * Pure component — stores and queries reviews fetched from Google Places and TripAdvisor.
 * Uses v.string() for all external references (tenantId, resourceId).
 * Sync logic (HTTP calls) lives in the facade layer (Convex actions).
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// QUERIES
// =============================================================================

/**
 * List external reviews, optionally filtered by resource and/or platform.
 */
export const list = query({
    args: {
        tenantId: v.string(),
        resourceId: v.optional(v.string()),
        platform: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, resourceId, platform, limit }) => {
        let reviews;

        if (resourceId) {
            reviews = await ctx.db
                .query("externalReviews")
                .withIndex("by_tenant_resource", (q) =>
                    q.eq("tenantId", tenantId).eq("resourceId", resourceId)
                )
                .collect();
        } else {
            reviews = await ctx.db
                .query("externalReviews")
                .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
                .collect();
        }

        // Filter out suppressed
        reviews = reviews.filter((r) => !r.isSuppressed);

        if (platform) {
            reviews = reviews.filter((r) => r.platform === platform);
        }

        // Sort newest first (by external creation time)
        reviews.sort((a, b) => b.externalCreatedAt - a.externalCreatedAt);

        if (limit) {
            reviews = reviews.slice(0, limit);
        }

        return reviews;
    },
});

/**
 * List external reviews for a resource (convenience wrapper).
 */
export const listForResource = query({
    args: {
        resourceId: v.string(),
        platform: v.optional(v.string()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { resourceId, platform }) => {
        let reviews = await ctx.db
            .query("externalReviews")
            .withIndex("by_resource", (q) => q.eq("resourceId", resourceId))
            .collect();

        reviews = reviews.filter((r) => !r.isSuppressed);

        if (platform) {
            reviews = reviews.filter((r) => r.platform === platform);
        }

        reviews.sort((a, b) => b.externalCreatedAt - a.externalCreatedAt);

        return reviews;
    },
});

/**
 * Get stats for a resource's external reviews (count + average per platform).
 */
export const stats = query({
    args: {
        resourceId: v.string(),
    },
    returns: v.any(),
    handler: async (ctx, { resourceId }) => {
        const reviews = await ctx.db
            .query("externalReviews")
            .withIndex("by_resource", (q) => q.eq("resourceId", resourceId))
            .collect();

        const visible = reviews.filter((r) => !r.isSuppressed);

        const byPlatform: Record<string, { total: number; averageRating: number }> = {};

        for (const r of visible) {
            if (!byPlatform[r.platform]) {
                byPlatform[r.platform] = { total: 0, averageRating: 0 };
            }
            byPlatform[r.platform].total++;
        }

        for (const platform of Object.keys(byPlatform)) {
            const platformReviews = visible.filter((r) => r.platform === platform);
            const sum = platformReviews.reduce((acc, r) => acc + r.rating, 0);
            byPlatform[platform].averageRating =
                platformReviews.length > 0
                    ? Math.round((sum / platformReviews.length) * 10) / 10
                    : 0;
        }

        const total = visible.length;
        const overallAvg =
            total > 0
                ? Math.round(
                      (visible.reduce((acc, r) => acc + r.rating, 0) / total) * 10
                  ) / 10
                : 0;

        return {
            total,
            averageRating: overallAvg,
            byPlatform,
        };
    },
});

/**
 * Batch stats for multiple resources (used by listing cards).
 */
export const batchStats = query({
    args: {
        resourceIds: v.array(v.string()),
    },
    returns: v.any(),
    handler: async (ctx, { resourceIds }) => {
        const result: Record<string, { total: number; averageRating: number }> = {};

        for (const resourceId of resourceIds) {
            const reviews = await ctx.db
                .query("externalReviews")
                .withIndex("by_resource", (q) => q.eq("resourceId", resourceId))
                .collect();

            const visible = reviews.filter((r) => !r.isSuppressed);
            const total = visible.length;
            const averageRating =
                total > 0
                    ? Math.round(
                          (visible.reduce((sum, r) => sum + r.rating, 0) / total) * 10
                      ) / 10
                    : 0;

            result[resourceId] = { total, averageRating };
        }

        return result;
    },
});

/**
 * Get platform config for a tenant (API keys masked on read).
 */
export const getConfig = query({
    args: {
        tenantId: v.string(),
        platform: v.string(),
    },
    returns: v.any(),
    handler: async (ctx, { tenantId, platform }) => {
        const config = await ctx.db
            .query("externalReviewsConfig")
            .withIndex("by_tenant_platform", (q) =>
                q.eq("tenantId", tenantId).eq("platform", platform)
            )
            .first();

        if (!config) return null;

        // Mask API key for reads
        return {
            ...config,
            apiKey: config.apiKey ? "****" + config.apiKey.slice(-4) : undefined,
        };
    },
});

/**
 * Get raw (unmasked) config — used internally by sync action.
 */
export const getConfigRaw = query({
    args: {
        tenantId: v.string(),
        platform: v.string(),
    },
    returns: v.any(),
    handler: async (ctx, { tenantId, platform }) => {
        return ctx.db
            .query("externalReviewsConfig")
            .withIndex("by_tenant_platform", (q) =>
                q.eq("tenantId", tenantId).eq("platform", platform)
            )
            .first();
    },
});

/**
 * List all enabled configs (used by sync cron job).
 */
export const listEnabledConfigs = query({
    args: {},
    returns: v.array(v.any()),
    handler: async (ctx) => {
        const configs = await ctx.db.query("externalReviewsConfig").collect();
        return configs.filter((c) => c.isEnabled);
    },
});

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create or update platform config.
 */
export const upsertConfig = mutation({
    args: {
        tenantId: v.string(),
        platform: v.string(),
        isEnabled: v.boolean(),
        apiKey: v.optional(v.string()),
        placeId: v.optional(v.string()),
        locationId: v.optional(v.string()),
        displayOnListing: v.boolean(),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("externalReviewsConfig")
            .withIndex("by_tenant_platform", (q) =>
                q.eq("tenantId", args.tenantId).eq("platform", args.platform)
            )
            .first();

        if (existing) {
            // Only update apiKey if a non-masked value is provided
            const updates: Record<string, any> = {
                isEnabled: args.isEnabled,
                displayOnListing: args.displayOnListing,
            };
            if (args.placeId !== undefined) updates.placeId = args.placeId;
            if (args.locationId !== undefined) updates.locationId = args.locationId;
            if (args.apiKey && !args.apiKey.startsWith("****")) {
                updates.apiKey = args.apiKey;
            }

            await ctx.db.patch(existing._id, updates);
            return { id: existing._id as string };
        }

        const id = await ctx.db.insert("externalReviewsConfig", {
            tenantId: args.tenantId,
            platform: args.platform,
            isEnabled: args.isEnabled,
            apiKey: args.apiKey,
            placeId: args.placeId,
            locationId: args.locationId,
            displayOnListing: args.displayOnListing,
        });

        return { id: id as string };
    },
});

/**
 * Import a single external review (upsert by platform + externalId).
 */
export const importReview = mutation({
    args: {
        tenantId: v.string(),
        resourceId: v.string(),
        platform: v.string(),
        externalId: v.string(),
        rating: v.number(),
        title: v.optional(v.string()),
        text: v.optional(v.string()),
        authorName: v.string(),
        authorUrl: v.optional(v.string()),
        externalCreatedAt: v.number(),
        externalUrl: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string(), isNew: v.boolean() }),
    handler: async (ctx, args) => {
        // Check for existing by platform + externalId
        const existing = await ctx.db
            .query("externalReviews")
            .withIndex("by_external_id", (q) =>
                q.eq("platform", args.platform).eq("externalId", args.externalId)
            )
            .first();

        if (existing) {
            // Update existing review
            await ctx.db.patch(existing._id, {
                rating: args.rating,
                title: args.title,
                text: args.text,
                authorName: args.authorName,
                authorUrl: args.authorUrl,
                externalUrl: args.externalUrl,
                syncedAt: Date.now(),
                metadata: args.metadata,
            });
            return { id: existing._id as string, isNew: false };
        }

        const id = await ctx.db.insert("externalReviews", {
            tenantId: args.tenantId,
            resourceId: args.resourceId,
            platform: args.platform,
            externalId: args.externalId,
            rating: args.rating,
            title: args.title,
            text: args.text,
            authorName: args.authorName,
            authorUrl: args.authorUrl,
            externalCreatedAt: args.externalCreatedAt,
            syncedAt: Date.now(),
            externalUrl: args.externalUrl,
            metadata: args.metadata,
        });

        return { id: id as string, isNew: true };
    },
});

/**
 * Batch import external reviews.
 */
export const batchImport = mutation({
    args: {
        tenantId: v.string(),
        reviews: v.array(
            v.object({
                resourceId: v.string(),
                platform: v.string(),
                externalId: v.string(),
                rating: v.number(),
                title: v.optional(v.string()),
                text: v.optional(v.string()),
                authorName: v.string(),
                authorUrl: v.optional(v.string()),
                externalCreatedAt: v.number(),
                externalUrl: v.optional(v.string()),
                metadata: v.optional(v.any()),
            })
        ),
    },
    returns: v.object({ imported: v.number(), updated: v.number() }),
    handler: async (ctx, { tenantId, reviews }) => {
        let imported = 0;
        let updated = 0;

        for (const review of reviews) {
            const existing = await ctx.db
                .query("externalReviews")
                .withIndex("by_external_id", (q) =>
                    q.eq("platform", review.platform).eq("externalId", review.externalId)
                )
                .first();

            if (existing) {
                await ctx.db.patch(existing._id, {
                    rating: review.rating,
                    title: review.title,
                    text: review.text,
                    authorName: review.authorName,
                    authorUrl: review.authorUrl,
                    externalUrl: review.externalUrl,
                    syncedAt: Date.now(),
                    metadata: review.metadata,
                });
                updated++;
            } else {
                await ctx.db.insert("externalReviews", {
                    tenantId,
                    resourceId: review.resourceId,
                    platform: review.platform,
                    externalId: review.externalId,
                    rating: review.rating,
                    title: review.title,
                    text: review.text,
                    authorName: review.authorName,
                    authorUrl: review.authorUrl,
                    externalCreatedAt: review.externalCreatedAt,
                    syncedAt: Date.now(),
                    externalUrl: review.externalUrl,
                    metadata: review.metadata,
                });
                imported++;
            }
        }

        return { imported, updated };
    },
});

/**
 * Suppress (admin-hide) an external review.
 */
export const suppress = mutation({
    args: {
        id: v.id("externalReviews"),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        const review = await ctx.db.get(id);
        if (!review) throw new Error("External review not found");

        await ctx.db.patch(id, { isSuppressed: true });
        return { success: true };
    },
});

/**
 * Unsuppress an external review.
 */
export const unsuppress = mutation({
    args: {
        id: v.id("externalReviews"),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        const review = await ctx.db.get(id);
        if (!review) throw new Error("External review not found");

        await ctx.db.patch(id, { isSuppressed: false });
        return { success: true };
    },
});

/**
 * Update sync status on config after a sync run.
 */
export const updateSyncStatus = mutation({
    args: {
        tenantId: v.string(),
        platform: v.string(),
        status: v.string(),
        error: v.optional(v.string()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { tenantId, platform, status, error }) => {
        const config = await ctx.db
            .query("externalReviewsConfig")
            .withIndex("by_tenant_platform", (q) =>
                q.eq("tenantId", tenantId).eq("platform", platform)
            )
            .first();

        if (!config) return { success: false };

        await ctx.db.patch(config._id, {
            lastSyncAt: Date.now(),
            lastSyncStatus: status,
            lastSyncError: error,
        });

        return { success: true };
    },
});
