import { mutation, query } from "../_generated/server";
import { components } from "../_generated/api";

/**
 * Admin cleanup mutations for consolidating duplicate data.
 * All resource operations go through the resources component.
 */

const MAIN_TENANT_ID = "j97d4h37a5z1chk8h0yf8dn01n80f7nm"; // Main demo tenant

/**
 * Preview duplicate tenants before cleanup.
 */
export const previewDuplicateTenants = query({
    args: {},
    handler: async (ctx) => {
        const tenants = await ctx.db.query("tenants").collect();
        const users = await ctx.db.query("users").collect();

        // Collect resources per-tenant (listAll now requires tenantId)
        const allResources: any[] = [];
        for (const t of tenants) {
            const r = await ctx.runQuery(components.resources.queries.listAll, { tenantId: t._id as string });
            allResources.push(...(r as any[]));
        }

        const skienTenants = tenants.filter((t) => t.slug === "demo");
        const duplicates = skienTenants.filter((t) => t._id !== MAIN_TENANT_ID);

        return {
            totalTenants: tenants.length,
            skienTenants: skienTenants.length,
            duplicates: duplicates.map((t) => ({
                id: t._id,
                name: t.name,
                resources: allResources.filter((r: any) => r.tenantId === (t._id as string)).length,
                users: users.filter((u) => u.tenantId === t._id).length,
            })),
            totalResources: allResources.length,
            totalUsers: users.length,
        };
    },
});

/**
 * Consolidate duplicate tenants into the main tenant.
 * Moves resources, users, and organizations, then deletes duplicates.
 */
export const consolidateTenants = mutation({
    args: {},
    handler: async (ctx) => {
        const tenants = await ctx.db.query("tenants").collect();
        const users = await ctx.db.query("users").collect();
        const organizations = await ctx.db.query("organizations").collect();

        // Collect resources per-tenant (listAll now requires tenantId)
        const resources: any[] = [];
        for (const t of tenants) {
            const r = await ctx.runQuery(components.resources.queries.listAll, { tenantId: t._id as string });
            resources.push(...(r as any[]));
        }

        const skienTenants = tenants.filter((t) => t.slug === "demo");
        const duplicates = skienTenants.filter((t) => t._id !== MAIN_TENANT_ID);

        if (duplicates.length === 0) {
            return { success: true, message: "No duplicate tenants found" };
        }

        const duplicateIds = duplicates.map((d) => d._id as string);
        let movedResources = 0;
        let movedUsers = 0;
        let movedOrgs = 0;
        let deletedTenants = 0;
        const deletedResourceSlugs: string[] = [];

        const mainOrg = organizations.find((o) => o.tenantId === MAIN_TENANT_ID);

        // Move resources from duplicates to main tenant via component
        for (const resource of resources) {
            if (duplicateIds.includes(resource.tenantId)) {
                const existingInMain = resources.find(
                    (r: any) => r.tenantId === MAIN_TENANT_ID && r.slug === resource.slug
                );

                if (existingInMain) {
                    await ctx.runMutation(components.resources.mutations.hardDelete, { id: resource._id });
                    deletedResourceSlugs.push(resource.slug);
                } else {
                    await ctx.runMutation(components.resources.mutations.reassignTenant, {
                        id: resource._id,
                        tenantId: MAIN_TENANT_ID,
                        organizationId: mainOrg?._id as string | undefined,
                    });
                    movedResources++;
                }
            }
        }

        // Move users (core table - direct access OK)
        const mainTenantEmails = users
            .filter((u) => u.tenantId === MAIN_TENANT_ID)
            .map((u) => u.email);

        for (const user of users) {
            if (duplicateIds.includes(user.tenantId as string)) {
                if (mainTenantEmails.includes(user.email)) {
                    await ctx.db.delete(user._id);
                } else {
                    await ctx.db.patch(user._id, { tenantId: MAIN_TENANT_ID as any });
                    movedUsers++;
                }
            }
        }

        // Move organizations (core table - direct access OK)
        for (const org of organizations) {
            if (duplicateIds.includes(org.tenantId as string)) {
                await ctx.db.delete(org._id);
                movedOrgs++;
            }
        }

        // Delete duplicate tenants (core table)
        for (const dup of duplicates) {
            await ctx.db.delete(dup._id);
            deletedTenants++;
        }

        return {
            success: true,
            movedResources,
            movedUsers,
            movedOrgs,
            deletedTenants,
            deletedResourceSlugs,
        };
    },
});

/**
 * Delete all resources for a tenant via component.
 */
export const deleteAllResources = mutation({
    args: {},
    handler: async (ctx) => {
        const tenants = await ctx.db.query("tenants").collect();
        const resources: any[] = [];
        for (const t of tenants) {
            const r = await ctx.runQuery(components.resources.queries.listAll, { tenantId: t._id as string });
            resources.push(...(r as any[]));
        }
        for (const resource of resources) {
            await ctx.runMutation(components.resources.mutations.hardDelete, { id: resource._id });
        }
        return { success: true, deleted: resources.length };
    },
});

/**
 * Get overall stats.
 */
export const stats = query({
    args: {},
    handler: async (ctx) => {
        const tenants = await ctx.db.query("tenants").collect();
        const allResources: any[] = [];
        for (const t of tenants) {
            const r = await ctx.runQuery(components.resources.queries.listAll, { tenantId: t._id as string });
            allResources.push(...(r as any[]));
        }
        return {
            resources: allResources.length,
            tenants: tenants.length,
        };
    },
});
