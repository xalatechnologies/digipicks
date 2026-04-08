import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "../schema";
import { modules } from "../testSetup.test-util";
import { api } from "../_generated/api";

const TENANT = "tenant-analytics-test";

// =============================================================================
// BOOKING METRICS
// =============================================================================

describe("analytics/mutations — booking metrics", () => {
    it("stores booking metrics", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.functions.storeBookingMetrics, {
            tenantId: TENANT, metricType: "revenue", period: "monthly",
            value: 150000, count: 42, periodStart: 1000, periodEnd: 2000,
        });
        expect(result.id).toBeDefined();
    });

    it("stores metrics with resource scope", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.functions.storeBookingMetrics, {
            tenantId: TENANT, resourceId: "res-1", metricType: "bookings", period: "weekly",
            value: 15, periodStart: 1000, periodEnd: 2000,
        });
        expect(result.id).toBeDefined();
    });
});

describe("analytics/queries — booking metrics", () => {
    it("gets booking metrics for a tenant within period", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.functions.storeBookingMetrics, {
            tenantId: TENANT, metricType: "revenue", period: "monthly",
            value: 100000, periodStart: 1000, periodEnd: 2000,
        });
        await t.mutation(api.functions.storeBookingMetrics, {
            tenantId: TENANT, metricType: "revenue", period: "monthly",
            value: 120000, periodStart: 3000, periodEnd: 4000,
        });

        const metrics = await t.query(api.functions.getBookingMetrics, {
            tenantId: TENANT, periodStart: 1000, periodEnd: 2000,
        });
        expect(metrics).toHaveLength(1);
        expect(metrics[0].value).toBe(100000);
    });

    it("filters by resourceId", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.functions.storeBookingMetrics, {
            tenantId: TENANT, resourceId: "res-1", metricType: "bookings", period: "weekly",
            value: 10, periodStart: 1000, periodEnd: 2000,
        });
        await t.mutation(api.functions.storeBookingMetrics, {
            tenantId: TENANT, resourceId: "res-2", metricType: "bookings", period: "weekly",
            value: 20, periodStart: 1000, periodEnd: 2000,
        });

        const metrics = await t.query(api.functions.getBookingMetrics, {
            tenantId: TENANT, resourceId: "res-1", periodStart: 1000, periodEnd: 2000,
        });
        expect(metrics).toHaveLength(1);
        expect(metrics[0].value).toBe(10);
    });
});

// =============================================================================
// AVAILABILITY METRICS
// =============================================================================

describe("analytics/mutations — availability metrics", () => {
    it("stores availability metrics", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.functions.storeAvailabilityMetrics, {
            tenantId: TENANT, resourceId: "res-1", period: "daily",
            totalSlots: 24, bookedSlots: 8, utilizationRate: 0.333,
            popularTimeSlots: [{ hour: 14, count: 5 }],
            periodStart: 1000, periodEnd: 2000,
        });
        expect(result.id).toBeDefined();
    });
});

describe("analytics/queries — availability metrics", () => {
    it("gets availability metrics for a resource", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.functions.storeAvailabilityMetrics, {
            tenantId: TENANT, resourceId: "res-1", period: "daily",
            totalSlots: 24, bookedSlots: 8, utilizationRate: 0.333,
            popularTimeSlots: [], periodStart: 1000, periodEnd: 2000,
        });

        const metrics = await t.query(api.functions.getAvailabilityMetrics, {
            resourceId: "res-1", periodStart: 500, periodEnd: 2500,
        });
        expect(metrics).toHaveLength(1);
        expect(metrics[0].utilizationRate).toBe(0.333);
    });
});

// =============================================================================
// REPORT SCHEDULES
// =============================================================================

