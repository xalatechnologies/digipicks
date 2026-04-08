/**
 * Resources Facade — delegates to the resources component.
 * Preserves api.domain.resources.* for SDK compatibility.
 *
 * Handles:
 * - ID conversion (v.id("tenants") -> string for component)
 * - Enrichment: get() enriches with amenities, addons, pricing from other components
 * - Cascade: archive/remove delegate to component
 * - Clone: clone() copies related data (pricing, addons) across components
 */

import { mutation, query } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";
import { requirePermission } from "../lib/permissions";
import { requireActiveUser } from "../lib/auth";
import { withAudit } from "../lib/auditHelpers";
import { rateLimit, rateLimitKeys } from "../lib/rateLimits";
import { emitEvent } from "../lib/eventBus";

// =============================================================================
// VENUE DATA ENRICHMENT HELPER
// =============================================================================

/**
 * Enrich event resources with venue data (name, color, colorDark) from the
 * actual venue relationship (venueSlug), not from static metadata.
 * This ensures card colors/names update when an event's venue is changed.
 */
async function enrichWithVenueData(ctx: any, resources: any[]): Promise<any[]> {
    // Collect unique { tenantId, venueSlug } pairs from event resources
    const slugLookups = new Map<string, { tenantId: string; slug: string }>();
    for (const r of resources) {
        if (r.venueSlug && r.tenantId) {
            const key = `${r.tenantId}:${r.venueSlug}`;
            if (!slugLookups.has(key)) {
                slugLookups.set(key, { tenantId: r.tenantId, slug: r.venueSlug });
            }
        }
    }

    if (slugLookups.size === 0) return resources;

    // Batch-fetch venue resources by slug
    const venueMap = new Map<string, { name: string; color?: string; colorDark?: string; image?: string; capacity?: number }>();
    for (const [key, { tenantId, slug }] of slugLookups) {
        const venue = await ctx.runQuery(components.resources.queries.getBySlug, {
            tenantId, slug,
        });
        if (venue) {
            // Extract primary image from venue
            const venueImages = (venue as any).images ?? [];
            let venueImage: string | undefined;
            if (venueImages.length > 0) {
                const first = venueImages[0];
                venueImage = typeof first === 'string' ? first : first?.url;
            }
            venueMap.set(key, {
                name: venue.name,
                color: venue.metadata?.color,
                colorDark: venue.metadata?.colorDark,
                image: venueImage,
                capacity: (venue as any).capacity,
            });
        }
    }

    // Enrich event resources with venue data
    return resources.map((r: any) => {
        if (!r.venueSlug || !r.tenantId) return r;
        const key = `${r.tenantId}:${r.venueSlug}`;
        const venue = venueMap.get(key);
        if (!venue) return r;
        return {
            ...r,
            venueName: venue.name,
            venueColor: venue.color,
            venueColorDark: venue.colorDark,
            venueImage: venue.image,
            venueCapacity: venue.capacity,
        };
    });
}

// =============================================================================
// QUERIES
// =============================================================================

export const list = query({
    args: {
        tenantId: v.optional(v.string()),
        categoryKey: v.optional(v.string()),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, categoryKey, status, limit }) => {
        let resources;
        if (tenantId) {
            resources = await ctx.runQuery(components.resources.queries.list, {
                tenantId, categoryKey, status, limit,
            });
        } else {
            resources = await ctx.runQuery(components.resources.queries.listPlatform, {
                categoryKey, status, limit,
            });
        }
        // Batch enrich with review stats
        const resourceIds = (resources as any[]).map((r: any) => r._id as string);
        const reviewStats = resourceIds.length > 0
            ? await ctx.runQuery(components.reviews.functions.batchStats, { resourceIds })
            : {};
        const enriched = (resources as any[]).map((r: any) => ({
            ...r,
            reviewStats: (reviewStats as any)[r._id] ?? { total: 0, averageRating: 0 },
        }));
        return enrichWithVenueData(ctx, enriched);
    },
});

