/**
 * Platform Admin — Domain Facade
 *
 * Super-admin-only queries for platform-wide oversight.
 * Powers the saas-admin dashboard (overview, users, stats).
 */

import { query, mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { wrapInEmailLayout } from "../email/baseLayout";
import {
    accountSuspendedEmail,
    accountActivatedEmail,
    accountTerminatedEmail,
    accountDeletedEmail,
    userSuspendedEmail,
    userInvitedEmail,
} from "../lib/adminEmailTemplates";

// =============================================================================
// PLATFORM STATS (Overview Dashboard)
// =============================================================================

/**
 * Aggregate platform statistics for the saas-admin overview page.
 */
export const platformStats = query({
    args: {},
    handler: async (ctx) => {
        // Count tenants by status
        const allTenants = await ctx.db.query("tenants").collect();
        const activeTenants = allTenants.filter(
            (t: any) => t.status === "active"
        ).length;
        const pendingTenants = allTenants.filter(
            (t: any) => t.status === "pending"
        ).length;

        // Count users
        const allUsers = await ctx.db.query("users").collect();
        const activeUsers = allUsers.filter(
            (u: any) => u.status === "active"
        ).length;

        // Count creators
        const creators = allUsers.filter(
            (u: any) => u.role === "creator"
        ).length;

        // Count super admins
        const superAdmins = allUsers.filter(
            (u: any) =>
                u.role === "super_admin" || u.role === "superadmin"
        ).length;

        return {
            tenants: {
                total: allTenants.length,
                active: activeTenants,
                pending: pendingTenants,
            },
            users: {
                total: allUsers.length,
                active: activeUsers,
                creators,
                superAdmins,
            },
        };
    },
});

// =============================================================================
// LIST ALL USERS (Platform User Management)
// =============================================================================

/**
 * List all users across the entire platform (super admin view).
 * Enriches each user with their tenant name.
 */
export const listAllUsers = query({
    args: {
        status: v.optional(v.string()),
        role: v.optional(v.string()),
    },
    handler: async (ctx, { status, role }) => {
        let users = await ctx.db.query("users").collect();

        // Apply status filter
        if (status) {
            users = users.filter((u: any) => u.status === status);
        }

        // Apply role filter
        if (role) {
            users = users.filter((u: any) => u.role === role);
        }

        // Batch-fetch tenant names
        const tenantIds = [
            ...new Set(
                users
                    .map((u: any) => u.tenantId)
                    .filter(Boolean) as string[]
            ),
        ];
        const tenantMap = new Map<string, string>();
        for (const tid of tenantIds) {
            const tenant = await ctx.db.get(tid as any);
            if (tenant) {
                tenantMap.set(tid, (tenant as any).name);
            }
        }

        return users.map((u: any) => ({
            id: u._id,
            name: u.name || u.email?.split("@")[0] || "Unnamed",
            email: u.email || "",
            phone: u.phoneNumber || "",
            role: u.role || "user",
            status: u.status || "active",
            tenantId: u.tenantId || null,
            tenantName: u.tenantId
                ? tenantMap.get(u.tenantId as string) || "Unknown"
                : "Platform",
            lastActive: u.lastLoginAt
                ? new Date(u.lastLoginAt).toISOString().split("T")[0]
                : u._creationTime
                    ? new Date(u._creationTime).toISOString().split("T")[0]
                    : "–",
            createdAt: u._creationTime
                ? new Date(u._creationTime).toISOString().split("T")[0]
                : "–",
        }));
    },
});

// =============================================================================
// RECENT ACTIVITY (Audit Feed)
// =============================================================================

/**
 * Get recent audit events for the platform overview feed.
 */
export const recentActivity = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { limit }) => {
        const maxItems = limit ?? 10;

        // Get all tenants to query audit across all tenants
        const allTenants = await ctx.db.query("tenants").collect();

        // Collect audit entries from each tenant via the audit component
        const allEntries: any[] = [];
        for (const tenant of allTenants) {
            try {
                const entries = await ctx.runQuery(
                    components.audit.functions.listForTenant,
                    { tenantId: tenant._id as string, limit: maxItems }
                );
                if (Array.isArray(entries)) {
                    allEntries.push(
                        ...entries.map((e: any) => ({
                            ...e,
                            tenantName: tenant.name,
                        }))
                    );
                }
            } catch {
                // Tenant may have no audit entries
            }
        }

        // Sort by creation time descending and take top N
        allEntries.sort(
            (a, b) => (b._creationTime || 0) - (a._creationTime || 0)
        );

        return allEntries.slice(0, maxItems).map((e: any) => ({
            id: e._id,
            action: e.action,
            entityType: e.entityType,
            entityId: e.entityId,
            actorId: e.actorId,
            tenantId: e.tenantId,
            tenantName: e.tenantName,
            details: e.details,
            timestamp: e._creationTime,
        }));
    },
});

