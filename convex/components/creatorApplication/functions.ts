/**
 * Creator Application Component Functions
 *
 * Pure component implementation — no auth/permissions/audit (those live in the facade).
 * All external IDs are v.string() per component isolation rules.
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// Social links validator (reused across mutations)
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
 * List applications for a tenant, optionally filtered by status.
 */
export const list = query({
    args: {
        tenantId: v.string(),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, status, limit }) => {
        const maxResults = limit ?? 50;

        if (status) {
            return ctx.db
                .query("applications")
                .withIndex("by_tenant_and_status", (q) =>
                    q.eq("tenantId", tenantId).eq("status", status)
                )
                .order("desc")
                .take(maxResults);
        }

        return ctx.db
            .query("applications")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .order("desc")
            .take(maxResults);
    },
});

/**
 * Get a single application by ID.
 */
export const get = query({
    args: { id: v.string() },
    returns: v.any(),
    handler: async (ctx, { id }) => {
        const applications = await ctx.db
            .query("applications")
            .take(500);
        return applications.find((a) => a._id === id) ?? null;
    },
});

/**
 * Get the latest application for a user within a tenant.
 */
export const getByUser = query({
    args: {
        tenantId: v.string(),
        userId: v.string(),
    },
    returns: v.any(),
    handler: async (ctx, { tenantId, userId }) => {
        return ctx.db
            .query("applications")
            .withIndex("by_tenant_and_user", (q) =>
                q.eq("tenantId", tenantId).eq("userId", userId)
            )
            .order("desc")
            .first();
    },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Submit a new creator application.
 * Rejects if the user already has a pending or approved application.
 */
export const submit = mutation({
    args: {
        tenantId: v.string(),
        userId: v.string(),
        displayName: v.string(),
        bio: v.string(),
        niche: v.string(),
        specialties: v.optional(v.array(v.string())),
        performanceProof: v.optional(v.string()),
        trackRecordUrl: v.optional(v.string()),
        socialLinks: socialLinksValidator,
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        // Check for existing pending or approved application
        const existing = await ctx.db
            .query("applications")
            .withIndex("by_tenant_and_user", (q) =>
                q.eq("tenantId", args.tenantId).eq("userId", args.userId)
            )
            .order("desc")
            .first();

        if (existing && (existing.status === "pending" || existing.status === "approved")) {
            throw new Error(
                existing.status === "pending"
                    ? "You already have a pending application"
                    : "You are already an approved creator"
            );
        }

        const id = await ctx.db.insert("applications", {
            tenantId: args.tenantId,
            userId: args.userId,
            displayName: args.displayName,
            bio: args.bio,
            niche: args.niche,
            specialties: args.specialties,
            performanceProof: args.performanceProof,
            trackRecordUrl: args.trackRecordUrl,
            socialLinks: args.socialLinks,
            status: "pending",
            submittedAt: Date.now(),
            previousApplicationId: existing?._id as string | undefined,
            metadata: args.metadata,
        });

        return { id: id as string };
    },
});

/**
 * Approve a creator application.
 */
export const approve = mutation({
    args: {
        id: v.string(),
        reviewedBy: v.string(),
        reviewNote: v.optional(v.string()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, reviewedBy, reviewNote }) => {
        const app = await ctx.db
            .query("applications")
            .take(500)
            .then((apps) => apps.find((a) => a._id === id));

        if (!app) {
            throw new Error("Application not found");
        }
        if (app.status !== "pending" && app.status !== "more_info_requested") {
            throw new Error(`Cannot approve application with status "${app.status}"`);
        }

        await ctx.db.patch(app._id, {
            status: "approved",
            reviewedBy,
            reviewedAt: Date.now(),
            reviewNote,
        });

        return { success: true };
    },
});

/**
 * Reject a creator application.
 */
export const reject = mutation({
    args: {
        id: v.string(),
        reviewedBy: v.string(),
        reviewNote: v.optional(v.string()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, reviewedBy, reviewNote }) => {
        const app = await ctx.db
            .query("applications")
            .take(500)
            .then((apps) => apps.find((a) => a._id === id));

        if (!app) {
            throw new Error("Application not found");
        }
        if (app.status !== "pending" && app.status !== "more_info_requested") {
            throw new Error(`Cannot reject application with status "${app.status}"`);
        }

        await ctx.db.patch(app._id, {
            status: "rejected",
            reviewedBy,
            reviewedAt: Date.now(),
            reviewNote,
        });

        return { success: true };
    },
});

/**
 * Request more information from the applicant.
 */
export const requestMoreInfo = mutation({
    args: {
        id: v.string(),
        reviewedBy: v.string(),
        reviewNote: v.string(),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, reviewedBy, reviewNote }) => {
        const app = await ctx.db
            .query("applications")
            .take(500)
            .then((apps) => apps.find((a) => a._id === id));

        if (!app) {
            throw new Error("Application not found");
        }
        if (app.status !== "pending") {
            throw new Error(`Cannot request more info for application with status "${app.status}"`);
        }

        await ctx.db.patch(app._id, {
            status: "more_info_requested",
            reviewedBy,
            reviewedAt: Date.now(),
            reviewNote,
        });

        return { success: true };
    },
});

/**
 * Resubmit an application after more info was requested or after rejection.
 * Updates the existing application with new data and resets to "pending".
 */
export const resubmit = mutation({
    args: {
        id: v.string(),
        userId: v.string(),
        displayName: v.optional(v.string()),
        bio: v.optional(v.string()),
        niche: v.optional(v.string()),
        specialties: v.optional(v.array(v.string())),
        performanceProof: v.optional(v.string()),
        trackRecordUrl: v.optional(v.string()),
        socialLinks: socialLinksValidator,
        metadata: v.optional(v.any()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, userId, ...updates }) => {
        const app = await ctx.db
            .query("applications")
            .take(500)
            .then((apps) => apps.find((a) => a._id === id));

        if (!app) {
            throw new Error("Application not found");
        }
        if (app.userId !== userId) {
            throw new Error("You can only resubmit your own application");
        }
        if (app.status !== "more_info_requested" && app.status !== "rejected") {
            throw new Error(`Cannot resubmit application with status "${app.status}"`);
        }

        // Build patch with only provided fields
        const patch: Record<string, unknown> = {
            status: "pending",
            resubmittedAt: Date.now(),
        };
        if (updates.displayName !== undefined) patch.displayName = updates.displayName;
        if (updates.bio !== undefined) patch.bio = updates.bio;
        if (updates.niche !== undefined) patch.niche = updates.niche;
        if (updates.specialties !== undefined) patch.specialties = updates.specialties;
        if (updates.performanceProof !== undefined) patch.performanceProof = updates.performanceProof;
        if (updates.trackRecordUrl !== undefined) patch.trackRecordUrl = updates.trackRecordUrl;
        if (updates.socialLinks !== undefined) patch.socialLinks = updates.socialLinks;
        if (updates.metadata !== undefined) patch.metadata = updates.metadata;

        await ctx.db.patch(app._id, patch);

        return { success: true };
    },
});
