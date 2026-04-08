/**
 * Addons Component — Import Functions
 *
 * Data migration helpers for addons, booking-addons, and resource-addons.
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Import an addon record from the legacy table.
 * Used during data migration.
 */
export const importAddon = mutation({
    args: {
        tenantId: v.string(),
        name: v.string(),
        slug: v.string(),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
        priceType: v.string(),
        price: v.number(),
        currency: v.string(),
        maxQuantity: v.optional(v.number()),
        requiresApproval: v.boolean(),
        leadTimeHours: v.optional(v.number()),
        icon: v.optional(v.string()),
        images: v.array(v.any()),
        displayOrder: v.number(),
        isActive: v.boolean(),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("addons", { ...args, metadata: args.metadata ?? {} });
        return { id: id as string };
    },
});

/**
 * Import a booking-addon association from the legacy table.
 * Used during data migration.
 */
export const importBookingAddon = mutation({
    args: {
        tenantId: v.string(),
        bookingId: v.string(),
        addonId: v.id("addons"),
        quantity: v.number(),
        unitPrice: v.number(),
        totalPrice: v.number(),
        currency: v.string(),
        notes: v.optional(v.string()),
        status: v.string(),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("bookingAddons", { ...args, metadata: args.metadata ?? {} });
        return { id: id as string };
    },
});

/**
 * Import a resource-addon association from the legacy table.
 * Used during data migration.
 */
export const importResourceAddon = mutation({
    args: {
        tenantId: v.string(),
        resourceId: v.string(),
        addonId: v.id("addons"),
        isRequired: v.boolean(),
        isRecommended: v.boolean(),
        customPrice: v.optional(v.number()),
        displayOrder: v.number(),
        isActive: v.boolean(),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("resourceAddons", { ...args, metadata: args.metadata ?? {} });
        return { id: id as string };
    },
});
