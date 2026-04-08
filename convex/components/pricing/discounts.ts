/**
 * Pricing Component — Discount Code Functions
 *
 * CRUD operations, validation, and usage tracking for discount/coupon codes.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Shared validator
const discountTypeValidator = v.union(
    v.literal("percent"),
    v.literal("fixed"),
    v.literal("free_hours")
);

// =============================================================================
// DISCOUNT CODES / COUPON CODES
// =============================================================================

// Get a single discount code by ID
export const getDiscountCode = query({
    args: { id: v.id("discountCodes") },
    returns: v.any(),
    handler: async (ctx, { id }) => {
        return ctx.db.get(id);
    },
});

// List discount codes
export const listDiscountCodes = query({
    args: {
        tenantId: v.string(),
        isActive: v.optional(v.boolean()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, isActive }) => {
        let codes;

        if (isActive !== undefined) {
            codes = await ctx.db
                .query("discountCodes")
                .withIndex("by_active", (q) =>
                    q.eq("tenantId", tenantId).eq("isActive", isActive)
                )
                .collect();
        } else {
            codes = await ctx.db
                .query("discountCodes")
                .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
                .collect();
        }

        codes.sort((a, b) => b._creationTime - a._creationTime);
        return codes;
    },
});

// Create discount code
export const createDiscountCode = mutation({
    args: {
        tenantId: v.string(),
        code: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        discountType: discountTypeValidator,
        discountValue: v.number(),
        minBookingAmount: v.optional(v.number()),
        maxDiscountAmount: v.optional(v.number()),
        minDurationMinutes: v.optional(v.number()),
        appliesToResources: v.optional(v.array(v.string())),
        appliesToCategories: v.optional(v.array(v.string())),
        appliesToBookingModes: v.optional(v.array(v.string())),
        maxUsesTotal: v.optional(v.number()),
        maxUsesPerUser: v.optional(v.number()),
        validFrom: v.optional(v.number()),
        validUntil: v.optional(v.number()),
        restrictToUsers: v.optional(v.array(v.string())),
        restrictToOrgs: v.optional(v.array(v.string())),
        restrictToPriceGroups: v.optional(v.array(v.string())),
        firstTimeBookersOnly: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        // Check if code already exists
        const existing = await ctx.db
            .query("discountCodes")
            .withIndex("by_code", (q) => q.eq("tenantId", args.tenantId).eq("code", args.code.toUpperCase()))
            .first();

        if (existing) {
            throw new Error("Discount code already exists");
        }

        const codeId = await ctx.db.insert("discountCodes", {
            tenantId: args.tenantId,
            code: args.code.toUpperCase(),
            name: args.name,
            description: args.description,
            discountType: args.discountType,
            discountValue: args.discountValue,
            minBookingAmount: args.minBookingAmount,
            maxDiscountAmount: args.maxDiscountAmount,
            minDurationMinutes: args.minDurationMinutes,
            appliesToResources: args.appliesToResources,
            appliesToCategories: args.appliesToCategories,
            appliesToBookingModes: args.appliesToBookingModes,
            maxUsesTotal: args.maxUsesTotal,
            maxUsesPerUser: args.maxUsesPerUser,
            currentUses: 0,
            validFrom: args.validFrom,
            validUntil: args.validUntil,
            restrictToUsers: args.restrictToUsers,
            restrictToOrgs: args.restrictToOrgs,
            restrictToPriceGroups: args.restrictToPriceGroups,
            firstTimeBookersOnly: args.firstTimeBookersOnly,
            isActive: true,
            metadata: args.metadata || {},
        });
        return { id: codeId as string };
    },
});

// Update discount code
export const updateDiscountCode = mutation({
    args: {
        id: v.id("discountCodes"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        discountType: v.optional(discountTypeValidator),
        discountValue: v.optional(v.number()),
        minBookingAmount: v.optional(v.number()),
        maxDiscountAmount: v.optional(v.number()),
        minDurationMinutes: v.optional(v.number()),
        appliesToResources: v.optional(v.array(v.string())),
        appliesToCategories: v.optional(v.array(v.string())),
        appliesToBookingModes: v.optional(v.array(v.string())),
        maxUsesTotal: v.optional(v.number()),
        maxUsesPerUser: v.optional(v.number()),
        validFrom: v.optional(v.number()),
        validUntil: v.optional(v.number()),
        restrictToUsers: v.optional(v.array(v.string())),
        restrictToOrgs: v.optional(v.array(v.string())),
        restrictToPriceGroups: v.optional(v.array(v.string())),
        firstTimeBookersOnly: v.optional(v.boolean()),
        isActive: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, ...updates }) => {
        const code = await ctx.db.get(id);
        if (!code) {
            throw new Error("Discount code not found");
        }
        const filteredUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );
        await ctx.db.patch(id, filteredUpdates);
        return { success: true };
    },
});

// Delete discount code
export const deleteDiscountCode = mutation({
    args: { id: v.id("discountCodes") },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        const code = await ctx.db.get(id);
        if (!code) {
            throw new Error("Discount code not found");
        }

        // Check for usage
        const usage = await ctx.db
            .query("discountCodeUsage")
            .withIndex("by_code", (q) => q.eq("discountCodeId", id))
            .first();
        if (usage) {
            throw new Error("Discount code has been used, deactivate instead of deleting");
        }

        await ctx.db.delete(id);
        return { success: true };
    },
});

/**
 * Validate and get discount code details.
 * Returns { valid, error, code } — the original return format.
 *
 * The facade passes isFirstTimeBooker since the component cannot
 * query the bookings table to check firstTimeBookersOnly.
 */
