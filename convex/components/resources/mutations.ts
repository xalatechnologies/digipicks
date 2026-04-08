/**
 * Resources Component — Mutation Functions
 *
 * Write operations for resources including CRUD, lifecycle, and import.
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Valid status transitions (state machine)
const VALID_TRANSITIONS: Record<string, string[]> = {
    draft: ["published", "scheduled", "archived", "deleted"],
    scheduled: ["draft", "published", "archived", "deleted"],
    published: ["draft", "archived", "deleted"],
    archived: ["draft", "published", "scheduled"],
    deleted: [],
};

function validateStatusTransition(currentStatus: string, targetStatus: string): void {
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed) throw new Error(`Unknown resource status: "${currentStatus}"`);
    if (!allowed.includes(targetStatus)) {
        throw new Error(`Invalid status transition: "${currentStatus}" → "${targetStatus}". Allowed: [${allowed.join(", ")}]`);
    }
}

// =============================================================================
// MUTATIONS
// =============================================================================

export const create = mutation({
    args: {
        tenantId: v.string(),
        organizationId: v.optional(v.string()),
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
        // Event/venue-specific top-level fields
        subtitle: v.optional(v.string()),
        venueSlug: v.optional(v.string()),
        duration: v.optional(v.number()),
        priceMax: v.optional(v.number()),
        ticketUrl: v.optional(v.string()),
        ageLimit: v.optional(v.number()),
        tags: v.optional(v.array(v.string())),
        // Promoted fields (matching schema)
        visibility: v.optional(v.union(v.literal("public"), v.literal("unlisted"), v.literal("private"))),
        fullDescription: v.optional(v.string()),
        highlights: v.optional(v.array(v.string())),
        amenities: v.optional(v.array(v.string())),
        location: v.optional(v.object({
            address: v.optional(v.string()),
            city: v.optional(v.string()),
            postalCode: v.optional(v.string()),
            municipality: v.optional(v.string()),
            country: v.optional(v.string()),
            lat: v.optional(v.number()),
            lng: v.optional(v.number()),
        })),
        areaSquareMeters: v.optional(v.number()),
        floors: v.optional(v.number()),
        capacityDetails: v.optional(v.any()),
        technicalSpecs: v.optional(v.object({
            audio: v.optional(v.string()),
            lighting: v.optional(v.string()),
            backline: v.optional(v.string()),
            haze: v.optional(v.string()),
            other: v.optional(v.string()),
        })),
        venueDimensions: v.optional(v.object({
            stageWidth: v.optional(v.number()),
            stageOpening: v.optional(v.number()),
            stageDepth: v.optional(v.number()),
            depthToBackdrop: v.optional(v.number()),
            ceilingHeight: v.optional(v.number()),
            riggingBars: v.optional(v.number()),
        })),
        parkingInfo: v.optional(v.string()),
        galleryMedia: v.optional(v.array(v.any())),
        contactEmail: v.optional(v.string()),
        contactName: v.optional(v.string()),
        contactPhone: v.optional(v.string()),
        contactWebsite: v.optional(v.string()),
        socialLinks: v.optional(v.object({
            facebook: v.optional(v.string()),
            instagram: v.optional(v.string()),
            twitter: v.optional(v.string()),
            linkedin: v.optional(v.string()),
            youtube: v.optional(v.string()),
            tiktok: v.optional(v.string()),
        })),
        pricingDescription: v.optional(v.string()),
        faq: v.optional(v.array(v.object({
            question: v.string(),
            answer: v.string(),
        }))),
        rules: v.optional(v.array(v.object({
            title: v.string(),
            description: v.optional(v.string()),
            type: v.optional(v.string()),
        }))),
        documents: v.optional(v.array(v.object({
            name: v.string(),
            url: v.string(),
            type: v.optional(v.string()),
            size: v.optional(v.number()),
            description: v.optional(v.string()),
        }))),
        bookingConfig: v.optional(v.object({
            bookingModel: v.optional(v.string()),
            slotDurationMinutes: v.optional(v.number()),
            minLeadTimeHours: v.optional(v.number()),
            maxAdvanceDays: v.optional(v.number()),
            bufferBeforeMinutes: v.optional(v.number()),
            bufferAfterMinutes: v.optional(v.number()),
            approvalRequired: v.optional(v.boolean()),
            paymentRequired: v.optional(v.boolean()),
            depositPercent: v.optional(v.number()),
            cancellationPolicy: v.optional(v.string()),
            allowRecurring: v.optional(v.boolean()),
            allowSeasonalLease: v.optional(v.boolean()),
        })),
        // Event-specific fields already in schema
        eventDate: v.optional(v.string()),
        startTime: v.optional(v.string()),
        endTime: v.optional(v.string()),
        venueId: v.optional(v.string()),
        linkedResourceIds: v.optional(v.array(v.string())),
        recommendedListingIds: v.optional(v.array(v.id("resources"))),
        allowSeasonRental: v.optional(v.boolean()),
        allowRecurringBooking: v.optional(v.boolean()),
        openingHours: v.optional(v.array(v.object({
            dayIndex: v.number(),
            day: v.string(),
            open: v.string(),
            close: v.string(),
            isClosed: v.optional(v.boolean()),
        }))),
        openingHoursExceptions: v.optional(v.array(v.object({
            date: v.string(),
            closed: v.optional(v.boolean()),
            open: v.optional(v.string()),
            close: v.optional(v.string()),
            reason: v.optional(v.string()),
        }))),
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
        // Ticketing fields
        shows: v.optional(v.array(v.any())),
        ticketTypes: v.optional(v.array(v.any())),
        ticketProvider: v.optional(v.any()),
        // Scheduled publishing
        publishAt: v.optional(v.number()),
        unpublishAt: v.optional(v.number()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const existing = await ctx.db.query("resources")
            .withIndex("by_slug", (q) => q.eq("tenantId", args.tenantId).eq("slug", args.slug))
            .first();

        const { tenantId, name, slug, description, categoryKey, timeMode, status, requiresApproval, capacity, images, pricing, metadata, ...rest } = args;

        // Upsert: update existing resource or create new one
        if (existing) {
            // Deep-merge metadata to preserve fields not sent by the caller
            const mergedMetadata = metadata
                ? { ...(existing.metadata as Record<string, unknown> || {}), ...(metadata as Record<string, unknown>) }
                : existing.metadata;
            const updates = Object.fromEntries(
                Object.entries({
                    name, description, categoryKey,
                    ...(timeMode ? { timeMode } : {}),
                    ...(status ? { status } : {}),
                    requiresApproval: requiresApproval || false,
                    ...(capacity !== undefined ? { capacity, inventoryTotal: capacity } : {}),
                    ...(images ? { images } : {}),
                    ...(pricing ? { pricing } : {}),
                    metadata: mergedMetadata,
                    ...rest,
                }).filter(([_, v]) => v !== undefined)
            );
            await ctx.db.patch(existing._id, updates);
            return { id: existing._id as string };
        }

        const id = await ctx.db.insert("resources", {
            tenantId, name, slug, description, categoryKey,
            timeMode: timeMode || "PERIOD",
            features: [],
            status: status || "draft",
            requiresApproval: requiresApproval || false,
            capacity,
            inventoryTotal: capacity,
            images: images || [],
            pricing: pricing || {},
            metadata: metadata || {},
            ...rest,
        });
        return { id: id as string };
    },
});

export const update = mutation({
    args: {
        id: v.id("resources"),
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
        openingHoursExceptions: v.optional(v.array(v.object({
            date: v.string(),
            closed: v.optional(v.boolean()),
            open: v.optional(v.string()),
            close: v.optional(v.string()),
            reason: v.optional(v.string()),
        }))),
        subcategoryKeys: v.optional(v.array(v.string())),
        features: v.optional(v.array(v.any())),
        linkedResourceIds: v.optional(v.array(v.string())),
        venueResourceId: v.optional(v.string()),
        venueSlug: v.optional(v.string()),
        // Arrangement-specific fields
        subtitle: v.optional(v.string()),
        duration: v.optional(v.number()),
        priceMax: v.optional(v.number()),
        ticketUrl: v.optional(v.string()),
        ageLimit: v.optional(v.number()),
        tags: v.optional(v.array(v.string())),
        recommendedListingIds: v.optional(v.array(v.id("resources"))),
        // Promoted fields (matching schema)
        visibility: v.optional(v.union(v.literal("public"), v.literal("unlisted"), v.literal("private"))),
        fullDescription: v.optional(v.string()),
        highlights: v.optional(v.array(v.string())),
        amenities: v.optional(v.array(v.string())),
        location: v.optional(v.object({
            address: v.optional(v.string()),
            city: v.optional(v.string()),
            postalCode: v.optional(v.string()),
            municipality: v.optional(v.string()),
            country: v.optional(v.string()),
            lat: v.optional(v.number()),
            lng: v.optional(v.number()),
        })),
        areaSquareMeters: v.optional(v.number()),
        floors: v.optional(v.number()),
        capacityDetails: v.optional(v.any()),
        technicalSpecs: v.optional(v.object({
            audio: v.optional(v.string()),
            lighting: v.optional(v.string()),
            backline: v.optional(v.string()),
            haze: v.optional(v.string()),
            other: v.optional(v.string()),
        })),
        venueDimensions: v.optional(v.object({
            stageWidth: v.optional(v.number()),
            stageOpening: v.optional(v.number()),
            stageDepth: v.optional(v.number()),
            depthToBackdrop: v.optional(v.number()),
            ceilingHeight: v.optional(v.number()),
            riggingBars: v.optional(v.number()),
        })),
        parkingInfo: v.optional(v.string()),
        galleryMedia: v.optional(v.array(v.any())),
        contactEmail: v.optional(v.string()),
        contactName: v.optional(v.string()),
        contactPhone: v.optional(v.string()),
        contactWebsite: v.optional(v.string()),
        socialLinks: v.optional(v.object({
            facebook: v.optional(v.string()),
            instagram: v.optional(v.string()),
            twitter: v.optional(v.string()),
            linkedin: v.optional(v.string()),
            youtube: v.optional(v.string()),
            tiktok: v.optional(v.string()),
        })),
        pricingDescription: v.optional(v.string()),
        faq: v.optional(v.array(v.object({
            question: v.string(),
            answer: v.string(),
        }))),
        rules: v.optional(v.array(v.object({
            title: v.string(),
            description: v.optional(v.string()),
            type: v.optional(v.string()),
        }))),
        documents: v.optional(v.array(v.object({
            name: v.string(),
            url: v.string(),
            type: v.optional(v.string()),
            size: v.optional(v.number()),
            description: v.optional(v.string()),
        }))),
        bookingConfig: v.optional(v.object({
            bookingModel: v.optional(v.string()),
            slotDurationMinutes: v.optional(v.number()),
            minLeadTimeHours: v.optional(v.number()),
            maxAdvanceDays: v.optional(v.number()),
            bufferBeforeMinutes: v.optional(v.number()),
            bufferAfterMinutes: v.optional(v.number()),
            approvalRequired: v.optional(v.boolean()),
            paymentRequired: v.optional(v.boolean()),
            depositPercent: v.optional(v.number()),
            cancellationPolicy: v.optional(v.string()),
            allowRecurring: v.optional(v.boolean()),
            allowSeasonalLease: v.optional(v.boolean()),
        })),
        // Event-specific fields already in schema
        eventDate: v.optional(v.string()),
        startTime: v.optional(v.string()),
        endTime: v.optional(v.string()),
        venueId: v.optional(v.string()),
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
        // Ticketing fields
        shows: v.optional(v.array(v.any())),
        ticketTypes: v.optional(v.array(v.any())),
        ticketProvider: v.optional(v.any()),
        // Event-venue sync
        venueBookingId: v.optional(v.string()),
        // Scheduled publishing
        publishAt: v.optional(v.number()),
        unpublishAt: v.optional(v.number()),
        publishedAt: v.optional(v.number()),
        // Multi-tenant SaaS: Listing lifecycle & moderation
        listingStatus: v.optional(v.union(
            v.literal("draft"),
            v.literal("pending_review"),
            v.literal("approved"),
            v.literal("published"),
            v.literal("paused"),
            v.literal("sold"),
            v.literal("expired"),
            v.literal("rejected"),
            v.literal("changes_requested"),
            v.literal("deleted"),
        )),
        moderationNote: v.optional(v.string()),
        moderatedBy: v.optional(v.string()),
        moderatedAt: v.optional(v.number()),
        submittedForReviewAt: v.optional(v.number()),
        autoApproved: v.optional(v.boolean()),
        riskLevel: v.optional(v.union(
            v.literal("low"),
            v.literal("medium"),
            v.literal("high"),
        )),
        ownerId: v.optional(v.string()),
        expiresAt: v.optional(v.number()),
        renewedAt: v.optional(v.number()),
        renewCount: v.optional(v.number()),
        reportCount: v.optional(v.number()),
        flaggedAt: v.optional(v.number()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, ...updates }) => {
        const existing = await ctx.db.get(id);
        if (!existing) throw new Error("Resource not found");
        const filtered = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined));
        // Deep-merge metadata to preserve fields not sent by the caller
        if (filtered.metadata && existing.metadata) {
            filtered.metadata = { ...existing.metadata, ...filtered.metadata };
        }
        await ctx.db.patch(id, filtered);
        return { success: true };
    },
});

/** Admin-only: patch any field including tenantId. Used for tenant migrations. */
export const adminPatch = mutation({
    args: { id: v.id("resources"), patch: v.any() },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, patch }) => {
        const existing = await ctx.db.get(id);
        if (!existing) throw new Error("Resource not found");
        await ctx.db.patch(id, patch);
        return { success: true };
    },
});

