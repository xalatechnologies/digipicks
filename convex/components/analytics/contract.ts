/**
 * Analytics Component Contract
 */

import { v } from "convex/values";
import { defineContract } from "../../lib/componentContract";

export const CONTRACT = defineContract({
    name: "analytics",
    version: "1.0.0",
    category: "infrastructure",
    description: "Booking and availability metrics with report scheduling",

    queries: {
        getBookingMetrics: {
            args: { tenantId: v.string() },
            returns: v.any(),
        },
        getAvailabilityMetrics: {
            args: { tenantId: v.string() },
            returns: v.any(),
        },
        listReportSchedules: {
            args: { tenantId: v.string() },
            returns: v.array(v.any()),
        },
    },

    mutations: {
        storeBookingMetrics: {
            args: { tenantId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        storeAvailabilityMetrics: {
            args: { tenantId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        createReportSchedule: {
            args: { tenantId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        updateReportSchedule: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        deleteReportSchedule: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
    },

    emits: [
        "analytics.metrics.stored",
        "analytics.report.scheduled",
    ],

    subscribes: [
        "bookings.booking.created",
        "bookings.booking.approved",
        "bookings.booking.cancelled",
    ],

    dependencies: {
        core: ["tenants", "resources"],
        components: [],
    },
});
