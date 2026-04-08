/**
 * External Reviews Component Schema
 *
 * Stores reviews fetched from external platforms (Google Places, TripAdvisor).
 * External references (tenantId, resourceId) use v.string() per component isolation rules.
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    externalReviews: defineTable({
        tenantId: v.string(),
        resourceId: v.string(),
        platform: v.string(), // "google_places" | "tripadvisor"
        externalId: v.string(), // Platform's review ID
        rating: v.number(), // 1-5
        title: v.optional(v.string()),
        text: v.optional(v.string()),
        authorName: v.string(),
        authorUrl: v.optional(v.string()),
        externalCreatedAt: v.number(), // When written on external platform
        syncedAt: v.number(), // When we fetched it
        externalUrl: v.optional(v.string()), // Link to review on platform
        isSuppressed: v.optional(v.boolean()), // Admin can hide
        metadata: v.optional(v.any()),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_resource", ["resourceId"])
        .index("by_tenant_resource", ["tenantId", "resourceId"])
        .index("by_external_id", ["platform", "externalId"]),

    externalReviewsConfig: defineTable({
        tenantId: v.string(),
        platform: v.string(), // "google_places" | "tripadvisor"
        isEnabled: v.boolean(),
        apiKey: v.optional(v.string()),
        placeId: v.optional(v.string()), // Google Place ID
        locationId: v.optional(v.string()), // TripAdvisor location ID
        displayOnListing: v.boolean(), // Show reviews on listing detail
        lastSyncAt: v.optional(v.number()),
        lastSyncStatus: v.optional(v.string()), // "success" | "failed" | "partial"
        lastSyncError: v.optional(v.string()),
        metadata: v.optional(v.any()),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_tenant_platform", ["tenantId", "platform"]),
});
