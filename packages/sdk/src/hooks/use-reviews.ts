/**
 * DigilistSaaS SDK - Reviews Hooks
 *
 * React hooks for review operations, wired to Convex backend.
 * Query hooks: { data, isLoading, error }
 * Mutation hooks: { mutate, mutateAsync, isLoading, error, isSuccess }
 */

import { useQuery as useConvexQuery, useMutation as useConvexMutation } from "convex/react";
import { api } from "../convex-api";
import type { Id } from "../convex-api";

// ============================================================================
// Types
// ============================================================================

export interface Review {
    id: string;
    tenantId: string;
    resourceId: string; // Maps to listingId in UI
    userId: string;
    rating: number;
    title?: string;
    body?: string; // 'text' in Convex, 'body' in SDK
    status: ReviewStatus;
    moderatorNotes?: string;
    moderatedBy?: string;
    moderatedAt?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt?: string;
    // Joined user data
    user?: { id: string; name?: string; email?: string };
    /** Enriched: user.name (from facade) */
    userName?: string;
    /** Enriched: user.email (from facade) */
    userEmail?: string;
    /** Enriched: resource.name (from facade) */
    listingName?: string;
}

export type ReviewStatus = "pending" | "approved" | "rejected" | "flagged";

export interface ReviewQueryParams {
    tenantId?: string;
    resourceId?: string; // listingId
    userId?: string;
    status?: ReviewStatus;
    minRating?: number;
    maxRating?: number;
    limit?: number;
    offset?: number;
}

export interface CreateReviewInput {
    tenantId: Id<"tenants">;
    resourceId: Id<"resources">;
    userId: Id<"users">;
    rating: number;
    title?: string;
    body?: string; // Will be mapped to 'text' for Convex
    metadata?: Record<string, unknown>;
}

export interface UpdateReviewInput {
    id: Id<"reviews">;
    rating?: number;
    title?: string;
    body?: string;
    metadata?: Record<string, unknown>;
}

export interface ModerateReviewInput {
    id: Id<"reviews">;
    status: "approved" | "rejected" | "flagged";
    moderatedBy: Id<"users">;
    moderatorNotes?: string;
}

export interface ReviewStats {
    averageRating: number;
    total: number;
    distribution: Record<number, number>;
    pending: number;
}

export interface ReviewSummary extends ReviewStats {
    recentReviews: Review[];
}

// ============================================================================
// Query Key Factory (for cache coordination)
// ============================================================================

export const reviewKeys = {
    all: ["reviews"] as const,
    lists: () => [...reviewKeys.all, "list"] as const,
    list: (params?: ReviewQueryParams) => [...reviewKeys.lists(), params] as const,
    details: () => [...reviewKeys.all, "detail"] as const,
    detail: (id: string) => [...reviewKeys.details(), id] as const,
    byResource: (resourceId: string, params?: Omit<ReviewQueryParams, "resourceId">) =>
        [...reviewKeys.all, "byResource", resourceId, params] as const,
    stats: (resourceId: string) => [...reviewKeys.all, "stats", resourceId] as const,
    summary: (resourceId: string) => [...reviewKeys.all, "summary", resourceId] as const,
    my: (userId: string, params?: ReviewQueryParams) => [...reviewKeys.all, "my", userId, params] as const,
};

// ============================================================================
// Transform helpers (extracted to transforms/review.ts)
// ============================================================================

import { transformReview } from '../transforms/review';

// ============================================================================
// Query Hooks (Wired to Convex)
// ============================================================================

/**
 * Fetch reviews for a tenant, optionally filtered by resource/status.
 * Connected to: api.domain.reviews.list
 */
export function useReviews(
    tenantId: Id<"tenants"> | undefined,
    params?: { resourceId?: Id<"resources">; status?: string; limit?: number }
) {
    const data = useConvexQuery(
        api.domain.reviews.list,
        tenantId ? { tenantId, ...params } : "skip"
    );

    const isLoading = tenantId !== undefined && data === undefined;
    const reviews: Review[] = (data ?? []).map(transformReview);

    return {
        data: { data: reviews },
        reviews,
        isLoading,
        error: null,
    };
}

/**
 * Fetch a single review by ID.
 * Connected to: api.domain.reviews.get
 */
export function useReview(id: Id<"reviews"> | undefined) {
    const data = useConvexQuery(
        api.domain.reviews.get,
        id ? { id } : "skip"
    );

    const isLoading = id !== undefined && data === undefined;
    const review: Review | null = data ? transformReview(data) : null;

    return {
        data: review ? { data: review } : null,
        review,
        isLoading,
        error: null,
    };
}

/**
 * Fetch reviews for a specific resource (listing).
 * Connected to: api.domain.reviews.list with resourceId filter
 */
