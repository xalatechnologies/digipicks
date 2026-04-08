/**
 * DigilistSaaS SDK - Leaderboard Hooks
 *
 * React hooks for the creator leaderboard, wired to Convex backend.
 * Real-time updates via Convex subscriptions — leaderboard reflects
 * latest graded picks without manual refresh.
 *
 * Connected to: api.domain.picks.leaderboard
 */

import { useQuery as useConvexQuery } from "convex/react";
import { api } from "../convex-api";
import type { Id } from "../convex-api";

// ============================================================================
// Types
// ============================================================================

export type LeaderboardTimeframe = "30d" | "90d" | "all";
export type LeaderboardSortBy = "roi" | "winRate" | "streak" | "totalPicks";
export type StreakType = "W" | "L" | "none";

export interface LeaderboardEntry {
    rank: number;
    creatorId: string;
    totalPicks: number;
    wins: number;
    losses: number;
    pushes: number;
    winRate: number;
    netUnits: number;
    roi: number;
    currentStreak: number;
    streakType: StreakType;
    avgOdds: number;
    creator: {
        id: string;
        name?: string;
        displayName?: string;
        email?: string;
        avatarUrl?: string;
    } | null;
}

export interface UseLeaderboardParams {
    sport?: string;
    timeframe?: LeaderboardTimeframe;
    sortBy?: LeaderboardSortBy;
    limit?: number;
}

// ============================================================================
// Transform
// ============================================================================

function transformEntry(raw: any): LeaderboardEntry {
    return {
        rank: raw.rank,
        creatorId: raw.creatorId,
        totalPicks: raw.totalPicks,
        wins: raw.wins,
        losses: raw.losses,
        pushes: raw.pushes,
        winRate: raw.winRate,
        netUnits: raw.netUnits,
        roi: raw.roi,
        currentStreak: raw.currentStreak,
        streakType: raw.streakType,
        avgOdds: raw.avgOdds,
        creator: raw.creator,
    };
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch the creator leaderboard for a tenant.
 * Real-time: updates automatically when picks are graded.
 *
 * @param tenantId - Tenant to fetch leaderboard for
 * @param params - Optional filters (sport, timeframe, sortBy, limit)
 */
export function useLeaderboard(
    tenantId: Id<"tenants"> | undefined,
    params?: UseLeaderboardParams
) {
    const data = useConvexQuery(
        api.domain.picks.leaderboard,
        tenantId ? { tenantId, ...params } : "skip"
    );

    const isLoading = tenantId !== undefined && data === undefined;
    const entries: LeaderboardEntry[] = (data ?? []).map(transformEntry);

    return { data: entries, entries, isLoading, error: null };
}