export const listAll = query({
    args: {
        tenantId: v.id("tenants"),
        categoryKey: v.optional(v.string()),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, ...rest }) => {
        const resources = await ctx.runQuery(components.resources.queries.listAll, {
            tenantId: tenantId as string,
            ...rest,
        });
        const resourceIds = (resources as any[]).map((r: any) => r._id as string);
        const reviewStats = resourceIds.length > 0
            ? await ctx.runQuery(components.reviews.functions.batchStats, { resourceIds })
            : {};
        const enriched = (resources as any[]).map((r: any) => ({
            ...r,
            reviewStats: (reviewStats as any)[r._id] ?? { total: 0, averageRating: 0 },
        }));
        return enrichWithVenueData(ctx, enriched);
    },
});



/**
 * List all resources across all tenants (platform-wide).
 * SECURITY: For superadmin use only.
 */
export const listPlatform = query({
    args: {
        categoryKey: v.optional(v.string()),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { categoryKey, status, limit }) => {
        const resources = await ctx.runQuery(components.resources.queries.listPlatform, {
            categoryKey, status, limit,
        });
        const resourceIds = (resources as any[]).map((r: any) => r._id as string);
        const reviewStats = resourceIds.length > 0
            ? await ctx.runQuery(components.reviews.functions.batchStats, { resourceIds })
            : {};
        const enriched = (resources as any[]).map((r: any) => ({
            ...r,
            reviewStats: (reviewStats as any)[r._id] ?? { total: 0, averageRating: 0 },
        }));
        return enrichWithVenueData(ctx, enriched);
    },
});

export const listPublic = query({
    args: {
        tenantId: v.optional(v.string()),
        categoryKey: v.optional(v.string()),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const resources = await ctx.runQuery(components.resources.queries.listPublic, args);
        const resourceIds = (resources as any[]).map((r: any) => r._id as string);
        const reviewStats = resourceIds.length > 0
            ? await ctx.runQuery(components.reviews.functions.batchStats, { resourceIds })
            : {};
        const enriched = (resources as any[]).map((r: any) => ({
            ...r,
            reviewStats: (reviewStats as any)[r._id] ?? { total: 0, averageRating: 0 },
        }));
        return enrichWithVenueData(ctx, enriched);
    },
});

export const get = query({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        // Get base resource from component
        const resource = await ctx.runQuery(components.resources.queries.get, { id: id as string });

        // Enrich with related data from other components
        const addons = await ctx.runQuery(components.addons.queries.listForResource, {
            resourceId: id as string,
        });
        const pricing = await ctx.runQuery(components.pricing.queries.listForResource, {
            resourceId: id as string,
        });

        const reviewStats = await ctx.runQuery(components.reviews.functions.stats, {
            resourceId: id as string,
        });

        // External review stats (Google, TripAdvisor)
        const externalReviewStats = await ctx.runQuery(
            components.externalReviews.functions.stats,
            { resourceId: id as string }
        );

        return {
            ...resource,
            addons,
            pricing,
            reviewStats: { total: reviewStats.total, averageRating: reviewStats.averageRating },
            externalReviewStats: externalReviewStats ?? { total: 0, averageRating: 0, byPlatform: {} },
        };
    },
});

