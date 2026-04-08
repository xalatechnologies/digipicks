/**
 * DigilistSaaS SDK — AI Insights Hooks
 *
 * React hooks for the subscriber insights dashboard.
 * Surfaces performance predictions, bankroll management suggestions,
 * and a composite dashboard view.
 */

import { useQuery } from "./convex-utils";
import { api } from "../convex-api";
import type { Id } from "../convex-api";

// ============================================================================
// Types
// ============================================================================

export interface StreakInfo {
    type: "win" | "loss" | "none";
    length: number;
}

export interface ConfidenceCalibration {
    confidence: string;
    picks: number;
    winRate: number;
    avgOdds: number;
    roi: number;
}

export interface BestEdge {
    sport: string;
    league?: string;
    pickType: string;
    picks: number;
    winRate: number;
    roi: number;
}

export interface PickTypeBreakdown {
    pickType: string;
    picks: number;
    winRate: number;
    roi: number;
}

export interface PerformancePredictions {
    currentStreak: StreakInfo;
    longestWinStreak: number;
    longestLossStreak: number;
    recentWinRate: number;
    overallWinRate: number;
    trend: "improving" | "declining" | "stable";
    confidenceCalibration: ConfidenceCalibration[];
    bestEdges: BestEdge[];
    pickTypeBreakdown: PickTypeBreakdown[];
    sampleSize: number;
    creator: {
        id: string;
        name: string;
        displayName?: string;
        avatarUrl?: string;
    } | null;
}

export interface KellySuggestion {
    confidence: string;
    historicalWinRate: number;
    avgOdds: number;
    kellyFraction: number;
    suggestedUnits: number;
    suggestedDollarAmount: number;
}

export interface RiskMetrics {
    maxDrawdown: number;
    maxDrawdownPercent: number;
    currentDrawdown: number;
    variance: number;
    sharpeRatio: number;
}

export interface BankrollProjection {
    next50PicksExpected: number;
    next100PicksExpected: number;
    breakEvenPicks?: number;
}

export interface BankrollInsights {
    kellySuggestions: KellySuggestion[];
    riskMetrics: RiskMetrics;
    projection: BankrollProjection;
    sampleSize: number;
}

export interface CreatorInsight {
    creatorId: string;
    creator: {
        id: string;
        name: string;
        displayName?: string;
        avatarUrl?: string;
    } | null;
    predictions: Omit<PerformancePredictions, "creator">;
}

export interface SubscriberDashboard {
    personalStats: {
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
        sportBreakdown: Array<{
            sport: string;
            picks: number;
            wins: number;
            losses: number;
            netUnits: number;
            winRate: number;
        }>;
    };
    bankrollInsights: BankrollInsights | null;
    creatorInsights: CreatorInsight[];
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Get AI-powered performance predictions for a creator.
 * Includes streak analysis, trend detection, confidence calibration,
 * best edges, and pick type breakdown.
 */
export function useCreatorPredictions(
    tenantId: Id<"tenants"> | undefined,
    creatorId: string | undefined,
): PerformancePredictions | undefined {
    return useQuery(
        api.domain.insights.creatorPredictions,
        tenantId && creatorId ? { tenantId, creatorId } : "skip",
    ) as PerformancePredictions | undefined;
}

/**
 * Get personalized bankroll management insights.
 * Returns Kelly-criterion sizing, risk metrics, and projections.
 */
export function useBankrollInsights(
    tenantId: Id<"tenants"> | undefined,
    userId: string | undefined,
    bankroll: number | undefined,
): BankrollInsights | undefined {
    return useQuery(
        api.domain.insights.bankrollInsights,
        tenantId && userId && bankroll !== undefined && bankroll > 0
            ? { tenantId, userId, bankroll }
            : "skip",
    ) as BankrollInsights | undefined;
}

/**
 * Get the full subscriber insights dashboard — personal stats,
 * bankroll insights, and creator predictions in one query.
 */
export function useSubscriberDashboard(
    tenantId: Id<"tenants"> | undefined,
    userId: string | undefined,
    bankroll?: number,
): SubscriberDashboard | undefined {
    return useQuery(
        api.domain.insights.subscriberDashboard,
        tenantId && userId ? { tenantId, userId, bankroll } : "skip",
    ) as SubscriberDashboard | undefined;
}
