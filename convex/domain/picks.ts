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
import { requirePermission } from "../lib/permissions";
import { rateLimit, rateLimitKeys } from "../lib/rateLimits";
import { withAudit } from "../lib/auditHelpers";
import { emitEvent } from "../lib/eventBus";

// =============================================================================
// SUBSCRIPTION GATING
// =============================================================================

/** 24-hour grace period after payment failure (in ms). */
const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

/** Check if a membership grants access (active, trialing, or within grace period). */
function membershipGrantsAccess(membership: any): boolean {
    if (!membership) return false;
    if (membership.status === "active" || membership.status === "trialing") return true;
    if (
        membership.status === "past_due" &&
        typeof membership.lastPaymentDate === "number" &&
        Date.now() - membership.lastPaymentDate < GRACE_PERIOD_MS
    ) {
        return true;
    }
    return false;
}

/**
 * Check if a viewer has premium access to a specific creator's picks.
 * Per-creator gating: checks subscription to this specific creator.
 * Returns true when viewerId is not provided (dashboard/creator context).
 */
async function hasSubscriptionAccess(
    ctx: QueryCtx,
    viewerId: string | undefined,
    creatorId?: string,
): Promise<boolean> {
    if (!viewerId) return true;

    if (creatorId) {
        const membership = await ctx.runQuery(
            components.subscriptions.functions.getMembershipByUserAndCreator,
            { userId: viewerId, creatorId },
        );
        return membershipGrantsAccess(membership);
    }

    // Fallback: any active membership (legacy behavior)
    const membership = await ctx.runQuery(
        components.subscriptions.functions.getMembershipByUser,
        { userId: viewerId },
    );
    return membershipGrantsAccess(membership);
}

/**
 * Check co-post access: viewer subscribes to ANY collaborator on this pick.
 * Uses batch query to avoid N+1.
 */
async function hasCoPostAccess(
    ctx: QueryCtx,
    viewerId: string | undefined,
    pickId: string,
): Promise<boolean> {
    if (!viewerId) return true;

    const collaborators = await ctx.runQuery(
        components.picks.functions.listPickCollaborators,
        { pickId },
    );
    if ((collaborators as any[]).length === 0) return false;

    const creatorIds = (collaborators as any[]).map((c: any) => c.creatorId);
    const memberships = await ctx.runQuery(
        components.subscriptions.functions.listMembershipsByCreatorIds,
        { userId: viewerId, creatorIds },
    );
    return (memberships as any[]).some((m: any) => membershipGrantsAccess(m));
}

/**
 * Full pick access check: creator ownership, per-creator subscription, or co-post access.
 */
async function hasPickAccess(
    ctx: QueryCtx,
    viewerId: string | undefined,
    pick: any,
): Promise<boolean> {
    if (!viewerId) return true;
    if (pick.creatorId === viewerId) return true;

    const directAccess = await hasSubscriptionAccess(ctx, viewerId, pick.creatorId);
    if (directAccess) return true;

    const pickId = pick._id ?? pick.id;
    if (pickId) return hasCoPostAccess(ctx, viewerId, pickId as string);

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

        // Batch fetch creator users
        const creatorIds = [...new Set((picks as any[]).map((p: any) => p.creatorId).filter(Boolean))];
        const users = await Promise.all(
            creatorIds.map((id: string) => ctx.db.get(id as Id<"users">).catch(() => null))
        );
        const userMap = new Map(users.filter(Boolean).map((u: any) => [u!._id, u]));

        // Per-pick access check (per-creator + co-post)
        const results = [];
        for (const pick of picks as any[]) {
            const user = pick.creatorId ? userMap.get(pick.creatorId) : null;
            const collaborators = await ctx.runQuery(
                components.picks.functions.listPickCollaborators,
                { pickId: pick._id as string },
            );
            const enriched = {
                ...pick,
                creator: user
                    ? { id: user._id, name: user.name, email: user.email, displayName: user.displayName }
                    : null,
                collaborators: (collaborators as any[]).map((c: any) => ({
                    creatorId: c.creatorId, role: c.role, splitPercent: c.splitPercent,
                })),
            };
            const access = await hasPickAccess(ctx, viewerId, pick);
            results.push(access ? ungatePick(enriched) : gatePick(enriched));
        }
        return results;
    },
});