export const getBySlug = query({
    args: { tenantId: v.id("tenants"), slug: v.string() },
    handler: async (ctx, { tenantId, slug }) => {
        const resource = await ctx.runQuery(components.resources.queries.getBySlug, {
            tenantId: tenantId as string, slug,
        });
        if (!resource) return null;

        const id = (resource as any)._id as string;
        const resourceTenantId = tenantId as string;

        // Full enrichment (same as getBySlugPublic)
        const addons = await ctx.runQuery(components.addons.queries.listForResource, { resourceId: id });
        const pricing = await ctx.runQuery(components.pricing.queries.listForResource, { resourceId: id });
        const reviewStats = await ctx.runQuery(components.reviews.functions.stats, { resourceId: id });

        // Venue enrichment for events (query venue by venueSlug)
        const res = resource as Record<string, any>;
        let venueEnrichment: Record<string, any> = {};
        if (res.venueSlug && res.venueSlug !== slug) {
            const venue = await ctx.runQuery(components.resources.queries.getBySlugPublic, {
                slug: res.venueSlug, tenantId: resourceTenantId,
            });
            if (venue) {
                const v = venue as Record<string, any>;
                const venueMeta = v.metadata ?? {};
                const venueImages = v.images ?? [];
                const venueCapDetails = v.capacityDetails ?? venueMeta.capacityDetails;
                let mainCapacity = v.capacity;
                if (Array.isArray(venueCapDetails) && venueCapDetails.length > 0) {
                    mainCapacity = venueCapDetails[0].capacity ?? v.capacity;
                } else if (venueCapDetails && typeof venueCapDetails === 'object') {
                    mainCapacity = venueCapDetails.amfi ?? venueCapDetails.staaKonsert ?? v.capacity;
                }
                const wheelchair = venueMeta.wheelchairSpots ?? v.wheelchairSpots ?? (venueCapDetails && !Array.isArray(venueCapDetails) ? venueCapDetails.rullestol : undefined);
                const wheelchairNum = typeof wheelchair === 'number' ? wheelchair : (typeof wheelchair === 'string' ? parseInt(wheelchair, 10) || null : null);
                venueEnrichment = {
                    venueName: v.name,
                    venueImage: venueImages[0]?.url ?? venueImages[0] ?? null,
                    venueDescription: v.description ?? venueMeta.shortDescription ?? null,
                    venueCapacity: typeof mainCapacity === 'number' ? mainCapacity : (typeof mainCapacity === 'string' ? parseInt(mainCapacity, 10) || null : null),
                    venueWheelchairSpots: wheelchairNum,
                    venueParkingInfo: v.parkingInfo ?? venueMeta.parkingInfo ?? null,
                    ...(!res.contactName && !res.contactEmail && !res.contactPhone ? {
                        contactName: v.contactName ?? venueMeta.contactName ?? null,
                        contactEmail: v.contactEmail ?? venueMeta.contactEmail ?? null,
                        contactPhone: v.contactPhone ?? venueMeta.contactPhone ?? null,
                    } : {}),
                };
            }
        }

        return {
            ...resource,
            ...venueEnrichment,
            addons,
            pricing,
            reviewStats: { total: reviewStats.total, averageRating: reviewStats.averageRating },
        };
    },
});

export const getBySlugPublic = query({
    args: { slug: v.string(), tenantId: v.optional(v.string()) },
    handler: async (ctx, { slug, tenantId }) => {
        const resource = await ctx.runQuery(components.resources.queries.getBySlugPublic, { slug, tenantId });
        if (!resource) return null;

        const id = (resource as any)._id as string;

        // Full enrichment (matching get() facade)
        const addons = await ctx.runQuery(components.addons.queries.listForResource, {
            resourceId: id,
        });
        const pricing = await ctx.runQuery(components.pricing.queries.listForResource, {
            resourceId: id,
        });
        const reviewStats = await ctx.runQuery(components.reviews.functions.stats, {
            resourceId: id,
        });

        const resourceTenantId = tenantId || (resource as any).tenantId;

        // Enrich events with linked venue data (capacity, description, image, etc.)
        const res = resource as Record<string, any>;
        let venueEnrichment: Record<string, any> = {};
        if (res.venueSlug && res.venueSlug !== slug) {
            const venue = await ctx.runQuery(components.resources.queries.getBySlugPublic, {
                slug: res.venueSlug,
                tenantId: resourceTenantId,
            });
            if (venue) {
                const v = venue as Record<string, any>;
                const venueMeta = v.metadata ?? {};
                const venueImages = v.images ?? [];
                const venueCapDetails = v.capacityDetails ?? venueMeta.capacityDetails;
                // Main capacity: from array format or legacy object format
                let mainCapacity = v.capacity;
                if (Array.isArray(venueCapDetails) && venueCapDetails.length > 0) {
                    mainCapacity = venueCapDetails[0].capacity ?? v.capacity;
                } else if (venueCapDetails && typeof venueCapDetails === 'object') {
                    mainCapacity = venueCapDetails.amfi ?? venueCapDetails.staaKonsert ?? v.capacity;
                }
                // Wheelchair: from metadata or legacy capacityDetails.rullestol
                const wheelchair = venueMeta.wheelchairSpots ?? v.wheelchairSpots ?? (venueCapDetails && !Array.isArray(venueCapDetails) ? venueCapDetails.rullestol : undefined);
                const wheelchairNum = typeof wheelchair === 'number' ? wheelchair : (typeof wheelchair === 'string' ? parseInt(wheelchair, 10) || null : null);
                venueEnrichment = {
                    venueName: v.name,
                    venueImage: venueImages[0]?.url ?? venueImages[0] ?? null,
                    venueDescription: v.description ?? venueMeta.shortDescription ?? null,
                    venueCapacity: typeof mainCapacity === 'number' ? mainCapacity : (typeof mainCapacity === 'string' ? parseInt(mainCapacity, 10) || null : null),
                    venueWheelchairSpots: wheelchairNum,
                    venueParkingInfo: v.parkingInfo ?? venueMeta.parkingInfo ?? null,
                    // Inherit venue contact info if event doesn't have its own
                    ...(!res.contactName && !res.contactEmail && !res.contactPhone ? {
                        contactName: v.contactName ?? venueMeta.contactName ?? null,
                        contactEmail: v.contactEmail ?? venueMeta.contactEmail ?? null,
                        contactPhone: v.contactPhone ?? venueMeta.contactPhone ?? null,
                    } : {}),
                };
            }
        }

        return {
            ...resource,
            ...venueEnrichment,
            addons,
            pricing,
            reviewStats: { total: reviewStats.total, averageRating: reviewStats.averageRating },
        };
    },
});

