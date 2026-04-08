/**
 * DigilistSaaS SDK — Pick Tracker Hooks
 *
 * React hooks for the personal pick tracker (tail/untail, P/L dashboard).
 * Subscribers can tail picks and see aggregated personal performance.
 */

import { useQuery, useMutation } from "./convex-utils";
import { api } from "../convex-api";
import type { Id } from "../convex-api";
import type { Pick } from "./use-picks";

// ============================================================================
// Types
// ============================================================================

export interface TailedPick extends Pick {
    tailId: string;
    tailedAt: number;
    startingBankroll?: number;
}

export interface SportBreakdown {
    sport: string;
    picks: number;
    wins: number;
    losses: number;
    netUnits: number;
    winRate: number;
}

export interface PersonalTrackerStats {
    totalTailed: number;
    wins: number;
    losses: number;
    pushes: number;
    voids: number;
    pending: number;
    winRate: number;
    netUnits: number;
    roi: number;
    totalWagered: number;
    currentBankroll?: number;
    sportBreakdown: SportBreakdown[];
}

// ============================================================================
// Transform
// ============================================================================

function transformTailedPick(raw: any): TailedPick {
    return {
        id: raw._id as string,
        tenantId: raw.tenantId,
        creatorId: raw.creatorId,
        event: raw.event,
        sport: raw.sport,
        league: raw.league,
        pickType: raw.pickType,
        selection: raw.selection ?? null,
        oddsAmerican: raw.oddsAmerican ?? null,
        oddsDecimal: raw.oddsDecimal ?? null,
        units: raw.units ?? null,
        confidence: raw.confidence,
        analysis: raw.analysis ?? null,
        result: raw.result,
        resultAt: raw.resultAt,
        gradedBy: raw.gradedBy,
        eventDate: raw.eventDate,
        status: raw.status,
        metadata: raw.metadata,
        createdAt: new Date(raw._creationTime).toISOString(),
        isGated: false,
        creator: raw.creator,
        tailId: raw.tailId,
        tailedAt: raw.tailedAt,
        startingBankroll: raw.startingBankroll,
    };
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch all tailed picks for the current user, with optional filters.
 * Connected to: api.domain.picks.myTailedPicks
 */
export function useMyTailedPicks(
    tenantId: Id<"tenants"> | undefined,
    userId: string | undefined,
    params?: {
        sport?: string;
        result?: string;
        creatorId?: string;
    }
) {
    const data = useQuery(
        api.domain.picks.myTailedPicks,
        tenantId && userId ? { tenantId, userId, ...params } : "skip"
    );

    const isLoading = (tenantId !== undefined && userId !== undefined) && data === undefined;
    const picks: TailedPick[] = (data ?? []).map(transformTailedPick);

    return { data: picks, picks, isLoading, error: null };
}

/**
 * Fetch personal P/L tracker stats for the current user.
 * Connected to: api.domain.picks.myTrackerStats
 */
export function useMyTrackerStats(
    tenantId: Id<"tenants"> | undefined,
    userId: string | undefined,
    startingBankroll?: number
) {
    const data = useQuery(
        api.domain.picks.myTrackerStats,
        tenantId && userId ? { tenantId, userId, startingBankroll } : "skip"
    );

    const isLoading = (tenantId !== undefined && userId !== undefined) && data === undefined;
    const stats: PersonalTrackerStats | null = data ?? null;

    return { data: stats, stats, isLoading, error: null };
}

/**
 * Check if current user has tailed a specific pick.
 * Connected to: api.domain.picks.isTailed
 */
export function useIsTailed(
    userId: string | undefined,
    pickId: string | undefined
) {
    const data = useQuery(
        api.domain.picks.isTailed,
        userId && pickId ? { userId, pickId } : "skip"
    );

    const isLoading = (userId !== undefined && pickId !== undefined) && data === undefined;

    return { isTailed: data ?? false, isLoading, error: null };
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Tail a pick — mark that the user is following this pick.
 * Connected to: api.domain.picks.tailPick
 */
export function useTailPick() {
    const mutation = useMutation(api.domain.picks.tailPick);

    return {
        mutate: (input: {
            tenantId: Id<"tenants">;
            userId: Id<"users">;
            pickId: string;
            startingBankroll?: number;
        }) => mutation(input),
        mutateAsync: async (input: {
            tenantId: Id<"tenants">;
            userId: Id<"users">;
            pickId: string;
            startingBankroll?: number;
        }) => mutation(input),
        isLoading: false,
        error: null,
    };
}

/**
 * Untail a pick — remove tracking.
 * Connected to: api.domain.picks.untailPick
 */
export function useUntailPick() {
    const mutation = useMutation(api.domain.picks.untailPick);

    return {
        mutate: (input: { userId: Id<"users">; pickId: string }) => mutation(input),
        mutateAsync: async (input: { userId: Id<"users">; pickId: string }) => mutation(input),
        isLoading: false,
        error: null,
    };
}
