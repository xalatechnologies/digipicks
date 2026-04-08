/**
 * Pricing Component — Mutation Functions
 *
 * Write operations for pricing groups, resource pricing, org/user pricing groups,
 * and additional services.
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// PRICING GROUPS
// =============================================================================

// Create pricing group
export const createGroup = mutation({
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
        isDefault: v.optional(v.boolean()),
        priority: v.optional(v.number()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const groupId = await ctx.db.insert("pricingGroups", {
            tenantId: args.tenantId,
            name: args.name,
            description: args.description,
            groupType: args.groupType,
            discountPercent: args.discountPercent,
            discountAmount: args.discountAmount,
            applicableBookingModes: args.applicableBookingModes,
            validFrom: args.validFrom,
            validUntil: args.validUntil,
            isDefault: args.isDefault ?? false,
            priority: args.priority ?? 0,
            isActive: true,
            metadata: args.metadata || {},
        });

        return { id: groupId as string };
    },
});

// Update pricing group
export const updateGroup = mutation({
    args: {
        id: v.id("pricingGroups"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        groupType: v.optional(v.string()),
        discountPercent: v.optional(v.number()),
        discountAmount: v.optional(v.number()),
        applicableBookingModes: v.optional(v.array(v.string())),
        validFrom: v.optional(v.number()),
        validUntil: v.optional(v.number()),
        isDefault: v.optional(v.boolean()),
        priority: v.optional(v.number()),
        isActive: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, ...updates }) => {
        const group = await ctx.db.get(id);
        if (!group) {
            throw new Error("Pricing group not found");
        }

        const filteredUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );

        await ctx.db.patch(id, filteredUpdates);

        return { success: true };
    },
});

// Delete pricing group
export const removeGroup = mutation({
    args: {
        id: v.id("pricingGroups"),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        const group = await ctx.db.get(id);
        if (!group) {
            throw new Error("Pricing group not found");
        }

        // Check if used by resource pricing
        const used = await ctx.db
            .query("resourcePricing")
            .withIndex("by_pricing_group", (q) => q.eq("pricingGroupId", id as string))
            .first();

        if (used) {
            throw new Error("Pricing group is in use, deactivate instead");
        }

        // Check for org assignments
        const orgAssignment = await ctx.db
            .query("orgPricingGroups")
            .withIndex("by_pricing_group", (q) => q.eq("pricingGroupId", id))
            .first();
        if (orgAssignment) {
            throw new Error("Pricing group is assigned to organizations, deactivate instead");
        }

        // Check for user assignments
        const userAssignment = await ctx.db
            .query("userPricingGroups")
            .withIndex("by_pricing_group", (q) => q.eq("pricingGroupId", id))
            .first();
        if (userAssignment) {
            throw new Error("Pricing group is assigned to users, deactivate instead");
        }

        await ctx.db.delete(id);

        return { success: true };
    },
});

// =============================================================================
// RESOURCE PRICING
// =============================================================================

// Create resource pricing
export const create = mutation({
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
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const pricingId = await ctx.db.insert("resourcePricing", {
            tenantId: args.tenantId,
            resourceId: args.resourceId,
            pricingGroupId: args.pricingGroupId,
            priceType: args.priceType,
            basePrice: args.basePrice,
            currency: args.currency,
            pricePerHour: args.pricePerHour,
            pricePerDay: args.pricePerDay,
            pricePerHalfDay: args.pricePerHalfDay,
            pricePerPerson: args.pricePerPerson,
            pricePerPersonHour: args.pricePerPersonHour,
            slotOptions: args.slotOptions,
            minDuration: args.minDuration,
            maxDuration: args.maxDuration,
            minPeople: args.minPeople,
            maxPeople: args.maxPeople,
            minAge: args.minAge,
            maxAge: args.maxAge,
            slotDurationMinutes: args.slotDurationMinutes,
            advanceBookingDays: args.advanceBookingDays,
            sameDayBookingAllowed: args.sameDayBookingAllowed,
            cancellationHours: args.cancellationHours,
            applicableBookingModes: args.applicableBookingModes,
            depositAmount: args.depositAmount,
            cleaningFee: args.cleaningFee,
            serviceFee: args.serviceFee,
            taxRate: args.taxRate,
            taxIncluded: args.taxIncluded,
            weekendMultiplier: args.weekendMultiplier,
            peakHoursMultiplier: args.peakHoursMultiplier,
            holidayMultiplier: args.holidayMultiplier,
            enableDiscountCodes: args.enableDiscountCodes,
            enableSurcharges: args.enableSurcharges,
            enablePriceGroups: args.enablePriceGroups,
            rules: args.rules || {},
            isActive: true,
            metadata: args.metadata || {},
        });

        return { id: pricingId as string };
    },
});

// Update resource pricing
export const update = mutation({
    args: {
        id: v.id("resourcePricing"),
        priceType: v.optional(v.string()),
        basePrice: v.optional(v.number()),
        currency: v.optional(v.string()),
        pricingGroupId: v.optional(v.string()),
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
        isActive: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, ...updates }) => {
        const pricing = await ctx.db.get(id);
        if (!pricing) {
            throw new Error("Pricing not found");
        }

        const filteredUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );

        await ctx.db.patch(id, filteredUpdates);

        return { success: true };
    },
});

// Delete resource pricing
export const remove = mutation({
    args: {
        id: v.id("resourcePricing"),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        const pricing = await ctx.db.get(id);
        if (!pricing) {
            throw new Error("Pricing not found");
        }

        await ctx.db.delete(id);

        return { success: true };
    },
});

// =============================================================================
// ORG PRICING GROUPS
// =============================================================================

// Assign a pricing group to an organization
export const assignOrgPricingGroup = mutation({
    args: {
        tenantId: v.string(),
        organizationId: v.string(),
        pricingGroupId: v.id("pricingGroups"),
        discountPercent: v.optional(v.number()),
        validFrom: v.optional(v.number()),
        validUntil: v.optional(v.number()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        // Check pricing group exists
        const group = await ctx.db.get(args.pricingGroupId);
        if (!group) throw new Error("Pricing group not found");

        // Check for existing assignment
        const existing = await ctx.db
            .query("orgPricingGroups")
            .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
            .collect();
        const duplicate = existing.find(
            (e) =>
                (e.pricingGroupId as string) === (args.pricingGroupId as string) &&
                e.tenantId === args.tenantId &&
                e.isActive
        );
        if (duplicate) throw new Error("Organization already assigned to this pricing group");

        const id = await ctx.db.insert("orgPricingGroups", {
            tenantId: args.tenantId,
            organizationId: args.organizationId,
            pricingGroupId: args.pricingGroupId,
            discountPercent: args.discountPercent,
            validFrom: args.validFrom,
            validUntil: args.validUntil,
            isActive: true,
            metadata: args.metadata || {},
        });

        return { id: id as string };
    },
});

// Remove an org pricing group assignment
export const removeOrgPricingGroup = mutation({
    args: { id: v.id("orgPricingGroups") },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        if (!await ctx.db.get(id)) throw new Error("Org pricing group assignment not found");
        await ctx.db.delete(id);
        return { success: true };
    },
});

// =============================================================================
// USER PRICING GROUPS
// =============================================================================

// Assign a pricing group to a user
export const assignUserPricingGroup = mutation({
    args: {
        tenantId: v.string(),
        userId: v.string(),
        pricingGroupId: v.id("pricingGroups"),
        validFrom: v.optional(v.number()),
        validUntil: v.optional(v.number()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        // Check pricing group exists
        const group = await ctx.db.get(args.pricingGroupId);
        if (!group) throw new Error("Pricing group not found");

        // Check for existing assignment
        const existing = await ctx.db
            .query("userPricingGroups")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();
        const duplicate = existing.find(
            (e) =>
                (e.pricingGroupId as string) === (args.pricingGroupId as string) &&
                e.tenantId === args.tenantId &&
                e.isActive
        );
        if (duplicate) throw new Error("User already assigned to this pricing group");

        const id = await ctx.db.insert("userPricingGroups", {
            tenantId: args.tenantId,
            userId: args.userId,
            pricingGroupId: args.pricingGroupId,
            validFrom: args.validFrom,
            validUntil: args.validUntil,
            isActive: true,
            metadata: args.metadata || {},
        });

        return { id: id as string };
    },
});

// Remove a user pricing group assignment
export const removeUserPricingGroup = mutation({
    args: { id: v.id("userPricingGroups") },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        if (!await ctx.db.get(id)) throw new Error("User pricing group assignment not found");
        await ctx.db.delete(id);
        return { success: true };
    },
});

// =============================================================================
// ADDITIONAL SERVICES
// =============================================================================

// Create an additional service
export const createAdditionalService = mutation({
    args: {
        tenantId: v.string(),
        resourceId: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        price: v.number(),
        currency: v.optional(v.string()),
        isRequired: v.optional(v.boolean()),
        displayOrder: v.optional(v.number()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("additionalServices", {
            tenantId: args.tenantId,
            resourceId: args.resourceId,
            name: args.name,
            description: args.description,
            price: args.price,
            currency: args.currency,
            isRequired: args.isRequired,
            displayOrder: args.displayOrder,
            isActive: true,
            metadata: args.metadata || {},
        });

        return { id: id as string };
    },
});

// Update an additional service
export const updateAdditionalService = mutation({
    args: {
        id: v.id("additionalServices"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        price: v.optional(v.number()),
        currency: v.optional(v.string()),
        isRequired: v.optional(v.boolean()),
        displayOrder: v.optional(v.number()),
        isActive: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, ...updates }) => {
        if (!await ctx.db.get(id)) throw new Error("Additional service not found");

        const filteredUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );
        await ctx.db.patch(id, filteredUpdates);
        return { success: true };
    },
});

// Remove an additional service
export const removeAdditionalService = mutation({
    args: { id: v.id("additionalServices") },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        if (!await ctx.db.get(id)) throw new Error("Additional service not found");
        await ctx.db.delete(id);
        return { success: true };
    },
});

// =============================================================================
// TICKET TEMPLATES
// =============================================================================

// Create a ticket template
export const createTicketTemplate = mutation({
    args: {
        tenantId: v.string(),
        name: v.string(),
        price: v.number(),
        maxPerPurchase: v.optional(v.number()),
        description: v.optional(v.string()),
        displayOrder: v.optional(v.number()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("ticketTemplates", {
            tenantId: args.tenantId,
            name: args.name,
            price: args.price,
            maxPerPurchase: args.maxPerPurchase,
            description: args.description,
            displayOrder: args.displayOrder,
            isActive: true,
            metadata: args.metadata || {},
        });

        return { id: id as string };
    },
});

// Update a ticket template
export const updateTicketTemplate = mutation({
    args: {
        id: v.id("ticketTemplates"),
        name: v.optional(v.string()),
        price: v.optional(v.number()),
        maxPerPurchase: v.optional(v.number()),
        description: v.optional(v.string()),
        displayOrder: v.optional(v.number()),
        isActive: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, ...updates }) => {
        if (!await ctx.db.get(id)) throw new Error("Ticket template not found");

        const filteredUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );
        await ctx.db.patch(id, filteredUpdates);
        return { success: true };
    },
});

// Remove a ticket template
export const removeTicketTemplate = mutation({
    args: { id: v.id("ticketTemplates") },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        if (!await ctx.db.get(id)) throw new Error("Ticket template not found");
        await ctx.db.delete(id);
        return { success: true };
    },
});

// =========================================================================
// PACKAGES
// =========================================================================

export const createPackage = mutation({
    args: {
        tenantId: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        price: v.number(),
        currency: v.optional(v.string()),
        includedServiceIds: v.optional(v.array(v.string())),
        includedAddonIds: v.optional(v.array(v.string())),
        includedItems: v.optional(v.array(v.string())),
        suitableFor: v.optional(v.array(v.string())),
        displayOrder: v.number(),
        isRecommended: v.optional(v.boolean()),
        isPublic: v.boolean(),
        isActive: v.boolean(),
    },
    returns: v.object({ id: v.id("packages") }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("packages", args);
        return { id };
    },
});

export const updatePackage = mutation({
    args: {
        id: v.id("packages"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        price: v.optional(v.number()),
        currency: v.optional(v.string()),
        includedServiceIds: v.optional(v.array(v.string())),
        includedAddonIds: v.optional(v.array(v.string())),
        includedItems: v.optional(v.array(v.string())),
        suitableFor: v.optional(v.array(v.string())),
        displayOrder: v.optional(v.number()),
        isRecommended: v.optional(v.boolean()),
        isPublic: v.optional(v.boolean()),
        isActive: v.optional(v.boolean()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, ...updates }) => {
        const existing = await ctx.db.get(id);
        if (!existing) throw new Error("Package not found");
        const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
        await ctx.db.patch(id, filtered);
        return { success: true };
    },
});

export const deletePackage = mutation({
    args: { id: v.id("packages") },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        if (!await ctx.db.get(id)) throw new Error("Package not found");
        await ctx.db.delete(id);
        return { success: true };
    },
});