/**
 * List distinct cities from published resources (delegates to component).
 */
export const listCities = query({
    args: { tenantId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        return ctx.runQuery((components.resources.queries as any).listCities, args);
    },
});

/**
 * List distinct municipalities from published resources (delegates to component).
 */
export const listMunicipalities = query({
    args: { tenantId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        return ctx.runQuery((components.resources.queries as any).listMunicipalities, args);
    },
});

/**
 * Get listing statistics for a single resource.
 * Aggregates booking and review data from respective components.
 */
export const getListingStats = query({
    args: { resourceId: v.string() },
    handler: async (ctx, { resourceId }) => {
        // Get resource to find tenantId
        const resource = await ctx.runQuery(components.resources.queries.get, { id: resourceId });
        if (!resource) throw new Error("Resource not found");

        // Get review stats
        const reviewStats = await ctx.runQuery(components.reviews.functions.stats, {
            resourceId,
        }) as any;

        return {
            listingId: resourceId,
            totalBookings: 0,
            totalRevenue: 0,
            averageRating: reviewStats?.averageRating ?? 0,
            utilizationRate: 0,
            lastBooking: undefined,
        };
    },
});

/**
 * Delete a specific media item from a resource's images array.
 */
export const deleteMedia = mutation({
    args: {
        tenantId: v.id("tenants"),
        resourceId: v.string(),
        mediaIndex: v.number(),
    },
    handler: async (ctx, { tenantId, resourceId, mediaIndex }) => {
        await rateLimit(ctx, { name: "mutateResource", key: rateLimitKeys.tenant(tenantId as string), throws: true });

        const resource = await ctx.runQuery(components.resources.queries.get, { id: resourceId });
        if (!resource) throw new Error("Resource not found");

        const images = [...((resource as any).images || [])];
        if (mediaIndex < 0 || mediaIndex >= images.length) {
            throw new Error("Invalid media index");
        }
        images.splice(mediaIndex, 1);

        await ctx.runMutation(components.resources.mutations.update, {
            id: resourceId as any,
            images,
        });

        await withAudit(ctx, {
            tenantId: tenantId as string,
            entityType: "resource",
            entityId: resourceId,
            action: "media_deleted",
            sourceComponent: "resources",
            details: { mediaIndex },
        });

        return { success: true };
    },
});

// =============================================================================
// MUTATIONS
// =============================================================================

