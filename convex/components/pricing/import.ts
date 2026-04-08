/**
 * Pricing Component — Import Functions (data migration)
 *
 * Used for migrating data from legacy tables into the pricing component.
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Shared validators
const surchargeTypeValidator = v.union(
    v.literal("percent"),
    v.literal("fixed"),
    v.literal("multiplier")
);

const discountTypeValidator = v.union(
    v.literal("percent"),
    v.literal("fixed"),
    v.literal("free_hours")
);

// =============================================================================
// IMPORT FUNCTIONS (data migration)
// =============================================================================

/** Import a pricing group record from the legacy table. */
export const importPricingGroup = mutation({
    args: {
        tenantId: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        groupType: v.optional(v.string()),
        discountPercent: v.optional(v.number()),
        discountAmount: v.optional(v.number()),
        applicableBookingModes: v.optional(v.array(v.string())),
        validFrom: v.optional(v.number()),
        validUntil: v.optional(v.number()),
        isDefault: v.boolean(),
        priority: v.number(),
        isActive: v.boolean(),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("pricingGroups", { ...args, metadata: args.metadata ?? {} });
        return { id: id as string };
    },
});

/** Import a resource pricing record from the legacy table. */
export const importResourcePricing = mutation({
    args: {
        tenantId: v.string(),
        resourceId: v.string(),
        pricingGroupId: v.optional(v.string()),
        priceType: v.string(),
        basePrice: v.number(),
        currency: v.string(),
        pricePerHour: v.optional(v.number()),
        pricePerDay: v.optional(v.number()),
        pricePerHalfDay: v.optional(v.number()),
        pricePerPerson: v.optional(v.number()),
        pricePerPersonHour: v.optional(v.number()),
        slotOptions: v.optional(v.array(v.any())),
        minDuration: v.optional(v.number()),
        maxDuration: v.optional(v.number()),
        minPeople: v.optional(v.number()),
        maxPeople: v.optional(v.number()),
        minAge: v.optional(v.number()),
        maxAge: v.optional(v.number()),
        slotDurationMinutes: v.optional(v.number()),
        advanceBookingDays: v.optional(v.number()),
        sameDayBookingAllowed: v.optional(v.boolean()),
        cancellationHours: v.optional(v.number()),
        applicableBookingModes: v.optional(v.array(v.string())),
        depositAmount: v.optional(v.number()),
        cleaningFee: v.optional(v.number()),
        serviceFee: v.optional(v.number()),
        taxRate: v.optional(v.number()),
        taxIncluded: v.optional(v.boolean()),
        weekendMultiplier: v.optional(v.number()),
        peakHoursMultiplier: v.optional(v.number()),
        holidayMultiplier: v.optional(v.number()),
        enableDiscountCodes: v.optional(v.boolean()),
        enableSurcharges: v.optional(v.boolean()),
        enablePriceGroups: v.optional(v.boolean()),
        rules: v.optional(v.any()),
        isActive: v.boolean(),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("resourcePricing", {
            ...args,
            rules: args.rules ?? {},
            metadata: args.metadata ?? {},
        });
        return { id: id as string };
    },
});

/** Import a holiday record from the legacy table. */
export const importHoliday = mutation({
    args: {
        tenantId: v.string(),
        name: v.string(),
        date: v.string(),
        isRecurring: v.boolean(),
        surchargeType: surchargeTypeValidator,
        surchargeValue: v.number(),
        appliesToResources: v.optional(v.array(v.string())),
        appliesToCategories: v.optional(v.array(v.string())),
        isActive: v.boolean(),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("holidays", { ...args, metadata: args.metadata ?? {} });
        return { id: id as string };
    },
});

/** Import a weekday pricing record from the legacy table. */
export const importWeekdayPricing = mutation({
    args: {
        tenantId: v.string(),
        resourceId: v.optional(v.string()),
        dayOfWeek: v.number(),
        surchargeType: surchargeTypeValidator,
        surchargeValue: v.number(),
        startTime: v.optional(v.string()),
        endTime: v.optional(v.string()),
        label: v.optional(v.string()),
        isActive: v.boolean(),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("weekdayPricing", { ...args, metadata: args.metadata ?? {} });
        return { id: id as string };
    },
});