/**
 * Get a single pick by ID. Enriches with creator data and collaborators.
 * Per-creator + co-post subscription gating.
 */
export const get = query({
    args: {
        id: v.string(),
        viewerId: v.optional(v.string()),
    },
    handler: async (ctx, { id, viewerId }) => {
        const pick = await ctx.runQuery(components.picks.functions.get, { id });

        const user = (pick as any).creatorId
            ? await ctx.db.get((pick as any).creatorId as Id<"users">).catch(() => null)
            : null;

        const collaborators = await ctx.runQuery(
            components.picks.functions.listPickCollaborators,
            { pickId: id },
        );

        const enriched = {
            ...pick,
            creator: user
                ? { id: user._id, name: user.name, email: user.email, displayName: user.displayName }
                : null,
            collaborators: (collaborators as any[]).map((c: any) => ({
                creatorId: c.creatorId, role: c.role, splitPercent: c.splitPercent,
            })),
        };

        const access = await hasPickAccess(ctx, viewerId, pick);
        return access ? ungatePick(enriched) : gatePick(enriched);
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

        // 4. Fetch creator verification status
        const verificationMap = await batchCreatorVerification(ctx, tenantId as string, [creatorId]);
        const verification = verificationMap.get(creatorId);

        // 5. Gate picks based on viewer subscription (per-creator)
        const hasAccess = await hasSubscriptionAccess(ctx, viewerId, creatorId);

        return {
            id: user._id,
            name: user.name,
            displayName: user.displayName,
            email: user.email,
            avatarUrl: user.avatarUrl,
            role: user.role,
            verified: verification?.verified ?? false,
            verifiedAt: verification?.verifiedAt ?? null,
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
// CREATOR VERIFICATION HELPERS
// =============================================================================

/** Batch-fetch approved creator applications for a list of creator IDs. */
async function batchCreatorVerification(
    ctx: QueryCtx,
    tenantId: string,
    creatorIds: string[]
): Promise<Map<string, { verified: boolean; verifiedAt: number | null }>> {
    const result = new Map<string, { verified: boolean; verifiedAt: number | null }>();
    if (creatorIds.length === 0) return result;

    const apps = await Promise.all(
        creatorIds.map((id) =>
            ctx.runQuery(components.creatorApplication.functions.getByUser, {
                tenantId,
                userId: id,
            }).catch(() => null)
        )
    );

    for (let i = 0; i < creatorIds.length; i++) {
        const app = apps[i] as any;
        result.set(creatorIds[i], {
            verified: app?.status === "approved",
            verifiedAt: app?.status === "approved" ? (app.reviewedAt ?? null) : null,
        });
    }

    return result;
}

// =============================================================================
// CREATOR DISCOVERY FACADE
// =============================================================================

/**
 * Creator discovery — browseable grid of creators with stats, branding, and pricing.
 * Aggregates: leaderboard stats + user data + brand configs + subscription tiers.
 * Used by the /creators marketplace page. Public, no auth required.
 */
export const discoverCreators = query({
    args: {
        tenantId: v.id("tenants"),
        search: v.optional(v.string()),
        sport: v.optional(v.string()),
    },
    handler: async (ctx, { tenantId, search, sport }) => {
        // 1. Fetch all creators via leaderboard (all-time, sorted by ROI, high limit)
        const entries = await ctx.runQuery(components.picks.functions.leaderboard, {
            tenantId: tenantId as string,
            sport,
            timeframe: "all",
            sortBy: "roi",
            limit: 200,
        });

        if ((entries as any[]).length === 0) return [];

        // 2. Batch fetch user data
        const creatorIds = (entries as any[]).map((e: any) => e.creatorId);
        const users = await Promise.all(
            creatorIds.map((id: string) => ctx.db.get(id as Id<"users">).catch(() => null))
        );
        const userMap = new Map(
            users.filter(Boolean).map((u: any) => [u!._id as string, u])
        );

        // 3. Batch fetch brand configs
        const brandConfigs = await ctx.runQuery(
            components.tenantConfig.queries.listCreatorBrandConfigs,
            { tenantId: tenantId as string }
        );
        const brandMap = new Map(
            (brandConfigs as any[]).map((b: any) => [b.creatorId, b])
        );

        // 4. Fetch subscription tiers for pricing info
        const tiers = await ctx.runQuery(components.subscriptions.functions.listTiers, {
            tenantId: tenantId as string,
            publicOnly: true,
            activeOnly: true,
        });
        // Use lowest-price tier as the "starting at" price
        const lowestTier = (tiers as any[]).length > 0
            ? (tiers as any[]).reduce((min: any, t: any) => t.price < min.price ? t : min)
            : null;

        // 5. Batch fetch creator verification (from creatorApplication component)
        const verificationMap = await batchCreatorVerification(
            ctx,
            tenantId as string,
            creatorIds.filter((id: string) => userMap.has(id))
        );

        // 6. Assemble enriched creator entries
        const results = (entries as any[]).map((entry: any) => {
            const user = userMap.get(entry.creatorId);
            if (!user || user.status !== "active") return null;
            // Exclude suspended/hidden users
            if (user.status === "suspended" || user.status === "deleted") return null;

            const brand = brandMap.get(entry.creatorId);
            const verification = verificationMap.get(entry.creatorId);

            return {
                creatorId: entry.creatorId,
                name: user.displayName || user.name || "Unknown",
                avatarUrl: user.avatarUrl || null,
                tagline: brand?.tagline || null,
                sport: entry.sport || null,
                stats: {
                    totalPicks: entry.totalPicks,
                    wins: entry.wins,
                    losses: entry.losses,
                    pushes: entry.pushes,
                    winRate: entry.winRate,
                    roi: entry.roi,
                    netUnits: entry.netUnits,
                    currentStreak: entry.currentStreak,
                    streakType: entry.streakType,
                },
                startingPrice: lowestTier ? {
                    amount: lowestTier.price,
                    currency: lowestTier.currency,
                    interval: lowestTier.billingInterval,
                } : null,
                verified: verification?.verified ?? false,
                verifiedAt: verification?.verifiedAt ?? null,
            };
        }).filter(Boolean);

        // 7. Apply search filter (client-side on assembled data)
        if (search && search.trim().length > 0) {
            const q = search.toLowerCase();
            return results.filter((c: any) =>
                c.name.toLowerCase().includes(q) ||
                (c.tagline && c.tagline.toLowerCase().includes(q)) ||
                (c.sport && c.sport.toLowerCase().includes(q))
            );
        }

        return results;
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

        // Get active subscriptions for this user (scoped by userId at component level)
        const memberships = await ctx.runQuery(
            components.subscriptions.functions.listMemberships,
            { tenantId: tenantId as string, userId, status: "active" }
        );
        const subscribedCreatorIds = (memberships as any[])
            .filter((m: any) => m.creatorId)
            .map((m: any) => m.creatorId as string);

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

        // Batch fetch verification status
        const verificationMap = await batchCreatorVerification(ctx, tenantId as string, creatorIdSet);

        return (picks as any[]).map((pick: any) => {
            const user = pick.creatorId ? userMap.get(pick.creatorId) : null;
            const verification = pick.creatorId ? verificationMap.get(pick.creatorId) : null;
            return {
                ...pick,
                isUnlocked: true,
                creator: user
                    ? { id: user._id, name: user.name, email: user.email, displayName: user.displayName, verified: verification?.verified ?? false }
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

        // Resolve which creators the user is subscribed to (scoped by userId at component level)
        let subscribedCreatorIds = new Set<string>();
        if (userId) {
            const memberships = await ctx.runQuery(
                components.subscriptions.functions.listMemberships,
                { tenantId: tenantId as string, userId, status: "active" }
            );
            subscribedCreatorIds = new Set(
                (memberships as any[])
                    .filter((m: any) => m.creatorId)
                    .map((m: any) => m.creatorId as string)
            );
        }

        // Enrich with creator data
        const creatorIdSet = [...new Set((picks as any[]).map((p: any) => p.creatorId).filter(Boolean))];
        const users = await Promise.all(
            creatorIdSet.map((id: string) => ctx.db.get(id as Id<"users">).catch(() => null))
        );
        const userMap = new Map(users.filter(Boolean).map((u: any) => [u!._id, u]));

        // Batch fetch verification status
        const verificationMap = await batchCreatorVerification(ctx, tenantId as string, creatorIdSet);

        const results = [];
        for (const pick of picks as any[]) {
            const user = pick.creatorId ? userMap.get(pick.creatorId) : null;
            const verification = pick.creatorId ? verificationMap.get(pick.creatorId) : null;
            const creator = user
                ? { id: user._id, name: user.name, email: user.email, displayName: user.displayName, verified: verification?.verified ?? false }
                : null;

            // Check per-creator subscription + co-post access
            let isUnlocked = !!(
                userId &&
                (pick.creatorId === userId || subscribedCreatorIds.has(pick.creatorId))
            );
            if (!isUnlocked && userId) {
                isUnlocked = await hasCoPostAccess(ctx, userId, pick._id as string);
            }

            // Enrich with collaborators
            const collaborators = await ctx.runQuery(
                components.picks.functions.listPickCollaborators,
                { pickId: pick._id as string },
            );
            const collabData = (collaborators as any[]).map((c: any) => ({
                creatorId: c.creatorId, role: c.role, splitPercent: c.splitPercent,
            }));

            if (isUnlocked) {
                results.push({ ...pick, isUnlocked: true, creator, collaborators: collabData });
            } else {
                results.push({
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
                    selection: null,
                    oddsAmerican: null,
                    oddsDecimal: null,
                    units: null,
                    analysis: null,
                    isUnlocked: false,
                    creator,
                    collaborators: collabData,
                });
            }
        }
        return results;
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
        scheduledPublishAt: v.optional(v.number()),
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
            scheduledPublishAt: args.scheduledPublishAt,
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
        callerId: v.id("users"),
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
        scheduledPublishAt: v.optional(v.number()),
        status: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, { id, callerId, ...updates }) => {
        await requireActiveUser(ctx, callerId);

        const pick = await ctx.runQuery(components.picks.functions.get, { id });

        // Ownership check: only the creator can update their pick
        if ((pick as any)?.creatorId !== (callerId as string)) {
            throw new Error("Not authorized: only the pick creator can update this pick");
        }

        await rateLimit(ctx, {
            name: "mutatePick",
            key: rateLimitKeys.user(callerId as string),
            throws: true,
        });

        const result = await ctx.runMutation(components.picks.functions.update, {
            id,
            ...updates,
        });

        await withAudit(ctx, {
            tenantId: (pick as any)?.tenantId ?? "",
            userId: callerId as string,
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
            tenantId: (pickBefore as any)?.tenantId,
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
    args: {
        id: v.string(),
        callerId: v.id("users"),
    },
    handler: async (ctx, { id, callerId }) => {
        await requireActiveUser(ctx, callerId);

        const pick = await ctx.runQuery(components.picks.functions.get, { id });

        // Ownership check: only the creator can remove their pick
        if ((pick as any)?.creatorId !== (callerId as string)) {
            throw new Error("Not authorized: only the pick creator can remove this pick");
        }

        await rateLimit(ctx, {
            name: "mutatePick",
            key: rateLimitKeys.user(callerId as string),
            throws: true,
        });

        const result = await ctx.runMutation(components.picks.functions.remove, { id });

        await withAudit(ctx, {
            tenantId: (pick as any)?.tenantId ?? "",
            userId: callerId as string,
            entityType: "pick",
            entityId: id,
            action: "removed",
            previousState: { event: (pick as any)?.event, sport: (pick as any)?.sport },
            sourceComponent: "picks",
        });

        await emitEvent(ctx, "picks.pick.removed", (pick as any)?.tenantId ?? "", "picks", {
            pickId: id,
            creatorId: (pick as any)?.creatorId,
            event: (pick as any)?.event,
            sport: (pick as any)?.sport,
        });

        return result;
    },
});

/**
 * Set or clear the scheduled publish time for a draft pick.
 * Pass scheduledPublishAt to schedule, or omit/null to clear.
 */
export const setScheduledPublish = mutation({
    args: {
        id: v.string(),
        callerId: v.id("users"),
        scheduledPublishAt: v.optional(v.number()),
    },
    handler: async (ctx, { id, callerId, scheduledPublishAt }) => {
        await requireActiveUser(ctx, callerId);

        const pick = await ctx.runQuery(components.picks.functions.get, { id });
        if (!pick) {
            throw new Error("Pick not found");
        }

        // Ownership check
        if ((pick as any)?.creatorId !== (callerId as string)) {
            throw new Error("Not authorized: only the pick creator can schedule this pick");
        }

        // Can only schedule draft picks
        if ((pick as any)?.status !== "draft") {
            throw new Error("Only draft picks can be scheduled for future publication");
        }

        await rateLimit(ctx, {
            name: "mutatePick",
            key: rateLimitKeys.user(callerId as string),
            throws: true,
        });

        const result = await ctx.runMutation(components.picks.functions.update, {
            id,
            scheduledPublishAt,
            status: "draft",
        });

        await withAudit(ctx, {
            tenantId: (pick as any)?.tenantId ?? "",
            userId: callerId as string,
            entityType: "pick",
            entityId: id,
            action: "scheduled",
            previousState: { scheduledPublishAt: (pick as any)?.scheduledPublishAt },
            newState: { scheduledPublishAt },
            sourceComponent: "picks",
        });

        await emitEvent(ctx, "picks.pick.scheduled", (pick as any)?.tenantId ?? "", "picks", {
            pickId: id,
            creatorId: (pick as any)?.creatorId,
            event: (pick as any)?.event,
            sport: (pick as any)?.sport,
            scheduledPublishAt,
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

// =============================================================================
// SPORT-SPECIFIC ANALYTICS FACADES
// =============================================================================

/**
 * Sport dashboard — aggregate stats for a single sport.
 * Enriches top creators with user data from core tables.
 */
export const sportDashboard = query({
    args: {
        tenantId: v.id("tenants"),
        sport: v.string(),
        timeframe: v.optional(v.union(v.literal("7d"), v.literal("30d"), v.literal("90d"), v.literal("all"))),
    },
    handler: async (ctx, { tenantId, sport, timeframe }) => {
        const dashboard = await ctx.runQuery(components.picks.functions.sportDashboard, {
            tenantId: tenantId as string,
            sport,
            timeframe,
        });

        // Enrich top creators with user data
        const creatorIds = (dashboard as any).topCreators.map((c: any) => c.creatorId);
        const users = await Promise.all(
            creatorIds.map((id: string) => ctx.db.get(id as Id<"users">).catch(() => null))
        );
        const userMap = new Map(users.filter(Boolean).map((u: any) => [u!._id as string, u]));

        return {
            ...dashboard,
            topCreators: (dashboard as any).topCreators.map((entry: any, index: number) => {
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
            }),
        };
    },
});

/**
 * Sport overview — aggregate stats across ALL sports for comparison.
 * Used to render a multi-sport comparison dashboard / grid.
 */
export const sportOverview = query({
    args: {
        tenantId: v.id("tenants"),
        timeframe: v.optional(v.union(v.literal("7d"), v.literal("30d"), v.literal("90d"), v.literal("all"))),
    },
    handler: async (ctx, { tenantId, timeframe }) => {
        return ctx.runQuery(components.picks.functions.sportOverview, {
            tenantId: tenantId as string,
            timeframe,
        });
    },
});

/**
 * Creator stats broken down by sport — used on creator profile pages.
 * Shows per-sport performance metrics for a single creator.
 */
export const creatorStatsBySport = query({
    args: {
        tenantId: v.id("tenants"),
        creatorId: v.string(),
    },
    handler: async (ctx, { tenantId, creatorId }) => {
        return ctx.runQuery(components.picks.functions.creatorStatsBySport, {
            tenantId: tenantId as string,
            creatorId,
        });
    },
});

// =============================================================================
// CO-POST / COLLABORATION FACADES
// =============================================================================

/**
 * Create a co-posted pick with collaborators.
 * Creates the pick, then sets collaborators with validated splits.
 */
export const createCoPost = mutation({
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
        collaborators: v.array(v.object({
            creatorId: v.string(),
            role: v.string(),
            splitPercent: v.number(),
        })),
    },
    handler: async (ctx, args) => {
        await requireActiveUser(ctx, args.creatorId);

        await rateLimit(ctx, {
            name: "createPick",
            key: rateLimitKeys.user(args.creatorId as string),
            throws: true,
        });

        // Create the pick
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

        // Set collaborators (validates splits sum to 100%, max 5, etc.)
        await ctx.runMutation(components.picks.functions.setPickCollaborators, {
            tenantId: args.tenantId as string,
            pickId: result.id,
            collaborators: args.collaborators,
        });

        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: args.creatorId as string,
            entityType: "pick",
            entityId: result.id,
            action: "co_post_created",
            newState: {
                event: args.event,
                sport: args.sport,
                collaboratorCount: args.collaborators.length,
            },
            sourceComponent: "picks",
        });

        await emitEvent(ctx, "picks.copost.created", args.tenantId as string, "picks", {
            pickId: result.id,
            creatorId: args.creatorId as string,
            event: args.event,
            sport: args.sport,
            collaborators: args.collaborators.map((c) => ({
                creatorId: c.creatorId,
                role: c.role,
                splitPercent: c.splitPercent,
            })),
        });

        return result;
    },
});

/**
 * Set collaborators on an existing pick. Only the lead creator can do this.
 */
export const setCollaborators = mutation({
    args: {
        pickId: v.string(),
        callerId: v.id("users"),
        collaborators: v.array(v.object({
            creatorId: v.string(),
            role: v.string(),
            splitPercent: v.number(),
        })),
    },
    handler: async (ctx, { pickId, callerId, collaborators }) => {
        await requireActiveUser(ctx, callerId);

        const pick = await ctx.runQuery(components.picks.functions.get, { id: pickId });

        // Only the lead creator can set collaborators
        if ((pick as any)?.creatorId !== (callerId as string)) {
            throw new Error("Not authorized: only the pick creator can manage collaborators");
        }

        await rateLimit(ctx, {
            name: "mutatePick",
            key: rateLimitKeys.user(callerId as string),
            throws: true,
        });

        const result = await ctx.runMutation(components.picks.functions.setPickCollaborators, {
            tenantId: (pick as any)?.tenantId ?? "",
            pickId,
            collaborators,
        });

        await withAudit(ctx, {
            tenantId: (pick as any)?.tenantId ?? "",
            userId: callerId as string,
            entityType: "pick",
            entityId: pickId,
            action: "collaborators_updated",
            newState: { collaboratorCount: collaborators.length },
            sourceComponent: "picks",
        });

        await emitEvent(ctx, "picks.copost.collaborators_updated", (pick as any)?.tenantId ?? "", "picks", {
            pickId,
            collaborators: collaborators.map((c) => ({
                creatorId: c.creatorId, role: c.role, splitPercent: c.splitPercent,
            })),
        });

        return result;
    },
});

/**
 * Get collaborators for a pick (public query).
 */
export const getCollaborators = query({
    args: { pickId: v.string() },
    handler: async (ctx, { pickId }) => {
        const collaborators = await ctx.runQuery(
            components.picks.functions.listPickCollaborators,
            { pickId },
        );

        // Enrich with user data
        const results = [];
        for (const collab of collaborators as any[]) {
            const user = await ctx.db.get(collab.creatorId as Id<"users">).catch(() => null);
            results.push({
                ...collab,
                creator: user
                    ? { id: user._id, name: user.name, displayName: user.displayName, avatarUrl: user.avatarUrl }
                    : null,
            });
        }
        return results;
    },
});

/**
 * Validate collaborator splits on a pick.
 */
export const validateSplits = query({
    args: { pickId: v.string() },
    handler: async (ctx, { pickId }) => {
        return ctx.runQuery(components.picks.functions.validatePickSplits, { pickId });
    },
});

// =============================================================================
// MODERATION FACADES
// =============================================================================

/**
 * Report a pick — any user can report a pick they find problematic.
 * Creates a report record and may auto-flag the pick at threshold (3 reports).
 */
export const reportPick = mutation({
    args: {
        tenantId: v.id("tenants"),
        reporterId: v.id("users"),
        pickId: v.string(),
        reason: v.union(
            v.literal("fraud"),
            v.literal("misleading"),
            v.literal("spam"),
            v.literal("inappropriate"),
            v.literal("other")
        ),
        details: v.optional(v.string()),
    },
    handler: async (ctx, { tenantId, reporterId, pickId, reason, details }) => {
        await requireActiveUser(ctx, reporterId);

        await rateLimit(ctx, {
            name: "reportPick",
            key: rateLimitKeys.user(reporterId as string),
            throws: true,
        });

        const result = await ctx.runMutation(components.picks.functions.reportPick, {
            tenantId: tenantId as string,
            pickId,
            reporterId: reporterId as string,
            reason,
            details,
        });

        await withAudit(ctx, {
            tenantId: tenantId as string,
            userId: reporterId as string,
            entityType: "pickReport",
            entityId: result.id,
            action: "reported",
            newState: { pickId, reason, autoFlagged: result.autoFlagged },
            sourceComponent: "picks",
        });

        await emitEvent(ctx, "picks.pick.reported", tenantId as string, "picks", {
            pickId,
            reporterId: reporterId as string,
            reason,
            autoFlagged: result.autoFlagged,
        });

        return result;
    },
});

/**
 * Moderate a pick — admin sets moderation status (approve, reject, hide, etc.).
 * Requires `pick:moderate` permission. Triggers notification to creator.
 */
export const moderatePick = mutation({
    args: {
        id: v.string(),
        moderatedBy: v.id("users"),
        moderationStatus: v.union(
            v.literal("clean"),
            v.literal("flagged"),
            v.literal("under_review"),
            v.literal("approved"),
            v.literal("rejected"),
            v.literal("hidden")
        ),
        moderationNote: v.optional(v.string()),
    },
    handler: async (ctx, { id, moderatedBy, moderationStatus, moderationNote }) => {
        await requireActiveUser(ctx, moderatedBy);

        // Fetch pick to get tenantId for permission check
        const pick = await ctx.runQuery(components.picks.functions.get, { id });
        if (!pick) throw new Error("Pick not found");
        const tenantId = (pick as any)?.tenantId ?? "";

        await requirePermission(ctx, moderatedBy, tenantId, "pick:moderate");

        await rateLimit(ctx, {
            name: "moderatePick",
            key: rateLimitKeys.user(moderatedBy as string),
            throws: true,
        });

        const previousStatus = (pick as any)?.moderationStatus ?? "clean";

        const result = await ctx.runMutation(components.picks.functions.moderate, {
            id,
            moderationStatus,
            moderatedBy: moderatedBy as string,
            moderationNote,
        });

        await withAudit(ctx, {
            tenantId,
            userId: moderatedBy as string,
            entityType: "pick",
            entityId: id,
            action: `moderated_${moderationStatus}`,
            previousState: { moderationStatus: previousStatus },
            newState: { moderationStatus, moderationNote },
            sourceComponent: "picks",
        });

        await emitEvent(ctx, "picks.pick.moderated", tenantId, "picks", {
            pickId: id,
            moderationStatus,
            moderatedBy: moderatedBy as string,
            creatorId: (pick as any)?.creatorId,
        });

        // Notify the creator about the moderation action
        const creatorId = (pick as any)?.creatorId;
        if (creatorId && ["rejected", "hidden", "approved"].includes(moderationStatus)) {
            const statusLabel = moderationStatus === "approved"
                ? "approved"
                : moderationStatus === "rejected"
                    ? "rejected"
                    : "hidden";
            await ctx.runMutation(components.notifications.functions.create, {
                tenantId,
                userId: creatorId,
                type: `pick.moderation.${statusLabel}`,
                title: `Your pick has been ${statusLabel}`,
                body: moderationNote
                    ? `Reason: ${moderationNote}`
                    : `Your pick "${(pick as any)?.event ?? ""}" has been ${statusLabel} by a moderator.`,
                link: `/picks/${id}`,
            });
        }

        return result;
    },
});

/**
 * List picks in the moderation queue — admin view.
 * Requires `pick:moderate` permission. Enriches with creator data.
 */
export const listModerationQueue = query({
    args: {
        tenantId: v.id("tenants"),
        moderationStatus: v.optional(v.string()),
        creatorId: v.optional(v.string()),
        limit: v.optional(v.number()),
        callerId: v.id("users"),
    },
    handler: async (ctx, { tenantId, moderationStatus, creatorId, limit, callerId }) => {
        await requirePermission(ctx, callerId, tenantId, "pick:moderate");

        const picks = await ctx.runQuery(components.picks.functions.listByModerationStatus, {
            tenantId: tenantId as string,
            moderationStatus,
            creatorId,
            limit,
        });

        // Batch enrich with creator data
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
 * Get reports for a specific pick — admin detail view.
 * Requires `pick:moderate` permission. Enriches with reporter data.
 */
export const listPickReports = query({
    args: {
        pickId: v.string(),
        callerId: v.id("users"),
        status: v.optional(v.string()),
    },
    handler: async (ctx, { pickId, callerId, status }) => {
        // Get pick to check tenant
        const pick = await ctx.runQuery(components.picks.functions.get, { id: pickId });
        if (!pick) throw new Error("Pick not found");
        const tenantId = (pick as any)?.tenantId ?? "";

        await requirePermission(ctx, callerId, tenantId, "pick:moderate");

        const reports = await ctx.runQuery(components.picks.functions.listPickReports, {
            pickId,
            status,
        });

        // Enrich with reporter data
        const reporterIds = [...new Set((reports as any[]).map((r: any) => r.reporterId).filter(Boolean))];
        const users = await Promise.all(
            reporterIds.map((id: string) => ctx.db.get(id as Id<"users">).catch(() => null))
        );
        const userMap = new Map(users.filter(Boolean).map((u: any) => [u!._id, u]));

        return (reports as any[]).map((report: any) => {
            const user = report.reporterId ? userMap.get(report.reporterId) : null;
            return {
                ...report,
                reporter: user
                    ? { id: user._id, name: user.name, email: user.email, displayName: user.displayName }
                    : null,
            };
        });
    },
});

/**
 * Moderation stats — counts of picks by moderation status.
 * Requires `pick:moderate` permission.
 */
export const moderationStats = query({
    args: {
        tenantId: v.id("tenants"),
        callerId: v.id("users"),
    },
    handler: async (ctx, { tenantId, callerId }) => {
        await requirePermission(ctx, callerId, tenantId, "pick:moderate");

        return ctx.runQuery(components.picks.functions.moderationStats, {
            tenantId: tenantId as string,
        });
    },
});

// =============================================================================
// VIEW TRACKING
// =============================================================================

/**
 * Track a view on a pick. Deduplicates per user — each user counts once.
 * Emits picks.pick.viewed event for analytics.
 */
export const trackView = mutation({
    args: {
        tenantId: v.id("tenants"),
        userId: v.id("users"),
        pickId: v.string(),
    },
    handler: async (ctx, { tenantId, userId, pickId }) => {
        await requireActiveUser(ctx, userId);

        const result = await ctx.runMutation(components.picks.functions.trackView, {
            tenantId: tenantId as string,
            pickId,
            userId: userId as string,
        });

        // Only emit event and audit on first view (not duplicates)
        if (!result.alreadyViewed) {
            await emitEvent(ctx, "picks.pick.viewed", tenantId as string, "picks", {
                pickId,
                userId: userId as string,
            });
        }

        return result;
    },
});

/**
 * Get the view count for a specific pick.
 */
export const getViewCount = query({
    args: {
        pickId: v.string(),
    },
    handler: async (ctx, { pickId }) => {
        return ctx.runQuery(components.picks.functions.getViewCount, { pickId });
    },
});
