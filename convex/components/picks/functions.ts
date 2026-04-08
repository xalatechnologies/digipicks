/**
 * Picks Component Functions
 *
 * Pure component implementation — operates only on its own tables.
 * Uses v.string() for all external references (tenantId, creatorId).
 * Data enrichment (user names) happens in the facade layer.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// CONSTANTS
// =============================================================================

const VALID_SPORTS = ["NBA", "NFL", "MLB", "NHL", "Soccer", "UFC", "Tennis", "Golf", "NCAAB", "NCAAF", "Other"];
const VALID_PICK_TYPES = ["spread", "moneyline", "total", "prop", "parlay_leg"];
const VALID_CONFIDENCE = ["low", "medium", "high"];
const VALID_RESULTS = ["pending", "won", "lost", "push", "void"];
const VALID_STATUSES = ["draft", "published", "archived"];

// =============================================================================
// QUERIES
// =============================================================================

/**
 * List picks for a tenant, with optional filters.
 */
export const list = query({
    args: {
        tenantId: v.string(),
        creatorId: v.optional(v.string()),
        sport: v.optional(v.string()),
        result: v.optional(v.string()),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, creatorId, sport, result, status, limit }) => {
        let picks;

        if (creatorId) {
            picks = await ctx.db
                .query("picks")
                .withIndex("by_creator", (q) => q.eq("creatorId", creatorId))
                .collect();
            picks = picks.filter((p) => p.tenantId === tenantId);
        } else if (status) {
            picks = await ctx.db
                .query("picks")
                .withIndex("by_tenant_status", (q) =>
                    q.eq("tenantId", tenantId).eq("status", status)
                )
                .collect();
        } else {
            picks = await ctx.db
                .query("picks")
                .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
                .collect();
        }

        if (sport) {
            picks = picks.filter((p) => p.sport === sport);
        }
        if (result) {
            picks = picks.filter((p) => p.result === result);
        }

        // Sort newest first
        picks.sort((a, b) => b._creationTime - a._creationTime);

        if (limit) {
            picks = picks.slice(0, limit);
        }

        return picks;
    },
});

/**
 * List published picks for a feed, optionally filtered by a set of creator IDs.
 * Used by the facade for Following (with creatorIds) and For You (without) feeds.
 */
export const listPublishedFeed = query({
    args: {
        tenantId: v.string(),
        creatorIds: v.optional(v.array(v.string())),
        sport: v.optional(v.string()),
        result: v.optional(v.string()),
        limit: v.optional(v.number()),
        cursor: v.optional(v.number()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, creatorIds, sport, result, limit, cursor }) => {
        let picks = await ctx.db
            .query("picks")
            .withIndex("by_tenant_status", (q) =>
                q.eq("tenantId", tenantId).eq("status", "published")
            )
            .collect();

        if (creatorIds && creatorIds.length > 0) {
            const creatorSet = new Set(creatorIds);
            picks = picks.filter((p) => creatorSet.has(p.creatorId));
        }

        if (sport) {
            picks = picks.filter((p) => p.sport === sport);
        }
        if (result) {
            picks = picks.filter((p) => p.result === result);
        }

        // Sort newest first
        picks.sort((a, b) => b._creationTime - a._creationTime);

        // Cursor-based pagination: skip picks created before cursor timestamp
        if (cursor) {
            picks = picks.filter((p) => p._creationTime < cursor);
        }

        const pageLimit = limit ?? 20;
        picks = picks.slice(0, pageLimit);

        return picks;
    },
});

/**
 * Get a single pick by ID.
 */
export const get = query({
    args: { id: v.id("picks") },
    returns: v.any(),
    handler: async (ctx, { id }) => {
        const pick = await ctx.db.get(id);
        if (!pick) {
            throw new Error("Pick not found");
        }
        return pick;
    },
});

/**
 * Get pick stats for a creator: win rate, ROI, record breakdown.
 */
