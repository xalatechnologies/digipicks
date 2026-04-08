/**
 * Picks Facade
 *
 * Thin facade that delegates to the picks component.
 * Preserves the API path (api.domain.picks.*) for SDK compatibility.
 * Handles:
 *   - ID type conversion (typed Id<"tenants"> -> string for component)
 *   - Data enrichment (join user data from core tables)
 *   - Subscription gating (redact premium fields for non-subscribers)
 *   - Audit logging via audit component
 *   - Event bus emission
 */

import { mutation, query } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { requireActiveUser } from "../lib/auth";
import { rateLimit, rateLimitKeys } from "../lib/rateLimits";
import { withAudit } from "../lib/auditHelpers";
import { emitEvent } from "../lib/eventBus";

// =============================================================================
// SUBSCRIPTION GATING
// =============================================================================

/** 24-hour grace period after payment failure (in ms). */
const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

/**
 * Check if a viewer has premium access to pick details.
 * Returns true when the viewer has an active subscription or is within
 * the 24-hour grace period after a payment failure (past_due status).
 * Returns true when viewerId is not provided (dashboard/creator context).
 */
async function hasSubscriptionAccess(
    ctx: QueryCtx,
    viewerId: string | undefined,
): Promise<boolean> {
    if (!viewerId) return true;

    const membership = await ctx.runQuery(
        components.subscriptions.functions.getMembershipByUser,
        { userId: viewerId },
    );

    if (!membership) return false;
    if (membership.status === "active") return true;

    // Grace period: past_due with last payment within 24h
    if (
        membership.status === "past_due" &&
        typeof membership.lastPaymentDate === "number" &&
        Date.now() - membership.lastPaymentDate < GRACE_PERIOD_MS
    ) {
        return true;
    }

    return false;
}

/** Fields redacted for non-subscribers. */
const GATED_FIELDS = ["selection", "oddsAmerican", "oddsDecimal", "units", "analysis"] as const;

/**
 * Redact premium fields from a pick for non-subscribers.
 * Returns the pick with `isGated: true` and sensitive fields nulled.
 */
function gatePick(pick: Record<string, any>): Record<string, any> {
    const gated: Record<string, any> = { ...pick, isGated: true };
    for (const field of GATED_FIELDS) {
        gated[field] = null;
    }
    return gated;
}

/** Mark a pick as ungated (full access). */
function ungatePick(pick: Record<string, any>): Record<string, any> {
    return { ...pick, isGated: false };
}

// =============================================================================
// QUERY FACADES
// =============================================================================

/**
 * List picks for a tenant, with optional filters.
 * Enriches results with creator user data from core tables.
 * When `viewerId` is provided, checks subscription status and gates
 * premium pick fields for non-subscribers.
 */
export const list = query({
    args: {
        tenantId: v.id("tenants"),
        creatorId: v.optional(v.string()),
        sport: v.optional(v.string()),
        result: v.optional(v.string()),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
        viewerId: v.optional(v.string()),
    },
    handler: async (ctx, { tenantId, creatorId, sport, result, status, limit, viewerId }) => {
        const picks = await ctx.runQuery(components.picks.functions.list, {
            tenantId: tenantId as string,
            creatorId,
            sport,
            result,
            status,
            limit,
        });

        const hasAccess = await hasSubscriptionAccess(ctx, viewerId);

        // Batch fetch creator users
        const creatorIds = [...new Set((picks as any[]).map((p: any) => p.creatorId).filter(Boolean))];
        const users = await Promise.all(
            creatorIds.map((id: string) => ctx.db.get(id as Id<"users">).catch(() => null))
        );
        const userMap = new Map(users.filter(Boolean).map((u: any) => [u!._id, u]));

        return (picks as any[]).map((pick: any) => {
            const user = pick.creatorId ? userMap.get(pick.creatorId) : null;
            const enriched = {
                ...pick,
                creator: user
                    ? { id: user._id, name: user.name, email: user.email, displayName: user.displayName }
                    : null,
            };
            return hasAccess ? ungatePick(enriched) : gatePick(enriched);
        });
    },
});

/**
 * Get a single pick by ID. Enriches with creator data.
 * When `viewerId` is provided, checks subscription status and gates
 * premium pick fields for non-subscribers.
 */