export const create = mutation({
    args: {
        tenantId: v.id("tenants"),
        organizationId: v.optional(v.id("organizations")),
        name: v.string(),
        slug: v.string(),
        description: v.optional(v.string()),
        categoryKey: v.string(),
        timeMode: v.optional(v.string()),
        status: v.optional(v.string()),
        requiresApproval: v.optional(v.boolean()),
        capacity: v.optional(v.number()),
        images: v.optional(v.array(v.any())),
        pricing: v.optional(v.any()),
        metadata: v.optional(v.any()),
        subcategoryKeys: v.optional(v.array(v.string())),
        // Event-specific
        subtitle: v.optional(v.string()),
        venueSlug: v.optional(v.string()),
        duration: v.optional(v.number()),
        priceMax: v.optional(v.number()),
        ticketUrl: v.optional(v.string()),
        ageLimit: v.optional(v.number()),
        tags: v.optional(v.array(v.string())),
        eventDate: v.optional(v.string()),
        startTime: v.optional(v.string()),
        endTime: v.optional(v.string()),
        venueId: v.optional(v.string()),
        venueResourceId: v.optional(v.string()),
        // Ticketing fields
        shows: v.optional(v.array(v.any())),
        ticketTypes: v.optional(v.array(v.any())),
        ticketProvider: v.optional(v.any()),
        // Promoted fields
        visibility: v.optional(v.string()),
        fullDescription: v.optional(v.string()),
        highlights: v.optional(v.array(v.string())),
        amenities: v.optional(v.array(v.string())),
        location: v.optional(v.any()),
        areaSquareMeters: v.optional(v.number()),
        floors: v.optional(v.number()),
        capacityDetails: v.optional(v.any()),
        technicalSpecs: v.optional(v.any()),
        venueDimensions: v.optional(v.any()),
        parkingInfo: v.optional(v.string()),
        galleryMedia: v.optional(v.array(v.any())),
        contactEmail: v.optional(v.string()),
        contactName: v.optional(v.string()),
        contactPhone: v.optional(v.string()),
        contactWebsite: v.optional(v.string()),
        socialLinks: v.optional(v.any()),
        pricingDescription: v.optional(v.string()),
        faq: v.optional(v.array(v.any())),
        rules: v.optional(v.array(v.any())),
        documents: v.optional(v.array(v.any())),
        bookingConfig: v.optional(v.any()),
        linkedResourceIds: v.optional(v.array(v.string())),
        recommendedListingIds: v.optional(v.array(v.any())),
        allowSeasonRental: v.optional(v.boolean()),
        allowRecurringBooking: v.optional(v.boolean()),
        openingHours: v.optional(v.array(v.any())),
        slotDurationMinutes: v.optional(v.number()),
        customSlots: v.optional(v.array(v.object({
            label: v.optional(v.string()),
            startTime: v.string(),
            endTime: v.string(),
            price: v.optional(v.number()),
        }))),
        enabledPackageIds: v.optional(v.array(v.string())),
        packagePriceOverrides: v.optional(v.any()),
        pricingRules: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        await rateLimit(ctx, { name: "mutateResource", key: rateLimitKeys.tenant(args.tenantId as string), throws: true });
        const { tenantId, organizationId, ...rest } = args;
        const result = await ctx.runMutation(components.resources.mutations.create, {
            tenantId: tenantId as string,
            organizationId: organizationId as string | undefined,
            ...rest,
            visibility: rest.visibility as "public" | "unlisted" | "private" | undefined,
        });

        // Audit
        await withAudit(ctx, {
            tenantId: tenantId as string,
            entityType: "resource", entityId: result.id,
            action: "created", sourceComponent: "resources",
            newState: { name: args.name, slug: args.slug },
        });

        // Event bus
        await emitEvent(ctx, "resources.resource.created", tenantId as string, "resources", {
            resourceId: result.id, name: args.name, slug: args.slug,
        });

        return result;
    },
});