// =============================================================================
// USER MUTATIONS
// =============================================================================

export const updateUser = mutation({
    args: {
        userId: v.id("users"),
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        role: v.optional(v.string()),
        status: v.optional(v.union(
            v.literal("active"),
            v.literal("inactive"),
            v.literal("invited"),
            v.literal("suspended"),
            v.literal("deleted"),
        )),
    },
    handler: async (ctx, { userId, ...updates }) => {
        const user = await ctx.db.get(userId);
        if (!user) throw new Error("User not found");
        const oldStatus = (user as any).status;
        const patch: Record<string, unknown> = {};
        if (updates.name !== undefined) patch.name = updates.name;
        if (updates.email !== undefined) patch.email = updates.email;
        if (updates.phone !== undefined) patch.phoneNumber = updates.phone;
        if (updates.role !== undefined) patch.role = updates.role;
        if (updates.status !== undefined) patch.status = updates.status;
        await ctx.db.patch(userId, patch);

        // Cascade status change to owned tenants + listings
        const email = updates.email || (user as any).email;
        const name = updates.name || (user as any).name || email;
        if (updates.status && updates.status !== oldStatus) {
            if (updates.status === "suspended" || updates.status === "inactive") {
                // Suspend owned tenants + deactivate their listings
                await cascadeUserStatusToTenants(ctx, userId, "suspended", "pause");
                // Email
                if (email) {
                    const tmpl = userSuspendedEmail({ recipientName: name });
                    const html = wrapInEmailLayout({ body: tmpl.html, subject: tmpl.subject, tenantName: process.env.PLATFORM_NAME || "Xala" });
                    await ctx.scheduler.runAfter(0, internal.lib.email.sendEmail, { tenantId: "platform", to: email, subject: tmpl.subject, html });
                }
            } else if (updates.status === "active" && (oldStatus === "suspended" || oldStatus === "inactive")) {
                // Reactivate owned tenants + their listings
                await cascadeUserStatusToTenants(ctx, userId, "active", "unpause");
                // Email
                if (email) {
                    const tmpl = accountActivatedEmail({ recipientName: name });
                    const html = wrapInEmailLayout({ body: tmpl.html, subject: tmpl.subject, tenantName: process.env.PLATFORM_NAME || "Xala" });
                    await ctx.scheduler.runAfter(0, internal.lib.email.sendEmail, { tenantId: "platform", to: email, subject: tmpl.subject, html });
                }
            }
        }

        return { success: true };
    },
});

/**
 * Helper: pause/unpause all published listings for a tenant.
 * - "pause": published → paused
 * - "unpause": paused → published
 * - "deactivate": any → paused
 */
async function setTenantListingsVisibility(ctx: any, tenantId: string, action: "pause" | "unpause" | "deactivate") {
    try {
        const resources = await ctx.runQuery(components.resources.queries.list, { tenantId });
        if (!Array.isArray(resources)) return;
        for (const r of resources) {
            const ls = (r as any).listingStatus;
            if (action === "pause" && ls === "published") {
                await ctx.runMutation(components.resources.mutations.update, { id: (r as any)._id, listingStatus: "paused" });
            } else if (action === "unpause" && ls === "paused") {
                await ctx.runMutation(components.resources.mutations.update, { id: (r as any)._id, listingStatus: "published" });
            } else if (action === "deactivate" && ls !== "draft" && ls !== "deleted") {
                await ctx.runMutation(components.resources.mutations.update, { id: (r as any)._id, listingStatus: "paused" });
            }
        }
    } catch { /* component may not be available */ }
}

/**
 * Helper: cascade status change to owned tenants + their listings.
 */
async function cascadeUserStatusToTenants(ctx: any, userId: any, newTenantStatus: string, listingAction: "pause" | "unpause" | "deactivate") {
    const ownedTenants = await ctx.db.query("tenants").filter((q: any) => q.eq(q.field("ownerId"), userId)).collect();
    for (const tenant of ownedTenants) {
        await ctx.db.patch(tenant._id, { status: newTenantStatus });
        await setTenantListingsVisibility(ctx, tenant._id as string, listingAction);
    }
    return ownedTenants;
}