export const get = query({
    args: {
        id: v.string(),
        viewerId: v.optional(v.string()),
    },
    handler: async (ctx, { id, viewerId }) => {
        const pick = await ctx.runQuery(components.picks.functions.get, { id });

        const user = pick.creatorId
            ? await ctx.db.get(pick.creatorId as Id<"users">).catch(() => null)
            : null;

        const enriched = {
            ...pick,
            creator: user
                ? { id: user._id, name: user.name, email: user.email, displayName: user.displayName }
                : null,
        };

        const hasAccess = await hasSubscriptionAccess(ctx, viewerId);
        return hasAccess ? ungatePick(enriched) : gatePick(enriched);
    },
});

/**
 * Get creator stats: win rate, ROI, record breakdown.
 */
export const creatorStats = query({
    args: {
        tenantId: v.id("tenants"),
        creatorId: v.string(),
    },
    handler: async (ctx, { tenantId, creatorId }) => {
        return ctx.runQuery(components.picks.functions.creatorStats, {
            tenantId: tenantId as string,
            creatorId,
        });
    },
});

/**
 * Get a creator's public profile: user info, stats, and recent published picks.
 * Used by the public creator profile page at /creator/:creatorId.
 */
export const creatorProfile = query({
    args: {
        tenantId: v.id("tenants"),
        creatorId: v.string(),
        viewerId: v.optional(v.string()),
    },
    handler: async (ctx, { tenantId, creatorId, viewerId }) => {
        // 1. Fetch user info from core table
        const user = await ctx.db.get(creatorId as Id<"users">).catch(() => null);
        if (!user || user.status !== "active") {
            return null;
        }

        // 2. Fetch stats from picks component (always visible)
        const stats = await ctx.runQuery(components.picks.functions.creatorStats, {
            tenantId: tenantId as string,
            creatorId,
        });

        // 3. Fetch recent published picks (last 10)
        const recentPicks = await ctx.runQuery(components.picks.functions.list, {
            tenantId: tenantId as string,
            creatorId,
            status: "published",
            limit: 10,
        });

        // 4. Gate picks based on viewer subscription
        const hasAccess = await hasSubscriptionAccess(ctx, viewerId);

        return {
            id: user._id,
            name: user.name,
            displayName: user.displayName,
            email: user.email,
            avatarUrl: user.avatarUrl,
            role: user.role,
            stats,
            recentPicks: (recentPicks as any[]).map((pick: any) => {
                const enriched = {
                    ...pick,
                    creator: { id: user._id, name: user.name, displayName: user.displayName },
                };
                return hasAccess ? ungatePick(enriched) : gatePick(enriched);
            }),
        };
    },
});

// =============================================================================
// LEADERBOARD FACADE
// =============================================================================

/**
 * Public leaderboard — ranked list of creators with performance stats.
 * Enriches each entry with creator user info (name, avatar, displayName).
 * Real-time via Convex subscriptions — updates when picks are graded.
 */
export const leaderboard = query({
    args: {
        tenantId: v.id("tenants"),
        sport: v.optional(v.string()),
        timeframe: v.optional(v.union(v.literal("30d"), v.literal("90d"), v.literal("all"))),
        sortBy: v.optional(v.union(v.literal("roi"), v.literal("winRate"), v.literal("streak"), v.literal("totalPicks"))),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, sport, timeframe, sortBy, limit }) => {
        const entries = await ctx.runQuery(components.picks.functions.leaderboard, {
            tenantId: tenantId as string,
            sport,
            timeframe,
            sortBy,
            limit,
        });

        // Batch fetch creator users for enrichment
        const creatorIds = (entries as any[]).map((e: any) => e.creatorId);
        const users = await Promise.all(
            creatorIds.map((id: string) => ctx.db.get(id as Id<"users">).catch(() => null))
        );
        const userMap = new Map(users.filter(Boolean).map((u: any) => [u!._id as string, u]));

        return (entries as any[]).map((entry: any, index: number) => {
            const user = userMap.get(entry.creatorId);
            return {
                rank: index + 1,
                ...entry,
                creator: user
                    ? {
                        id: user._id,
                        name: user.name,
                        displayName: user.displayName,
                        email: user.email,
                        avatarUrl: user.avatarUrl,
                    }
                    : null,
            };
        });
    },
});

// =============================================================================
// FEED FACADES
// =============================================================================

/**
 * "Following" feed — published picks from creators the user is subscribed to.
 * Returns picks with `isUnlocked: true` since the user is a subscriber.
 * Enriches with creator data. Requires userId to resolve subscriptions.
 */