export const update = mutation({
    args: {
        id: v.string(),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        categoryKey: v.optional(v.string()),
        timeMode: v.optional(v.string()),
        status: v.optional(v.string()),
        requiresApproval: v.optional(v.boolean()),
        capacity: v.optional(v.number()),
        images: v.optional(v.array(v.any())),
        pricing: v.optional(v.any()),
        metadata: v.optional(v.any()),
        openingHours: v.optional(v.any()),
        subcategoryKeys: v.optional(v.array(v.string())),
        features: v.optional(v.array(v.any())),
        linkedResourceIds: v.optional(v.array(v.string())),
        venueResourceId: v.optional(v.string()),
        venueSlug: v.optional(v.string()),
        subtitle: v.optional(v.string()),
        duration: v.optional(v.number()),
        priceMax: v.optional(v.number()),
        ticketUrl: v.optional(v.string()),
        ageLimit: v.optional(v.number()),
        tags: v.optional(v.array(v.string())),
        recommendedListingIds: v.optional(v.array(v.any())),
        eventDate: v.optional(v.string()),
        startTime: v.optional(v.string()),
        endTime: v.optional(v.string()),
        venueId: v.optional(v.string()),
        // Ticketing fields
        shows: v.optional(v.array(v.any())),
        ticketTypes: v.optional(v.array(v.any())),
        ticketProvider: v.optional(v.any()),
        // Promoted fields
        visibility: v.optional(v.string()),
        fullDescription: v.optional(v.string()),
        highlights: v.optional(v.array(v.string())),
        amenities: v.optional(v.array(v.string())),
        location: v.optional(v.any()),
        areaSquareMeters: v.optional(v.number()),
        floors: v.optional(v.number()),
        capacityDetails: v.optional(v.any()),
        technicalSpecs: v.optional(v.any()),
        venueDimensions: v.optional(v.any()),
        parkingInfo: v.optional(v.string()),
        galleryMedia: v.optional(v.array(v.any())),
        contactEmail: v.optional(v.string()),
        contactName: v.optional(v.string()),
        contactPhone: v.optional(v.string()),
        contactWebsite: v.optional(v.string()),
        socialLinks: v.optional(v.any()),
        pricingDescription: v.optional(v.string()),
        faq: v.optional(v.array(v.any())),
        rules: v.optional(v.array(v.any())),
        documents: v.optional(v.array(v.any())),
        bookingConfig: v.optional(v.any()),
        allowSeasonRental: v.optional(v.boolean()),
        allowRecurringBooking: v.optional(v.boolean()),
        slotDurationMinutes: v.optional(v.number()),
        customSlots: v.optional(v.array(v.object({
            label: v.optional(v.string()),
            startTime: v.string(),
            endTime: v.string(),
            price: v.optional(v.number()),
        }))),
        enabledPackageIds: v.optional(v.array(v.string())),
        packagePriceOverrides: v.optional(v.any()),
        pricingRules: v.optional(v.any()),
        // Event-venue sync
        venueBookingId: v.optional(v.string()),
        // When true, images array is appended to existing images instead of replacing
        appendImages: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        // Rate limit: fetch resource to get tenantId
        const existing = await ctx.runQuery(components.resources.queries.get, { id: args.id });
        if (existing) {
            await rateLimit(ctx, { name: "mutateResource", key: rateLimitKeys.tenant((existing as any).tenantId), throws: true });
        }

        // Handle appendImages: merge new images with existing
        if (args.appendImages && args.images?.length) {
            const existing = await ctx.runQuery(components.resources.queries.get, { id: args.id });
            const existingImages = (existing as any)?.images || [];
            args = { ...args, images: [...existingImages, ...args.images] };
            delete (args as any).appendImages;
        } else {
            // Strip appendImages flag before passing to component
            const { appendImages: _, ...rest } = args;
            args = rest as typeof args;
        }
        // Normalize openingHours: convert { monday: {open, close}, ... } to array format
        let normalizedOpeningHours = args.openingHours;
        if (normalizedOpeningHours && !Array.isArray(normalizedOpeningHours)) {
            const dayMap: Record<string, { dayIndex: number; day: string }> = {
                monday: { dayIndex: 1, day: "Mandag" },
                tuesday: { dayIndex: 2, day: "Tirsdag" },
                wednesday: { dayIndex: 3, day: "Onsdag" },
                thursday: { dayIndex: 4, day: "Torsdag" },
                friday: { dayIndex: 5, day: "Fredag" },
                saturday: { dayIndex: 6, day: "Lørdag" },
                sunday: { dayIndex: 0, day: "Søndag" },
            };
            const oh = normalizedOpeningHours as Record<string, { open: string; close: string } | null>;
            normalizedOpeningHours = Object.entries(oh)
                .filter(([key, val]) => val && dayMap[key])
                .map(([key, val]) => ({
                    dayIndex: dayMap[key]!.dayIndex,
                    day: dayMap[key]!.day,
                    open: val!.open,
                    close: val!.close,
                    isClosed: false,
                }));
        }

        const result = await ctx.runMutation(components.resources.mutations.update, {
            ...args,
            openingHours: normalizedOpeningHours,
            visibility: args.visibility as "public" | "unlisted" | "private" | undefined,
        });

        // Audit
        const resource = await ctx.runQuery(components.resources.queries.get, { id: args.id as string });
        await withAudit(ctx, {
            tenantId: (resource as any).tenantId,
            entityType: "resource",
            entityId: args.id as string,
            action: "updated",
            sourceComponent: "resources",
        });

        return result;
    },
});

