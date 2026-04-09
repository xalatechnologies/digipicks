/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    functions: {
      addPickCollaborator: FunctionReference<
        "mutation",
        "internal",
        {
          creatorId: string;
          pickId: string;
          role: string;
          splitPercent: number;
          tenantId: string;
        },
        { id: string },
        Name
      >;
      bankrollInsights: FunctionReference<
        "query",
        "internal",
        { bankroll: number; tenantId: string; userId: string },
        {
          kellySuggestions: Array<{
            avgOdds: number;
            confidence: string;
            historicalWinRate: number;
            kellyFraction: number;
            suggestedDollarAmount: number;
            suggestedUnits: number;
          }>;
          projection: {
            breakEvenPicks?: number;
            next100PicksExpected: number;
            next50PicksExpected: number;
          };
          riskMetrics: {
            currentDrawdown: number;
            maxDrawdown: number;
            maxDrawdownPercent: number;
            sharpeRatio: number;
            variance: number;
          };
          sampleSize: number;
        },
        Name
      >;
      create: FunctionReference<
        "mutation",
        "internal",
        {
          analysis?: string;
          confidence: string;
          creatorId: string;
          event: string;
          eventDate?: number;
          league?: string;
          metadata?: any;
          oddsAmerican: string;
          oddsDecimal: number;
          pickType: string;
          selection: string;
          sport: string;
          status?: string;
          tenantId: string;
          units: number;
        },
        { id: string },
        Name
      >;
      creatorStats: FunctionReference<
        "query",
        "internal",
        { creatorId: string; tenantId: string },
        {
          losses: number;
          netUnits: number;
          pending: number;
          pushes: number;
          roi: number;
          totalPicks: number;
          voids: number;
          winRate: number;
          wins: number;
        },
        Name
      >;
      creatorStatsBySport: FunctionReference<
        "query",
        "internal",
        { creatorId: string; tenantId: string },
        Array<{
          avgOdds: number;
          losses: number;
          netUnits: number;
          pushes: number;
          roi: number;
          sport: string;
          totalPicks: number;
          winRate: number;
          wins: number;
        }>,
        Name
      >;
      get: FunctionReference<
        "query",
        "internal",
        { id: string; tenantId?: string },
        any,
        Name
      >;
      grade: FunctionReference<
        "mutation",
        "internal",
        {
          gradedBy: string;
          id: string;
          result: "won" | "lost" | "push" | "void";
          tenantId?: string;
        },
        { success: boolean },
        Name
      >;
      isTailed: FunctionReference<
        "query",
        "internal",
        { pickId: string; userId: string },
        boolean,
        Name
      >;
      leaderboard: FunctionReference<
        "query",
        "internal",
        {
          limit?: number;
          sortBy?: "roi" | "winRate" | "streak" | "totalPicks";
          sport?: string;
          tenantId: string;
          timeframe?: "30d" | "90d" | "all";
        },
        Array<{
          avgOdds: number;
          creatorId: string;
          currentStreak: number;
          losses: number;
          netUnits: number;
          pushes: number;
          roi: number;
          streakType: "W" | "L" | "none";
          totalPicks: number;
          winRate: number;
          wins: number;
        }>,
        Name
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          creatorId?: string;
          limit?: number;
          result?: string;
          sport?: string;
          status?: string;
          tenantId: string;
        },
        Array<any>,
        Name
      >;
      listByModerationStatus: FunctionReference<
        "query",
        "internal",
        {
          creatorId?: string;
          limit?: number;
          moderationStatus?: string;
          tenantId: string;
        },
        Array<any>,
        Name
      >;
      listPickCollaborators: FunctionReference<
        "query",
        "internal",
        { pickId: string },
        Array<any>,
        Name
      >;
      listPickReports: FunctionReference<
        "query",
        "internal",
        { pickId: string; status?: string },
        Array<any>,
        Name
      >;
      listPicksByCollaborator: FunctionReference<
        "query",
        "internal",
        { creatorId: string; tenantId: string },
        Array<any>,
        Name
      >;
      listPublishedFeed: FunctionReference<
        "query",
        "internal",
        {
          creatorIds?: Array<string>;
          cursor?: number;
          limit?: number;
          result?: string;
          sport?: string;
          tenantId: string;
        },
        Array<any>,
        Name
      >;
      listTailed: FunctionReference<
        "query",
        "internal",
        {
          creatorId?: string;
          result?: string;
          sport?: string;
          tenantId: string;
          userId: string;
        },
        Array<any>,
        Name
      >;
      moderate: FunctionReference<
        "mutation",
        "internal",
        {
          id: string;
          moderatedBy: string;
          moderationNote?: string;
          moderationStatus:
            | "clean"
            | "flagged"
            | "under_review"
            | "approved"
            | "rejected"
            | "hidden";
        },
        { success: boolean },
        Name
      >;
      moderationStats: FunctionReference<
        "query",
        "internal",
        { tenantId: string },
        {
          approved: number;
          flagged: number;
          hidden: number;
          pendingReports: number;
          rejected: number;
          underReview: number;
        },
        Name
      >;
      performancePredictions: FunctionReference<
        "query",
        "internal",
        { creatorId: string; tenantId: string },
        {
          bestEdges: Array<{
            league?: string;
            pickType: string;
            picks: number;
            roi: number;
            sport: string;
            winRate: number;
          }>;
          confidenceCalibration: Array<{
            avgOdds: number;
            confidence: string;
            picks: number;
            roi: number;
            winRate: number;
          }>;
          currentStreak: { length: number; type: "win" | "loss" | "none" };
          longestLossStreak: number;
          longestWinStreak: number;
          overallWinRate: number;
          pickTypeBreakdown: Array<{
            pickType: string;
            picks: number;
            roi: number;
            winRate: number;
          }>;
          recentWinRate: number;
          sampleSize: number;
          trend: "improving" | "declining" | "stable";
        },
        Name
      >;
      personalStats: FunctionReference<
        "query",
        "internal",
        { startingBankroll?: number; tenantId: string; userId: string },
        {
          currentBankroll?: number;
          losses: number;
          netUnits: number;
          pending: number;
          pushes: number;
          roi: number;
          sportBreakdown: Array<{
            losses: number;
            netUnits: number;
            picks: number;
            sport: string;
            winRate: number;
            wins: number;
          }>;
          totalTailed: number;
          totalWagered: number;
          voids: number;
          winRate: number;
          wins: number;
        },
        Name
      >;
      remove: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      removePickCollaborator: FunctionReference<
        "mutation",
        "internal",
        { creatorId: string; pickId: string },
        { success: boolean },
        Name
      >;
      reportPick: FunctionReference<
        "mutation",
        "internal",
        {
          details?: string;
          pickId: string;
          reason: string;
          reporterId: string;
          tenantId: string;
        },
        { autoFlagged: boolean; id: string },
        Name
      >;
      setPickCollaborators: FunctionReference<
        "mutation",
        "internal",
        {
          collaborators: Array<{
            creatorId: string;
            role: string;
            splitPercent: number;
          }>;
          pickId: string;
          tenantId: string;
        },
        { success: boolean },
        Name
      >;
      sportDashboard: FunctionReference<
        "query",
        "internal",
        {
          sport: string;
          tenantId: string;
          timeframe?: "7d" | "30d" | "90d" | "all";
        },
        {
          avgOdds: number;
          gradedPicks: number;
          losses: number;
          netUnits: number;
          pendingPicks: number;
          pickTypeBreakdown: Array<{
            count: number;
            losses: number;
            netUnits: number;
            pickType: string;
            winRate: number;
            wins: number;
          }>;
          pushes: number;
          recentResults: Array<{ count: number; result: string }>;
          roi: number;
          sport: string;
          topCreators: Array<{
            creatorId: string;
            losses: number;
            netUnits: number;
            roi: number;
            winRate: number;
            wins: number;
          }>;
          totalCreators: number;
          totalPicks: number;
          winRate: number;
          wins: number;
        },
        Name
      >;
      sportOverview: FunctionReference<
        "query",
        "internal",
        { tenantId: string; timeframe?: "7d" | "30d" | "90d" | "all" },
        Array<{
          gradedPicks: number;
          losses: number;
          netUnits: number;
          roi: number;
          sport: string;
          totalCreators: number;
          totalPicks: number;
          winRate: number;
          wins: number;
        }>,
        Name
      >;
      tailPick: FunctionReference<
        "mutation",
        "internal",
        {
          pickId: string;
          startingBankroll?: number;
          tenantId: string;
          userId: string;
        },
        { id: string },
        Name
      >;
      untailPick: FunctionReference<
        "mutation",
        "internal",
        { pickId: string; userId: string },
        { success: boolean },
        Name
      >;
      update: FunctionReference<
        "mutation",
        "internal",
        {
          analysis?: string;
          confidence?: string;
          event?: string;
          eventDate?: number;
          id: string;
          league?: string;
          metadata?: any;
          oddsAmerican?: string;
          oddsDecimal?: number;
          pickType?: string;
          selection?: string;
          sport?: string;
          status?: string;
          units?: number;
        },
        { success: boolean },
        Name
      >;
      validatePickSplits: FunctionReference<
        "query",
        "internal",
        { pickId: string },
        { collaboratorCount: number; totalPercent: number; valid: boolean },
        Name
      >;
    };
  };
