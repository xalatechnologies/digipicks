/**
 * Addons Component Schema
 *
 * Add-on services, booking-addon associations, and resource-addon associations.
 * External references (tenantId, bookingId, resourceId) use v.string()
 * because component tables cannot reference app-level tables.
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    addons: defineTable({
        tenantId: v.string(),
        name: v.string(),
        slug: v.string(),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
        priceType: v.string(), // "fixed" | "per_hour" | "per_person" | "per_unit"
        price: v.number(),
        currency: v.string(),
        maxQuantity: v.optional(v.number()),
        requiresApproval: v.boolean(),
        leadTimeHours: v.optional(v.number()),
        icon: v.optional(v.string()),
        images: v.array(v.any()),
        displayOrder: v.number(),
        isActive: v.boolean(),
        metadata: v.any(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_slug", ["tenantId", "slug"])
        .index("by_category", ["tenantId", "category"]),

    bookingAddons: defineTable({
        tenantId: v.string(),
        bookingId: v.string(),
        addonId: v.id("addons"),
        quantity: v.number(),
        unitPrice: v.number(),
        totalPrice: v.number(),
        currency: v.string(),
        notes: v.optional(v.string()),
        status: v.string(), // "pending" | "confirmed" | "cancelled" | "approved" | "rejected"
        metadata: v.any(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_booking", ["bookingId"])
        .index("by_addon", ["addonId"]),

    resourceAddons: defineTable({
        tenantId: v.string(),
        resourceId: v.string(),
        addonId: v.id("addons"),
        isRequired: v.boolean(),
        isRecommended: v.boolean(),
        customPrice: v.optional(v.number()),
        displayOrder: v.number(),
        isActive: v.boolean(),
        metadata: v.any(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_resource", ["resourceId"])
        .index("by_addon", ["addonId"]),
});
