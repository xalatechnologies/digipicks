/**
 * External Reviews Facade
 *
 * Thin facade delegating to the external-reviews component.
 * Preserves api.domain.externalReviews.* for SDK compatibility.
 * Handles:
 *   - ID type conversion (typed Id<"tenants"> -> string)
 *   - Data enrichment (resource names from resources component)
 *   - Audit logging
 *   - External API sync (Google Places, TripAdvisor) via actions
 */

import { action, mutation, query, internalAction } from "../_generated/server";
import { api, components } from "../_generated/api";
import { v } from "convex/values";
import { withAudit } from "../lib/auditHelpers";

// =============================================================================
// QUERIES
// =============================================================================

/**
 * List external reviews for a tenant, optionally filtered by resource/platform.
 */
export const list = query({
    args: {
        tenantId: v.id("tenants"),
        resourceId: v.optional(v.string()),
        platform: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, resourceId, platform, limit }) => {
        const reviews = await ctx.runQuery(
            components.externalReviews.functions.list,
            {
                tenantId: tenantId as string,
                resourceId,
                platform,
                limit,
            }
        );

        // Enrich with resource names
        const resourceIds = [
            ...new Set(
                (reviews as any[]).map((r: any) => r.resourceId).filter(Boolean)
            ),
        ];
        const resourceMap = new Map<string, string>();
        for (const rid of resourceIds) {
            const resource = await ctx
                .runQuery(components.resources.queries.get, { id: rid })
                .catch(() => null);
            if (resource) {
                resourceMap.set(rid, (resource as any).name);
            }
        }

        return (reviews as any[]).map((r: any) => ({
            ...r,
            resourceName: resourceMap.get(r.resourceId),
        }));
    },
});

/**
 * Get external review stats for a resource.
 */
export const stats = query({
    args: {
        resourceId: v.string(),
    },
    handler: async (ctx, { resourceId }) => {
        return ctx.runQuery(components.externalReviews.functions.stats, {
            resourceId,
        });
    },
});

/**
 * Get platform config (masked API keys).
 */
export const getConfig = query({
    args: {
        tenantId: v.id("tenants"),
        platform: v.string(),
    },
    handler: async (ctx, { tenantId, platform }) => {
        return ctx.runQuery(
            components.externalReviews.functions.getConfig,
            {
                tenantId: tenantId as string,
                platform,
            }
        );
    },
});

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Save platform config + audit.
 */
export const saveConfig = mutation({
    args: {
        tenantId: v.id("tenants"),
        platform: v.string(),
        isEnabled: v.boolean(),
        apiKey: v.optional(v.string()),
        placeId: v.optional(v.string()),
        locationId: v.optional(v.string()),
        displayOnListing: v.boolean(),
    },
    handler: async (ctx, args) => {
        const result = await ctx.runMutation(
            components.externalReviews.functions.upsertConfig,
            {
                tenantId: args.tenantId as string,
                platform: args.platform,
                isEnabled: args.isEnabled,
                apiKey: args.apiKey,
                placeId: args.placeId,
                locationId: args.locationId,
                displayOnListing: args.displayOnListing,
            }
        );

        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            entityType: "externalReviewsConfig",
            entityId: result.id,
            action: "upserted",
            newState: {
                platform: args.platform,
                isEnabled: args.isEnabled,
                displayOnListing: args.displayOnListing,
            },
            sourceComponent: "external-reviews",
        });

        return result;
    },
});

/**
 * Suppress an external review + audit.
 */
export const suppress = mutation({
    args: {
        tenantId: v.id("tenants"),
        id: v.string(),
    },
    handler: async (ctx, { tenantId, id }) => {
        const result = await ctx.runMutation(
            components.externalReviews.functions.suppress,
            { id }
        );

        await withAudit(ctx, {
            tenantId: tenantId as string,
            entityType: "externalReview",
            entityId: id,
            action: "suppressed",
            sourceComponent: "external-reviews",
        });

        return result;
    },
});

/**
 * Unsuppress an external review + audit.
 */
export const unsuppress = mutation({
    args: {
        tenantId: v.id("tenants"),
        id: v.string(),
    },
    handler: async (ctx, { tenantId, id }) => {
        const result = await ctx.runMutation(
            components.externalReviews.functions.unsuppress,
            { id }
        );

        await withAudit(ctx, {
            tenantId: tenantId as string,
            entityType: "externalReview",
            entityId: id,
            action: "unsuppressed",
            sourceComponent: "external-reviews",
        });

        return result;
    },
});

// =============================================================================
// ACTIONS — External API Sync
// =============================================================================

/**
 * Sync reviews from a single platform for a tenant.
 * Makes HTTP calls to Google Places or TripAdvisor API.
 */