export const deleteUser = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        const user = await ctx.db.get(userId);
        if (!user) throw new Error("User not found");

        // Cascade: deactivate listings, delete tenant
        const ownedTenants = await ctx.db.query("tenants").filter((q) => q.eq(q.field("ownerId"), userId)).collect();
        for (const tenant of ownedTenants) {
            // Deactivate all listings (don't delete them)
            await setTenantListingsVisibility(ctx, tenant._id as string, "deactivate");

            // Delete tenantUser associations
            const tus = await ctx.db.query("tenantUsers").withIndex("by_tenant", (q) => q.eq("tenantId", tenant._id)).collect();
            for (const tu of tus) await ctx.db.delete(tu._id);

            // Send email
            const email = (user as any).email;
            if (email) {
                const tmpl = accountDeletedEmail({ recipientName: (user as any).name || email, tenantName: tenant.name });
                const html = wrapInEmailLayout({ body: tmpl.html, subject: tmpl.subject, tenantName: process.env.PLATFORM_NAME || "Xala" });
                await ctx.scheduler.runAfter(0, internal.lib.email.sendEmail, { tenantId: tenant._id as string, to: email, subject: tmpl.subject, html });
            }

            // Delete tenant
            await ctx.db.delete(tenant._id);
        }

        // Remove remaining tenantUser associations
        const tenantUsers = await ctx.db.query("tenantUsers").filter((q) => q.eq(q.field("userId"), userId)).collect();
        for (const tu of tenantUsers) await ctx.db.delete(tu._id);

        await ctx.db.delete(userId);
        return { success: true };
    },
});

// =============================================================================
// TENANT MUTATIONS
// =============================================================================

export const updateTenant = mutation({
    args: {
        tenantId: v.id("tenants"),
        name: v.optional(v.string()),
        slug: v.optional(v.string()),
        description: v.optional(v.string()),
        plan: v.optional(v.string()),
        status: v.optional(v.union(
            v.literal("active"),
            v.literal("suspended"),
            v.literal("pending"),
            v.literal("deleted"),
        )),
        contactEmail: v.optional(v.string()),
        contactPhone: v.optional(v.string()),
        orgNumber: v.optional(v.string()),
    },
    handler: async (ctx, { tenantId, ...updates }) => {
        const tenant = await ctx.db.get(tenantId);
        if (!tenant) throw new Error("Tenant not found");
        const oldStatus = tenant.status;
        const patch: Record<string, unknown> = {};
        if (updates.name !== undefined) patch.name = updates.name;
        if (updates.slug !== undefined) patch.slug = updates.slug;
        if (updates.description !== undefined) patch.description = updates.description;
        if (updates.plan !== undefined) patch.plan = updates.plan;
        if (updates.status !== undefined) patch.status = updates.status;
        if (updates.contactEmail !== undefined) patch.contactEmail = updates.contactEmail;
        if (updates.contactPhone !== undefined) patch.contactPhone = updates.contactPhone;
        if (updates.orgNumber !== undefined) patch.orgNumber = updates.orgNumber;
        await ctx.db.patch(tenantId, patch);

        // Cascade status to listings + owner user
        if (updates.status && updates.status !== oldStatus) {
            if (updates.status === "suspended") {
                // Pause published listings
                await setTenantListingsVisibility(ctx, tenantId as string, "pause");
                // Suspend the owner user too
                const ownerId = (tenant as any).ownerId;
                if (ownerId) await ctx.db.patch(ownerId, { status: "suspended" as any });
            } else if (updates.status === "active" && (oldStatus === "suspended" || oldStatus === "pending")) {
                // Unpause paused listings back to published
                await setTenantListingsVisibility(ctx, tenantId as string, "unpause");
                // Reactivate the owner user too
                const ownerId = (tenant as any).ownerId;
                if (ownerId) {
                    const owner = await ctx.db.get(ownerId);
                    if (owner && (owner as any).status === "suspended") {
                        await ctx.db.patch(ownerId, { status: "active" as any });
                    }
                }
            } else if (updates.status === "deleted") {
                // Pause all listings (keep data)
                await setTenantListingsVisibility(ctx, tenantId as string, "deactivate");
            }
        }

        // Send email to tenant owner on status change
        if (updates.status && updates.status !== oldStatus) {
            const ownerId = (tenant as any).ownerId;
            let ownerEmail: string | null = null;
            let ownerName: string | null = null;
            if (ownerId) {
                const owner = await ctx.db.get(ownerId);
                if (owner) { ownerEmail = (owner as any).email; ownerName = (owner as any).name; }
            }
            // Fallback to tenant contactEmail
            const recipientEmail = ownerEmail || (tenant as any).contactEmail || updates.contactEmail;
            const recipientName = ownerName || tenant.name;

            if (recipientEmail) {
                let tmpl: { subject: string; html: string } | null = null;
                if (updates.status === "suspended") {
                    tmpl = accountSuspendedEmail({ recipientName, tenantName: tenant.name });
                } else if (updates.status === "active" && oldStatus === "suspended") {
                    tmpl = accountActivatedEmail({ recipientName, tenantName: tenant.name });
                } else if (updates.status === "deleted" && oldStatus !== "deleted") {
                    tmpl = accountTerminatedEmail({ recipientName, tenantName: tenant.name });
                }
                if (tmpl) {
                    const html = wrapInEmailLayout({ body: tmpl.html, subject: tmpl.subject, tenantName: process.env.PLATFORM_NAME || "Xala" });
                    await ctx.scheduler.runAfter(0, internal.lib.email.sendEmail, { tenantId: tenantId as string, to: recipientEmail, subject: tmpl.subject, html });
                }
            }
        }

        return { success: true };
    },
});

