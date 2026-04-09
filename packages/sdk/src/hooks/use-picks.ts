/**
 * DigilistSaaS SDK - Picks Hooks
 *
 * React hooks for creator pick operations, wired to Convex backend.
 * Query hooks: { data, picks, isLoading, error }
 * Mutation hooks: { mutate, mutateAsync, isLoading, error }
 */

import { useQuery as useConvexQuery, useMutation as useConvexMutation } from "convex/react";
import { api } from "../convex-api";
import type { Id } from "../convex-api";

// ============================================================================
// Types
// ============================================================================

export interface Pick {
    id: string;
    tenantId: string;
    creatorId: string;
    event: string;
    sport: string;
    league?: string;
    pickType: PickType;
    /** Null when gated (viewer lacks active subscription). */
    selection: string | null;
    /** Null when gated. */
    oddsAmerican: string | null;
    /** Null when gated. */
    oddsDecimal: number | null;
    /** Null when gated. */
    units: number | null;
    confidence: Confidence;
    /** Null when gated. */
    analysis?: string | null;
    result: PickResult;
    resultAt?: number;
    gradedBy?: string;
    eventDate?: number;
    status: PickStatus;
    metadata?: Record<string, unknown>;
    createdAt: string;
    /** True when the viewer lacks an active subscription — premium fields are redacted. */
    isGated: boolean;
    // Enriched from facade
    creator?: { id: string; name?: string; email?: string; displayName?: string; verified?: boolean };
}

export type PickType = "spread" | "moneyline" | "total" | "prop" | "parlay_leg";
export type Confidence = "low" | "medium" | "high";
export type PickResult = "pending" | "won" | "lost" | "push" | "void";
export type PickStatus = "draft" | "published" | "archived";

export interface CreatePickInput {
    tenantId: Id<"tenants">;
    creatorId: Id<"users">;
    event: string;
    sport: string;
    league?: string;
    pickType: PickType;
    selection: string;
    oddsAmerican: string;
    oddsDecimal: number;
    units: number;
    confidence: Confidence;
    analysis?: string;
    eventDate?: number;
    status?: PickStatus;
    metadata?: Record<string, unknown>;
}

export interface UpdatePickInput {
    id: string;
    callerId: Id<"users">;
    event?: string;
    sport?: string;
    league?: string;
    pickType?: PickType;
    selection?: string;
    oddsAmerican?: string;
    oddsDecimal?: number;
    units?: number;
    confidence?: Confidence;
    analysis?: string;
    eventDate?: number;
    status?: PickStatus;
    metadata?: Record<string, unknown>;
}

export interface GradePickInput {
    id: string;
    result: "won" | "lost" | "push" | "void";
    gradedBy: Id<"users">;
}

export interface CreatorStats {
    totalPicks: number;
    wins: number;
    losses: number;
    pushes: number;
    voids: number;
    pending: number;
    winRate: number;
    netUnits: number;
    roi: number;
}

export interface CreatorProfile {
    id: string;
    name?: string;
    displayName?: string;
    email?: string;
    avatarUrl?: string;
    role: string;
    verified: boolean;
    verifiedAt: number | null;
    stats: CreatorStats;
    recentPicks: Pick[];
}

// ============================================================================
// Transform
// ============================================================================

function transformPick(raw: any): Pick {
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
        isGated: raw.isGated ?? false,
        creator: raw.creator,
    };
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch picks for a tenant, with optional filters.
 * Pass `viewerId` to enable subscription gating — premium fields
 * will be redacted for non-subscribers.
 * Connected to: api.domain.picks.list
 */
export function usePicks(
    tenantId: Id<"tenants"> | undefined,
    params?: {
        creatorId?: string;
        sport?: string;
        result?: string;
        status?: string;
        limit?: number;
        viewerId?: string;
    }
) {
    const data = useConvexQuery(
        api.domain.picks.list,
        tenantId ? { tenantId, ...params } : "skip"
    );

    const isLoading = tenantId !== undefined && data === undefined;
    const picks: Pick[] = (data ?? []).map(transformPick);

    return { data: picks, picks, isLoading, error: null };
}

/**
 * Fetch a single pick by ID.
 * Pass `viewerId` to enable subscription gating.
 * Connected to: api.domain.picks.get
 */
export function usePick(id: string | undefined, viewerId?: string) {
    const data = useConvexQuery(
        api.domain.picks.get,
        id ? { id, viewerId } : "skip"
    );

    const isLoading = id !== undefined && data === undefined;
    const pick: Pick | null = data ? transformPick(data) : null;

    return { data: pick, pick, isLoading, error: null };
}

/**
 * Fetch creator stats: win rate, ROI, record.
 * Connected to: api.domain.picks.creatorStats
 */
export function useCreatorStats(
    tenantId: Id<"tenants"> | undefined,
    creatorId: string | undefined
) {
    const data = useConvexQuery(
        api.domain.picks.creatorStats,
        tenantId && creatorId ? { tenantId, creatorId } : "skip"
    );

    const isLoading = (tenantId !== undefined && creatorId !== undefined) && data === undefined;
    const stats: CreatorStats | null = data ?? null;

    return { data: stats, stats, isLoading, error: null };
}

/**
 * Fetch a creator's public profile: user info, stats, and recent picks.
 * Connected to: api.domain.picks.creatorProfile
 */
export function useCreatorProfile(
    tenantId: Id<"tenants"> | undefined,
    creatorId: string | undefined,
    viewerId?: string
) {
    const data = useConvexQuery(
        api.domain.picks.creatorProfile,
        tenantId && creatorId ? { tenantId, creatorId, viewerId } : "skip"
    );

    const isLoading = (tenantId !== undefined && creatorId !== undefined) && data === undefined;

    const profile: CreatorProfile | null = data
        ? {
            id: data.id,
            name: data.name,
            displayName: data.displayName,
            email: data.email,
            avatarUrl: data.avatarUrl,
            role: data.role,
            verified: data.verified ?? false,
            verifiedAt: data.verifiedAt ?? null,
            stats: data.stats,
            recentPicks: (data.recentPicks ?? []).map(transformPick),
        }
        : null;

    return { data: profile, profile, isLoading, error: null };
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new pick.
 * Connected to: api.domain.picks.create
 */
export function useCreatePick() {
    const mutation = useConvexMutation(api.domain.picks.create);

    return {
        mutate: (input: CreatePickInput) => mutation(input),
        mutateAsync: async (input: CreatePickInput) => mutation(input),
        isLoading: false,
        error: null,
    };
}

/**
 * Update a pick.
 * Connected to: api.domain.picks.update
 */
export function useUpdatePick() {
    const mutation = useConvexMutation(api.domain.picks.update);

    return {
        mutate: (input: UpdatePickInput) => mutation(input),
        mutateAsync: async (input: UpdatePickInput) => mutation(input),
        isLoading: false,
        error: null,
    };
}

/**
 * Grade a pick (set result).
 * Connected to: api.domain.picks.grade
 */
export function useGradePick() {
    const mutation = useConvexMutation(api.domain.picks.grade);

    return {
        mutate: (input: GradePickInput) => mutation(input),
        mutateAsync: async (input: GradePickInput) => mutation(input),
        isLoading: false,
        error: null,
    };
}

/**
 * Delete a pick.
 * Connected to: api.domain.picks.remove
 */
export function useDeletePick() {
    const mutation = useConvexMutation(api.domain.picks.remove);

    return {
        mutate: (input: { id: string; callerId: Id<"users"> }) => mutation(input),
        mutateAsync: async (input: { id: string; callerId: Id<"users"> }) => mutation(input),
        isLoading: false,
        error: null,
    };
}