export const syncPlatform = action({
    args: {
        tenantId: v.id("tenants"),
        platform: v.string(),
        resourceId: v.optional(v.string()),
    },
    handler: async (ctx, { tenantId, platform, resourceId }) => {
        // Get raw (unmasked) config
        const config = await ctx.runQuery(
            components.externalReviews.functions.getConfigRaw,
            { tenantId: tenantId as string, platform }
        );

        if (!config || !config.isEnabled) {
            throw new Error(`External reviews not enabled for platform: ${platform}`);
        }

        // Determine target resource(s)
        // If resourceId is provided, sync just that resource. Otherwise, sync
        // the default configured location (placeId/locationId applies globally).
        // For now, we'll use the placeId/locationId from config.

        let reviews: Array<{
            resourceId: string;
            platform: string;
            externalId: string;
            rating: number;
            title?: string;
            text?: string;
            authorName: string;
            authorUrl?: string;
            externalCreatedAt: number;
            externalUrl?: string;
            metadata?: any;
        }> = [];

        const targetResourceId = resourceId || config.placeId || config.locationId || "";

        if (platform === "google_places") {
            reviews = await fetchGooglePlacesReviews(
                config.apiKey,
                config.placeId,
                targetResourceId
            );
        } else if (platform === "tripadvisor") {
            reviews = await fetchTripAdvisorReviews(
                config.apiKey,
                config.locationId,
                targetResourceId
            );
        }

        // Batch import
        let result = { imported: 0, updated: 0 };
        if (reviews.length > 0) {
            result = await ctx.runMutation(
                components.externalReviews.functions.batchImport,
                { tenantId: tenantId as string, reviews }
            );
        }

        // Update sync status
        await ctx.runMutation(
            components.externalReviews.functions.updateSyncStatus,
            {
                tenantId: tenantId as string,
                platform,
                status: "success",
            }
        );

        return {
            platform,
            imported: result.imported,
            updated: result.updated,
            total: reviews.length,
        };
    },
});

/**
 * Internal action: sync all enabled tenants (called by cron).
 */
export const syncAllTenants = internalAction({
    args: {},
    handler: async (ctx) => {
        const configs = await ctx.runQuery(
            components.externalReviews.functions.listEnabledConfigs,
            {}
        );

        for (const config of configs as any[]) {
            try {
                await ctx.runAction(
                    api.domain.externalReviews.syncPlatform,
                    {
                        tenantId: config.tenantId,
                        platform: config.platform,
                    }
                );
            } catch (e) {
                // Update sync status with error
                await ctx.runMutation(
                    components.externalReviews.functions.updateSyncStatus,
                    {
                        tenantId: config.tenantId,
                        platform: config.platform,
                        status: "failed",
                        error: e instanceof Error ? e.message : "Unknown error",
                    }
                );
            }
        }
    },
});

// =============================================================================
// PLATFORM API HELPERS
// =============================================================================

/**
 * Fetch reviews from Google Places API (New) v1.
 * Returns up to 5 reviews (API limit).
 */
async function fetchGooglePlacesReviews(
    apiKey: string | undefined,
    placeId: string | undefined,
    resourceId: string
): Promise<any[]> {
    if (!apiKey || !placeId) return [];

    const url = `https://places.googleapis.com/v1/places/${placeId}?fields=reviews&key=${apiKey}`;
    const response = await fetch(url, {
        headers: { "X-Goog-FieldMask": "reviews" },
    });

    if (!response.ok) {
        throw new Error(
            `Google Places API error: ${response.status} ${response.statusText}`
        );
    }

    const data = await response.json();
    const googleReviews = data.reviews || [];

    return googleReviews.map((r: any) => ({
        resourceId,
        platform: "google_places",
        externalId: r.name || `gp-${Date.parse(r.publishTime || "0")}`,
        rating: r.rating || 0,
        text: r.text?.text || r.originalText?.text,
        authorName:
            r.authorAttribution?.displayName || "Google User",
        authorUrl: r.authorAttribution?.uri,
        externalCreatedAt: r.publishTime
            ? Date.parse(r.publishTime)
            : Date.now(),
        externalUrl: r.googleMapsUri,
        metadata: {
            language: r.text?.languageCode || r.originalText?.languageCode,
            relativePublishTimeDescription: r.relativePublishTimeDescription,
        },
    }));
}

/**
 * Fetch reviews from TripAdvisor Content API v1.
 */
async function fetchTripAdvisorReviews(
    apiKey: string | undefined,
    locationId: string | undefined,
    resourceId: string
): Promise<any[]> {
    if (!apiKey || !locationId) return [];

    const url = `https://api.content.tripadvisor.com/api/v1/location/${locationId}/reviews?key=${apiKey}&language=no`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `TripAdvisor API error: ${response.status} ${response.statusText}`
        );
    }

    const data = await response.json();
    const taReviews = data.data || [];

    return taReviews.map((r: any) => ({
        resourceId,
        platform: "tripadvisor",
        externalId: String(r.id),
        rating: r.rating || 0,
        title: r.title,
        text: r.text,
        authorName: r.user?.username || "TripAdvisor User",
        authorUrl: r.user?.user_location?.id
            ? `https://www.tripadvisor.com/Profile/${r.user.username}`
            : undefined,
        externalCreatedAt: r.published_date
            ? Date.parse(r.published_date)
            : Date.now(),
        externalUrl: r.url,
        metadata: {
            language: r.lang,
            tripType: r.trip_type,
            travelDate: r.travel_date,
        },
    }));
}
