import { query } from "../_generated/server";
import { components } from "../_generated/api";

/**
 * Admin stats queries for debugging and monitoring.
 * Run: npx convex run admin/stats:resourceStats
 */

export const resourceStats = query({
    args: {},
    handler: async (ctx) => {
        const tenants = await ctx.db.query("tenants").collect();

        // Collect resources per-tenant (listAll now requires tenantId)
        const resources: any[] = [];
        for (const t of tenants) {
            const r = await ctx.runQuery(components.resources.queries.listAll, { tenantId: t._id as string });
            resources.push(...(r as any[]));
        }

        // Count by tenant
        const byTenant: Record<string, { count: number; name: string }> = {};
        for (const tenant of tenants) {
            byTenant[tenant._id] = { count: 0, name: tenant.name };
        }
        byTenant["no-tenant"] = { count: 0, name: "No Tenant" };

        // Count by status
        const byStatus: Record<string, number> = {};

        // Count by category
        const byCategory: Record<string, number> = {};

        for (const r of resources) {
            // By tenant
            const tid = r.tenantId?.toString() || "no-tenant";
            if (byTenant[tid]) {
                byTenant[tid].count++;
            } else {
                byTenant[tid] = { count: 1, name: "Unknown Tenant" };
            }

            // By status
            byStatus[r.status] = (byStatus[r.status] || 0) + 1;

            // By category
            byCategory[r.categoryKey] = (byCategory[r.categoryKey] || 0) + 1;
        }

        return {
            total: resources.length,
            byTenant,
            byStatus,
            byCategory,
            tenants: tenants.map((t) => ({ id: t._id, name: t.name, slug: t.slug })),
        };
    },
});

export const userStats = query({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        const tenants = await ctx.db.query("tenants").collect();

        // Count by tenant
        const byTenant: Record<string, { count: number; name: string }> = {};
        for (const tenant of tenants) {
            byTenant[tenant._id] = { count: 0, name: tenant.name };
        }
        byTenant["no-tenant"] = { count: 0, name: "No Tenant" };

        // Count by role
        const byRole: Record<string, number> = {};

        for (const u of users) {
            // By tenant
            const tid = u.tenantId?.toString() || "no-tenant";
            if (byTenant[tid]) {
                byTenant[tid].count++;
            } else {
                byTenant[tid] = { count: 1, name: "Unknown Tenant" };
            }

            // By role
            byRole[u.role] = (byRole[u.role] || 0) + 1;
        }

        return {
            total: users.length,
            byTenant,
            byRole,
        };
    },
});
