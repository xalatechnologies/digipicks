/**
 * Pricing Component — Surcharge / Weekday Pricing Functions
 *
 * CRUD operations for weekday pricing rules and surcharge lookup.
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
// Helper functions
// =============================================================================

/** Convert time string "HH:MM" to minutes since midnight */
function timeToMinutesHelper(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
}

/** Get day label for surcharge display */
function getDayLabelHelper(dayOfWeek: number): string {
    const days = ['Søndagstillegg', 'Mandagstillegg', 'Tirsdagstillegg', 'Onsdagstillegg', 'Torsdagstillegg', 'Fredagstillegg', 'Lørdagstillegg'];
    return days[dayOfWeek] || '';
}

/** Format a Date to local YYYY-MM-DD (avoids UTC shift from toISOString) */
function formatLocalDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// =============================================================================
// WEEKDAY PRICING MANAGEMENT
// =============================================================================

// List weekday pricing rules
export const listWeekdayPricing = query({
    args: {
        tenantId: v.string(),
        resourceId: v.optional(v.string()),
        dayOfWeek: v.optional(v.number()),
        isActive: v.optional(v.boolean()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, resourceId, dayOfWeek, isActive }) => {
        let rules;

        if (dayOfWeek !== undefined) {
            rules = await ctx.db
                .query("weekdayPricing")
                .withIndex("by_tenant_day", (q) =>
                    q.eq("tenantId", tenantId).eq("dayOfWeek", dayOfWeek)
                )
                .collect();
        } else {
            rules = await ctx.db
                .query("weekdayPricing")
                .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
                .collect();
        }

        if (resourceId) {
            rules = rules.filter((r) => !r.resourceId || r.resourceId === resourceId);
        }

        if (isActive !== undefined) {
            rules = rules.filter((r) => r.isActive === isActive);
        } else {
            rules = rules.filter((r) => r.isActive === true);
        }

        return rules;
    },
});

// Get a single weekday pricing rule by ID
export const getWeekdayPricingRule = query({
    args: { id: v.id("weekdayPricing") },
    returns: v.any(),
    handler: async (ctx, { id }) => {
        return ctx.db.get(id);
    },
});

// Create weekday pricing rule
export const createWeekdayPricing = mutation({
    args: {
        tenantId: v.string(),
        resourceId: v.optional(v.string()),
        dayOfWeek: v.number(),
        surchargeType: surchargeTypeValidator,
        surchargeValue: v.number(),
        startTime: v.optional(v.string()),
        endTime: v.optional(v.string()),
        label: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        if (args.dayOfWeek < 0 || args.dayOfWeek > 6) {
            throw new Error("dayOfWeek must be between 0 (Sunday) and 6 (Saturday)");
        }

        const ruleId = await ctx.db.insert("weekdayPricing", {
            tenantId: args.tenantId,
            resourceId: args.resourceId,
            dayOfWeek: args.dayOfWeek,
            surchargeType: args.surchargeType,
            surchargeValue: args.surchargeValue,
            startTime: args.startTime,
            endTime: args.endTime,
            label: args.label,
            isActive: true,
            metadata: args.metadata || {},
        });
        return { id: ruleId as string };
    },
});

// Update weekday pricing rule
export const updateWeekdayPricing = mutation({
    args: {
        id: v.id("weekdayPricing"),
        dayOfWeek: v.optional(v.number()),
        surchargeType: v.optional(surchargeTypeValidator),
        surchargeValue: v.optional(v.number()),
        startTime: v.optional(v.string()),
        endTime: v.optional(v.string()),
        label: v.optional(v.string()),
        isActive: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, ...updates }) => {
        const rule = await ctx.db.get(id);
        if (!rule) {
            throw new Error("Weekday pricing rule not found");
        }

        if (updates.dayOfWeek !== undefined && (updates.dayOfWeek < 0 || updates.dayOfWeek > 6)) {
            throw new Error("dayOfWeek must be between 0 (Sunday) and 6 (Saturday)");
        }

        const filteredUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );
        await ctx.db.patch(id, filteredUpdates);
        return { success: true };
    },
});

