/**
 * DigilistSaaS SDK - Creator Discovery Hook
 *
 * React hook for the creator marketplace/discovery page.
 * Aggregates creator stats, branding, and pricing via Convex backend.
 *
 * Connected to: api.domain.picks.discoverCreators
 */

import { useQuery as useConvexQuery } from "convex/react";
import { api } from "../convex-api";
import type { Id } from "../convex-api";

// ============================================================================
// Types
// ============================================================================

export interface DiscoveryCreator {
    creatorId: string;
    name: string;
    avatarUrl: string | null;
    tagline: string | null;
    sport: string | null;
    stats: {
        totalPicks: number;
        wins: number;
        losses: number;
        pushes: number;
        winRate: number;
        roi: number;
        netUnits: number;
        currentStreak: number;
        streakType: "W" | "L" | "none";
    };
    startingPrice: {
        amount: number;
        currency: string;
        interval: string;
    } | null;
    verified: boolean;
    verifiedAt: number | null;
}

export interface UseCreatorDiscoveryParams {
    search?: string;
    sport?: string;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Fetch discoverable creators for the marketplace page.
 * Real-time: updates when creator stats change.
 *
 * @param tenantId - Tenant to fetch creators for
 * @param params - Optional search/filter params
 */
export function useCreatorDiscovery(
    tenantId: Id<"tenants"> | undefined,
    params?: UseCreatorDiscoveryParams
) {
    const data = useConvexQuery(
        api.domain.picks.discoverCreators,
        tenantId ? { tenantId, ...params } : "skip"
    );

    const isLoading = tenantId !== undefined && data === undefined;
    const creators: DiscoveryCreator[] = (data ?? []) as DiscoveryCreator[];

    return { creators, isLoading };
}