/** Import a discount code record from the legacy table. */
export const importDiscountCode = mutation({
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
        currentUses: v.number(),
        validFrom: v.optional(v.number()),
        validUntil: v.optional(v.number()),
        restrictToUsers: v.optional(v.array(v.string())),
        restrictToOrgs: v.optional(v.array(v.string())),
        restrictToPriceGroups: v.optional(v.array(v.string())),
        firstTimeBookersOnly: v.optional(v.boolean()),
        isActive: v.boolean(),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("discountCodes", { ...args, metadata: args.metadata ?? {} });
        return { id: id as string };
    },
});

/** Import a discount code usage record from the legacy table. */
export const importDiscountCodeUsage = mutation({
    args: {
        tenantId: v.string(),
        discountCodeId: v.id("discountCodes"),
        userId: v.string(),
        bookingId: v.optional(v.string()),
        discountAmount: v.number(),
        usedAt: v.number(),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("discountCodeUsage", { ...args });
        return { id: id as string };
    },
});

/** Import an org pricing group assignment from the legacy table. */
export const importOrgPricingGroup = mutation({
    args: {
        tenantId: v.string(),
        organizationId: v.string(),
        pricingGroupId: v.id("pricingGroups"),
        discountPercent: v.optional(v.number()),
        validFrom: v.optional(v.number()),
        validUntil: v.optional(v.number()),
        isActive: v.boolean(),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("orgPricingGroups", { ...args, metadata: args.metadata ?? {} });
        return { id: id as string };
    },
});

/** Import a user pricing group assignment from the legacy table. */
export const importUserPricingGroup = mutation({
    args: {
        tenantId: v.string(),
        userId: v.string(),
        pricingGroupId: v.id("pricingGroups"),
        validFrom: v.optional(v.number()),
        validUntil: v.optional(v.number()),
        isActive: v.boolean(),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("userPricingGroups", { ...args, metadata: args.metadata ?? {} });
        return { id: id as string };
    },
});

/** Import a ticket template (find-or-update by tenantId + name). */
export const importTicketTemplate = mutation({
    args: {
        tenantId: v.string(),
        name: v.string(),
        price: v.number(),
        maxPerPurchase: v.optional(v.number()),
        description: v.optional(v.string()),
        displayOrder: v.optional(v.number()),
        isActive: v.boolean(),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        // Find-or-update by tenantId + name
        const existing = await ctx.db
            .query("ticketTemplates")
            .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
            .filter((q) => q.eq(q.field("name"), args.name))
            .first();
        if (existing) {
            await ctx.db.patch(existing._id, {
                price: args.price,
                maxPerPurchase: args.maxPerPurchase,
                description: args.description,
                displayOrder: args.displayOrder,
                isActive: args.isActive,
                metadata: args.metadata ?? {},
            });
            return { id: existing._id as string };
        }
        const id = await ctx.db.insert("ticketTemplates", { ...args, metadata: args.metadata ?? {} });
        return { id: id as string };
    },
});

/** Import an additional service record from the legacy table. */
export const importAdditionalService = mutation({
    args: {
        tenantId: v.string(),
        resourceId: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        price: v.number(),
        currency: v.optional(v.string()),
        isRequired: v.optional(v.boolean()),
        displayOrder: v.optional(v.number()),
        isActive: v.boolean(),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        // Find-or-update by tenantId + resourceId + name
        const existing = await ctx.db
            .query("additionalServices")
            .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
            .filter((q) =>
                q.and(
                    q.eq(q.field("resourceId"), args.resourceId),
                    q.eq(q.field("name"), args.name)
                )
            )
            .first();
        if (existing) {
            await ctx.db.patch(existing._id, {
                description: args.description,
                price: args.price,
                currency: args.currency,
                isRequired: args.isRequired,
                displayOrder: args.displayOrder,
                isActive: args.isActive,
                metadata: args.metadata ?? {},
            });
            return { id: existing._id as string };
        }
        const id = await ctx.db.insert("additionalServices", { ...args, metadata: args.metadata ?? {} });
        return { id: id as string };
    },
});
