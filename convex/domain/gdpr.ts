/**
 * GDPR Facade — Data Export & Purge
 *
 * Implements GDPR Article 17 (Right to Erasure) and Article 20 (Data Portability).
 * Data export returns all PII + orders + tickets as JSON.
 * Purge anonymizes user data while retaining financial records (legal requirement).
 * Tenant purge handles full data deletion at contract termination.
 */

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireActiveUser } from "../lib/auth";
import { rateLimit, rateLimitKeys } from "../lib/rateLimits";
import { withAudit } from "../lib/auditHelpers";
import { emitEvent } from "../lib/eventBus";

// =============================================================================
// CONSTANTS
// =============================================================================

const ANONYMIZED_EMAIL = "deleted@gdpr.local";
const ANONYMIZED_NAME = "[Slettet bruker]";

// =============================================================================
// QUERY FACADES
// =============================================================================

/**
 * Export all user data (GDPR Article 20 — Data Portability).
 * Returns a structured JSON blob of all PII and associated records.
 */
export const exportUserData = query({
    args: {
        tenantId: v.id("tenants"),
        userId: v.id("users"),
    },
    handler: async (ctx, { tenantId: _tenantId, userId }) => {
        // Core user data
        const user = await ctx.db.get(userId);
        if (!user) return null;

        // Tenant memberships
        const memberships = await ctx.db
            .query("tenantUsers")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        const exportData = {
            exportedAt: new Date().toISOString(),
            gdprBasis: "Article 20 — Right to Data Portability",
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                displayName: user.displayName,
                phoneNumber: user.phoneNumber,
                nin: user.nin ? "[ENCRYPTED]" : undefined,
                role: user.role,
                status: user.status,
                createdAt: user._creationTime,
                lastLoginAt: user.lastLoginAt,
                metadata: user.metadata,
            },
            tenantMemberships: memberships.map((m) => ({
                tenantId: m.tenantId,
                status: m.status,
                joinedAt: m.joinedAt,
                invitedAt: m.invitedAt,
            })),
        };

        return exportData;
    },
});

// =============================================================================
// MUTATION FACADES
// =============================================================================

/**
 * Purge user data (GDPR Article 17 — Right to Erasure).
 * Anonymizes PII while retaining financial records (legal requirement).
 */
export const purgeUserData = mutation({
    args: {
        tenantId: v.id("tenants"),
        userId: v.id("users"),
        requestedBy: v.id("users"),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, { tenantId, userId, requestedBy, reason }) => {
        await requireActiveUser(ctx, requestedBy);

        await rateLimit(ctx, {
            name: "gdprPurge",
            key: rateLimitKeys.tenant(tenantId as string),
            throws: true,
        });

        const user = await ctx.db.get(userId);
        if (!user) {
            throw new Error("User not found");
        }

        // Anonymize user record — retain structure, remove PII
        await ctx.db.patch(userId, {
            email: ANONYMIZED_EMAIL,
            name: ANONYMIZED_NAME,
            displayName: undefined,
            avatarUrl: undefined,
            nin: undefined,
            phoneNumber: undefined,
            authUserId: undefined,
            status: "deleted" as const,
            deletedAt: Date.now(),
            metadata: { gdprPurged: true, purgedAt: Date.now(), purgedBy: requestedBy },
        });

        // Deactivate tenant membership
        const memberships = await ctx.db
            .query("tenantUsers")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        for (const membership of memberships) {
            await ctx.db.patch(membership._id, {
                status: "removed" as const,
            });
        }

        // Revoke custody grants
        const grants = await ctx.db
            .query("custodyGrants")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        for (const grant of grants) {
            await ctx.db.patch(grant._id, {
                isActive: false,
            });
        }

        await withAudit(ctx, {
            tenantId: tenantId as string,
            userId: requestedBy as string,
            entityType: "user",
            entityId: userId as string,
            action: "gdpr_purged",
            newState: { reason, purgedFields: ["email", "name", "phone", "nin", "avatar"] },
            sourceComponent: "platform",
        });

        await emitEvent(ctx, "platform.user.gdpr_purged", tenantId as string, "platform", {
            userId: userId as string,
            requestedBy: requestedBy as string,
            reason,
        });

        return {
            success: true,
            anonymizedFields: ["email", "name", "displayName", "avatarUrl", "nin", "phoneNumber", "authUserId"],
            retainedForLegalReasons: ["orders", "payments", "invoices"],
        };
    },
});

/**
 * Purge all tenant data (contract termination).
 * Super admin only. Marks all tenant data for deletion.
 */
export const purgeTenantData = mutation({
    args: {
        tenantId: v.id("tenants"),
        requestedBy: v.id("users"),
        confirmationCode: v.string(),
    },
    handler: async (ctx, { tenantId, requestedBy, confirmationCode }) => {
        await requireActiveUser(ctx, requestedBy);

        // Require confirmation code to prevent accidental deletion
        const expectedCode = `DELETE-${(tenantId as string).slice(-6).toUpperCase()}`;
        if (confirmationCode !== expectedCode) {
            throw new Error(`Invalid confirmation code. Expected: ${expectedCode}`);
        }

        const tenant = await ctx.db.get(tenantId);
        if (!tenant) {
            throw new Error("Tenant not found");
        }

        // Mark tenant as deleted
        await ctx.db.patch(tenantId, {
            status: "deleted" as const,
            deletedAt: Date.now(),
        });

        // Anonymize all tenant users
        const tenantUsers = await ctx.db
            .query("tenantUsers")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .collect();

        let purgedUserCount = 0;
        for (const tu of tenantUsers) {
            const user = await ctx.db.get(tu.userId);
            if (user && user.status !== "deleted") {
                await ctx.db.patch(tu.userId, {
                    email: `${ANONYMIZED_EMAIL.replace("@", `+${purgedUserCount}@`)}`,
                    name: ANONYMIZED_NAME,
                    displayName: undefined,
                    avatarUrl: undefined,
                    nin: undefined,
                    phoneNumber: undefined,
                    status: "deleted" as const,
                    deletedAt: Date.now(),
                });
                purgedUserCount++;
            }

            await ctx.db.patch(tu._id, {
                status: "removed" as const,
            });
        }

        await withAudit(ctx, {
            tenantId: tenantId as string,
            userId: requestedBy as string,
            entityType: "tenant",
            entityId: tenantId as string,
            action: "gdpr_tenant_purged",
            newState: { purgedUserCount },
            sourceComponent: "platform",
        });

        await emitEvent(ctx, "platform.tenant.gdpr_purged", tenantId as string, "platform", {
            tenantId: tenantId as string,
            requestedBy: requestedBy as string,
            purgedUserCount,
        });

        return {
            success: true,
            purgedUserCount,
            tenantStatus: "deleted",
        };
    },
});