// Delete weekday pricing rule
export const deleteWeekdayPricing = mutation({
    args: { id: v.id("weekdayPricing") },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        await ctx.db.delete(id);
        return { success: true };
    },
});

// =============================================================================
// ENHANCED PRICE CALCULATION WITH SURCHARGES
// =============================================================================

/**
 * Get applicable surcharges for a booking.
 * The facade passes tenantId and resourceCategoryKey since the component
 * cannot read the resources table.
 */
export const getApplicableSurcharges = query({
    args: {
        tenantId: v.string(),
        resourceId: v.string(),
        bookingDate: v.number(),              // Timestamp of booking start
        bookingTime: v.optional(v.string()),  // Start time like "14:00"
        // Component-specific: facade passes this since we can't read resources table
        resourceCategoryKey: v.optional(v.string()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, resourceId, bookingDate, bookingTime, resourceCategoryKey }) => {
        const surcharges: Array<{
            id: string;
            type: 'holiday' | 'weekday' | 'peak';
            label: string;
            surchargeType: 'percent' | 'fixed' | 'multiplier';
            surchargeValue: number;
        }> = [];

        const date = new Date(bookingDate);
        const dayOfWeek = date.getDay();
        const monthDay = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const fullDate = formatLocalDate(date);

        // Check holidays
        const holidays = await ctx.db
            .query("holidays")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .filter((q) => q.eq(q.field("isActive"), true))
            .collect();

        for (const holiday of holidays) {
            let matchesDate: boolean;
            if (holiday.dateTo) {
                // Date range — compare as strings (MM-DD for recurring, YYYY-MM-DD otherwise)
                const check = holiday.isRecurring ? monthDay : fullDate;
                matchesDate = check >= holiday.date && check <= holiday.dateTo;
            } else {
                matchesDate = holiday.isRecurring
                    ? holiday.date === monthDay
                    : holiday.date === fullDate;
            }

            if (matchesDate) {
                // Check time range if specified
                if (holiday.startTime && holiday.endTime && bookingTime) {
                    const bookingMinutes = timeToMinutesHelper(bookingTime);
                    const startMinutes = timeToMinutesHelper(holiday.startTime);
                    const endMinutes = timeToMinutesHelper(holiday.endTime);
                    if (bookingMinutes < startMinutes || bookingMinutes >= endMinutes) {
                        continue;
                    }
                }

                // Check if applies to this resource
                const appliesToResource = !holiday.appliesToResources ||
                    holiday.appliesToResources.length === 0 ||
                    holiday.appliesToResources.includes(resourceId);

                const appliesToCategory = !holiday.appliesToCategories ||
                    holiday.appliesToCategories.length === 0 ||
                    (resourceCategoryKey && holiday.appliesToCategories.includes(resourceCategoryKey));

                if (appliesToResource && appliesToCategory) {
                    surcharges.push({
                        id: holiday._id,
                        type: 'holiday',
                        label: holiday.name,
                        surchargeType: holiday.surchargeType,
                        surchargeValue: holiday.surchargeValue,
                    });
                }
            }
        }

        // Check weekday pricing
        const weekdayRules = await ctx.db
            .query("weekdayPricing")
            .withIndex("by_tenant_day", (q) => q.eq("tenantId", tenantId).eq("dayOfWeek", dayOfWeek))
            .filter((q) => q.eq(q.field("isActive"), true))
            .collect();

        for (const rule of weekdayRules) {
            // Check if applies to this resource
            if (rule.resourceId && rule.resourceId !== resourceId) {
                continue;
            }

            // Check time-based rules
            if (rule.startTime && rule.endTime && bookingTime) {
                const bookingMinutes = timeToMinutesHelper(bookingTime);
                const startMinutes = timeToMinutesHelper(rule.startTime);
                const endMinutes = timeToMinutesHelper(rule.endTime);

                if (bookingMinutes < startMinutes || bookingMinutes >= endMinutes) {
                    continue;
                }
            }

            surcharges.push({
                id: rule._id,
                type: rule.startTime ? 'peak' : 'weekday',
                label: rule.label || getDayLabelHelper(dayOfWeek),
                surchargeType: rule.surchargeType,
                surchargeValue: rule.surchargeValue,
            });
        }

        return surcharges;
    },
});