export const remove = mutation({
    args: { id: v.id("resources") },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        const r = await ctx.db.get(id);
        if (!r) throw new Error("Resource not found");
        validateStatusTransition(r.status, "deleted");
        await ctx.db.patch(id, { status: "deleted" });
        return { success: true };
    },
});

/** Permanently delete a resource row (used by seed reset only). */
export const hardDelete = mutation({
    args: { id: v.id("resources") },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        await ctx.db.delete(id);
        return { success: true };
    },
});

export const publish = mutation({
    args: { id: v.id("resources") },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        const r = await ctx.db.get(id);
        if (!r) throw new Error("Resource not found");
        validateStatusTransition(r.status, "published");
        await ctx.db.patch(id, { status: "published" });
        return { success: true };
    },
});

export const unpublish = mutation({
    args: { id: v.id("resources") },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        const r = await ctx.db.get(id);
        if (!r) throw new Error("Resource not found");
        validateStatusTransition(r.status, "draft");
        await ctx.db.patch(id, { status: "draft" });
        return { success: true };
    },
});

export const archive = mutation({
    args: { id: v.id("resources") },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        const r = await ctx.db.get(id);
        if (!r) throw new Error("Resource not found");
        validateStatusTransition(r.status, "archived");
        await ctx.db.patch(id, { status: "archived" });
        // NOTE: Cascade (cancel bookings, deactivate blocks) happens in the facade layer
        return { success: true };
    },
});