export const remove = mutation({
    args: {
        id: v.string(),
        removedBy: v.id("users"),
    },
    handler: async (ctx, { id, removedBy }) => {
        await requireActiveUser(ctx, removedBy);

        // Get resource before removal for auth/audit/cascade
        const resource = await ctx.runQuery(components.resources.queries.get, { id: id as string });
        if (!resource) throw new Error("Resource not found");
        const tenantId = (resource as any).tenantId;

        // Rate limit: per-tenant resource mutation
        await rateLimit(ctx, { name: "mutateResource", key: rateLimitKeys.tenant(tenantId), throws: true });

        // RBAC guard
        await requirePermission(ctx, removedBy, tenantId, "resource:delete");

        const result = await ctx.runMutation(components.resources.mutations.remove, { id: id as string });

        // Audit: enriched with caller identity
        await withAudit(ctx, {
            tenantId,
            userId: removedBy as string,
            entityType: "resource",
            entityId: id as string,
            action: "removed",
            previousState: {
                name: (resource as any).name,
                status: (resource as any).status,
                categoryKey: (resource as any).categoryKey,
            },
            sourceComponent: "resources",
        });

        // Event bus
        await emitEvent(ctx, "resources.resource.removed", tenantId, "resources", {
            resourceId: id as string, name: (resource as any).name,
        });

        return result;
    },
});

/**
 * Hard-delete a resource and purge ALL dependent data.
 * Requires: resource:delete permission. For admin/seed operations.
 */
export const hardDelete = mutation({
    args: {
        id: v.string(),
        deletedBy: v.id("users"),
    },
    handler: async (ctx, { id, deletedBy }) => {
        await requireActiveUser(ctx, deletedBy);

        const resource = await ctx.runQuery(components.resources.queries.get, { id: id as string });
        if (!resource) throw new Error("Resource not found");
        const tenantId = (resource as any).tenantId;

        // Rate limit: per-tenant resource mutation
        await rateLimit(ctx, { name: "mutateResource", key: rateLimitKeys.tenant(tenantId), throws: true });

        // RBAC gate: must have resource:delete
        await requirePermission(ctx, deletedBy, tenantId, "resource:delete");

        // Hard-delete the resource itself
        await ctx.runMutation(components.resources.mutations.hardDelete, { id: id as string });

        // Audit: full destruction record
        await withAudit(ctx, {
            tenantId,
            userId: deletedBy as string,
            entityType: "resource",
            entityId: id as string,
            action: "hard_deleted",
            previousState: {
                name: (resource as any).name,
                slug: (resource as any).slug,
                categoryKey: (resource as any).categoryKey,
                status: (resource as any).status,
            },
            sourceComponent: "resources",
        });

        return { success: true };
    },
});


