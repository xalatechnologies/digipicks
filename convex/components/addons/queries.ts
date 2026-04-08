/**
 * Addons Component — Query Functions
 *
 * Read-only operations for addons, resource-addon, and booking-addon associations.
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// ADDON QUERIES
// =============================================================================

/**
 * List addons for a tenant, optionally filtered by category or active status.
 */
export const list = query({
    args: {
        tenantId: v.string(),
        category: v.optional(v.string()),
        isActive: v.optional(v.boolean()),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, category, isActive, limit = 100 }) => {
        let addons;

        if (category) {
            addons = await ctx.db
                .query("addons")
                .withIndex("by_category", (q) =>
                    q.eq("tenantId", tenantId).eq("category", category)
                )
                .collect();
        } else {
            addons = await ctx.db
                .query("addons")
                .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
                .collect();
        }

        if (isActive !== undefined) {
            addons = addons.filter((a) => a.isActive === isActive);
        }

        addons.sort((a, b) => a.displayOrder - b.displayOrder);
        return addons.slice(0, limit);
    },
});

/**
 * Get a single addon by ID.
 */
export const get = query({
    args: {
        id: v.id("addons"),
    },
    returns: v.any(),
    handler: async (ctx, { id }) => {
        const addon = await ctx.db.get(id);
        if (!addon) {
            throw new Error("Addon not found");
        }
        return addon;
    },
});

/**
 * List addons available for a specific resource (via resourceAddons join).
 */
export const listForResource = query({
    args: {
        resourceId: v.string(),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { resourceId, limit = 100 }) => {
        const resourceAddons = await ctx.db
            .query("resourceAddons")
            .withIndex("by_resource", (q) => q.eq("resourceId", resourceId))
            .collect();

        // Filter active associations
        const activeAssociations = resourceAddons.filter((ra) => ra.isActive).slice(0, limit);

        // Batch fetch addons to avoid N+1
        const addonIds = [...new Set(activeAssociations.map((ra) => ra.addonId))];
        const addons = await Promise.all(addonIds.map((id) => ctx.db.get(id)));
        const addonMap = new Map(addons.filter(Boolean).map((a: any) => [a._id, a]));

        return activeAssociations.map((ra) => {
            const addon = addonMap.get(ra.addonId) ?? null;
            return {
                ...ra,
                addon,
                // Use custom price if set, otherwise addon's default price
                effectivePrice: ra.customPrice ?? addon?.price ?? 0,
            };
        });
    },
});

// =============================================================================
// BOOKING-ADDON QUERIES
// =============================================================================

/**
 * List addons for a specific booking.
 */
export const listForBooking = query({
    args: {
        bookingId: v.string(),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { bookingId, limit = 100 }) => {
        const bookingAddons = await ctx.db
            .query("bookingAddons")
            .withIndex("by_booking", (q) => q.eq("bookingId", bookingId))
            .take(limit);

        // Batch fetch addons to avoid N+1
        const addonIds = [...new Set(bookingAddons.map((ba) => ba.addonId))];
        const addons = await Promise.all(addonIds.map((id) => ctx.db.get(id)));
        const addonMap = new Map(addons.filter(Boolean).map((a: any) => [a._id, a]));

        return bookingAddons.map((ba) => ({
            ...ba,
            addon: addonMap.get(ba.addonId) ?? null,
        }));
    },
});