export function useListingReviews(
    tenantId: Id<"tenants"> | undefined,
    resourceId: Id<"resources"> | undefined,
    params?: { status?: string; limit?: number }
) {
    const data = useConvexQuery(
        api.domain.reviews.list,
        tenantId && resourceId ? { tenantId, resourceId, ...params } : "skip"
    );

    const isLoading = tenantId !== undefined && resourceId !== undefined && data === undefined;
    const reviews: Review[] = (data ?? []).map(transformReview);

    return {
        data: { data: reviews },
        reviews,
        isLoading,
        error: null,
    };
}

/**
 * Fetch review statistics for a resource.
 * Connected to: api.domain.reviews.stats
 */
export function useReviewStats(resourceId: Id<"resources"> | undefined) {
    const data = useConvexQuery(
        api.domain.reviews.stats,
        resourceId ? { resourceId } : "skip"
    );

    const isLoading = resourceId !== undefined && data === undefined;

    const stats: ReviewStats | null = data
        ? {
            averageRating: data.averageRating,
            total: data.total,
            distribution: data.distribution,
            pending: data.pending,
        }
        : null;

    return {
        data: stats ? { data: stats } : null,
        stats,
        isLoading,
        error: null,
    };
}

/**
 * Fetch review summary for a resource (stats + recent reviews).
 * Combines stats and list queries.
 */
export function useReviewSummary(
    tenantId: Id<"tenants"> | undefined,
    resourceId: Id<"resources"> | undefined
) {
    const statsResult = useReviewStats(resourceId);
    const reviewsResult = useListingReviews(tenantId, resourceId, { status: "approved", limit: 5 });

    const isLoading = statsResult.isLoading || reviewsResult.isLoading;

    const summary: ReviewSummary | null =
        statsResult.stats && reviewsResult.reviews
            ? {
                ...statsResult.stats,
                recentReviews: reviewsResult.reviews,
            }
            : null;

    return {
        data: summary ? { data: summary } : null,
        summary,
        isLoading,
        error: null,
    };
}

/**
 * Fetch the current user's reviews.
 * Connected to: api.domain.reviews.list filtered by user
 */
export function useMyReviews(
    tenantId: Id<"tenants"> | undefined,
    userId: Id<"users"> | undefined,
    params?: { limit?: number }
) {
    // We need to fetch by tenant and filter by user
    // The Convex function filters by-user via index
    const data = useConvexQuery(
        api.domain.reviews.list,
        tenantId ? { tenantId, limit: params?.limit } : "skip"
    );

    const isLoading = tenantId !== undefined && data === undefined;

    // Filter by userId on client (Convex query doesn't have userId filter built-in for tenant list)
    const allReviews: Review[] = (data ?? []).map(transformReview);
    const reviews = userId ? allReviews.filter(r => r.userId === userId) : [];

    return {
        data: { data: reviews },
        reviews,
        isLoading,
        error: null,
    };
}

// ============================================================================
// Mutation Hooks (Wired to Convex)
// ============================================================================

/**
 * Create a new review.
 * Connected to: api.domain.reviews.create
 */
export function useCreateReview() {
    const mutation = useConvexMutation(api.domain.reviews.create);

    return {
        mutate: (input: CreateReviewInput) => {
            mutation({
                tenantId: input.tenantId,
                resourceId: input.resourceId,
                userId: input.userId,
                rating: input.rating,
                title: input.title,
                text: input.body, // Map 'body' to 'text'
                metadata: input.metadata,
            });
        },
        mutateAsync: async (input: CreateReviewInput) => {
            const result = await mutation({
                tenantId: input.tenantId,
                resourceId: input.resourceId,
                userId: input.userId,
                rating: input.rating,
                title: input.title,
                text: input.body,
                metadata: input.metadata,
            });
            return result;
        },
        isLoading: false,
        error: null,
        isSuccess: false,
    };
}

/**
 * Update an existing review.
 * Connected to: api.domain.reviews.update
 */
export function useUpdateReview() {
    const mutation = useConvexMutation(api.domain.reviews.update);

    return {
        mutate: (input: UpdateReviewInput) => {
            mutation({
                id: input.id,
                rating: input.rating,
                title: input.title,
                text: input.body,
                metadata: input.metadata,
            });
        },
        mutateAsync: async (input: UpdateReviewInput) => {
            const result = await mutation({
                id: input.id,
                rating: input.rating,
                title: input.title,
                text: input.body,
                metadata: input.metadata,
            });
            return result;
        },
        isLoading: false,
        error: null,
        isSuccess: false,
    };
}

/**
 * Delete a review.
 * Connected to: api.domain.reviews.remove
 */
export function useDeleteReview() {
    const mutation = useConvexMutation(api.domain.reviews.remove);

    return {
        mutate: (id: Id<"reviews">) => {
            mutation({ id });
        },
        mutateAsync: async (id: Id<"reviews">) => {
            const result = await mutation({ id });
            return result;
        },
        isLoading: false,
        error: null,
        isSuccess: false,
    };
}

/**
 * Moderate a review (approve, reject, or flag).
 * Connected to: api.domain.reviews.moderate
 */