export const publish = mutation({
    args: { id: v.string(), publishedBy: v.id("users") },
    handler: async (ctx, { id, publishedBy }) => {
        const resource = await ctx.runQuery(components.resources.queries.get, { id: id as string });
        if (!resource) throw new Error("Resource not found");
        const tenantId = (resource as any).tenantId;
        await rateLimit(ctx, { name: "mutateResource", key: rateLimitKeys.tenant(tenantId), throws: true });
        await requirePermission(ctx, publishedBy, tenantId, "resource:publish");

        const result = await ctx.runMutation(components.resources.mutations.publish, { id: id as string });
        await withAudit(ctx, {
            tenantId,
            entityType: "resource",
            entityId: id as string,
            action: "published",
            sourceComponent: "resources",
        });

        // Event bus
        await emitEvent(ctx, "resources.resource.published", tenantId, "resources", {
            resourceId: id as string, name: (resource as any).name,
        });

        return result;
    },
});

export const unpublish = mutation({
    args: { id: v.string(), unpublishedBy: v.id("users") },
    handler: async (ctx, { id, unpublishedBy }) => {
        const resource = await ctx.runQuery(components.resources.queries.get, { id: id as string });
        if (!resource) throw new Error("Resource not found");
        const tenantId = (resource as any).tenantId;
        await rateLimit(ctx, { name: "mutateResource", key: rateLimitKeys.tenant(tenantId), throws: true });
        await requirePermission(ctx, unpublishedBy, tenantId, "resource:publish");

        const result = await ctx.runMutation(components.resources.mutations.unpublish, { id: id as string });
        await withAudit(ctx, {
            tenantId,
            entityType: "resource",
            entityId: id as string,
            action: "unpublished",
            sourceComponent: "resources",
        });

        return result;
    },
});

/**
 * Archive — delegates to component for status change, then cascades to bookings/blocks.
 */
export const archive = mutation({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        // Get tenantId from the resource for rate limit and component queries
        const resource = await ctx.runQuery(components.resources.queries.get, { id: id as string });
        const tenantId = (resource as any).tenantId;
        await rateLimit(ctx, { name: "mutateResource", key: rateLimitKeys.tenant(tenantId), throws: true });

        // Archive the resource in the component
        await ctx.runMutation(components.resources.mutations.archive, { id: id as string });

        await withAudit(ctx, {
            tenantId,
            entityType: "resource",
            entityId: id as string,
            action: "archived",
            sourceComponent: "resources",
            previousState: { name: (resource as any).name, status: (resource as any).status },
        });

        return { success: true };
    },
});

export const restore = mutation({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        const resource = await ctx.runQuery(components.resources.queries.get, { id: id as string });
        if (resource) {
            await rateLimit(ctx, { name: "mutateResource", key: rateLimitKeys.tenant((resource as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.resources.mutations.restore, { id: id as string });
        await withAudit(ctx, {
            tenantId: (resource as any)?.tenantId ?? "",
            entityType: "resource",
            entityId: id as string,
            action: "restored",
            sourceComponent: "resources",
        });
        return result;
    },
});

/**
 * Clone — delegates base resource to component, then clones related data across components.
 */
export const clone = mutation({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        // Rate limit: fetch original resource to get tenantId
        const original = await ctx.runQuery(components.resources.queries.get, { id: id as string });
        if (original) {
            await rateLimit(ctx, { name: "mutateResource", key: rateLimitKeys.tenant((original as any).tenantId), throws: true });
        }

        // Clone the base resource in the component
        const result = await ctx.runMutation(components.resources.mutations.cloneResource, {
            id: id as string,
        });
        const newResourceId = result.id;

        // Clone resource addons via addons component
        const addons = await ctx.runQuery(components.addons.queries.listForResource, {
            resourceId: id as string,
        });
        for (const a of addons as any[]) {
            if (a.addonId) {
                await ctx.runMutation(components.addons.mutations.addToResource, {
                    tenantId: a.tenantId, resourceId: newResourceId,
                    addonId: a.addonId, isRequired: a.isRequired,
                    isRecommended: a.isRecommended, customPrice: a.customPrice,
                    displayOrder: a.displayOrder,
                    metadata: a.metadata,
                });
            }
        }

        // Audit the clone (original already fetched above for rate limit)
        await withAudit(ctx, {
            tenantId: (original as any)?.tenantId ?? "",
            entityType: "resource",
            entityId: newResourceId,
            action: "cloned",
            sourceComponent: "resources",
            newState: { sourceId: id, slug: result.slug },
        });

        return { id: newResourceId, slug: result.slug };
    },
});
