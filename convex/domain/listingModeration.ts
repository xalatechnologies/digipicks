/**
 * Listing Moderation — Domain Facade
 *
 * Controls the listing lifecycle state machine for the platform.
 * Owners submit listings for review; super admins approve/reject.
 *
 * State machine:
 *   DRAFT → PENDING_REVIEW → APPROVED → PUBLISHED → SOLD/EXPIRED/DELETED
 *                   ↓
 *               REJECTED / CHANGES_REQUESTED → (owner edits) → PENDING_REVIEW
 *   PUBLISHED → PAUSED (owner) → PUBLISHED
 *   PUBLISHED → EXPIRED (cron)
 *
 * Two moderation models:
 *   - Auto-approve: low-risk categories (equipment, small venues)
 *   - Manual review: high-risk (real estate, large events, paid services)
 */

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { components } from "../_generated/api";

// Categories that auto-approve (low risk)
const AUTO_APPROVE_CATEGORIES = new Set([
    "utstyr",          // Equipment
    "rom",             // Small rooms
    "kurs",            // Courses
    "aktivitet",       // Activities
]);

const LISTING_EXPIRY_DAYS = 60;
const MS_PER_DAY = 86_400_000;

// =============================================================================
// OWNER: Submit for Review
// =============================================================================

/**
 * Submit a listing for review.
 * Auto-approves low-risk categories; queues others for manual review.
 */
export const submitForReview = mutation({
    args: {
        resourceId: v.string(),
        tenantId: v.string(),
    },
    handler: async (ctx, { resourceId, tenantId: _tenantId }) => {
        // Query via the resources component
        const resource: any = await ctx.runQuery(
            components.resources.queries.get,
            { id: resourceId }
        );

        if (!resource) {
            return { success: false, error: "Listing not found" };
        }

        const categoryKey = resource.categoryKey || "";
        const isLowRisk = AUTO_APPROVE_CATEGORIES.has(categoryKey);

        if (isLowRisk) {
            // Auto-approve path
            await ctx.runMutation(
                components.resources.mutations.update,
                {
                    id: resourceId,
                    listingStatus: "approved",
                    status: "published",
                    autoApproved: true,
                    riskLevel: "low",
                    submittedForReviewAt: Date.now(),
                    moderatedAt: Date.now(),
                    moderatedBy: "system",
                    publishedAt: Date.now(),
                    expiresAt: Date.now() + LISTING_EXPIRY_DAYS * MS_PER_DAY,
                } as any
            );

            return { success: true, autoApproved: true };
        }

        // Manual review path
        await ctx.runMutation(
            components.resources.mutations.update,
            {
                id: resourceId,
                listingStatus: "pending_review",
                riskLevel: "medium",
                submittedForReviewAt: Date.now(),
            } as any
        );

        // Emit event for notification system
        try {
            const { emitEvent } = await import("../lib/eventBus");
            await emitEvent(ctx, "resources.listing.submitted_for_review", _tenantId, "listingModeration", {
                resourceId,
                resourceName: resource.name,
                tenantId: _tenantId,
            });
        } catch { /* event bus optional */ }

        return { success: true, autoApproved: false };
    },
});

// =============================================================================
// SUPER ADMIN: Approve / Reject / Request Changes
// =============================================================================

/**
 * Approve a listing (super admin action).
 */
export const approveListing = mutation({
    args: {
        resourceId: v.string(),
        tenantId: v.string(),
        moderatorId: v.string(),
        note: v.optional(v.string()),
    },
    handler: async (ctx, { resourceId, moderatorId, note }) => {
        await ctx.runMutation(
            components.resources.mutations.update,
            {
                id: resourceId,
                listingStatus: "approved",
                status: "published",
                moderatedBy: moderatorId,
                moderatedAt: Date.now(),
                moderationNote: note || "Approved",
                publishedAt: Date.now(),
                expiresAt: Date.now() + LISTING_EXPIRY_DAYS * MS_PER_DAY,
            } as any
        );

        return { success: true };
    },
});

/**
 * Reject a listing (super admin action).
 */
