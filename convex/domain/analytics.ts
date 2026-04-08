/**
 * Analytics Facade — Revenue & Billing
 *
 * Aggregation queries that compute revenue reports by querying the
 * billing component.
 *
 * These are real-time aggregations (not pre-calculated metrics stored
 * in the analytics component tables). Pre-calculated metrics are
 * stored via the analytics component's store* mutations.
 */

import { query } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";

// =============================================================================
// HELPERS
// =============================================================================

/** Parse ISO date string to epoch ms, or return undefined. */
function isoToEpoch(iso?: string): number | undefined {
    if (!iso) return undefined;
    const ms = new Date(iso).getTime();
    return isNaN(ms) ? undefined : ms;
}

// =============================================================================
// REVENUE REPORT
// =============================================================================

/**
 * Aggregate revenue from the billing component for a tenant.
 * Delegates to billing's getEconomyStats which already computes these totals.
 */
export const getRevenueReport = query({
    args: {
        tenantId: v.id("tenants"),
        startDate: v.optional(v.string()),
        endDate: v.optional(v.string()),
    },
    handler: async (ctx, { tenantId, startDate, endDate }) => {
        // Use billing component's economy stats for base numbers
        // Determine period based on date range (or default to "all")
        let period = "all";
        if (startDate && endDate) {
            const diffDays = (isoToEpoch(endDate)! - isoToEpoch(startDate)!) / (24 * 60 * 60 * 1000);
            if (diffDays <= 31) period = "month";
            else if (diffDays <= 92) period = "quarter";
            else if (diffDays <= 366) period = "year";
        }

        const stats: any = await ctx.runQuery(
            components.billing.queries.getEconomyStats,
            {
                tenantId: tenantId as string,
                period,
            },
        );

        // Also fetch invoices for monthly breakdown
        const invoices: any[] = await ctx.runQuery(
            components.billing.queries.listTenantInvoices,
            {
                tenantId: tenantId as string,
                limit: 1000,
            },
        );

        // Filter by date range if specified
        const startMs = isoToEpoch(startDate) || 0;
        const endMs = isoToEpoch(endDate) || Infinity;
        const filtered = invoices.filter(
            (inv: any) => inv.createdAt >= startMs && inv.createdAt <= endMs,
        );

        // Monthly breakdown from filtered invoices
        const byMonth: Array<{ month: string; revenue: number; count: number }> = [];
        const monthMap = new Map<string, { revenue: number; count: number }>();
        for (const inv of filtered) {
            if (inv.status === "paid") {
                const d = new Date(inv.createdAt);
                const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
                const entry = monthMap.get(key) || { revenue: 0, count: 0 };
                entry.revenue += inv.totalAmount;
                entry.count += 1;
                monthMap.set(key, entry);
            }
        }
        for (const [month, data] of [...monthMap.entries()].sort()) {
            byMonth.push({ month, ...data });
        }

        return {
            totalRevenue: stats?.totalRevenue ?? 0,
            pendingAmount: stats?.pendingAmount ?? 0,
            overdueAmount: stats?.overdueAmount ?? 0,
            paidCount: stats?.invoicesByStatus?.paid ?? 0,
            totalInvoices: stats?.totalInvoices ?? 0,
            currency: "NOK",
            byMonth,
        };
    },
});