export function useModerateReview() {
    const mutation = useConvexMutation(api.domain.reviews.moderate);

    return {
        mutate: (input: ModerateReviewInput) => {
            mutation({
                id: input.id,
                status: input.status,
                moderatedBy: input.moderatedBy,
                moderationNote: input.moderatorNotes,
            });
        },
        mutateAsync: async (input: ModerateReviewInput) => {
            const result = await mutation({
                id: input.id,
                status: input.status,
                moderatedBy: input.moderatedBy,
                moderationNote: input.moderatorNotes,
            });
            return result;
        },
        isLoading: false,
        error: null,
        isSuccess: false,
    };
}

/**
 * Approve a review (convenience wrapper around moderate).
 */
export function useApproveReview() {
    const moderateMutation = useModerateReview();

    return {
        mutate: (args: { id: Id<"reviews">; moderatedBy: Id<"users">; notes?: string }) => {
            moderateMutation.mutate({
                id: args.id,
                status: "approved",
                moderatedBy: args.moderatedBy,
                moderatorNotes: args.notes,
            });
        },
        mutateAsync: async (args: { id: Id<"reviews">; moderatedBy: Id<"users">; notes?: string }) => {
            return moderateMutation.mutateAsync({
                id: args.id,
                status: "approved",
                moderatedBy: args.moderatedBy,
                moderatorNotes: args.notes,
            });
        },
        isLoading: false,
        error: null,
        isSuccess: false,
    };
}

/**
 * Reject a review (convenience wrapper around moderate).
 */
export function useRejectReview() {
    const moderateMutation = useModerateReview();

    return {
        mutate: (args: { id: Id<"reviews">; moderatedBy: Id<"users">; notes?: string }) => {
            moderateMutation.mutate({
                id: args.id,
                status: "rejected",
                moderatedBy: args.moderatedBy,
                moderatorNotes: args.notes,
            });
        },
        mutateAsync: async (args: { id: Id<"reviews">; moderatedBy: Id<"users">; notes?: string }) => {
            return moderateMutation.mutateAsync({
                id: args.id,
                status: "rejected",
                moderatedBy: args.moderatedBy,
                moderatorNotes: args.notes,
            });
        },
        isLoading: false,
        error: null,
        isSuccess: false,
    };
}

// ============================================================================
// Helpful Vote Hooks (Wired to Convex)
// ============================================================================

/**
 * Check if a user has voted a review as helpful.
 * Connected to: api.domain.reviews.hasVotedHelpful
 */
export function useHasVotedHelpful(userId: Id<"users"> | undefined, reviewId: string | undefined) {
    const data = useConvexQuery(
        api.domain.reviews.hasVotedHelpful,
        userId && reviewId ? { userId, reviewId } : "skip"
    );

    return {
        hasVoted: data ?? false,
        isLoading: userId !== undefined && reviewId !== undefined && data === undefined,
    };
}

/**
 * Mark a review as helpful.
 * Connected to: api.domain.reviews.markHelpful
 */
export function useMarkReviewHelpful() {
    const mutation = useConvexMutation(api.domain.reviews.markHelpful);

    return {
        mutate: (args: { tenantId: Id<"tenants">; reviewId: string; userId: Id<"users"> }) => {
            mutation({
                tenantId: args.tenantId,
                reviewId: args.reviewId,
                userId: args.userId,
            });
        },
        mutateAsync: async (args: { tenantId: Id<"tenants">; reviewId: string; userId: Id<"users"> }) => {
            return mutation({
                tenantId: args.tenantId,
                reviewId: args.reviewId,
                userId: args.userId,
            });
        },
        isLoading: false,
        error: null,
        isSuccess: false,
    };
}

/**
 * Mark a review as unhelpful (downvote).
 * Connected to: api.domain.reviews.markUnhelpful
 */
export function useMarkReviewUnhelpful() {
    const mutation = useConvexMutation(api.domain.reviews.markUnhelpful);

    return {
        mutate: (args: { tenantId: Id<"tenants">; reviewId: string; userId: Id<"users"> }) => {
            mutation({
                tenantId: args.tenantId,
                reviewId: args.reviewId,
                userId: args.userId,
            });
        },
        mutateAsync: async (args: { tenantId: Id<"tenants">; reviewId: string; userId: Id<"users"> }) => {
            return mutation({
                tenantId: args.tenantId,
                reviewId: args.reviewId,
                userId: args.userId,
            });
        },
        isLoading: false,
        error: null,
        isSuccess: false,
    };
}

/**
 * Remove a helpful vote from a review.
 * Connected to: api.domain.reviews.unmarkHelpful
 */
export function useUnmarkReviewHelpful() {
    const mutation = useConvexMutation(api.domain.reviews.unmarkHelpful);

    return {
        mutate: (args: { reviewId: string; userId: Id<"users"> }) => {
            mutation({
                reviewId: args.reviewId,
                userId: args.userId,
            });
        },
        mutateAsync: async (args: { reviewId: string; userId: Id<"users"> }) => {
            return mutation({
                reviewId: args.reviewId,
                userId: args.userId,
            });
        },
        isLoading: false,
        error: null,
        isSuccess: false,
    };
}
