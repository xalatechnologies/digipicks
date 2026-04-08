/**
 * Addons Component — Mutation Functions
 *
 * Write operations for addons, resource-addon, and booking-addon associations.
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// ADDON MUTATIONS
// =============================================================================

/**
 * Create a new addon.
 */
export const create = mutation({
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
        requiresApproval: v.optional(v.boolean()),
        leadTimeHours: v.optional(v.number()),
        icon: v.optional(v.string()),
        images: v.optional(v.array(v.any())),
        displayOrder: v.optional(v.number()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        // Check slug uniqueness within tenant
        const existing = await ctx.db
            .query("addons")
            .withIndex("by_slug", (q) =>
                q.eq("tenantId", args.tenantId).eq("slug", args.slug)
            )
            .first();

        if (existing) {
            throw new Error(`Addon with slug "${args.slug}" already exists`);
        }

        const id = await ctx.db.insert("addons", {
            tenantId: args.tenantId,
            name: args.name,
            slug: args.slug,
            description: args.description,
            category: args.category,
            priceType: args.priceType,
            price: args.price,
            currency: args.currency,
            maxQuantity: args.maxQuantity,
            requiresApproval: args.requiresApproval ?? false,
            leadTimeHours: args.leadTimeHours,
            icon: args.icon,
            images: args.images ?? [],
            displayOrder: args.displayOrder ?? 0,
            isActive: true,
            metadata: args.metadata || {},
        });

        return { id: id as string };
    },
});

/**
 * Update an existing addon.
 */
export const update = mutation({
    args: {
        id: v.id("addons"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
        priceType: v.optional(v.string()),
        price: v.optional(v.number()),
        currency: v.optional(v.string()),
        maxQuantity: v.optional(v.number()),
        requiresApproval: v.optional(v.boolean()),
        leadTimeHours: v.optional(v.number()),
        icon: v.optional(v.string()),
        images: v.optional(v.array(v.any())),
        displayOrder: v.optional(v.number()),
        isActive: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, ...updates }) => {
        if (!(await ctx.db.get(id))) {
            throw new Error("Addon not found");
        }

        const filteredUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );

        await ctx.db.patch(id, filteredUpdates);
        return { success: true };
    },
});

/**
 * Remove an addon. Fails if it has active booking associations.
 */
export const remove = mutation({
    args: {
        id: v.id("addons"),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        if (!(await ctx.db.get(id))) {
            throw new Error("Addon not found");
        }

        // Check for active booking addons
        const activeBookingAddon = await ctx.db
            .query("bookingAddons")
            .withIndex("by_addon", (q) => q.eq("addonId", id))
            .first();

        if (activeBookingAddon) {
            throw new Error(
                "Addon has active booking associations, deactivate instead"
            );
        }

        // Remove all resource-addon associations
        const resourceAddons = await ctx.db
            .query("resourceAddons")
            .withIndex("by_addon", (q) => q.eq("addonId", id))
            .collect();

        for (const ra of resourceAddons) {
            await ctx.db.delete(ra._id);
        }

        await ctx.db.delete(id);
        return { success: true };
    },
});

// =============================================================================
// RESOURCE-ADDON ASSOCIATION MUTATIONS
// =============================================================================

/**
 * Associate an addon with a resource.
 */