export const feedFollowing = query({
    args: {
        tenantId: v.id("tenants"),
        userId: v.optional(v.string()),
        sport: v.optional(v.string()),
        result: v.optional(v.string()),
        limit: v.optional(v.number()),
        cursor: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, userId, sport, result, limit, cursor }) => {
        if (!userId) return [];

        // Get all active subscriptions for this user
        const memberships = await ctx.runQuery(
            components.subscriptions.functions.listMemberships,
            { tenantId: tenantId as string, status: "active" }
        );
        const userMemberships = (memberships as any[]).filter(
            (m: any) => m.userId === userId && m.creatorId
        );
        const subscribedCreatorIds = userMemberships.map((m: any) => m.creatorId as string);

        if (subscribedCreatorIds.length === 0) return [];

        // Fetch published picks from subscribed creators
        const picks = await ctx.runQuery(components.picks.functions.listPublishedFeed, {
            tenantId: tenantId as string,
            creatorIds: subscribedCreatorIds,
            sport,
            result,
            limit,
            cursor,
        });

        // Enrich with creator data
        const creatorIdSet = [...new Set((picks as any[]).map((p: any) => p.creatorId).filter(Boolean))];
        const users = await Promise.all(
            creatorIdSet.map((id: string) => ctx.db.get(id as Id<"users">).catch(() => null))
        );
        const userMap = new Map(users.filter(Boolean).map((u: any) => [u!._id, u]));

        return (picks as any[]).map((pick: any) => {
            const user = pick.creatorId ? userMap.get(pick.creatorId) : null;
            return {
                ...pick,
                isUnlocked: true,
                creator: user
                    ? { id: user._id, name: user.name, email: user.email, displayName: user.displayName }
                    : null,
            };
        });
    },
});

/**
 * "For You" feed — discovery/trending picks across the platform.
 * Returns all published picks, marking each as locked or unlocked
 * based on subscription status. Locked picks have sensitive fields redacted.
 */
export const feedForYou = query({
    args: {
        tenantId: v.id("tenants"),
        userId: v.optional(v.string()),
        sport: v.optional(v.string()),
        result: v.optional(v.string()),
        limit: v.optional(v.number()),
        cursor: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, userId, sport, result, limit, cursor }) => {
        // Fetch all published picks
        const picks = await ctx.runQuery(components.picks.functions.listPublishedFeed, {
            tenantId: tenantId as string,
            sport,
            result,
            limit,
            cursor,
        });

        // Resolve which creators the user is subscribed to
        let subscribedCreatorIds = new Set<string>();
        if (userId) {
            const memberships = await ctx.runQuery(
                components.subscriptions.functions.listMemberships,
                { tenantId: tenantId as string, status: "active" }
            );
            const userMemberships = (memberships as any[]).filter(
                (m: any) => m.userId === userId && m.creatorId
            );
            subscribedCreatorIds = new Set(userMemberships.map((m: any) => m.creatorId as string));
        }

        // Enrich with creator data
        const creatorIdSet = [...new Set((picks as any[]).map((p: any) => p.creatorId).filter(Boolean))];
        const users = await Promise.all(
            creatorIdSet.map((id: string) => ctx.db.get(id as Id<"users">).catch(() => null))
        );
        const userMap = new Map(users.filter(Boolean).map((u: any) => [u!._id, u]));

        return (picks as any[]).map((pick: any) => {
            const isUnlocked = !!(
                userId &&
                (pick.creatorId === userId || subscribedCreatorIds.has(pick.creatorId))
            );
            const user = pick.creatorId ? userMap.get(pick.creatorId) : null;
            const creator = user
                ? { id: user._id, name: user.name, email: user.email, displayName: user.displayName }
                : null;

            if (isUnlocked) {
                return { ...pick, isUnlocked: true, creator };
            }

            // Locked: redact sensitive pick details
            return {
                _id: pick._id,
                _creationTime: pick._creationTime,
                tenantId: pick.tenantId,
                creatorId: pick.creatorId,
                event: pick.event,
                sport: pick.sport,
                league: pick.league,
                pickType: pick.pickType,
                confidence: pick.confidence,
                result: pick.result,
                resultAt: pick.resultAt,
                eventDate: pick.eventDate,
                status: pick.status,
                // Redacted fields for locked picks
                selection: null,
                oddsAmerican: null,
                oddsDecimal: null,
                units: null,
                analysis: null,
                isUnlocked: false,
                creator,
            };
        });
    },
});

