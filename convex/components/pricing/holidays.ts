/**
 * Pricing Component — Holiday Management Functions
 *
 * CRUD operations for holiday surcharge rules.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Shared validator
const surchargeTypeValidator = v.union(
    v.literal("percent"),
    v.literal("fixed"),
    v.literal("multiplier")
);

// =============================================================================
// HOLIDAY MANAGEMENT
// =============================================================================

// List holidays for a tenant
export const listHolidays = query({
    args: {
        tenantId: v.string(),
        isActive: v.optional(v.boolean()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, isActive }) => {
        let holidays = await ctx.db
            .query("holidays")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .collect();

        if (isActive !== undefined) {
            holidays = holidays.filter((h) => h.isActive === isActive);
        }

        return holidays;
    },
});

// Get a single holiday by ID
export const getHoliday = query({
    args: { id: v.id("holidays") },
    returns: v.any(),
    handler: async (ctx, { id }) => {
        return ctx.db.get(id);
    },
});

// Create holiday
export const createHoliday = mutation({
    args: {
        tenantId: v.string(),
        name: v.string(),
        date: v.string(),
        dateTo: v.optional(v.string()),
        startTime: v.optional(v.string()),
        endTime: v.optional(v.string()),
        isRecurring: v.boolean(),
        surchargeType: surchargeTypeValidator,
        surchargeValue: v.number(),
        appliesToResources: v.optional(v.array(v.string())),
        appliesToCategories: v.optional(v.array(v.string())),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const holidayId = await ctx.db.insert("holidays", {
            tenantId: args.tenantId,
            name: args.name,
            date: args.date,
            dateTo: args.dateTo,
            startTime: args.startTime,
            endTime: args.endTime,
            isRecurring: args.isRecurring,
            surchargeType: args.surchargeType,
            surchargeValue: args.surchargeValue,
            appliesToResources: args.appliesToResources,
            appliesToCategories: args.appliesToCategories,
            isActive: true,
            metadata: args.metadata || {},
        });
        return { id: holidayId as string };
    },
});

// Update holiday
export const updateHoliday = mutation({
    args: {
        id: v.id("holidays"),
        name: v.optional(v.string()),
        date: v.optional(v.string()),
        dateTo: v.optional(v.string()),
        startTime: v.optional(v.string()),
        endTime: v.optional(v.string()),
        isRecurring: v.optional(v.boolean()),
        surchargeType: v.optional(surchargeTypeValidator),
        surchargeValue: v.optional(v.number()),
        appliesToResources: v.optional(v.array(v.string())),
        appliesToCategories: v.optional(v.array(v.string())),
        isActive: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, ...updates }) => {
        const holiday = await ctx.db.get(id);
        if (!holiday) {
            throw new Error("Holiday not found");
        }
        const filteredUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );
        await ctx.db.patch(id, filteredUpdates);
        return { success: true };
    },
});

// Delete holiday
export const deleteHoliday = mutation({
    args: { id: v.id("holidays") },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        await ctx.db.delete(id);
        return { success: true };
    },
});
