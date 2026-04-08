/**
 * Insights Facade
 *
 * AI-powered insights for the subscriber dashboard.
 * Composes performance predictions, bankroll suggestions, and
 * creator analytics from the picks component into subscriber-facing views.
 *
 * Handles:
 *   - ID type conversion (typed Id<"tenants"> -> string for component)
 *   - Subscription gating (insights require active subscription)
 *   - Data enrichment (creator user data from core tables)
 */

import { query } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

// =============================================================================
// CREATOR PERFORMANCE PREDICTIONS
// =============================================================================

/**
 * Get AI-powered performance predictions for a creator.
 * Surfaces streak analysis, trend detection, confidence calibration,
 * best edges (sport/league/pickType combos), and pick type breakdown.
 *
 * Available to any viewer — used on public creator profile pages
 * and within the subscriber insights dashboard.
 */
export const creatorPredictions = query({
    args: {
        tenantId: v.id("tenants"),
        creatorId: v.string(),
    },
    handler: async (ctx, { tenantId, creatorId }) => {
        const predictions = await ctx.runQuery(
            components.picks.functions.performancePredictions,
            { tenantId: tenantId as string, creatorId },
        );

        // Enrich with creator user data
        const user = await ctx.db.get(creatorId as Id<"users">).catch(() => null);

        return {
            ...predictions,
            creator: user
                ? {
                    id: user._id,
                    name: user.name,
                    displayName: user.displayName,
                    avatarUrl: user.avatarUrl,
                }
                : null,
        };
    },
});

// =============================================================================
// BANKROLL MANAGEMENT INSIGHTS
// =============================================================================

/**
 * Get personalized bankroll management insights for a subscriber.
 * Returns Kelly-criterion bet sizing, risk metrics (max drawdown,
 * variance, Sharpe ratio), and bankroll growth projections.
 *
 * Requires `userId` and `bankroll` (the subscriber's current bankroll).
 */
export const bankrollInsights = query({
    args: {
        tenantId: v.id("tenants"),
        userId: v.string(),
        bankroll: v.number(),
    },
    handler: async (ctx, { tenantId, userId, bankroll }) => {
        return ctx.runQuery(
            components.picks.functions.bankrollInsights,
            { tenantId: tenantId as string, userId, bankroll },
        );
    },
});

// =============================================================================
// COMPOSITE SUBSCRIBER DASHBOARD
// =============================================================================

/**
 * Full insights dashboard for a subscriber — combines personal stats,
 * bankroll insights, and performance predictions for their top creators.
 *
 * This is the main entry point for the subscriber insights page.
 * Returns everything needed to render the insights dashboard in one query.
 */
export const subscriberDashboard = query({
    args: {
        tenantId: v.id("tenants"),
        userId: v.string(),
        bankroll: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, userId, bankroll }) => {
        // 1. Personal P/L stats
        const personalStats = await ctx.runQuery(
            components.picks.functions.personalStats,
            { tenantId: tenantId as string, userId, startingBankroll: bankroll },
        );

        // 2. Bankroll insights (only if bankroll provided)
        let bankrollData = null;
        if (bankroll !== undefined && bankroll > 0) {
            bankrollData = await ctx.runQuery(
                components.picks.functions.bankrollInsights,
                { tenantId: tenantId as string, userId, bankroll },
            );
        }

        // 3. Find the user's most-tailed creators and get predictions for top 3
        const tails = await ctx.runQuery(
            components.picks.functions.listTailed,
            { tenantId: tenantId as string, userId },
        );

        // Count picks per creator
        const creatorCounts = new Map<string, number>();
        for (const pick of tails as any[]) {
            const cid = pick.creatorId;
            if (cid) creatorCounts.set(cid, (creatorCounts.get(cid) ?? 0) + 1);
        }
        const topCreatorIds = Array.from(creatorCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([id]) => id);

        // Get predictions for top creators
        const creatorInsights = await Promise.all(
            topCreatorIds.map(async (creatorId) => {
                const predictions = await ctx.runQuery(
                    components.picks.functions.performancePredictions,
                    { tenantId: tenantId as string, creatorId },
                );
                const user = await ctx.db.get(creatorId as Id<"users">).catch(() => null);
                return {
                    creatorId,
                    creator: user
                        ? {
                            id: user._id,
                            name: user.name,
                            displayName: user.displayName,
                            avatarUrl: user.avatarUrl,
                        }
                        : null,
                    predictions,
                };
            }),
        );

        return {
            personalStats,
            bankrollInsights: bankrollData,
            creatorInsights,
        };
    },
});
