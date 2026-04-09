/**
 * Creator Application Facade
 *
 * Delegates to the creatorApplication component. Handles auth, rate limiting,
 * audit logging, and event bus emission. SDK hooks call these functions via
 * api.domain.creatorApplication.*.
 */

import { mutation, query } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { requireActiveUser, requireAdmin, requireTenantMember } from "../lib/auth";
import { rateLimit, rateLimitKeys } from "../lib/rateLimits";
import { withAudit } from "../lib/auditHelpers";
import { emitEvent } from "../lib/eventBus";

// =============================================================================
// Social links validator (matches component schema)
// =============================================================================

const socialLinksValidator = v.optional(
    v.object({
        twitter: v.optional(v.string()),
        instagram: v.optional(v.string()),
        youtube: v.optional(v.string()),
        discord: v.optional(v.string()),
        website: v.optional(v.string()),
    })
);

// =============================================================================
// Queries
// =============================================================================

/**
 * List creator applications for a tenant. Admin-only for full queue;
 * regular users can only see their own application via getMyApplication.
 */
export const list = query({
    args: {
        tenantId: v.id("tenants"),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, status, limit }) => {
        const applications = await ctx.runQuery(
            components.creatorApplication.functions.list,
            {
                tenantId: tenantId as string,
                status,
                limit,
            }
        );

        // Batch fetch user data to avoid N+1
        const userIds = [
            ...new Set(applications.map((a: any) => a.userId).filter(Boolean)),
        ];
        const users = await Promise.all(
            userIds.map((id: string) => ctx.db.get(id as Id<"users">))
        );
        const userMap = new Map(
            users.filter(Boolean).map((u: any) => [u._id, u])
        );

        return applications.map((app: any) => ({
            ...app,
            user: app.userId
                ? {
                      id: app.userId,
                      name: userMap.get(app.userId)?.name,
                      email: userMap.get(app.userId)?.email,
                      displayName: userMap.get(app.userId)?.displayName,
                  }
                : null,
        }));
    },
});

/**
 * Get a single application by ID.
 */
export const get = query({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        const app = await ctx.runQuery(
            components.creatorApplication.functions.get,
            { id }
        );
        if (!app) return null;

        // Enrich with user data
        const user = app.userId
            ? await ctx.db.get(app.userId as Id<"users">)
            : null;

        return {
            ...app,
            user: user
                ? {
                      id: user._id,
                      name: user.name,
                      email: user.email,
                      displayName: user.displayName,
                  }
                : null,
        };
    },
});

/**
 * Get the current user's latest application for a tenant.
 */
export const getMyApplication = query({
    args: {
        tenantId: v.id("tenants"),
        userId: v.id("users"),
    },
    handler: async (ctx, { tenantId, userId }) => {
        return ctx.runQuery(
            components.creatorApplication.functions.getByUser,
            {
                tenantId: tenantId as string,
                userId: userId as string,
            }
        );
    },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Submit a new creator application. Rate-limited per user.
 */
export const submit = mutation({
    args: {
        tenantId: v.id("tenants"),
        userId: v.id("users"),
        displayName: v.string(),
        bio: v.string(),
        niche: v.string(),
        specialties: v.optional(v.array(v.string())),
        performanceProof: v.optional(v.string()),
        trackRecordUrl: v.optional(v.string()),
        socialLinks: socialLinksValidator,
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        // Auth: user must be active and a tenant member
        await requireActiveUser(ctx, args.userId);
        await requireTenantMember(ctx, args.userId, args.tenantId);

        // Rate limit: application submission
        await rateLimit(ctx, {
            name: "submitCreatorApplication",
            key: rateLimitKeys.user(args.userId as string),
            throws: true,
        });

        // Delegate to component
        const result = await ctx.runMutation(
            components.creatorApplication.functions.submit,
            {
                tenantId: args.tenantId as string,
                userId: args.userId as string,
                displayName: args.displayName,
                bio: args.bio,
                niche: args.niche,
                specialties: args.specialties,
                performanceProof: args.performanceProof,
                trackRecordUrl: args.trackRecordUrl,
                socialLinks: args.socialLinks,
                metadata: args.metadata,
            }
        );

        // Audit
        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: args.userId as string,
            entityType: "creatorApplication",
            entityId: result.id,
            action: "submitted",
            newState: {
                displayName: args.displayName,
                niche: args.niche,
                status: "pending",
            },
            sourceComponent: "creatorApplication",
        });

        // Event bus
        await emitEvent(
            ctx,
            "creator-application.application.submitted",
            args.tenantId as string,
            "creatorApplication",
            {
                applicationId: result.id,
                userId: args.userId as string,
                displayName: args.displayName,
                niche: args.niche,
            }
        );

        return result;
    },
});

/**
 * Approve a creator application. Admin-only.
 */
