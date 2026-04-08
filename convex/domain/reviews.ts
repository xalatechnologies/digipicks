/**
 * Reviews Facade
 *
 * Thin facade that delegates to the reviews component.
 * Preserves the existing API path (api.domain.reviews.*) for SDK compatibility.
 * Handles:
 *   - ID type conversion (typed Id<"tenants"> -> string for component)
 *   - Data enrichment (join user/resource data from core tables)
 *   - Audit logging via audit component
 */

import { mutation, query } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { requireActiveUser } from "../lib/auth";
import { requirePermission } from "../lib/permissions";
import { rateLimit, rateLimitKeys } from "../lib/rateLimits";
import { withAudit } from "../lib/auditHelpers";
import { emitEvent } from "../lib/eventBus";

// =============================================================================
// QUERY FACADES
// =============================================================================

/**
 * List reviews for a tenant, optionally filtered by resource.
 * Enriches results with user data from core tables.
 */
export const list = query({
    args: {
        tenantId: v.id("tenants"),
        resourceId: v.optional(v.string()),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, resourceId, status, limit }) => {
        // Delegate to component (convert typed IDs to strings)
        const reviews = await ctx.runQuery(components.reviews.functions.list, {
            tenantId: tenantId as string,
            resourceId: resourceId as string | undefined,
            status,
            limit,
        });

        // Batch fetch users and resources to avoid N+1
        const userIds = [...new Set(reviews.map((r: any) => r.userId).filter(Boolean))];
        const resourceIds = [...new Set(reviews.map((r: any) => r.resourceId).filter(Boolean))];

        const users = await Promise.all(userIds.map((id: string) => ctx.db.get(id as Id<"users">)));
        const userMap = new Map(users.filter(Boolean).map((u: any) => [u._id, u]));

        const resources = await Promise.all(
            resourceIds.map((id: string) =>
                ctx.runQuery(components.resources.queries.get, { id }).catch(() => null)
            )
        );
        const resourceEntries = resourceIds
            .map((id, i) => [id, resources[i]] as const)
            .filter((entry): entry is readonly [string, NonNullable<(typeof resources)[number]>] =>
                entry[1] != null
            );
        const resourceMap = new Map<string, { name?: string }>(resourceEntries);

        const withUsers = reviews.map((review: any) => {
            const user = review.userId ? userMap.get(review.userId) : null;
            const resource = review.resourceId ? resourceMap.get(review.resourceId) : null;
            return {
                ...review,
                user: user ? { id: user._id, name: user.name, email: user.email } : null,
                resourceName: resource?.name,
            };
        });

        return withUsers;
    },
});

/**
 * Get a single review by ID.
 * Enriches with user, resource, and moderator data.
 */
export const get = query({
    args: {
        id: v.string(),
    },
    handler: async (ctx, { id }) => {
        const review = await ctx.runQuery(components.reviews.functions.get, {
            id,
        });

        // Enrich with related data from core tables
        const user = review.userId
            ? await ctx.db.get(review.userId as Id<"users">)
            : null;
        const resource = review.resourceId
            ? await ctx.runQuery(components.resources.queries.get, {
                id: review.resourceId,
            }).catch(() => null)
            : null;
        const moderator = review.moderatedBy
            ? await ctx.db.get(review.moderatedBy as Id<"users">)
            : null;

        return {
            ...review,
            user: user
                ? { id: user._id, name: user.name, email: user.email }
                : null,
            resource: resource
                ? { id: resource._id, name: resource.name }
                : null,
            moderator: moderator
                ? { id: moderator._id, name: moderator.name }
                : null,
        };
    },
});

/**
 * Get review stats for a resource.
 */
export const stats = query({
    args: {
        resourceId: v.string(),
    },
    handler: async (ctx, { resourceId }) => {
        return ctx.runQuery(components.reviews.functions.stats, {
            resourceId,
        });
    },
});

/**
 * Check if a user has voted a review as helpful.
 */
export const hasVotedHelpful = query({
    args: {
        userId: v.id("users"),
        reviewId: v.string(),
    },
    handler: async (ctx, { userId, reviewId }) => {
        return ctx.runQuery(components.reviews.functions.hasVotedHelpful, {
            userId: userId as string,
            reviewId,
        });
    },
});

// =============================================================================
// MUTATION FACADES
// =============================================================================

/**
 * Create a new review.
 * Validates resource exists in core tables, then delegates to component.
 */
export const create = mutation({
    args: {
        tenantId: v.id("tenants"),
        resourceId: v.string(),
        userId: v.id("users"),
        rating: v.number(),
        title: v.optional(v.string()),
        text: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        await requireActiveUser(ctx, args.userId);

        // Rate limit: per-user review creation
        await rateLimit(ctx, {
            name: "createReview",
            key: rateLimitKeys.user(args.userId as string),
            throws: true,
        });

        // Validate resource exists in resources component
        const resource = await ctx.runQuery(components.resources.queries.get, {
            id: args.resourceId,
        });
        if (!resource) {
            throw new Error("Resource not found");
        }

        // Delegate to component
        const result = await ctx.runMutation(components.reviews.functions.create, {
            tenantId: args.tenantId as string,
            resourceId: args.resourceId,
            userId: args.userId as string,
            rating: args.rating,
            title: args.title,
            text: args.text,
            metadata: args.metadata,
        });

        // Create audit entry
        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: args.userId as string,
            entityType: "review",
            entityId: result.id,
            action: "created",
            newState: { rating: args.rating, resourceId: args.resourceId },
            sourceComponent: "reviews",
        });

        // Event bus
        await emitEvent(ctx, "reviews.review.created", args.tenantId as string, "reviews", {
            reviewId: result.id, resourceId: args.resourceId, rating: args.rating, userId: args.userId as string,
        });

        return result;
    },
});