export const addToResource = mutation({
    args: {
        tenantId: v.string(),
        resourceId: v.string(),
        addonId: v.id("addons"),
        isRequired: v.optional(v.boolean()),
        isRecommended: v.optional(v.boolean()),
        customPrice: v.optional(v.number()),
        displayOrder: v.optional(v.number()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        // Verify addon exists
        if (!(await ctx.db.get(args.addonId))) {
            throw new Error("Addon not found");
        }

        // Check for existing association
        const existing = await ctx.db
            .query("resourceAddons")
            .withIndex("by_resource", (q) =>
                q.eq("resourceId", args.resourceId)
            )
            .filter((q) => q.eq(q.field("addonId"), args.addonId))
            .first();

        if (existing) {
            throw new Error("Addon already associated with this resource");
        }

        const id = await ctx.db.insert("resourceAddons", {
            tenantId: args.tenantId,
            resourceId: args.resourceId,
            addonId: args.addonId,
            isRequired: args.isRequired ?? false,
            isRecommended: args.isRecommended ?? false,
            customPrice: args.customPrice,
            displayOrder: args.displayOrder ?? 0,
            isActive: true,
            metadata: args.metadata || {},
        });

        return { id: id as string };
    },
});

/**
 * Remove an addon association from a resource.
 */
export const removeFromResource = mutation({
    args: {
        resourceId: v.string(),
        addonId: v.id("addons"),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { resourceId, addonId }) => {
        const existing = await ctx.db
            .query("resourceAddons")
            .withIndex("by_resource", (q) => q.eq("resourceId", resourceId))
            .filter((q) => q.eq(q.field("addonId"), addonId))
            .first();

        if (!existing) {
            throw new Error("Addon not associated with this resource");
        }

        await ctx.db.delete(existing._id);
        return { success: true };
    },
});

// =============================================================================
// BOOKING-ADDON MUTATIONS
// =============================================================================

/**
 * Add an addon to a booking.
 */
export const addToBooking = mutation({
    args: {
        tenantId: v.string(),
        bookingId: v.string(),
        addonId: v.id("addons"),
        quantity: v.number(),
        notes: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        // Verify addon exists and is active
        const addon = await ctx.db.get(args.addonId);
        if (!addon) {
            throw new Error("Addon not found");
        }
        if (!addon.isActive) {
            throw new Error("Addon is not active");
        }

        // Validate quantity
        if (args.quantity < 1) {
            throw new Error("Quantity must be at least 1");
        }
        if (addon.maxQuantity && args.quantity > addon.maxQuantity) {
            throw new Error(
                `Quantity exceeds maximum of ${addon.maxQuantity}`
            );
        }

        // Check for duplicate
        const existing = await ctx.db
            .query("bookingAddons")
            .withIndex("by_booking", (q) =>
                q.eq("bookingId", args.bookingId)
            )
            .filter((q) => q.eq(q.field("addonId"), args.addonId))
            .first();

        if (existing) {
            throw new Error("Addon already added to this booking");
        }

        const unitPrice = addon.price;
        const totalPrice = unitPrice * args.quantity;

        const id = await ctx.db.insert("bookingAddons", {
            tenantId: args.tenantId,
            bookingId: args.bookingId,
            addonId: args.addonId,
            quantity: args.quantity,
            unitPrice,
            totalPrice,
            currency: addon.currency,
            notes: args.notes,
            status: addon.requiresApproval ? "pending" : "confirmed",
            metadata: args.metadata || {},
        });

        return { id: id as string };
    },
});

/**
 * Update a booking addon (quantity, notes).
 */
export const updateBookingAddon = mutation({
    args: {
        id: v.id("bookingAddons"),
        quantity: v.optional(v.number()),
        notes: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, quantity, notes, metadata }) => {
        const bookingAddon = await ctx.db.get(id);
        if (!bookingAddon) {
            throw new Error("Booking addon not found");
        }

        if (bookingAddon.status === "cancelled") {
            throw new Error("Cannot update a cancelled booking addon");
        }

        const updates: Record<string, unknown> = {};

        if (quantity !== undefined) {
            if (quantity < 1) {
                throw new Error("Quantity must be at least 1");
            }

            // Check max quantity
            const addon = await ctx.db.get(bookingAddon.addonId);
            if (addon?.maxQuantity && quantity > addon.maxQuantity) {
                throw new Error(
                    `Quantity exceeds maximum of ${addon.maxQuantity}`
                );
            }

            updates.quantity = quantity;
            updates.totalPrice = bookingAddon.unitPrice * quantity;
        }

        if (notes !== undefined) updates.notes = notes;
        if (metadata !== undefined) updates.metadata = metadata;

        await ctx.db.patch(id, updates);
        return { success: true };
    },
});

/**
 * Remove an addon from a booking.
 */
export const removeFromBooking = mutation({
    args: {
        id: v.id("bookingAddons"),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        const bookingAddon = await ctx.db.get(id);
        if (!bookingAddon) {
            throw new Error("Booking addon not found");
        }

        await ctx.db.delete(id);
        return { success: true };
    },
});

/**
 * Approve a pending booking addon (for addons that require approval).
 */
export const approve = mutation({
    args: {
        id: v.id("bookingAddons"),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        const bookingAddon = await ctx.db.get(id);
        if (!bookingAddon) {
            throw new Error("Booking addon not found");
        }

        if (bookingAddon.status !== "pending") {
            throw new Error(
                `Cannot approve booking addon with status "${bookingAddon.status}"`
            );
        }

        await ctx.db.patch(id, { status: "approved" });
        return { success: true };
    },
});

/**
 * Reject a pending booking addon.
 */
export const reject = mutation({
    args: {
        id: v.id("bookingAddons"),
        reason: v.optional(v.string()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, reason }) => {
        const bookingAddon = await ctx.db.get(id);
        if (!bookingAddon) {
            throw new Error("Booking addon not found");
        }

        if (bookingAddon.status !== "pending") {
            throw new Error(
                `Cannot reject booking addon with status "${bookingAddon.status}"`
            );
        }

        await ctx.db.patch(id, {
            status: "rejected",
            notes: reason
                ? `${bookingAddon.notes ? bookingAddon.notes + " | " : ""}Rejected: ${reason}`
                : bookingAddon.notes,
        });
        return { success: true };
    },
});