export const approve = mutation({
    args: {
        tenantId: v.id("tenants"),
        id: v.string(),
        reviewedBy: v.id("users"),
        reviewNote: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Auth: must be admin
        await requireAdmin(ctx, args.reviewedBy);
        await requireTenantMember(ctx, args.reviewedBy, args.tenantId);

        // Delegate to component
        const result = await ctx.runMutation(
            components.creatorApplication.functions.approve,
            {
                id: args.id,
                reviewedBy: args.reviewedBy as string,
                reviewNote: args.reviewNote,
            }
        );

        // Get application for audit context
        const app = await ctx.runQuery(
            components.creatorApplication.functions.get,
            { id: args.id }
        );

        // Audit
        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: args.reviewedBy as string,
            entityType: "creatorApplication",
            entityId: args.id,
            action: "approved",
            previousState: { status: "pending" },
            newState: { status: "approved", reviewNote: args.reviewNote },
            sourceComponent: "creatorApplication",
        });

        // Event bus
        await emitEvent(
            ctx,
            "creator-application.application.approved",
            args.tenantId as string,
            "creatorApplication",
            {
                applicationId: args.id,
                userId: app?.userId,
                reviewedBy: args.reviewedBy as string,
            }
        );

        return result;
    },
});

/**
 * Reject a creator application. Admin-only.
 */
export const reject = mutation({
    args: {
        tenantId: v.id("tenants"),
        id: v.string(),
        reviewedBy: v.id("users"),
        reviewNote: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx, args.reviewedBy);
        await requireTenantMember(ctx, args.reviewedBy, args.tenantId);

        const result = await ctx.runMutation(
            components.creatorApplication.functions.reject,
            {
                id: args.id,
                reviewedBy: args.reviewedBy as string,
                reviewNote: args.reviewNote,
            }
        );

        const app = await ctx.runQuery(
            components.creatorApplication.functions.get,
            { id: args.id }
        );

        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: args.reviewedBy as string,
            entityType: "creatorApplication",
            entityId: args.id,
            action: "rejected",
            previousState: { status: "pending" },
            newState: { status: "rejected", reviewNote: args.reviewNote },
            sourceComponent: "creatorApplication",
        });

        await emitEvent(
            ctx,
            "creator-application.application.rejected",
            args.tenantId as string,
            "creatorApplication",
            {
                applicationId: args.id,
                userId: app?.userId,
                reviewedBy: args.reviewedBy as string,
            }
        );

        return result;
    },
});

/**
 * Request more information from the applicant. Admin-only.
 */
export const requestMoreInfo = mutation({
    args: {
        tenantId: v.id("tenants"),
        id: v.string(),
        reviewedBy: v.id("users"),
        reviewNote: v.string(),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx, args.reviewedBy);
        await requireTenantMember(ctx, args.reviewedBy, args.tenantId);

        const result = await ctx.runMutation(
            components.creatorApplication.functions.requestMoreInfo,
            {
                id: args.id,
                reviewedBy: args.reviewedBy as string,
                reviewNote: args.reviewNote,
            }
        );

        const app = await ctx.runQuery(
            components.creatorApplication.functions.get,
            { id: args.id }
        );

        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: args.reviewedBy as string,
            entityType: "creatorApplication",
            entityId: args.id,
            action: "moreInfoRequested",
            previousState: { status: "pending" },
            newState: { status: "more_info_requested", reviewNote: args.reviewNote },
            sourceComponent: "creatorApplication",
        });

        await emitEvent(
            ctx,
            "creator-application.application.more-info-requested",
            args.tenantId as string,
            "creatorApplication",
            {
                applicationId: args.id,
                userId: app?.userId,
                reviewedBy: args.reviewedBy as string,
                note: args.reviewNote,
            }
        );

        return result;
    },
});

/**
 * Resubmit an application after more-info or rejection. User-only.
 */
export const resubmit = mutation({
    args: {
        tenantId: v.id("tenants"),
        id: v.string(),
        userId: v.id("users"),
        displayName: v.optional(v.string()),
        bio: v.optional(v.string()),
        niche: v.optional(v.string()),
        specialties: v.optional(v.array(v.string())),
        performanceProof: v.optional(v.string()),
        trackRecordUrl: v.optional(v.string()),
        socialLinks: socialLinksValidator,
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        await requireActiveUser(ctx, args.userId);
        await requireTenantMember(ctx, args.userId, args.tenantId);

        await rateLimit(ctx, {
            name: "submitCreatorApplication",
            key: rateLimitKeys.user(args.userId as string),
            throws: true,
        });

        const result = await ctx.runMutation(
            components.creatorApplication.functions.resubmit,
            {
                id: args.id,
                userId: args.userId as string,
                displayName: args.displayName,
                bio: args.bio,
                niche: args.niche,
                specialties: args.specialties,
                performanceProof: args.performanceProof,
                trackRecordUrl: args.trackRecordUrl,
                socialLinks: args.socialLinks,
                metadata: args.metadata,
            }
        );

        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: args.userId as string,
            entityType: "creatorApplication",
            entityId: args.id,
            action: "resubmitted",
            newState: { status: "pending" },
            sourceComponent: "creatorApplication",
        });

        await emitEvent(
            ctx,
            "creator-application.application.resubmitted",
            args.tenantId as string,
            "creatorApplication",
            {
                applicationId: args.id,
                userId: args.userId as string,
            }
        );

        return result;
    },
});
