/**
 * DigilistSaaS SDK — Pick Feed Hooks
 *
 * React hooks for the customer-facing pick feed.
 * Following feed: picks from subscribed creators (always unlocked).
 * For You feed: discovery/trending picks (locked/unlocked based on subscription).
 */

import { useQuery } from "./convex-utils";
import { api } from "../convex-api";
import type { Id } from "../convex-api";
import type { Pick } from "./use-picks";

// ============================================================================
// Types
// ============================================================================

export interface FeedPick extends Pick {
    /** Whether the current user can see full pick details */
    isUnlocked: boolean;
}

export interface FeedParams {
    sport?: string;
    result?: string;
    limit?: number;
    cursor?: number;
}

// ============================================================================
// Transform
// ============================================================================

function transformFeedPick(raw: any): FeedPick {
    return {
        id: raw._id as string,
        tenantId: raw.tenantId,
        creatorId: raw.creatorId,
        event: raw.event,
        sport: raw.sport,
        league: raw.league,
        pickType: raw.pickType,
        selection: raw.selection,
        oddsAmerican: raw.oddsAmerican,
        oddsDecimal: raw.oddsDecimal,
        units: raw.units,
        confidence: raw.confidence,
        analysis: raw.analysis,
        result: raw.result,
        resultAt: raw.resultAt,
        gradedBy: raw.gradedBy,
        eventDate: raw.eventDate,
        status: raw.status,
        metadata: raw.metadata,
        createdAt: new Date(raw._creationTime).toISOString(),
        creator: raw.creator,
        isUnlocked: raw.isUnlocked ?? false,
    };
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * "Following" feed — picks from creators the user subscribes to.
 * All picks are unlocked. Returns empty if not logged in or no subscriptions.
 */
export function usePickFeedFollowing(
    tenantId: Id<"tenants"> | undefined,
    userId: string | undefined,
    params?: FeedParams
) {
    const data = useQuery(
        api.domain.picks.feedFollowing,
        tenantId
            ? { tenantId, userId, ...params }
            : "skip"
    );

    const isLoading = tenantId !== undefined && data === undefined;
    const picks: FeedPick[] = (data ?? []).map(transformFeedPick);

    return { data: picks, picks, isLoading, error: null };
}

/**
 * "For You" feed — discovery/trending picks across the platform.
 * Picks are marked as locked or unlocked based on subscription status.
 * Locked picks have redacted selection, odds, units, and analysis.
 */
export function usePickFeedForYou(
    tenantId: Id<"tenants"> | undefined,
    userId: string | undefined,
    params?: FeedParams
) {
    const data = useQuery(
        api.domain.picks.feedForYou,
        tenantId
            ? { tenantId, userId, ...params }
            : "skip"
    );

    const isLoading = tenantId !== undefined && data === undefined;
    const picks: FeedPick[] = (data ?? []).map(transformFeedPick);

    return { data: picks, picks, isLoading, error: null };
}