export const rejectListing = mutation({
    args: {
        resourceId: v.string(),
        tenantId: v.string(),
        moderatorId: v.string(),
        note: v.string(),
    },
    handler: async (ctx, { resourceId, moderatorId, note }) => {
        await ctx.runMutation(
            components.resources.mutations.update,
            {
                id: resourceId,
                listingStatus: "rejected",
                moderatedBy: moderatorId,
                moderatedAt: Date.now(),
                moderationNote: note,
            } as any
        );

        return { success: true };
    },
});

/**
 * Request changes on a listing (super admin action).
 */
export const requestChanges = mutation({
    args: {
        resourceId: v.string(),
        tenantId: v.string(),
        moderatorId: v.string(),
        note: v.string(),
    },
    handler: async (ctx, { resourceId, moderatorId, note }) => {
        await ctx.runMutation(
            components.resources.mutations.update,
            {
                id: resourceId,
                listingStatus: "changes_requested",
                moderatedBy: moderatorId,
                moderatedAt: Date.now(),
                moderationNote: note,
            } as any
        );

        return { success: true };
    },
});

// =============================================================================
// OWNER: Pause / Resume / Renew
// =============================================================================

/**
 * Pause a published listing (owner self-service).
 */
export const pauseListing = mutation({
    args: {
        resourceId: v.string(),
        tenantId: v.string(),
    },
    handler: async (ctx, { resourceId }) => {
        await ctx.runMutation(
            components.resources.mutations.update,
            {
                id: resourceId,
                listingStatus: "paused",
                status: "draft",
            } as any
        );

        return { success: true };
    },
});

/**
 * Resume a paused listing (owner self-service).
 */
export const resumeListing = mutation({
    args: {
        resourceId: v.string(),
        tenantId: v.string(),
    },
    handler: async (ctx, { resourceId }) => {
        await ctx.runMutation(
            components.resources.mutations.update,
            {
                id: resourceId,
                listingStatus: "published",
                status: "published",
                publishedAt: Date.now(),
            } as any
        );

        return { success: true };
    },
});

/**
 * Renew an expired listing (owner self-service).
 */
export const renewListing = mutation({
    args: {
        resourceId: v.string(),
        tenantId: v.string(),
    },
    handler: async (ctx, { resourceId }): Promise<{ success: boolean; error?: string; renewCount?: number }> => {
        const resource: any = await ctx.runQuery(
            components.resources.queries.get,
            { id: resourceId }
        );

        if (!resource) {
            return { success: false, error: "Listing not found" };
        }

        const currentRenewCount: number = (resource.renewCount || 0) + 1;

        await ctx.runMutation(
            components.resources.mutations.update,
            {
                id: resourceId,
                listingStatus: "published",
                status: "published",
                expiresAt: Date.now() + LISTING_EXPIRY_DAYS * MS_PER_DAY,
                renewedAt: Date.now(),
                renewCount: currentRenewCount,
            } as any
        );

        return { success: true, renewCount: currentRenewCount };
    },
});

// =============================================================================
// QUERIES: Moderation Queue + Status Filtering
// =============================================================================

/**
 * List all listings pending review (super admin moderation queue).
 * Queries all published resources and filters by listingStatus.
 */
export const listPendingReview = query({
    args: {},
    handler: async (ctx): Promise<any[]> => {
        // Query all tenants, then list resources for each tenant
        const allTenants = await ctx.db.query("tenants").collect();

        const pendingResources: any[] = [];
        for (const tenant of allTenants) {
            try {
                const resources: any[] = await ctx.runQuery(
                    components.resources.queries.list,
                    { tenantId: tenant._id as string }
                );
                const pending = resources.filter(
                    (r: any) => r.listingStatus === "pending_review"
                );
                pendingResources.push(
                    ...pending.map((r: any) => ({
                        ...r,
                        tenantName: tenant.name,
                    }))
                );
            } catch {
                // Tenant may have no resources
            }
        }

        return pendingResources;
    },
});

/**
 * List listings by status for a specific tenant (owner view).
 */
export const listByTenantAndStatus = query({
    args: {
        tenantId: v.string(),
        listingStatus: v.optional(v.string()),
    },
    handler: async (ctx, { tenantId, listingStatus }): Promise<any[]> => {
        const resources: any[] = await ctx.runQuery(
            components.resources.queries.list,
            { tenantId }
        );

        if (listingStatus) {
            return resources.filter(
                (r: any) => r.listingStatus === listingStatus
            );
        }

        return resources;
    },
});