export const deleteTenant = mutation({
    args: { tenantId: v.id("tenants") },
    handler: async (ctx, { tenantId }) => {
        const tenant = await ctx.db.get(tenantId);
        if (!tenant) throw new Error("Tenant not found");

        // Send deletion email before deleting
        const ownerId = (tenant as any).ownerId;
        let ownerEmail: string | null = null;
        let ownerName: string | null = null;
        if (ownerId) {
            const owner = await ctx.db.get(ownerId);
            if (owner) { ownerEmail = (owner as any).email; ownerName = (owner as any).name; }
        }
        const recipientEmail = ownerEmail || (tenant as any).contactEmail;
        if (recipientEmail) {
            const tmpl = accountDeletedEmail({ recipientName: ownerName || tenant.name, tenantName: tenant.name });
            const html = wrapInEmailLayout({ body: tmpl.html, subject: tmpl.subject, tenantName: process.env.PLATFORM_NAME || "Xala" });
            await ctx.scheduler.runAfter(0, internal.lib.email.sendEmail, { tenantId: tenantId as string, to: recipientEmail, subject: tmpl.subject, html });
        }

        // Deactivate all listings (keep data, don't delete)
        await setTenantListingsVisibility(ctx, tenantId as string, "deactivate");

        // Suspend the owner user
        if (ownerId) {
            const owner = await ctx.db.get(ownerId);
            if (owner) await ctx.db.patch(ownerId, { status: "suspended" as any });
        }

        const tenantUsers = await ctx.db.query("tenantUsers").withIndex("by_tenant", (q) => q.eq("tenantId", tenantId)).collect();
        for (const tu of tenantUsers) await ctx.db.delete(tu._id);
        await ctx.db.delete(tenantId);
        return { success: true };
    },
});

// =============================================================================
// INVITE USER
// =============================================================================

export const inviteUser = mutation({
    args: {
        name: v.optional(v.string()),
        email: v.string(),
        phone: v.optional(v.string()),
        role: v.string(),
        inviterName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Create user record with "invited" status
        const userId = await ctx.db.insert("users", {
            email: args.email,
            name: args.name || "",
            phoneNumber: args.phone,
            role: args.role,
            status: "invited",
            metadata: {},
        });

        // Send invitation email
        const tmpl = userInvitedEmail({
            recipientName: args.name || "",
            recipientEmail: args.email,
            inviterName: args.inviterName,
            role: args.role,
            loginUrl: `${process.env.DASHBOARD_URL || "http://localhost:5180"}/login`,
        });
        const html = wrapInEmailLayout({ body: tmpl.html, subject: tmpl.subject, tenantName: process.env.PLATFORM_NAME || "Xala" });
        await ctx.scheduler.runAfter(0, internal.lib.email.sendEmail, { tenantId: "platform", to: args.email, subject: tmpl.subject, html });

        return { success: true, userId: userId as string };
    },
});
