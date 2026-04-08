/**
 * DigilistSaaS SDK - External Reviews Hooks
 *
 * React hooks for external reviews (Google Places, TripAdvisor).
 * Query hooks: { data, isLoading, error }
 * Mutation hooks: { mutate, mutateAsync, isLoading, error, isSuccess }
 */

import { useQuery as useConvexQuery, useMutation as useConvexMutation, useAction as useConvexAction } from "convex/react";
import { api } from "../convex-api";
import type { Id } from "../convex-api";

// ============================================================================
// Types
// ============================================================================

export type ExternalPlatform = "google_places" | "tripadvisor";

export interface ExternalReview {
    _id: string;
    tenantId: string;
    resourceId: string;
    platform: ExternalPlatform;
    externalId: string;
    rating: number;
    title?: string;
    text?: string;
    authorName: string;
    authorUrl?: string;
    externalCreatedAt: number;
    syncedAt: number;
    externalUrl?: string;
    isSuppressed?: boolean;
    metadata?: Record<string, unknown>;
    /** Enriched: resource name (from facade) */
    resourceName?: string;
}

export interface ExternalReviewStats {
    total: number;
    averageRating: number;
    byPlatform: Record<string, { total: number; averageRating: number }>;
}

export interface ExternalReviewsConfig {
    _id: string;
    tenantId: string;
    platform: ExternalPlatform;
    isEnabled: boolean;
    apiKey?: string; // Masked on read
    placeId?: string;
    locationId?: string;
    displayOnListing: boolean;
    lastSyncAt?: number;
    lastSyncStatus?: string;
    lastSyncError?: string;
}

export interface SaveExternalReviewsConfigInput {
    tenantId: Id<"tenants">;
    platform: ExternalPlatform;
    isEnabled: boolean;
    apiKey?: string;
    placeId?: string;
    locationId?: string;
    displayOnListing: boolean;
}

// ============================================================================
// Query Key Factory
// ============================================================================

export const externalReviewKeys = {
    all: ["externalReviews"] as const,
    lists: () => [...externalReviewKeys.all, "list"] as const,
    list: (params?: { tenantId?: string; resourceId?: string; platform?: string }) =>
        [...externalReviewKeys.lists(), params] as const,
    stats: (resourceId: string) => [...externalReviewKeys.all, "stats", resourceId] as const,
    config: (tenantId: string, platform: string) =>
        [...externalReviewKeys.all, "config", tenantId, platform] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch external reviews for a tenant, optionally filtered by resource/platform.
 * Connected to: api.domain.externalReviews.list
 */
export function useExternalReviews(
    tenantId: Id<"tenants"> | undefined,
    params?: { resourceId?: string; platform?: ExternalPlatform; limit?: number }
) {
    const data = useConvexQuery(
        api.domain.externalReviews.list,
        tenantId ? { tenantId, ...params } : "skip"
    );

    const isLoading = tenantId !== undefined && data === undefined;
    const reviews: ExternalReview[] = (data ?? []) as ExternalReview[];

    return {
        data: { data: reviews },
        reviews,
        isLoading,
        error: null,
    };
}

/**
 * Fetch external review stats for a resource.
 * Connected to: api.domain.externalReviews.stats
 */
export function useExternalReviewStats(resourceId: string | undefined) {
    const data = useConvexQuery(
        api.domain.externalReviews.stats,
        resourceId ? { resourceId } : "skip"
    );

    const isLoading = resourceId !== undefined && data === undefined;

    return {
        data: data as ExternalReviewStats | null,
        stats: data as ExternalReviewStats | null,
        isLoading,
        error: null,
    };
}

/**
 * Fetch platform config (masked API keys).
 * Connected to: api.domain.externalReviews.getConfig
 */
export function useExternalReviewsConfig(
    tenantId: Id<"tenants"> | undefined,
    platform: ExternalPlatform | undefined
) {
    const data = useConvexQuery(
        api.domain.externalReviews.getConfig,
        tenantId && platform ? { tenantId, platform } : "skip"
    );

    const isLoading = tenantId !== undefined && platform !== undefined && data === undefined;

    return {
        data: data as ExternalReviewsConfig | null,
        config: data as ExternalReviewsConfig | null,
        isLoading,
        error: null,
    };
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Save external reviews platform config.
 * Connected to: api.domain.externalReviews.saveConfig
 */
export function useSaveExternalReviewsConfig() {
    const mutation = useConvexMutation(api.domain.externalReviews.saveConfig);

    return {
        mutate: (input: SaveExternalReviewsConfigInput) => {
            mutation({
                tenantId: input.tenantId,
                platform: input.platform,
                isEnabled: input.isEnabled,
                apiKey: input.apiKey,
                placeId: input.placeId,
                locationId: input.locationId,
                displayOnListing: input.displayOnListing,
            });
        },
        mutateAsync: async (input: SaveExternalReviewsConfigInput) => {
            return mutation({
                tenantId: input.tenantId,
                platform: input.platform,
                isEnabled: input.isEnabled,
                apiKey: input.apiKey,
                placeId: input.placeId,
                locationId: input.locationId,
                displayOnListing: input.displayOnListing,
            });
        },
        isLoading: false,
        error: null,
        isSuccess: false,
    };
}

/**
 * Trigger manual sync of external reviews.
 * Connected to: api.domain.externalReviews.syncPlatform
 */
export function useSyncExternalReviews() {
    const syncAction = useConvexAction(api.domain.externalReviews.syncPlatform);

    return {
        mutate: (args: { tenantId: Id<"tenants">; platform: ExternalPlatform; resourceId?: string }) => {
            syncAction({
                tenantId: args.tenantId,
                platform: args.platform,
                resourceId: args.resourceId,
            });
        },
        mutateAsync: async (args: { tenantId: Id<"tenants">; platform: ExternalPlatform; resourceId?: string }) => {
            return syncAction({
                tenantId: args.tenantId,
                platform: args.platform,
                resourceId: args.resourceId,
            });
        },
        isLoading: false,
        error: null,
        isSuccess: false,
    };
}

/**
 * Suppress an external review.
 * Connected to: api.domain.externalReviews.suppress
 */
export function useSuppressExternalReview() {
    const mutation = useConvexMutation(api.domain.externalReviews.suppress);

    return {
        mutate: (args: { tenantId: Id<"tenants">; id: string }) => {
            mutation({ tenantId: args.tenantId, id: args.id });
        },
        mutateAsync: async (args: { tenantId: Id<"tenants">; id: string }) => {
            return mutation({ tenantId: args.tenantId, id: args.id });
        },
        isLoading: false,
        error: null,
        isSuccess: false,
    };
}

/**
 * Unsuppress an external review.
 * Connected to: api.domain.externalReviews.unsuppress
 */
export function useUnsuppressExternalReview() {
    const mutation = useConvexMutation(api.domain.externalReviews.unsuppress);

    return {
        mutate: (args: { tenantId: Id<"tenants">; id: string }) => {
            mutation({ tenantId: args.tenantId, id: args.id });
        },
        mutateAsync: async (args: { tenantId: Id<"tenants">; id: string }) => {
            return mutation({ tenantId: args.tenantId, id: args.id });
        },
        isLoading: false,
        error: null,
        isSuccess: false,
    };
}
