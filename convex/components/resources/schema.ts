/**
 * Resources Component Schema
 *
 * The central entity for generic SaaS listings, items, or projects.
 * External references (tenantId, organizationId) use v.string().
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    resources: defineTable({
        tenantId: v.string(),
        organizationId: v.optional(v.string()),
        name: v.string(),
        slug: v.string(),
        description: v.optional(v.string()),
        categoryKey: v.string(),
        subcategoryKeys: v.optional(v.array(v.string())),
        features: v.array(v.any()),
        status: v.string(), // "draft" | "active" | "archived"
        images: v.array(v.any()), // Array of URLs or objects
        pricing: v.any(), // Flexible pricing configuration
        metadata: v.any(), // Flexible custom metadata
        tags: v.optional(v.array(v.string())),

        // ─── Core Resource Fields ───
        timeMode: v.optional(v.string()),
        requiresApproval: v.optional(v.boolean()),
        capacity: v.optional(v.number()),
        inventoryTotal: v.optional(v.number()),
        ruleSetKey: v.optional(v.string()),

        // ─── Promoted Content ───
        visibility: v.optional(v.union(v.literal("public"), v.literal("unlisted"), v.literal("private"))),
        fullDescription: v.optional(v.string()),
        subtitle: v.optional(v.string()),
        highlights: v.optional(v.array(v.string())),
        pricingDescription: v.optional(v.string()),
        galleryMedia: v.optional(v.array(v.any())),

        // ─── Location & Venue Details ───
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
        parkingInfo: v.optional(v.string()),
        amenities: v.optional(v.array(v.string())),

        // ─── Technical Specifications ───
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

        // ─── Contact Information ───
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

        // ─── FAQ & Rules ───
        faq: v.optional(v.array(v.object({
            question: v.string(),
            answer: v.string(),
        }))),
        rules: v.optional(v.array(v.object({
            title: v.string(),
            description: v.optional(v.string()),
            type: v.optional(v.string()),
        }))),

        // ─── Document/File Attachments ───
        documents: v.optional(v.array(v.object({
            name: v.string(),
            url: v.string(),
            type: v.optional(v.string()),
            size: v.optional(v.number()),
            description: v.optional(v.string()),
        }))),

        // ─── Event-Specific Fields ───
        eventDate: v.optional(v.string()),
        startTime: v.optional(v.string()),
        endTime: v.optional(v.string()),
        duration: v.optional(v.number()),
        ageLimit: v.optional(v.number()),
        priceMax: v.optional(v.number()),
        ticketUrl: v.optional(v.string()),
        venueId: v.optional(v.string()),
        venueSlug: v.optional(v.string()),
        venueResourceId: v.optional(v.string()),
        venueBookingId: v.optional(v.string()),
        linkedResourceIds: v.optional(v.array(v.string())),
        recommendedListingIds: v.optional(v.array(v.id("resources"))),

        // ─── Ticketing Fields ───
        shows: v.optional(v.array(v.any())),
        ticketTypes: v.optional(v.array(v.any())),
        ticketProvider: v.optional(v.any()),

        // ─── Booking Configuration ───
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
        minBookingDuration: v.optional(v.number()),
        maxBookingDuration: v.optional(v.number()),

        // ─── Pricing & Packages ───
        enabledPackageIds: v.optional(v.array(v.string())),
        packagePriceOverrides: v.optional(v.any()),
        pricingRules: v.optional(v.any()),

        // ─── Multi-tenant SaaS: Lifecycle ───
        publishAt: v.optional(v.number()),
        unpublishAt: v.optional(v.number()),
        publishedAt: v.optional(v.number()),

        // ─── Multi-tenant SaaS: Listing & Moderation ───
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

        // ─── Multi-tenant SaaS: Ownership ───
        ownerId: v.optional(v.string()),

        // ─── Multi-tenant SaaS: Expiration & Renewal ───
        expiresAt: v.optional(v.number()),
        renewedAt: v.optional(v.number()),
        renewCount: v.optional(v.number()),

        // ─── Multi-tenant SaaS: Reporting ───
        reportCount: v.optional(v.number()),
        flaggedAt: v.optional(v.number()),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_slug", ["tenantId", "slug"])
        .index("by_category", ["categoryKey"])
        .index("by_status", ["status"])
        .index("by_listing_status", ["listingStatus"])
        .index("by_owner", ["ownerId"])
        .index("by_tenant_listing_status", ["tenantId", "listingStatus"])
        .index("by_venue", ["venueId"])
        .index("by_venue_date", ["venueId", "eventDate"])
        .index("by_venue_slug", ["tenantId", "venueSlug"]),
});