/**
 * Update a review.
 */
export const update = mutation({
    args: {
        id: v.string(),
        rating: v.optional(v.number()),
        title: v.optional(v.string()),
        text: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, { id, ...updates }) => {
        const review = await ctx.runQuery(components.reviews.functions.get, { id });
        if (review) {
            await rateLimit(ctx, { name: "createReview", key: rateLimitKeys.user((review as any).userId), throws: true });
        }
        const result = await ctx.runMutation(components.reviews.functions.update, {
            id,
            ...updates,
        });
        await withAudit(ctx, {
            tenantId: (review as any)?.tenantId ?? "",
            entityType: "review",
            entityId: id,
            action: "updated",
            sourceComponent: "reviews",
            newState: updates,
        });
        return result;
    },
});

/**
 * Remove a review.
 */
export const remove = mutation({
    args: {
        id: v.string(),
    },
    handler: async (ctx, { id }) => {
        const review = await ctx.runQuery(components.reviews.functions.get, { id });
        if (review) {
            await rateLimit(ctx, { name: "createReview", key: rateLimitKeys.user((review as any).userId), throws: true });
        }
        const result = await ctx.runMutation(components.reviews.functions.remove, { id });
        await withAudit(ctx, {
            tenantId: (review as any)?.tenantId ?? "",
            entityType: "review",
            entityId: id,
            action: "removed",
            sourceComponent: "reviews",
            previousState: { rating: (review as any)?.rating, resourceId: (review as any)?.resourceId },
        });
        return result;
    },
});

/**
 * Mark a review as helpful.
 */
export const markHelpful = mutation({
    args: {
        tenantId: v.id("tenants"),
        reviewId: v.string(),
        userId: v.id("users"),
    },
    handler: async (ctx, { tenantId, reviewId, userId }) => {
        await requireActiveUser(ctx, userId);

        await rateLimit(ctx, {
            name: "markHelpful",
            key: rateLimitKeys.user(userId as string),
            throws: true,
        });

        const result = await ctx.runMutation(components.reviews.functions.markHelpful, {
            tenantId: tenantId as string,
            reviewId,
            userId: userId as string,
        });
        await withAudit(ctx, {
            tenantId: tenantId as string,
            userId: userId as string,
            entityType: "review",
            entityId: reviewId,
            action: "marked_helpful",
            sourceComponent: "reviews",
        });
        return result;
    },
});

/**
 * Mark a review as unhelpful (downvote).
 */
export const markUnhelpful = mutation({
    args: {
        tenantId: v.id("tenants"),
        reviewId: v.string(),
        userId: v.id("users"),
    },
    handler: async (ctx, { tenantId, reviewId, userId }) => {
        await requireActiveUser(ctx, userId);

        await rateLimit(ctx, {
            name: "markHelpful",
            key: rateLimitKeys.user(userId as string),
            throws: true,
        });

        const result = await ctx.runMutation(components.reviews.functions.markUnhelpful, {
            tenantId: tenantId as string,
            reviewId,
            userId: userId as string,
        });
        await withAudit(ctx, {
            tenantId: tenantId as string,
            userId: userId as string,
            entityType: "review",
            entityId: reviewId,
            action: "marked_unhelpful",
            sourceComponent: "reviews",
        });
        return result;
    },
});

/**
 * Remove a helpful vote from a review.
 */
export const unmarkHelpful = mutation({
    args: {
        reviewId: v.string(),
        userId: v.id("users"),
    },
    handler: async (ctx, { reviewId, userId }) => {
        await requireActiveUser(ctx, userId);

        const result = await ctx.runMutation(components.reviews.functions.unmarkHelpful, {
            reviewId,
            userId: userId as string,
        });
        await withAudit(ctx, {
            tenantId: "user",
            userId: userId as string,
            entityType: "review",
            entityId: reviewId,
            action: "unmarked_helpful",
            sourceComponent: "reviews",
        });
        return result;
    },
});

/**
 * Moderate a review (approve/reject/flag).
 */
export const moderate = mutation({
    args: {
        id: v.string(),
        status: v.union(
            v.literal("approved"),
            v.literal("rejected"),
            v.literal("flagged")
        ),
        moderatedBy: v.id("users"),
        moderationNote: v.optional(v.string()),
    },
    handler: async (ctx, { id, status, moderatedBy, moderationNote }) => {
        await requireActiveUser(ctx, moderatedBy);

        // Fetch review to get tenantId for permission check and audit
        const review = await ctx.runQuery(components.reviews.functions.get, { id });
        if (!review) throw new Error("Review not found");
        const tenantId = (review as any)?.tenantId ?? "";
        await requirePermission(ctx, moderatedBy, tenantId, "review:moderate");

        // Rate limit: per-user review moderation
        await rateLimit(ctx, {
            name: "moderateReview",
            key: rateLimitKeys.user(moderatedBy as string),
            throws: true,
        });

        const result = await ctx.runMutation(components.reviews.functions.moderate, {
            id,
            status,
            moderatedBy: moderatedBy as string,
            moderationNote,
        });

        // Create audit entry for moderation
        await withAudit(ctx, {
            tenantId: (review as any)?.tenantId ?? "",
            userId: moderatedBy as string,
            entityType: "review",
            entityId: id,
            action: `moderated_${status}`,
            newState: { status, moderationNote },
            sourceComponent: "reviews",
        });

        // Event bus
        await emitEvent(ctx, "reviews.review.moderated", (review as any)?.tenantId ?? "", "reviews", {
            reviewId: id, status, moderatedBy: moderatedBy as string,
        });

        return result;
    },
});