describe("analytics/mutations — report schedules", () => {
    it("creates a report schedule", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.functions.createReportSchedule, {
            tenantId: TENANT, name: "Weekly Revenue", reportType: "revenue",
            cronExpression: "0 8 * * 1", recipients: ["admin@test.com"],
            format: "pdf", createdBy: "admin-1",
        });
        expect(result.id).toBeDefined();
    });

    it("updates a report schedule", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.functions.createReportSchedule, {
            tenantId: TENANT, name: "Old", reportType: "revenue",
            cronExpression: "0 8 * * 1", recipients: ["a@test.com"],
            format: "pdf", createdBy: "admin-1",
        });
        await t.mutation(api.functions.updateReportSchedule, {
            id: id as any, name: "New", enabled: false,
        });

        const schedules = await t.query(api.functions.listReportSchedules, { tenantId: TENANT, enabled: false });
        expect(schedules).toHaveLength(1);
        expect(schedules[0].name).toBe("New");
    });

    it("deletes a report schedule", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.functions.createReportSchedule, {
            tenantId: TENANT, name: "X", reportType: "revenue",
            cronExpression: "0 8 * * 1", recipients: [],
            format: "csv", createdBy: "admin-1",
        });
        const result = await t.mutation(api.functions.deleteReportSchedule, { id: id as any });
        expect(result.success).toBe(true);
    });
});

describe("analytics/queries — report schedules", () => {
    it("lists report schedules for a tenant", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.functions.createReportSchedule, {
            tenantId: TENANT, name: "A", reportType: "revenue",
            cronExpression: "0 8 * * 1", recipients: [], format: "pdf", createdBy: "admin-1",
        });
        await t.mutation(api.functions.createReportSchedule, {
            tenantId: TENANT, name: "B", reportType: "utilization",
            cronExpression: "0 8 * * 5", recipients: [], format: "csv", createdBy: "admin-1",
        });

        const all = await t.query(api.functions.listReportSchedules, { tenantId: TENANT });
        expect(all).toHaveLength(2);
    });

    it("filters by enabled status", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.functions.createReportSchedule, {
            tenantId: TENANT, name: "Active", reportType: "revenue",
            cronExpression: "0 8 * * 1", recipients: [], format: "pdf", createdBy: "admin-1",
        });
        await t.mutation(api.functions.createReportSchedule, {
            tenantId: TENANT, name: "Disabled", reportType: "revenue",
            cronExpression: "0 8 * * 1", recipients: [], format: "pdf", createdBy: "admin-1",
        });
        await t.mutation(api.functions.updateReportSchedule, { id: id as any, enabled: false });

        const enabled = await t.query(api.functions.listReportSchedules, { tenantId: TENANT, enabled: true });
        expect(enabled).toHaveLength(1);
        expect(enabled[0].name).toBe("Disabled");
    });
});

// =============================================================================
// SCHEMA INDEXES
// =============================================================================

describe("analytics/schema — indexes", () => {
    it("bookingMetrics by_tenant index works", async () => {
        const t = convexTest(schema, modules);
        await t.run(async (ctx) => {
            await ctx.db.insert("bookingMetrics", {
                tenantId: TENANT, metricType: "revenue", period: "monthly",
                value: 100, periodStart: 1000, periodEnd: 2000, calculatedAt: Date.now(), metadata: {},
            });
            const found = await ctx.db.query("bookingMetrics")
                .withIndex("by_tenant", (q) => q.eq("tenantId", TENANT)).collect();
            expect(found).toHaveLength(1);
        });
    });

    it("reportSchedules by_enabled index works", async () => {
        const t = convexTest(schema, modules);
        await t.run(async (ctx) => {
            await ctx.db.insert("reportSchedules", {
                tenantId: TENANT, name: "R", reportType: "revenue", cronExpression: "0 8 * * 1",
                recipients: [], filters: {}, format: "pdf", enabled: true, createdBy: "admin", metadata: {},
            });
            const found = await ctx.db.query("reportSchedules")
                .withIndex("by_enabled", (q) => q.eq("tenantId", TENANT).eq("enabled", true)).collect();
            expect(found).toHaveLength(1);
        });
    });
});