export const restore = mutation({
    args: { id: v.id("resources") },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        const r = await ctx.db.get(id);
        if (!r) throw new Error("Resource not found");
        validateStatusTransition(r.status, "draft");
        await ctx.db.patch(id, { status: "draft" });
        return { success: true };
    },
});

export const cloneResource = mutation({
    args: { id: v.id("resources") },
    returns: v.object({ id: v.string(), slug: v.string() }),
    handler: async (ctx, { id }) => {
        const resource = await ctx.db.get(id);
        if (!resource) throw new Error("Resource not found");

        const baseSlug = resource.slug.replace(/-copy(-\d+)?$/, "");
        let newSlug = `${baseSlug}-copy`;
        let suffix = 1;
        while (true) {
            const existing = await ctx.db.query("resources")
                .withIndex("by_slug", (q) => q.eq("tenantId", resource.tenantId).eq("slug", newSlug))
                .first();
            if (!existing) break;
            suffix++;
            newSlug = `${baseSlug}-copy-${suffix}`;
        }

        const { _id, _creationTime, status, ...fields } = resource;
        const newId = await ctx.db.insert("resources", {
            ...fields,
            name: `${resource.name} (Copy)`,
            slug: newSlug,
            status: "draft",
        });
        // NOTE: Cloning related data (amenities, pricing, addons) happens in the facade
        return { id: newId as string, slug: newSlug };
    },
});