export const validateDiscountCode = query({
    args: {
        tenantId: v.string(),
        code: v.string(),
        resourceId: v.optional(v.string()),
        categoryKey: v.optional(v.string()),
        bookingMode: v.optional(v.string()),
        userId: v.optional(v.string()),
        organizationId: v.optional(v.string()),
        priceGroupId: v.optional(v.id("pricingGroups")),
        bookingAmount: v.optional(v.number()),
        durationMinutes: v.optional(v.number()),
        // Component-specific: facade passes this since we can't query bookings
        isFirstTimeBooker: v.optional(v.boolean()),
    },
    returns: v.any(),
    handler: async (ctx, args) => {
        const discountCode = await ctx.db
            .query("discountCodes")
            .withIndex("by_code", (q) => q.eq("tenantId", args.tenantId).eq("code", args.code.toUpperCase()))
            .first();

        if (!discountCode) {
            return { valid: false, error: "Ugyldig rabattkode", code: null };
        }

        if (!discountCode.isActive) {
            return { valid: false, error: "Rabattkoden er ikke aktiv", code: null };
        }

        const now = Date.now();

        // Check validity dates
        if (discountCode.validFrom && discountCode.validFrom > now) {
            return { valid: false, error: "Rabattkoden er ikke gyldig ennå", code: null };
        }
        if (discountCode.validUntil && discountCode.validUntil < now) {
            return { valid: false, error: "Rabattkoden har utløpt", code: null };
        }

        // Check max uses
        if (discountCode.maxUsesTotal && discountCode.currentUses >= discountCode.maxUsesTotal) {
            return { valid: false, error: "Rabattkoden er brukt opp", code: null };
        }

        // Check user-specific usage limit
        if (args.userId && discountCode.maxUsesPerUser) {
            const userUsages = await ctx.db
                .query("discountCodeUsage")
                .withIndex("by_user", (q) => q.eq("userId", args.userId!))
                .filter((q) => q.eq(q.field("discountCodeId"), discountCode._id))
                .collect();

            if (userUsages.length >= discountCode.maxUsesPerUser) {
                return { valid: false, error: "Du har allerede brukt denne rabattkoden", code: null };
            }
        }

        // Check resource restriction
        if (discountCode.appliesToResources && discountCode.appliesToResources.length > 0 && args.resourceId) {
            if (!discountCode.appliesToResources.includes(args.resourceId)) {
                return { valid: false, error: "Rabattkoden gjelder ikke for denne ressursen", code: null };
            }
        }

        // Check category restriction
        if (discountCode.appliesToCategories && discountCode.appliesToCategories.length > 0 && args.categoryKey) {
            if (!discountCode.appliesToCategories.includes(args.categoryKey)) {
                return { valid: false, error: "Rabattkoden gjelder ikke for denne kategorien", code: null };
            }
        }

        // Check booking mode restriction
        if (discountCode.appliesToBookingModes && discountCode.appliesToBookingModes.length > 0 && args.bookingMode) {
            if (!discountCode.appliesToBookingModes.includes(args.bookingMode)) {
                return { valid: false, error: "Rabattkoden gjelder ikke for denne bookingtypen", code: null };
            }
        }

        // Check user restriction
        if (discountCode.restrictToUsers && discountCode.restrictToUsers.length > 0) {
            if (!args.userId || !discountCode.restrictToUsers.includes(args.userId)) {
                return { valid: false, error: "Rabattkoden er ikke tilgjengelig for deg", code: null };
            }
        }

        // Check organization restriction
        if (discountCode.restrictToOrgs && discountCode.restrictToOrgs.length > 0) {
            if (!args.organizationId || !discountCode.restrictToOrgs.includes(args.organizationId)) {
                return { valid: false, error: "Rabattkoden gjelder ikke for din organisasjon", code: null };
            }
        }

        // Check price group restriction
        if (discountCode.restrictToPriceGroups && discountCode.restrictToPriceGroups.length > 0) {
            if (!args.priceGroupId || !discountCode.restrictToPriceGroups.includes(args.priceGroupId as string)) {
                return { valid: false, error: "Rabattkoden gjelder ikke for din prisgruppe", code: null };
            }
        }

        // Check minimum booking amount
        if (discountCode.minBookingAmount && args.bookingAmount && args.bookingAmount < discountCode.minBookingAmount) {
            return { valid: false, error: `Minimum bookingbeløp er ${discountCode.minBookingAmount} kr`, code: null };
        }

        // Check minimum duration
        if (discountCode.minDurationMinutes && args.durationMinutes && args.durationMinutes < discountCode.minDurationMinutes) {
            const minHours = discountCode.minDurationMinutes / 60;
            return { valid: false, error: `Minimum varighet er ${minHours >= 1 ? `${minHours} time${minHours > 1 ? 'r' : ''}` : `${discountCode.minDurationMinutes} min`}`, code: null };
        }

        // Check first-time bookers (facade passes isFirstTimeBooker since we can't query bookings)
        if (discountCode.firstTimeBookersOnly && args.isFirstTimeBooker === false) {
            return { valid: false, error: "Rabattkoden er kun for nye kunder", code: null };
        }

        return {
            valid: true,
            error: null,
            code: {
                id: discountCode._id,
                code: discountCode.code,
                name: discountCode.name,
                description: discountCode.description,
                discountType: discountCode.discountType,
                discountValue: discountCode.discountValue,
                maxDiscountAmount: discountCode.maxDiscountAmount,
            },
        };
    },
});

// Apply discount code (record usage)
export const applyDiscountCode = mutation({
    args: {
        tenantId: v.string(),
        discountCodeId: v.id("discountCodes"),
        userId: v.string(),
        bookingId: v.optional(v.string()),
        discountAmount: v.number(),
    },
    returns: v.object({ id: v.string(), success: v.boolean() }),
    handler: async (ctx, args) => {
        const code = await ctx.db.get(args.discountCodeId);
        if (!code) {
            throw new Error("Discount code not found");
        }

        // Record usage
        const usageId = await ctx.db.insert("discountCodeUsage", {
            tenantId: args.tenantId,
            discountCodeId: args.discountCodeId,
            userId: args.userId,
            bookingId: args.bookingId,
            discountAmount: args.discountAmount,
            usedAt: Date.now(),
        });

        // Increment usage counter
        await ctx.db.patch(args.discountCodeId, {
            currentUses: (code.currentUses || 0) + 1,
        });

        return { id: usageId as string, success: true };
    },
});
