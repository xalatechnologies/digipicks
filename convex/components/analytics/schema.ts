/**
 * Analytics Component Schema
 *
 * Metrics storage, report schedules, and generated reports.
 * Dashboard queries that read across core tables stay in the facade layer.
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    bookingMetrics: defineTable({
        tenantId: v.string(),
        resourceId: v.optional(v.string()),
        metricType: v.string(),
        period: v.string(),
        value: v.number(),
        count: v.optional(v.number()),
        metadata: v.any(),
        periodStart: v.number(),
        periodEnd: v.number(),
        calculatedAt: v.number(),
    })
        .index("by_type", ["metricType", "periodStart"])
        .index("by_resource", ["resourceId", "periodStart"])
        .index("by_tenant", ["tenantId"]),

    availabilityMetrics: defineTable({
        tenantId: v.string(),
        resourceId: v.string(),
        period: v.string(),
        totalSlots: v.number(),
        bookedSlots: v.number(),
        utilizationRate: v.number(),
        popularTimeSlots: v.array(v.any()),
        metadata: v.any(),
        periodStart: v.number(),
        periodEnd: v.number(),
        calculatedAt: v.number(),
    })
        .index("by_resource", ["resourceId", "periodStart"])
        .index("by_utilization", ["utilizationRate", "periodStart"])
        .index("by_tenant", ["tenantId"]),

    reportSchedules: defineTable({
        tenantId: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        reportType: v.string(),
        cronExpression: v.string(),
        recipients: v.array(v.string()),
        filters: v.any(),
        format: v.string(),
        enabled: v.boolean(),
        lastRunAt: v.optional(v.number()),
        nextRunAt: v.optional(v.number()),
        createdBy: v.string(),
        metadata: v.any(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_enabled", ["tenantId", "enabled"])
        .index("by_next_run", ["nextRunAt"])
        .index("by_type", ["reportType"]),

    scheduledReports: defineTable({
        scheduleId: v.id("reportSchedules"),
        tenantId: v.string(),
        status: v.string(),
        startedAt: v.optional(v.number()),
        completedAt: v.optional(v.number()),
        fileUrl: v.optional(v.string()),
        fileSize: v.optional(v.string()),
        error: v.optional(v.string()),
        metadata: v.any(),
    })
        .index("by_schedule", ["scheduleId"])
        .index("by_tenant", ["tenantId"])
        .index("by_status", ["status"]),
});