export const importResource = mutation({
    args: {
        tenantId: v.string(), organizationId: v.optional(v.string()),
        name: v.string(), slug: v.string(), description: v.optional(v.string()),
        categoryKey: v.string(), subcategoryKeys: v.optional(v.array(v.string())),
        timeMode: v.string(), features: v.array(v.any()),
        ruleSetKey: v.optional(v.string()), status: v.string(),
        requiresApproval: v.boolean(), capacity: v.optional(v.number()),
        inventoryTotal: v.optional(v.number()),
        images: v.array(v.any()), pricing: v.any(), metadata: v.any(),
        allowSeasonRental: v.optional(v.boolean()),
        allowRecurringBooking: v.optional(v.boolean()),
        openingHours: v.optional(v.array(v.any())),
        openingHoursExceptions: v.optional(v.array(v.object({
            date: v.string(),
            closed: v.optional(v.boolean()),
            open: v.optional(v.string()),
            close: v.optional(v.string()),
            reason: v.optional(v.string()),
        }))),
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
        minBookingDuration: v.optional(v.number()),
        maxBookingDuration: v.optional(v.number()),
        linkedResourceIds: v.optional(v.array(v.string())),
        venueResourceId: v.optional(v.string()),
        venueSlug: v.optional(v.string()),
        // Arrangement-specific fields
        subtitle: v.optional(v.string()),
        duration: v.optional(v.number()),
        priceMax: v.optional(v.number()),
        ticketUrl: v.optional(v.string()),
        ageLimit: v.optional(v.number()),
        tags: v.optional(v.array(v.string())),
        recommendedListingIds: v.optional(v.array(v.id("resources"))),
        // Promoted fields (matching schema)
        visibility: v.optional(v.union(v.literal("public"), v.literal("unlisted"), v.literal("private"))),
        fullDescription: v.optional(v.string()),
        highlights: v.optional(v.array(v.string())),
        amenities: v.optional(v.array(v.string())),
        location: v.optional(v.object({
            address: v.optional(v.string()),
            city: v.optional(v.string()),
            postalCode: v.optional(v.string()),
            municipality: v.optional(v.string()),
            country: v.optional(v.string()),
            lat: v.optional(v.number()),
            lng: v.optional(v.number()),
        })),
        areaSquareMeters: v.optional(v.number()),
        floors: v.optional(v.number()),
        capacityDetails: v.optional(v.any()),
        technicalSpecs: v.optional(v.object({
            audio: v.optional(v.string()),
            lighting: v.optional(v.string()),
            backline: v.optional(v.string()),
            haze: v.optional(v.string()),
            other: v.optional(v.string()),
        })),
        venueDimensions: v.optional(v.object({
            stageWidth: v.optional(v.number()),
            stageOpening: v.optional(v.number()),
            stageDepth: v.optional(v.number()),
            depthToBackdrop: v.optional(v.number()),
            ceilingHeight: v.optional(v.number()),
            riggingBars: v.optional(v.number()),
        })),
        parkingInfo: v.optional(v.string()),
        galleryMedia: v.optional(v.array(v.any())),
        contactEmail: v.optional(v.string()),
        contactName: v.optional(v.string()),
        contactPhone: v.optional(v.string()),
        contactWebsite: v.optional(v.string()),
        socialLinks: v.optional(v.object({
            facebook: v.optional(v.string()),
            instagram: v.optional(v.string()),
            twitter: v.optional(v.string()),
            linkedin: v.optional(v.string()),
            youtube: v.optional(v.string()),
            tiktok: v.optional(v.string()),
        })),
        pricingDescription: v.optional(v.string()),
        faq: v.optional(v.array(v.object({
            question: v.string(),
            answer: v.string(),
        }))),
        rules: v.optional(v.array(v.object({
            title: v.string(),
            description: v.optional(v.string()),
            type: v.optional(v.string()),
        }))),
        documents: v.optional(v.array(v.object({
            name: v.string(),
            url: v.string(),
            type: v.optional(v.string()),
            size: v.optional(v.number()),
            description: v.optional(v.string()),
        }))),
        bookingConfig: v.optional(v.object({
            bookingModel: v.optional(v.string()),
            slotDurationMinutes: v.optional(v.number()),
            minLeadTimeHours: v.optional(v.number()),
            maxAdvanceDays: v.optional(v.number()),
            bufferBeforeMinutes: v.optional(v.number()),
            bufferAfterMinutes: v.optional(v.number()),
            approvalRequired: v.optional(v.boolean()),
            paymentRequired: v.optional(v.boolean()),
            depositPercent: v.optional(v.number()),
            cancellationPolicy: v.optional(v.string()),
            allowRecurring: v.optional(v.boolean()),
            allowSeasonalLease: v.optional(v.boolean()),
        })),
        // Event-specific fields already in schema
        eventDate: v.optional(v.string()),
        startTime: v.optional(v.string()),
        endTime: v.optional(v.string()),
        venueId: v.optional(v.string()),
        // Ticketing fields
        shows: v.optional(v.array(v.any())),
        ticketTypes: v.optional(v.array(v.any())),
        ticketProvider: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        // Upsert: check for existing resource by tenant + slug
        const existing = await ctx.db.query("resources")
            .withIndex("by_slug", (q) => q.eq("tenantId", args.tenantId).eq("slug", args.slug))
            .first();

        if (existing) {
            const { tenantId: _t, slug: _s, metadata, ...rest } = args;
            // Deep-merge metadata to preserve fields not sent by the caller
            const mergedMetadata = metadata
                ? { ...(existing.metadata as Record<string, unknown> || {}), ...(metadata as Record<string, unknown>) }
                : existing.metadata;
            const updates = Object.fromEntries(
                Object.entries({ ...rest, metadata: mergedMetadata })
                    .filter(([_, v]) => v !== undefined)
            );
            await ctx.db.patch(existing._id, updates);
            return { id: existing._id as string };
        }

        const id = await ctx.db.insert("resources", args as any);
        return { id: id as string };
    },
});

/**
 * Admin: Reassign a resource to a different tenant/organization.
 */
export const reassignTenant = mutation({
    args: {
        id: v.id("resources"),
        tenantId: v.string(),
        organizationId: v.optional(v.string()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, tenantId, organizationId }) => {
        const r = await ctx.db.get(id);
        if (!r) throw new Error("Resource not found");
        await ctx.db.patch(id, { tenantId, organizationId });
        return { success: true };
    },
});