// =============================================================================
// MUTATION FACADES
// =============================================================================

/**
 * Create a new pick.
 */
export const create = mutation({
    args: {
        tenantId: v.id("tenants"),
        creatorId: v.id("users"),
        event: v.string(),
        sport: v.string(),
        league: v.optional(v.string()),
        pickType: v.string(),
        selection: v.string(),
        oddsAmerican: v.string(),
        oddsDecimal: v.number(),
        units: v.number(),
        confidence: v.string(),
        analysis: v.optional(v.string()),
        eventDate: v.optional(v.number()),
        status: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        await requireActiveUser(ctx, args.creatorId);

        await rateLimit(ctx, {
            name: "createPick",
            key: rateLimitKeys.user(args.creatorId as string),
            throws: true,
        });

        const result = await ctx.runMutation(components.picks.functions.create, {
            tenantId: args.tenantId as string,
            creatorId: args.creatorId as string,
            event: args.event,
            sport: args.sport,
            league: args.league,
            pickType: args.pickType,
            selection: args.selection,
            oddsAmerican: args.oddsAmerican,
            oddsDecimal: args.oddsDecimal,
            units: args.units,
            confidence: args.confidence,
            analysis: args.analysis,
            eventDate: args.eventDate,
            status: args.status,
            metadata: args.metadata,
        });

        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: args.creatorId as string,
            entityType: "pick",
            entityId: result.id,
            action: "created",
            newState: {
                event: args.event,
                sport: args.sport,
                selection: args.selection,
                oddsAmerican: args.oddsAmerican,
                units: args.units,
            },
            sourceComponent: "picks",
        });

        await emitEvent(ctx, "picks.pick.created", args.tenantId as string, "picks", {
            pickId: result.id,
            creatorId: args.creatorId as string,
            event: args.event,
            sport: args.sport,
            selection: args.selection,
        });

        return result;
    },
});

/**
 * Update a pick.
 */
export const update = mutation({
    args: {
        id: v.string(),
        event: v.optional(v.string()),
        sport: v.optional(v.string()),
        league: v.optional(v.string()),
        pickType: v.optional(v.string()),
        selection: v.optional(v.string()),
        oddsAmerican: v.optional(v.string()),
        oddsDecimal: v.optional(v.number()),
        units: v.optional(v.number()),
        confidence: v.optional(v.string()),
        analysis: v.optional(v.string()),
        eventDate: v.optional(v.number()),
        status: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, { id, ...updates }) => {
        const pick = await ctx.runQuery(components.picks.functions.get, { id });

        await rateLimit(ctx, {
            name: "mutatePick",
            key: rateLimitKeys.user((pick as any)?.creatorId ?? ""),
            throws: true,
        });

        const result = await ctx.runMutation(components.picks.functions.update, {
            id,
            ...updates,
        });

        await withAudit(ctx, {
            tenantId: (pick as any)?.tenantId ?? "",
            entityType: "pick",
            entityId: id,
            action: "updated",
            newState: updates,
            sourceComponent: "picks",
        });

        await emitEvent(ctx, "picks.pick.updated", (pick as any)?.tenantId ?? "", "picks", {
            pickId: id,
        });

        return result;
    },
});

/**
 * Grade a pick (set result).
 */
export const grade = mutation({
    args: {
        id: v.string(),
        result: v.union(
            v.literal("won"),
            v.literal("lost"),
            v.literal("push"),
            v.literal("void")
        ),
        gradedBy: v.id("users"),
    },
    handler: async (ctx, { id, result, gradedBy }) => {
        await requireActiveUser(ctx, gradedBy);

        await rateLimit(ctx, {
            name: "gradePick",
            key: rateLimitKeys.user(gradedBy as string),
            throws: true,
        });

        const pickBefore = await ctx.runQuery(components.picks.functions.get, { id });

        const gradeResult = await ctx.runMutation(components.picks.functions.grade, {
            id,
            result,
            gradedBy: gradedBy as string,
        });

        await withAudit(ctx, {
            tenantId: (pickBefore as any)?.tenantId ?? "",
            userId: gradedBy as string,
            entityType: "pick",
            entityId: id,
            action: "graded",
            previousState: { result: (pickBefore as any)?.result },
            newState: { result },
            sourceComponent: "picks",
        });

        await emitEvent(ctx, "picks.pick.graded", (pickBefore as any)?.tenantId ?? "", "picks", {
            pickId: id,
            creatorId: (pickBefore as any)?.creatorId,
            event: (pickBefore as any)?.event,
            result,
            gradedBy: gradedBy as string,
            sport: (pickBefore as any)?.sport,
            units: (pickBefore as any)?.units,
        });

        return gradeResult;
    },
});