export const creatorStats = query({
    args: {
        tenantId: v.string(),
        creatorId: v.string(),
    },
    returns: v.object({
        totalPicks: v.number(),
        wins: v.number(),
        losses: v.number(),
        pushes: v.number(),
        voids: v.number(),
        pending: v.number(),
        winRate: v.number(),
        netUnits: v.number(),
        roi: v.number(),
    }),
    handler: async (ctx, { tenantId, creatorId }) => {
        const picks = await ctx.db
            .query("picks")
            .withIndex("by_creator", (q) => q.eq("creatorId", creatorId))
            .collect();

        const tenantPicks = picks.filter((p) => p.tenantId === tenantId && p.status === "published");

        let wins = 0;
        let losses = 0;
        let pushes = 0;
        let voids = 0;
        let pending = 0;
        let netUnits = 0;

        for (const pick of tenantPicks) {
            if (pick.result === "won") {
                wins++;
                // Win: profit = units * (oddsDecimal - 1)
                netUnits += pick.units * (pick.oddsDecimal - 1);
            } else if (pick.result === "lost") {
                losses++;
                // Loss: lose the units wagered
                netUnits -= pick.units;
            } else if (pick.result === "push") {
                pushes++;
                // Push: no change
            } else if (pick.result === "void") {
                voids++;
            } else {
                pending++;
            }
        }

        const totalPicks = tenantPicks.length;
        const graded = wins + losses;
        const winRate = graded > 0 ? Math.round((wins / graded) * 100) / 100 : 0;
        const totalWagered = tenantPicks
            .filter((p) => p.result !== "void" && p.result !== "pending")
            .reduce((sum, p) => sum + p.units, 0);
        const roi = totalWagered > 0 ? Math.round((netUnits / totalWagered) * 100 * 100) / 100 : 0;

        return {
            totalPicks,
            wins,
            losses,
            pushes,
            voids,
            pending,
            winRate,
            netUnits: Math.round(netUnits * 100) / 100,
            roi,
        };
    },
});

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a new pick.
 */
export const create = mutation({
    args: {
        tenantId: v.string(),
        creatorId: v.string(),
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
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        // Validate sport
        if (!VALID_SPORTS.includes(args.sport)) {
            throw new Error(`Invalid sport: ${args.sport}. Must be one of: ${VALID_SPORTS.join(", ")}`);
        }

        // Validate pick type
        if (!VALID_PICK_TYPES.includes(args.pickType)) {
            throw new Error(`Invalid pick type: ${args.pickType}. Must be one of: ${VALID_PICK_TYPES.join(", ")}`);
        }

        // Validate confidence
        if (!VALID_CONFIDENCE.includes(args.confidence)) {
            throw new Error(`Invalid confidence: ${args.confidence}. Must be one of: ${VALID_CONFIDENCE.join(", ")}`);
        }

        // Validate units
        if (args.units <= 0) {
            throw new Error("Units must be greater than 0");
        }

        // Validate odds
        if (args.oddsDecimal < 1.01) {
            throw new Error("Decimal odds must be at least 1.01");
        }

        const pickId = await ctx.db.insert("picks", {
            tenantId: args.tenantId,
            creatorId: args.creatorId,
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
            result: "pending",
            eventDate: args.eventDate,
            status: args.status ?? "published",
            metadata: args.metadata ?? {},
        });

        return { id: pickId as string };
    },
});

/**
 * Update a pick (edit fields before grading).
 */
export const update = mutation({
    args: {
        id: v.id("picks"),
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
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, ...updates }) => {
        const pick = await ctx.db.get(id);
        if (!pick) {
            throw new Error("Pick not found");
        }

        if (pick.result !== "pending" && (updates.oddsAmerican || updates.oddsDecimal || updates.units || updates.selection)) {
            throw new Error("Cannot edit odds, units, or selection on a graded pick");
        }

        // Validate if provided
        if (updates.sport && !VALID_SPORTS.includes(updates.sport)) {
            throw new Error(`Invalid sport: ${updates.sport}`);
        }
        if (updates.pickType && !VALID_PICK_TYPES.includes(updates.pickType)) {
            throw new Error(`Invalid pick type: ${updates.pickType}`);
        }
        if (updates.confidence && !VALID_CONFIDENCE.includes(updates.confidence)) {
            throw new Error(`Invalid confidence: ${updates.confidence}`);
        }
        if (updates.units !== undefined && updates.units <= 0) {
            throw new Error("Units must be greater than 0");
        }
        if (updates.oddsDecimal !== undefined && updates.oddsDecimal < 1.01) {
            throw new Error("Decimal odds must be at least 1.01");
        }
        if (updates.status && !VALID_STATUSES.includes(updates.status)) {
            throw new Error(`Invalid status: ${updates.status}`);
        }

        const filteredUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );

        await ctx.db.patch(id, filteredUpdates);
        return { success: true };
    },
});

/**
 * Grade a pick (set result).
 */
export const grade = mutation({
    args: {
        id: v.id("picks"),
        result: v.union(
            v.literal("won"),
            v.literal("lost"),
            v.literal("push"),
            v.literal("void")
        ),
        gradedBy: v.string(),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, result, gradedBy }) => {
        const pick = await ctx.db.get(id);
        if (!pick) {
            throw new Error("Pick not found");
        }

        if (pick.result !== "pending") {
            throw new Error(`Pick already graded as "${pick.result}"`);
        }

        await ctx.db.patch(id, {
            result,
            resultAt: Date.now(),
            gradedBy,
        });

        return { success: true };
    },
});

/**
 * Remove a pick (hard delete).
 */
export const remove = mutation({
    args: { id: v.id("picks") },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        const pick = await ctx.db.get(id);
        if (!pick) {
            throw new Error("Pick not found");
        }

        await ctx.db.delete(id);
        return { success: true };
    },
});
