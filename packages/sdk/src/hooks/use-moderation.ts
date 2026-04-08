/**
 * DigilistSaaS SDK - Listing Moderation Hooks
 *
 * React hooks for listing moderation operations.
 * Query hooks: { data, isLoading, error }
 * Mutation hooks: { mutate, mutateAsync, isLoading, error, isSuccess }
 */

import { useQuery as useConvexQuery, useMutation as useConvexMutation } from "convex/react";
import { api } from "../convex-api";

// ============================================================================
// Types
// ============================================================================

export type ModerationListingStatus =
    | 'draft'
    | 'pending_review'
    | 'approved'
    | 'rejected'
    | 'changes_requested'
    | 'published'
    | 'paused'
    | 'expired'
    | 'archived'
    | 'delisted'
    | 'maintenance';

export interface ModerationListing {
    _id: string;
    name: string;
    slug?: string;
    tenantId: string;
    tenantName?: string;
    categoryKey?: string;
    listingStatus?: ModerationListingStatus;
    riskLevel?: string;
    moderatedBy?: string;
    moderatedAt?: number;
    moderationNote?: string;
    autoApproved?: boolean;
    submittedForReviewAt?: number;
    _creationTime: number;
    [key: string]: unknown;
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Submit a listing for review.
 * Connected to: api.domain.listingModeration.submitForReview
 */
export function useSubmitForReview() {
    const mutationFn = useConvexMutation(api.domain.listingModeration.submitForReview);

    return {
        mutate: (args: { resourceId: string; tenantId: string }) => {
            mutationFn(args);
        },
        mutateAsync: (args: { resourceId: string; tenantId: string }) => {
            return mutationFn(args);
        },
    };
}

/**
 * Approve a listing (super admin).
 * Connected to: api.domain.listingModeration.approveListing
 */
export function useApproveListing() {
    const mutationFn = useConvexMutation(api.domain.listingModeration.approveListing);

    return {
        mutate: (args: { resourceId: string; tenantId: string; moderatorId: string; note?: string }) => {
            mutationFn(args);
        },
        mutateAsync: (args: { resourceId: string; tenantId: string; moderatorId: string; note?: string }) => {
            return mutationFn(args);
        },
    };
}

/**
 * Reject a listing (super admin).
 * Connected to: api.domain.listingModeration.rejectListing
 */
export function useRejectListing() {
    const mutationFn = useConvexMutation(api.domain.listingModeration.rejectListing);

    return {
        mutate: (args: { resourceId: string; tenantId: string; moderatorId: string; note: string }) => {
            mutationFn(args);
        },
        mutateAsync: (args: { resourceId: string; tenantId: string; moderatorId: string; note: string }) => {
            return mutationFn(args);
        },
    };
}

/**
 * Request changes on a listing (super admin).
 * Connected to: api.domain.listingModeration.requestChanges
 */
export function useRequestChanges() {
    const mutationFn = useConvexMutation(api.domain.listingModeration.requestChanges);

    return {
        mutate: (args: { resourceId: string; tenantId: string; moderatorId: string; note: string }) => {
            mutationFn(args);
        },
        mutateAsync: (args: { resourceId: string; tenantId: string; moderatorId: string; note: string }) => {
            return mutationFn(args);
        },
    };
}

/**
 * Pause a published listing (owner self-service).
 * Connected to: api.domain.listingModeration.pauseListing
 */
export function usePauseListing() {
    const mutationFn = useConvexMutation(api.domain.listingModeration.pauseListing);

    return {
        mutate: (args: { resourceId: string; tenantId: string }) => {
            mutationFn(args);
        },
        mutateAsync: (args: { resourceId: string; tenantId: string }) => {
            return mutationFn(args);
        },
    };
}

/**
 * Resume a paused listing (owner self-service).
 * Connected to: api.domain.listingModeration.resumeListing
 */
export function useResumeListing() {
    const mutationFn = useConvexMutation(api.domain.listingModeration.resumeListing);

    return {
        mutate: (args: { resourceId: string; tenantId: string }) => {
            mutationFn(args);
        },
        mutateAsync: (args: { resourceId: string; tenantId: string }) => {
            return mutationFn(args);
        },
    };
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch all listings pending review (super admin moderation queue).
 * Connected to: api.domain.listingModeration.listPendingReview
 */
export function usePendingReviewListings() {
    const data = useConvexQuery(api.domain.listingModeration.listPendingReview, {});

    const isLoading = data === undefined;

    return {
        data: (data ?? []) as ModerationListing[],
        isLoading,
        error: null,
    };
}

/**
 * Fetch listings by status for a specific tenant (owner view).
 * Connected to: api.domain.listingModeration.listByTenantAndStatus
 */
export function useListingsByStatus(
    tenantId: string | undefined,
    status?: ModerationListingStatus
) {
    const data = useConvexQuery(
        api.domain.listingModeration.listByTenantAndStatus,
        tenantId ? { tenantId, listingStatus: status } : "skip"
    );

    const isLoading = tenantId !== undefined && data === undefined;

    return {
        data: (data ?? []) as ModerationListing[],
        isLoading,
        error: null,
    };
}
