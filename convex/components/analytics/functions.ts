/**
 * Analytics Component Functions
 *
 * Metrics storage and report schedule management.
 * Dashboard queries that aggregate across core tables stay in the facade.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// METRIC QUERIES
// =============================================================================

export const getBookingMetrics = query({
    args: {
        tenantId: v.string(),
        resourceId: v.optional(v.string()),
        periodStart: v.number(),
        periodEnd: v.number(),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, resourceId, periodStart, periodEnd }) => {
        let metrics = await ctx.db.query("bookingMetrics")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .collect();
        metrics = metrics.filter((m) => m.periodStart >= periodStart && m.periodEnd <= periodEnd);
        if (resourceId) metrics = metrics.filter((m) => m.resourceId === resourceId);
        return metrics;
    },
});

export const getAvailabilityMetrics = query({
    args: {
        resourceId: v.string(),
        periodStart: v.number(),
        periodEnd: v.number(),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { resourceId, periodStart, periodEnd }) => {
        return ctx.db.query("availabilityMetrics")
            .withIndex("by_resource", (q) => q.eq("resourceId", resourceId))
            .filter((q) => q.and(q.gte(q.field("periodStart"), periodStart), q.lte(q.field("periodEnd"), periodEnd)))
            .collect();
    },
});

// =============================================================================
// METRIC MUTATIONS (store pre-calculated metrics)
// =============================================================================

export const storeBookingMetrics = mutation({
    args: {
        tenantId: v.string(),
        resourceId: v.optional(v.string()),
        metricType: v.string(),
        period: v.string(),
        value: v.number(),
        count: v.optional(v.number()),
        metadata: v.optional(v.any()),
        periodStart: v.number(),
        periodEnd: v.number(),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("bookingMetrics", {
            ...args, metadata: args.metadata || {}, calculatedAt: Date.now(),
        });
        return { id: id as string };
    },
});

export const storeAvailabilityMetrics = mutation({
    args: {
        tenantId: v.string(),
        resourceId: v.string(),
        period: v.string(),
        totalSlots: v.number(),
        bookedSlots: v.number(),
        utilizationRate: v.number(),
        popularTimeSlots: v.array(v.any()),
        metadata: v.optional(v.any()),
        periodStart: v.number(),
        periodEnd: v.number(),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("availabilityMetrics", {
            ...args, metadata: args.metadata || {}, calculatedAt: Date.now(),
        });
        return { id: id as string };
    },
});

// =============================================================================
// REPORT SCHEDULES
// =============================================================================

export const listReportSchedules = query({
    args: { tenantId: v.string(), enabled: v.optional(v.boolean()) },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, enabled }) => {
        let schedules = await ctx.db.query("reportSchedules").withIndex("by_tenant", (q) => q.eq("tenantId", tenantId)).collect();
        if (enabled !== undefined) schedules = schedules.filter((s) => s.enabled === enabled);
        return schedules;
    },
});

export const createReportSchedule = mutation({
    args: {
        tenantId: v.string(), name: v.string(), description: v.optional(v.string()),
        reportType: v.string(), cronExpression: v.string(), recipients: v.array(v.string()),
        filters: v.optional(v.any()), format: v.string(), createdBy: v.string(),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("reportSchedules", {
            ...args, filters: args.filters || {}, enabled: true, metadata: args.metadata || {},
        });
        return { id: id as string };
    },
});

export const updateReportSchedule = mutation({
    args: {
        id: v.id("reportSchedules"), name: v.optional(v.string()), description: v.optional(v.string()),
        cronExpression: v.optional(v.string()), recipients: v.optional(v.array(v.string())),
        filters: v.optional(v.any()), format: v.optional(v.string()), enabled: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, ...updates }) => {
        if (!await ctx.db.get(id)) throw new Error("Report schedule not found");
        const filteredUpdates = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined));
        await ctx.db.patch(id, filteredUpdates);
        return { success: true };
    },
});

export const deleteReportSchedule = mutation({
    args: { id: v.id("reportSchedules") },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        if (!await ctx.db.get(id)) throw new Error("Report schedule not found");
        await ctx.db.delete(id);
        return { success: true };
    },
});

// =============================================================================
// IMPORT FUNCTIONS (data migration)
// =============================================================================

/**
 * Import a booking metrics record from the legacy table.
 * Used during data migration.
 */
export const importBookingMetrics = mutation({
    args: {
        tenantId: v.string(),
        resourceId: v.optional(v.string()),
        metricType: v.string(),
        period: v.string(),
        value: v.number(),
        count: v.optional(v.number()),
        metadata: v.optional(v.any()),
        periodStart: v.number(),
        periodEnd: v.number(),
        calculatedAt: v.number(),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("bookingMetrics", { ...args, metadata: args.metadata ?? {} });
        return { id: id as string };
    },
});

/**
 * Import an availability metrics record from the legacy table.
 * Used during data migration.
 */
export const importAvailabilityMetrics = mutation({
    args: {
        tenantId: v.string(),
        resourceId: v.string(),
        period: v.string(),
        totalSlots: v.number(),
        bookedSlots: v.number(),
        utilizationRate: v.number(),
        popularTimeSlots: v.array(v.any()),
        metadata: v.optional(v.any()),
        periodStart: v.number(),
        periodEnd: v.number(),
        calculatedAt: v.number(),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("availabilityMetrics", { ...args, metadata: args.metadata ?? {} });
        return { id: id as string };
    },
});

/**
 * Import a report schedule record from the legacy table.
 * Used during data migration.
 */
export const importReportSchedule = mutation({
    args: {
        tenantId: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        reportType: v.string(),
        cronExpression: v.string(),
        recipients: v.array(v.string()),
        filters: v.optional(v.any()),
        format: v.string(),
        enabled: v.boolean(),
        lastRunAt: v.optional(v.number()),
        nextRunAt: v.optional(v.number()),
        createdBy: v.string(),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("reportSchedules", {
            ...args,
            filters: args.filters ?? {},
            metadata: args.metadata ?? {},
        });
        return { id: id as string };
    },
});

/**
 * Import a scheduled report record from the legacy table.
 * Used during data migration.
 */
export const importScheduledReport = mutation({
    args: {
        scheduleId: v.id("reportSchedules"),
        tenantId: v.string(),
        status: v.string(),
        startedAt: v.optional(v.number()),
        completedAt: v.optional(v.number()),
        fileUrl: v.optional(v.string()),
        fileSize: v.optional(v.string()),
        error: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("scheduledReports", { ...args, metadata: args.metadata ?? {} });
        return { id: id as string };
    },
});