/**
 * Remove a pick.
 */
export const remove = mutation({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        const pick = await ctx.runQuery(components.picks.functions.get, { id });

        await rateLimit(ctx, {
            name: "mutatePick",
            key: rateLimitKeys.user((pick as any)?.creatorId ?? ""),
            throws: true,
        });

        const result = await ctx.runMutation(components.picks.functions.remove, { id });

        await withAudit(ctx, {
            tenantId: (pick as any)?.tenantId ?? "",
            entityType: "pick",
            entityId: id,
            action: "removed",
            previousState: { event: (pick as any)?.event, sport: (pick as any)?.sport },
            sourceComponent: "picks",
        });

        return result;
    },
});

// =============================================================================
// PICK TAILING FACADES
// =============================================================================

/**
 * Tail a pick — subscriber marks they are following this pick.
 */
export const tailPick = mutation({
    args: {
        tenantId: v.id("tenants"),
        userId: v.id("users"),
        pickId: v.string(),
        startingBankroll: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, userId, pickId, startingBankroll }) => {
        await requireActiveUser(ctx, userId);

        const result = await ctx.runMutation(components.picks.functions.tailPick, {
            tenantId: tenantId as string,
            userId: userId as string,
            pickId,
            startingBankroll,
        });

        await withAudit(ctx, {
            tenantId: tenantId as string,
            userId: userId as string,
            entityType: "pickTail",
            entityId: result.id,
            action: "created",
            newState: { pickId },
            sourceComponent: "picks",
        });

        await emitEvent(ctx, "picks.tail.created", tenantId as string, "picks", {
            pickId,
            userId: userId as string,
        });

        return result;
    },
});

/**
 * Untail a pick — remove tracking.
 */
export const untailPick = mutation({
    args: {
        userId: v.id("users"),
        pickId: v.string(),
    },
    handler: async (ctx, { userId, pickId }) => {
        await requireActiveUser(ctx, userId);

        const result = await ctx.runMutation(components.picks.functions.untailPick, {
            userId: userId as string,
            pickId,
        });

        return result;
    },
});

/**
 * Check if user has tailed a specific pick.
 */
export const isTailed = query({
    args: {
        userId: v.string(),
        pickId: v.string(),
    },
    handler: async (ctx, { userId, pickId }) => {
        return ctx.runQuery(components.picks.functions.isTailed, { userId, pickId });
    },
});

/**
 * List all tailed picks for a user, enriched with creator data.
 */
export const myTailedPicks = query({
    args: {
        tenantId: v.id("tenants"),
        userId: v.string(),
        sport: v.optional(v.string()),
        result: v.optional(v.string()),
        creatorId: v.optional(v.string()),
    },
    handler: async (ctx, { tenantId, userId, sport, result, creatorId }) => {
        const picks = await ctx.runQuery(components.picks.functions.listTailed, {
            tenantId: tenantId as string,
            userId,
            sport,
            result,
            creatorId,
        });

        // Enrich with creator data
        const creatorIds = [...new Set((picks as any[]).map((p: any) => p.creatorId).filter(Boolean))];
        const users = await Promise.all(
            creatorIds.map((id: string) => ctx.db.get(id as Id<"users">).catch(() => null))
        );
        const userMap = new Map(users.filter(Boolean).map((u: any) => [u!._id, u]));

        return (picks as any[]).map((pick: any) => {
            const user = pick.creatorId ? userMap.get(pick.creatorId) : null;
            return {
                ...pick,
                creator: user
                    ? { id: user._id, name: user.name, email: user.email, displayName: user.displayName }
                    : null,
            };
        });
    },
});

/**
 * Personal P/L tracker stats for a user's tailed picks.
 */
export const myTrackerStats = query({
    args: {
        tenantId: v.id("tenants"),
        userId: v.string(),
        startingBankroll: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, userId, startingBankroll }) => {
        return ctx.runQuery(components.picks.functions.personalStats, {
            tenantId: tenantId as string,
            userId,
            startingBankroll,
        });
    },
});
