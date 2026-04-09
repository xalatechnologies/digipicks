/**
 * Picks Component Functions
 *
 * Pure component implementation — operates only on its own tables.
 * Uses v.string() for all external references (tenantId, creatorId).
 * Data enrichment (user names) happens in the facade layer.
 */

import { mutation, query } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import { v } from 'convex/values';

// =============================================================================
// CONSTANTS
// =============================================================================

const VALID_SPORTS = ['NBA', 'NFL', 'MLB', 'NHL', 'Soccer', 'UFC', 'Tennis', 'Golf', 'NCAAB', 'NCAAF', 'Other'];
const VALID_PICK_TYPES = ['spread', 'moneyline', 'total', 'prop', 'parlay_leg'];
const VALID_CONFIDENCE = ['low', 'medium', 'high'];
const VALID_RESULTS = ['pending', 'won', 'lost', 'push', 'void'];
const VALID_STATUSES = ['draft', 'published', 'archived'];

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
        .query('picks')
        .withIndex('by_creator', (q) => q.eq('creatorId', creatorId))
        .collect();
      picks = picks.filter((p) => p.tenantId === tenantId);
    } else if (status) {
      picks = await ctx.db
        .query('picks')
        .withIndex('by_tenant_status', (q) => q.eq('tenantId', tenantId).eq('status', status))
        .collect();
    } else {
      picks = await ctx.db
        .query('picks')
        .withIndex('by_tenant', (q) => q.eq('tenantId', tenantId))
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
      .query('picks')
      .withIndex('by_tenant_status', (q) => q.eq('tenantId', tenantId).eq('status', 'published'))
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
  args: {
    id: v.id('picks'),
    tenantId: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, { id, tenantId }) => {
    const pick = await ctx.db.get(id);
    if (!pick) {
      throw new Error('Pick not found');
    }
    // Tenant isolation: if tenantId is provided, verify the pick belongs to that tenant
    if (tenantId && pick.tenantId !== tenantId) {
      throw new Error('Pick not found');
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
      .query('picks')
      .withIndex('by_creator', (q) => q.eq('creatorId', creatorId))
      .collect();

    const tenantPicks = picks.filter((p) => p.tenantId === tenantId && p.status === 'published');

    let wins = 0;
    let losses = 0;
    let pushes = 0;
    let voids = 0;
    let pending = 0;
    let netUnits = 0;

    for (const pick of tenantPicks) {
      if (pick.result === 'won') {
        wins++;
        // Win: profit = units * (oddsDecimal - 1)
        netUnits += pick.units * (pick.oddsDecimal - 1);
      } else if (pick.result === 'lost') {
        losses++;
        // Loss: lose the units wagered
        netUnits -= pick.units;
      } else if (pick.result === 'push') {
        pushes++;
        // Push: no change
      } else if (pick.result === 'void') {
        voids++;
      } else {
        pending++;
      }
    }

    const totalPicks = tenantPicks.length;
    const graded = wins + losses;
    const winRate = graded > 0 ? Math.round((wins / graded) * 100) / 100 : 0;
    const totalWagered = tenantPicks
      .filter((p) => p.result !== 'void' && p.result !== 'pending')
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

/**
 * Leaderboard: aggregate stats for all creators in a tenant.
 * Returns an array of creator entries ranked by the requested metric.
 * Filters published, graded picks only (won/lost). Pushes and voids excluded from record.
 */
export const leaderboard = query({
  args: {
    tenantId: v.string(),
    sport: v.optional(v.string()),
    timeframe: v.optional(v.union(v.literal('30d'), v.literal('90d'), v.literal('all'))),
    sortBy: v.optional(v.union(v.literal('roi'), v.literal('winRate'), v.literal('streak'), v.literal('totalPicks'))),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      creatorId: v.string(),
      totalPicks: v.number(),
      wins: v.number(),
      losses: v.number(),
      pushes: v.number(),
      winRate: v.number(),
      netUnits: v.number(),
      roi: v.number(),
      currentStreak: v.number(),
      streakType: v.union(v.literal('W'), v.literal('L'), v.literal('none')),
      avgOdds: v.number(),
    }),
  ),
  handler: async (ctx, { tenantId, sport, timeframe, sortBy, limit }) => {
    let picks = await ctx.db
      .query('picks')
      .withIndex('by_tenant_status', (q) => q.eq('tenantId', tenantId).eq('status', 'published'))
      .collect();

    // Time filter
    if (timeframe && timeframe !== 'all') {
      const days = timeframe === '30d' ? 30 : 90;
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      picks = picks.filter((p) => p._creationTime >= cutoff);
    }

    // Sport filter
    if (sport) {
      picks = picks.filter((p) => p.sport === sport);
    }

    // Group by creator
    const creatorMap = new Map<string, typeof picks>();
    for (const pick of picks) {
      const existing = creatorMap.get(pick.creatorId);
      if (existing) {
        existing.push(pick);
      } else {
        creatorMap.set(pick.creatorId, [pick]);
      }
    }

    // Calculate stats per creator
    const entries = [];
    for (const [creatorId, creatorPicks] of creatorMap) {
      let wins = 0;
      let losses = 0;
      let pushes = 0;
      let netUnits = 0;
      let totalWagered = 0;
      let oddsSum = 0;
      let oddsCount = 0;

      for (const pick of creatorPicks) {
        if (pick.result === 'won') {
          wins++;
          netUnits += pick.units * (pick.oddsDecimal - 1);
          totalWagered += pick.units;
          oddsSum += pick.oddsDecimal;
          oddsCount++;
        } else if (pick.result === 'lost') {
          losses++;
          netUnits -= pick.units;
          totalWagered += pick.units;
          oddsSum += pick.oddsDecimal;
          oddsCount++;
        } else if (pick.result === 'push') {
          pushes++;
        }
        // pending and void are excluded from stats
      }

      const graded = wins + losses;
      if (graded === 0) continue; // Skip creators with no graded picks

      const winRate = Math.round((wins / graded) * 100 * 100) / 100;
      const roi = totalWagered > 0 ? Math.round((netUnits / totalWagered) * 100 * 100) / 100 : 0;

      // Calculate current streak (most recent graded picks)
      const gradedPicks = creatorPicks
        .filter((p) => p.result === 'won' || p.result === 'lost')
        .sort((a, b) => b._creationTime - a._creationTime);

      let currentStreak = 0;
      let streakType: 'W' | 'L' | 'none' = 'none';
      if (gradedPicks.length > 0) {
        streakType = gradedPicks[0].result === 'won' ? 'W' : 'L';
        for (const pick of gradedPicks) {
          if ((streakType === 'W' && pick.result === 'won') || (streakType === 'L' && pick.result === 'lost')) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      entries.push({
        creatorId,
        totalPicks: graded,
        wins,
        losses,
        pushes,
        winRate,
        netUnits: Math.round(netUnits * 100) / 100,
        roi,
        currentStreak,
        streakType,
        avgOdds: oddsCount > 0 ? Math.round((oddsSum / oddsCount) * 100) / 100 : 0,
      });
    }

    // Sort
    const sort = sortBy ?? 'roi';
    entries.sort((a, b) => {
      if (sort === 'roi') return b.roi - a.roi;
      if (sort === 'winRate') return b.winRate - a.winRate;
      if (sort === 'streak') return b.currentStreak - a.currentStreak;
      if (sort === 'totalPicks') return b.totalPicks - a.totalPicks;
      return b.roi - a.roi;
    });

    return entries.slice(0, limit ?? 50);
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
      throw new Error(`Invalid sport: ${args.sport}. Must be one of: ${VALID_SPORTS.join(', ')}`);
    }

    // Validate pick type
    if (!VALID_PICK_TYPES.includes(args.pickType)) {
      throw new Error(`Invalid pick type: ${args.pickType}. Must be one of: ${VALID_PICK_TYPES.join(', ')}`);
    }

    // Validate confidence
    if (!VALID_CONFIDENCE.includes(args.confidence)) {
      throw new Error(`Invalid confidence: ${args.confidence}. Must be one of: ${VALID_CONFIDENCE.join(', ')}`);
    }

    // Validate units
    if (args.units <= 0) {
      throw new Error('Units must be greater than 0');
    }

    // Validate odds
    if (args.oddsDecimal < 1.01) {
      throw new Error('Decimal odds must be at least 1.01');
    }

    const pickId = await ctx.db.insert('picks', {
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
      result: 'pending',
      eventDate: args.eventDate,
      status: args.status ?? 'published',
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
    id: v.id('picks'),
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
      throw new Error('Pick not found');
    }

    if (
      pick.result !== 'pending' &&
      (updates.oddsAmerican || updates.oddsDecimal || updates.units || updates.selection)
    ) {
      throw new Error('Cannot edit odds, units, or selection on a graded pick');
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
      throw new Error('Units must be greater than 0');
    }
    if (updates.oddsDecimal !== undefined && updates.oddsDecimal < 1.01) {
      throw new Error('Decimal odds must be at least 1.01');
    }
    if (updates.status && !VALID_STATUSES.includes(updates.status)) {
      throw new Error(`Invalid status: ${updates.status}`);
    }

    const filteredUpdates = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined));

    await ctx.db.patch(id, filteredUpdates);
    return { success: true };
  },
});

/**
 * Grade a pick (set result).
 */
export const grade = mutation({
  args: {
    id: v.id('picks'),
    result: v.union(v.literal('won'), v.literal('lost'), v.literal('push'), v.literal('void')),
    gradedBy: v.string(),
    tenantId: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, { id, result, gradedBy, tenantId }) => {
    const pick = await ctx.db.get(id);
    if (!pick) {
      throw new Error('Pick not found');
    }

    // Tenant isolation: if tenantId is provided, verify the pick belongs to that tenant
    if (tenantId && pick.tenantId !== tenantId) {
      throw new Error('Pick not found');
    }

    if (pick.result !== 'pending') {
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
  args: { id: v.id('picks') },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, { id }) => {
    const pick = await ctx.db.get(id);
    if (!pick) {
      throw new Error('Pick not found');
    }

    await ctx.db.delete(id);
    return { success: true };
  },
});

// =============================================================================
// PICK TAILING (subscriber tracking)
// =============================================================================

/**
 * Tail a pick — mark that a subscriber is following this pick.
 */
export const tailPick = mutation({
  args: {
    tenantId: v.string(),
    userId: v.string(),
    pickId: v.string(),
    startingBankroll: v.optional(v.number()),
  },
  returns: v.object({ id: v.string() }),
  handler: async (ctx, { tenantId, userId, pickId, startingBankroll }) => {
    // Check the pick exists
    const pick = await ctx.db.get(pickId as any);
    if (!pick) {
      throw new Error('Pick not found');
    }

    // Check not already tailed
    const existing = await ctx.db
      .query('pickTails')
      .withIndex('by_user_pick', (q) => q.eq('userId', userId).eq('pickId', pickId))
      .unique();
    if (existing) {
      throw new Error('Already tailed this pick');
    }

    const id = await ctx.db.insert('pickTails', {
      tenantId,
      userId,
      pickId,
      tailedAt: Date.now(),
      startingBankroll,
    });

    return { id: id as string };
  },
});

/**
 * Untail a pick — remove tracking.
 */
export const untailPick = mutation({
  args: {
    userId: v.string(),
    pickId: v.string(),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, { userId, pickId }) => {
    const tail = await ctx.db
      .query('pickTails')
      .withIndex('by_user_pick', (q) => q.eq('userId', userId).eq('pickId', pickId))
      .unique();
    if (!tail) {
      throw new Error('Not tailed');
    }

    await ctx.db.delete(tail._id);
    return { success: true };
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
  returns: v.boolean(),
  handler: async (ctx, { userId, pickId }) => {
    const tail = await ctx.db
      .query('pickTails')
      .withIndex('by_user_pick', (q) => q.eq('userId', userId).eq('pickId', pickId))
      .unique();
    return tail !== null;
  },
});

/**
 * List all tailed picks for a user, with full pick data.
 */
export const listTailed = query({
  args: {
    tenantId: v.string(),
    userId: v.string(),
    sport: v.optional(v.string()),
    result: v.optional(v.string()),
    creatorId: v.optional(v.string()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, { tenantId, userId, sport, result, creatorId }) => {
    const tails = await ctx.db
      .query('pickTails')
      .withIndex('by_tenant_user', (q) => q.eq('tenantId', tenantId).eq('userId', userId))
      .collect();

    // Resolve picks
    const results = [];
    for (const tail of tails) {
      const pick = (await ctx.db.get(tail.pickId as any)) as Doc<'picks'> | null;
      if (!pick) continue;

      // Apply filters
      if (sport && pick.sport !== sport) continue;
      if (result && pick.result !== result) continue;
      if (creatorId && pick.creatorId !== creatorId) continue;

      results.push({
        ...pick,
        tailId: tail._id as string,
        tailedAt: tail.tailedAt,
        startingBankroll: tail.startingBankroll,
      });
    }

    // Sort newest tailed first
    results.sort((a, b) => b.tailedAt - a.tailedAt);

    return results;
  },
});

/**
 * Personal P/L stats for a user's tailed picks.
 */
export const personalStats = query({
  args: {
    tenantId: v.string(),
    userId: v.string(),
    startingBankroll: v.optional(v.number()),
  },
  returns: v.object({
    totalTailed: v.number(),
    wins: v.number(),
    losses: v.number(),
    pushes: v.number(),
    voids: v.number(),
    pending: v.number(),
    winRate: v.number(),
    netUnits: v.number(),
    roi: v.number(),
    totalWagered: v.number(),
    currentBankroll: v.optional(v.number()),
    sportBreakdown: v.array(
      v.object({
        sport: v.string(),
        picks: v.number(),
        wins: v.number(),
        losses: v.number(),
        netUnits: v.number(),
        winRate: v.number(),
      }),
    ),
  }),
  handler: async (ctx, { tenantId, userId, startingBankroll }) => {
    const tails = await ctx.db
      .query('pickTails')
      .withIndex('by_tenant_user', (q) => q.eq('tenantId', tenantId).eq('userId', userId))
      .collect();

    let wins = 0;
    let losses = 0;
    let pushes = 0;
    let voids = 0;
    let pending = 0;
    let netUnits = 0;
    let totalWagered = 0;
    const sportMap = new Map<string, { picks: number; wins: number; losses: number; netUnits: number }>();

    for (const tail of tails) {
      const pick = (await ctx.db.get(tail.pickId as any)) as Doc<'picks'> | null;
      if (!pick) continue;

      // Sport breakdown
      const sportEntry = sportMap.get(pick.sport) ?? { picks: 0, wins: 0, losses: 0, netUnits: 0 };
      sportEntry.picks++;

      if (pick.result === 'won') {
        wins++;
        const profit = pick.units * (pick.oddsDecimal - 1);
        netUnits += profit;
        totalWagered += pick.units;
        sportEntry.wins++;
        sportEntry.netUnits += profit;
      } else if (pick.result === 'lost') {
        losses++;
        netUnits -= pick.units;
        totalWagered += pick.units;
        sportEntry.losses++;
        sportEntry.netUnits -= pick.units;
      } else if (pick.result === 'push') {
        pushes++;
        totalWagered += pick.units;
      } else if (pick.result === 'void') {
        voids++;
      } else {
        pending++;
      }

      sportMap.set(pick.sport, sportEntry);
    }

    const totalTailed = tails.length;
    const graded = wins + losses;
    const winRate = graded > 0 ? Math.round((wins / graded) * 100) / 100 : 0;
    const roi = totalWagered > 0 ? Math.round((netUnits / totalWagered) * 100 * 100) / 100 : 0;

    const currentBankroll =
      startingBankroll !== undefined ? Math.round((startingBankroll + netUnits) * 100) / 100 : undefined;

    const sportBreakdown = Array.from(sportMap.entries()).map(([sport, data]) => {
      const sportGraded = data.wins + data.losses;
      return {
        sport,
        picks: data.picks,
        wins: data.wins,
        losses: data.losses,
        netUnits: Math.round(data.netUnits * 100) / 100,
        winRate: sportGraded > 0 ? Math.round((data.wins / sportGraded) * 100) / 100 : 0,
      };
    });

    return {
      totalTailed,
      wins,
      losses,
      pushes,
      voids,
      pending,
      winRate,
      netUnits: Math.round(netUnits * 100) / 100,
      roi,
      totalWagered: Math.round(totalWagered * 100) / 100,
      currentBankroll,
      sportBreakdown,
    };
  },
});

// =============================================================================
// SPORT-SPECIFIC ANALYTICS
// =============================================================================

/**
 * Sport dashboard — aggregate stats for a single sport across all creators.
 * Returns overall metrics, top performers, pick type breakdown, and recent results.
 */
export const sportDashboard = query({
  args: {
    tenantId: v.string(),
    sport: v.string(),
    timeframe: v.optional(v.union(v.literal('7d'), v.literal('30d'), v.literal('90d'), v.literal('all'))),
  },
  returns: v.object({
    sport: v.string(),
    totalPicks: v.number(),
    gradedPicks: v.number(),
    pendingPicks: v.number(),
    wins: v.number(),
    losses: v.number(),
    pushes: v.number(),
    winRate: v.number(),
    netUnits: v.number(),
    roi: v.number(),
    avgOdds: v.number(),
    totalCreators: v.number(),
    pickTypeBreakdown: v.array(
      v.object({
        pickType: v.string(),
        count: v.number(),
        wins: v.number(),
        losses: v.number(),
        winRate: v.number(),
        netUnits: v.number(),
      }),
    ),
    topCreators: v.array(
      v.object({
        creatorId: v.string(),
        wins: v.number(),
        losses: v.number(),
        winRate: v.number(),
        netUnits: v.number(),
        roi: v.number(),
      }),
    ),
    recentResults: v.array(
      v.object({
        result: v.string(),
        count: v.number(),
      }),
    ),
  }),
  handler: async (ctx, { tenantId, sport, timeframe }) => {
    let picks = await ctx.db
      .query('picks')
      .withIndex('by_tenant_sport', (q) => q.eq('tenantId', tenantId).eq('sport', sport))
      .collect();

    // Only published picks
    picks = picks.filter((p) => p.status === 'published');

    // Time filter
    if (timeframe && timeframe !== 'all') {
      const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      picks = picks.filter((p) => p._creationTime >= cutoff);
    }

    let wins = 0;
    let losses = 0;
    let pushes = 0;
    let pending = 0;
    let netUnits = 0;
    let totalWagered = 0;
    let oddsSum = 0;
    let oddsCount = 0;

    const creatorSet = new Set<string>();
    const pickTypeMap = new Map<
      string,
      { count: number; wins: number; losses: number; netUnits: number; wagered: number }
    >();
    const creatorStatsMap = new Map<string, { wins: number; losses: number; netUnits: number; wagered: number }>();

    for (const pick of picks) {
      creatorSet.add(pick.creatorId);

      const ptEntry = pickTypeMap.get(pick.pickType) ?? { count: 0, wins: 0, losses: 0, netUnits: 0, wagered: 0 };
      ptEntry.count++;

      const cEntry = creatorStatsMap.get(pick.creatorId) ?? { wins: 0, losses: 0, netUnits: 0, wagered: 0 };

      if (pick.result === 'won') {
        wins++;
        const profit = pick.units * (pick.oddsDecimal - 1);
        netUnits += profit;
        totalWagered += pick.units;
        oddsSum += pick.oddsDecimal;
        oddsCount++;
        ptEntry.wins++;
        ptEntry.netUnits += profit;
        ptEntry.wagered += pick.units;
        cEntry.wins++;
        cEntry.netUnits += profit;
        cEntry.wagered += pick.units;
      } else if (pick.result === 'lost') {
        losses++;
        netUnits -= pick.units;
        totalWagered += pick.units;
        oddsSum += pick.oddsDecimal;
        oddsCount++;
        ptEntry.losses++;
        ptEntry.netUnits -= pick.units;
        ptEntry.wagered += pick.units;
        cEntry.losses++;
        cEntry.netUnits -= pick.units;
        cEntry.wagered += pick.units;
      } else if (pick.result === 'push') {
        pushes++;
        totalWagered += pick.units;
      } else {
        pending++;
      }

      pickTypeMap.set(pick.pickType, ptEntry);
      creatorStatsMap.set(pick.creatorId, cEntry);
    }

    const gradedPicks = wins + losses;
    const winRate = gradedPicks > 0 ? Math.round((wins / gradedPicks) * 100 * 100) / 100 : 0;
    const roi = totalWagered > 0 ? Math.round((netUnits / totalWagered) * 100 * 100) / 100 : 0;
    const avgOdds = oddsCount > 0 ? Math.round((oddsSum / oddsCount) * 100) / 100 : 0;

    // Pick type breakdown
    const pickTypeBreakdown = Array.from(pickTypeMap.entries()).map(([pickType, data]) => {
      const ptGraded = data.wins + data.losses;
      return {
        pickType,
        count: data.count,
        wins: data.wins,
        losses: data.losses,
        winRate: ptGraded > 0 ? Math.round((data.wins / ptGraded) * 100 * 100) / 100 : 0,
        netUnits: Math.round(data.netUnits * 100) / 100,
      };
    });

    // Top creators (sorted by ROI, top 5)
    const topCreators = Array.from(creatorStatsMap.entries())
      .filter(([_, data]) => data.wins + data.losses > 0)
      .map(([creatorId, data]) => {
        const cGraded = data.wins + data.losses;
        return {
          creatorId,
          wins: data.wins,
          losses: data.losses,
          winRate: cGraded > 0 ? Math.round((data.wins / cGraded) * 100 * 100) / 100 : 0,
          netUnits: Math.round(data.netUnits * 100) / 100,
          roi: data.wagered > 0 ? Math.round((data.netUnits / data.wagered) * 100 * 100) / 100 : 0,
        };
      })
      .sort((a, b) => b.roi - a.roi)
      .slice(0, 5);

    // Recent results (last 10 graded picks)
    const recentGraded = picks
      .filter((p) => p.result === 'won' || p.result === 'lost' || p.result === 'push')
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 10);

    const recentMap = new Map<string, number>();
    for (const p of recentGraded) {
      recentMap.set(p.result, (recentMap.get(p.result) ?? 0) + 1);
    }
    const recentResults = Array.from(recentMap.entries()).map(([result, count]) => ({ result, count }));

    return {
      sport,
      totalPicks: picks.length,
      gradedPicks,
      pendingPicks: pending,
      wins,
      losses,
      pushes,
      winRate,
      netUnits: Math.round(netUnits * 100) / 100,
      roi,
      avgOdds,
      totalCreators: creatorSet.size,
      pickTypeBreakdown,
      topCreators,
      recentResults,
    };
  },
});

/**
 * Sport overview — aggregate stats across ALL sports for a tenant.
 * Used to render a multi-sport comparison dashboard.
 */
export const sportOverview = query({
  args: {
    tenantId: v.string(),
    timeframe: v.optional(v.union(v.literal('7d'), v.literal('30d'), v.literal('90d'), v.literal('all'))),
  },
  returns: v.array(
    v.object({
      sport: v.string(),
      totalPicks: v.number(),
      gradedPicks: v.number(),
      wins: v.number(),
      losses: v.number(),
      winRate: v.number(),
      netUnits: v.number(),
      roi: v.number(),
      totalCreators: v.number(),
    }),
  ),
  handler: async (ctx, { tenantId, timeframe }) => {
    let picks = await ctx.db
      .query('picks')
      .withIndex('by_tenant_status', (q) => q.eq('tenantId', tenantId).eq('status', 'published'))
      .collect();

    // Time filter
    if (timeframe && timeframe !== 'all') {
      const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      picks = picks.filter((p) => p._creationTime >= cutoff);
    }

    // Group by sport
    const sportMap = new Map<
      string,
      {
        totalPicks: number;
        wins: number;
        losses: number;
        netUnits: number;
        wagered: number;
        creators: Set<string>;
      }
    >();

    for (const pick of picks) {
      const entry = sportMap.get(pick.sport) ?? {
        totalPicks: 0,
        wins: 0,
        losses: 0,
        netUnits: 0,
        wagered: 0,
        creators: new Set<string>(),
      };
      entry.totalPicks++;
      entry.creators.add(pick.creatorId);

      if (pick.result === 'won') {
        entry.wins++;
        entry.netUnits += pick.units * (pick.oddsDecimal - 1);
        entry.wagered += pick.units;
      } else if (pick.result === 'lost') {
        entry.losses++;
        entry.netUnits -= pick.units;
        entry.wagered += pick.units;
      }

      sportMap.set(pick.sport, entry);
    }

    return Array.from(sportMap.entries())
      .map(([sport, data]) => {
        const graded = data.wins + data.losses;
        return {
          sport,
          totalPicks: data.totalPicks,
          gradedPicks: graded,
          wins: data.wins,
          losses: data.losses,
          winRate: graded > 0 ? Math.round((data.wins / graded) * 100 * 100) / 100 : 0,
          netUnits: Math.round(data.netUnits * 100) / 100,
          roi: data.wagered > 0 ? Math.round((data.netUnits / data.wagered) * 100 * 100) / 100 : 0,
          totalCreators: data.creators.size,
        };
      })
      .sort((a, b) => b.totalPicks - a.totalPicks);
  },
});

/**
 * Creator stats broken down by sport — performance per sport for a single creator.
 * Used on creator profile pages to show sport-specific performance.
 */
export const creatorStatsBySport = query({
  args: {
    tenantId: v.string(),
    creatorId: v.string(),
  },
  returns: v.array(
    v.object({
      sport: v.string(),
      totalPicks: v.number(),
      wins: v.number(),
      losses: v.number(),
      pushes: v.number(),
      winRate: v.number(),
      netUnits: v.number(),
      roi: v.number(),
      avgOdds: v.number(),
    }),
  ),
  handler: async (ctx, { tenantId, creatorId }) => {
    const picks = await ctx.db
      .query('picks')
      .withIndex('by_tenant_creator', (q) => q.eq('tenantId', tenantId).eq('creatorId', creatorId))
      .collect();

    const published = picks.filter((p) => p.status === 'published');

    const sportMap = new Map<
      string,
      {
        wins: number;
        losses: number;
        pushes: number;
        netUnits: number;
        wagered: number;
        oddsSum: number;
        oddsCount: number;
        total: number;
      }
    >();

    for (const pick of published) {
      const entry = sportMap.get(pick.sport) ?? {
        wins: 0,
        losses: 0,
        pushes: 0,
        netUnits: 0,
        wagered: 0,
        oddsSum: 0,
        oddsCount: 0,
        total: 0,
      };
      entry.total++;

      if (pick.result === 'won') {
        entry.wins++;
        entry.netUnits += pick.units * (pick.oddsDecimal - 1);
        entry.wagered += pick.units;
        entry.oddsSum += pick.oddsDecimal;
        entry.oddsCount++;
      } else if (pick.result === 'lost') {
        entry.losses++;
        entry.netUnits -= pick.units;
        entry.wagered += pick.units;
        entry.oddsSum += pick.oddsDecimal;
        entry.oddsCount++;
      } else if (pick.result === 'push') {
        entry.pushes++;
      }

      sportMap.set(pick.sport, entry);
    }

    return Array.from(sportMap.entries())
      .map(([sport, data]) => {
        const graded = data.wins + data.losses;
        return {
          sport,
          totalPicks: data.total,
          wins: data.wins,
          losses: data.losses,
          pushes: data.pushes,
          winRate: graded > 0 ? Math.round((data.wins / graded) * 100 * 100) / 100 : 0,
          netUnits: Math.round(data.netUnits * 100) / 100,
          roi: data.wagered > 0 ? Math.round((data.netUnits / data.wagered) * 100 * 100) / 100 : 0,
          avgOdds: data.oddsCount > 0 ? Math.round((data.oddsSum / data.oddsCount) * 100) / 100 : 0,
        };
      })
      .sort((a, b) => b.totalPicks - a.totalPicks);
  },
});

// =============================================================================
// PICK COLLABORATOR FUNCTIONS
// =============================================================================

const MAX_COLLABORATORS_PER_PICK = 5;

/**
 * Add a collaborator to a pick.
 */
export const addPickCollaborator = mutation({
  args: {
    tenantId: v.string(),
    pickId: v.string(),
    creatorId: v.string(),
    role: v.string(),
    splitPercent: v.number(),
  },
  returns: v.object({ id: v.string() }),
  handler: async (ctx, { tenantId, pickId, creatorId, role, splitPercent }) => {
    if (!['lead', 'contributor'].includes(role)) {
      throw new Error(`Invalid collaborator role: ${role}. Must be "lead" or "contributor".`);
    }
    if (splitPercent < 0 || splitPercent > 100) {
      throw new Error('Split percent must be between 0 and 100.');
    }

    const pick = await ctx.db.get(pickId as any);
    if (!pick) throw new Error('Pick not found');

    const existing = await ctx.db
      .query('pickCollaborators')
      .withIndex('by_pick_creator', (q) => q.eq('pickId', pickId).eq('creatorId', creatorId))
      .first();
    if (existing) throw new Error('Creator is already a collaborator on this pick.');

    const current = await ctx.db
      .query('pickCollaborators')
      .withIndex('by_pick', (q) => q.eq('pickId', pickId))
      .collect();
    if (current.length >= MAX_COLLABORATORS_PER_PICK) {
      throw new Error(`Maximum ${MAX_COLLABORATORS_PER_PICK} collaborators per pick.`);
    }

    const id = await ctx.db.insert('pickCollaborators', {
      tenantId,
      pickId,
      creatorId,
      role,
      splitPercent,
      addedAt: Date.now(),
    });
    return { id: id as string };
  },
});

/**
 * Remove a collaborator from a pick.
 */
export const removePickCollaborator = mutation({
  args: { pickId: v.string(), creatorId: v.string() },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, { pickId, creatorId }) => {
    const collab = await ctx.db
      .query('pickCollaborators')
      .withIndex('by_pick_creator', (q) => q.eq('pickId', pickId).eq('creatorId', creatorId))
      .first();
    if (!collab) throw new Error('Collaborator not found on this pick.');
    await ctx.db.delete(collab._id);
    return { success: true };
  },
});

/**
 * List all collaborators on a pick.
 */
export const listPickCollaborators = query({
  args: { pickId: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, { pickId }) => {
    return ctx.db
      .query('pickCollaborators')
      .withIndex('by_pick', (q) => q.eq('pickId', pickId))
      .collect();
  },
});

/**
 * List all picks where a creator is a collaborator.
 */
export const listPicksByCollaborator = query({
  args: { tenantId: v.string(), creatorId: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, { tenantId, creatorId }) => {
    const collabs = await ctx.db
      .query('pickCollaborators')
      .withIndex('by_creator', (q) => q.eq('creatorId', creatorId))
      .collect();

    const picks = [];
    for (const c of collabs) {
      if (c.tenantId !== tenantId) continue;
      const pick = await ctx.db.get(c.pickId as any);
      if (pick) picks.push({ ...pick, collaboratorRole: c.role, collaboratorSplit: c.splitPercent });
    }
    return picks;
  },
});

// =============================================================================
// AI-POWERED INSIGHTS
// =============================================================================

/**
 * Performance predictions — analyze a creator's historical pick data to
 * surface trends, streak patterns, confidence calibration, and projected
 * performance. Used by the subscriber insights dashboard.
 */
export const performancePredictions = query({
  args: {
    tenantId: v.string(),
    creatorId: v.string(),
  },
  returns: v.object({
    currentStreak: v.object({
      type: v.union(v.literal('win'), v.literal('loss'), v.literal('none')),
      length: v.number(),
    }),
    longestWinStreak: v.number(),
    longestLossStreak: v.number(),
    recentWinRate: v.number(),
    overallWinRate: v.number(),
    trend: v.union(v.literal('improving'), v.literal('declining'), v.literal('stable')),
    confidenceCalibration: v.array(
      v.object({
        confidence: v.string(),
        picks: v.number(),
        winRate: v.number(),
        avgOdds: v.number(),
        roi: v.number(),
      }),
    ),
    bestEdges: v.array(
      v.object({
        sport: v.string(),
        league: v.optional(v.string()),
        pickType: v.string(),
        picks: v.number(),
        winRate: v.number(),
        roi: v.number(),
      }),
    ),
    pickTypeBreakdown: v.array(
      v.object({
        pickType: v.string(),
        picks: v.number(),
        winRate: v.number(),
        roi: v.number(),
      }),
    ),
    sampleSize: v.number(),
  }),
  handler: async (ctx, { tenantId, creatorId }) => {
    const picks = await ctx.db
      .query('picks')
      .withIndex('by_tenant_creator', (q) => q.eq('tenantId', tenantId).eq('creatorId', creatorId))
      .collect();

    const published = picks
      .filter((p) => p.status === 'published')
      .sort((a, b) => (a._creationTime ?? 0) - (b._creationTime ?? 0));

    const graded = published.filter((p) => p.result === 'won' || p.result === 'lost');

    // --- Streak analysis ---
    let currentStreak: { type: 'win' | 'loss' | 'none'; length: number } = { type: 'none', length: 0 };
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let winRun = 0;
    let lossRun = 0;

    for (const pick of graded) {
      if (pick.result === 'won') {
        winRun++;
        lossRun = 0;
        if (winRun > longestWinStreak) longestWinStreak = winRun;
      } else {
        lossRun++;
        winRun = 0;
        if (lossRun > longestLossStreak) longestLossStreak = lossRun;
      }
    }
    if (graded.length > 0) {
      const last = graded[graded.length - 1];
      if (last.result === 'won') currentStreak = { type: 'win', length: winRun };
      else currentStreak = { type: 'loss', length: lossRun };
    }

    // --- Trend: recent 10 vs overall ---
    const overallWins = graded.filter((p) => p.result === 'won').length;
    const overallWinRate = graded.length > 0 ? Math.round((overallWins / graded.length) * 100) / 100 : 0;

    const recent10 = graded.slice(-10);
    const recentWins = recent10.filter((p) => p.result === 'won').length;
    const recentWinRate = recent10.length > 0 ? Math.round((recentWins / recent10.length) * 100) / 100 : 0;

    const trendDiff = recentWinRate - overallWinRate;
    const trend: 'improving' | 'declining' | 'stable' =
      trendDiff > 0.05 ? 'improving' : trendDiff < -0.05 ? 'declining' : 'stable';

    // --- Confidence calibration ---
    const confMap = new Map<
      string,
      { wins: number; total: number; oddsSum: number; wagered: number; netUnits: number }
    >();
    for (const pick of graded) {
      const entry = confMap.get(pick.confidence) ?? { wins: 0, total: 0, oddsSum: 0, wagered: 0, netUnits: 0 };
      entry.total++;
      entry.oddsSum += pick.oddsDecimal;
      entry.wagered += pick.units;
      if (pick.result === 'won') {
        entry.wins++;
        entry.netUnits += pick.units * (pick.oddsDecimal - 1);
      } else {
        entry.netUnits -= pick.units;
      }
      confMap.set(pick.confidence, entry);
    }
    const confidenceCalibration = Array.from(confMap.entries())
      .map(([confidence, d]) => ({
        confidence,
        picks: d.total,
        winRate: d.total > 0 ? Math.round((d.wins / d.total) * 100) / 100 : 0,
        avgOdds: d.total > 0 ? Math.round((d.oddsSum / d.total) * 100) / 100 : 0,
        roi: d.wagered > 0 ? Math.round((d.netUnits / d.wagered) * 100 * 100) / 100 : 0,
      }))
      .sort((a, b) => b.picks - a.picks);

    // --- Best edges: sport + league + pickType combos with >= 5 picks ---
    const edgeMap = new Map<
      string,
      {
        sport: string;
        league?: string;
        pickType: string;
        wins: number;
        total: number;
        wagered: number;
        netUnits: number;
      }
    >();
    for (const pick of graded) {
      const key = `${pick.sport}|${pick.league ?? ''}|${pick.pickType}`;
      const entry = edgeMap.get(key) ?? {
        sport: pick.sport,
        league: pick.league,
        pickType: pick.pickType,
        wins: 0,
        total: 0,
        wagered: 0,
        netUnits: 0,
      };
      entry.total++;
      entry.wagered += pick.units;
      if (pick.result === 'won') {
        entry.wins++;
        entry.netUnits += pick.units * (pick.oddsDecimal - 1);
      } else {
        entry.netUnits -= pick.units;
      }
      edgeMap.set(key, entry);
    }
    const bestEdges = Array.from(edgeMap.values())
      .filter((e) => e.total >= 5)
      .map((e) => ({
        sport: e.sport,
        league: e.league,
        pickType: e.pickType,
        picks: e.total,
        winRate: Math.round((e.wins / e.total) * 100) / 100,
        roi: e.wagered > 0 ? Math.round((e.netUnits / e.wagered) * 100 * 100) / 100 : 0,
      }))
      .sort((a, b) => b.roi - a.roi)
      .slice(0, 5);

    // --- Pick type breakdown ---
    const typeMap = new Map<string, { wins: number; total: number; wagered: number; netUnits: number }>();
    for (const pick of graded) {
      const entry = typeMap.get(pick.pickType) ?? { wins: 0, total: 0, wagered: 0, netUnits: 0 };
      entry.total++;
      entry.wagered += pick.units;
      if (pick.result === 'won') {
        entry.wins++;
        entry.netUnits += pick.units * (pick.oddsDecimal - 1);
      } else {
        entry.netUnits -= pick.units;
      }
      typeMap.set(pick.pickType, entry);
    }
    const pickTypeBreakdown = Array.from(typeMap.entries())
      .map(([pickType, d]) => ({
        pickType,
        picks: d.total,
        winRate: d.total > 0 ? Math.round((d.wins / d.total) * 100) / 100 : 0,
        roi: d.wagered > 0 ? Math.round((d.netUnits / d.wagered) * 100 * 100) / 100 : 0,
      }))
      .sort((a, b) => b.picks - a.picks);

    return {
      currentStreak,
      longestWinStreak,
      longestLossStreak,
      recentWinRate,
      overallWinRate,
      trend,
      confidenceCalibration,
      bestEdges,
      pickTypeBreakdown,
      sampleSize: graded.length,
    };
  },
});

/**
 * Validate that collaborator splits on a pick sum to exactly 100%.
 */
export const validatePickSplits = query({
  args: { pickId: v.string() },
  returns: v.object({ valid: v.boolean(), totalPercent: v.number(), collaboratorCount: v.number() }),
  handler: async (ctx, { pickId }) => {
    const collabs = await ctx.db
      .query('pickCollaborators')
      .withIndex('by_pick', (q) => q.eq('pickId', pickId))
      .collect();
    const totalPercent = collabs.reduce((sum, c) => sum + c.splitPercent, 0);
    return { valid: Math.abs(totalPercent - 100) < 0.01, totalPercent, collaboratorCount: collabs.length };
  },
});

/**
 * Set all collaborators on a pick at once (replace existing).
 * Validates splits sum to 100% and max 5 collaborators.
 */
export const setPickCollaborators = mutation({
  args: {
    tenantId: v.string(),
    pickId: v.string(),
    collaborators: v.array(
      v.object({
        creatorId: v.string(),
        role: v.string(),
        splitPercent: v.number(),
      }),
    ),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, { tenantId, pickId, collaborators }) => {
    if (collaborators.length > MAX_COLLABORATORS_PER_PICK) {
      throw new Error(`Maximum ${MAX_COLLABORATORS_PER_PICK} collaborators per pick.`);
    }

    const totalSplit = collaborators.reduce((sum, c) => sum + c.splitPercent, 0);
    if (Math.abs(totalSplit - 100) > 0.01) {
      throw new Error(`Collaborator splits must sum to 100%. Current total: ${totalSplit}%.`);
    }

    const creatorIds = collaborators.map((c) => c.creatorId);
    if (new Set(creatorIds).size !== creatorIds.length) {
      throw new Error('Duplicate creator in collaborators list.');
    }

    for (const c of collaborators) {
      if (!['lead', 'contributor'].includes(c.role)) {
        throw new Error(`Invalid collaborator role: ${c.role}. Must be "lead" or "contributor".`);
      }
      if (c.splitPercent < 0 || c.splitPercent > 100) {
        throw new Error('Split percent must be between 0 and 100.');
      }
    }

    const pick = await ctx.db.get(pickId as any);
    if (!pick) throw new Error('Pick not found');

    // Remove existing
    const existing = await ctx.db
      .query('pickCollaborators')
      .withIndex('by_pick', (q) => q.eq('pickId', pickId))
      .collect();
    for (const e of existing) await ctx.db.delete(e._id);

    // Insert new
    for (const c of collaborators) {
      await ctx.db.insert('pickCollaborators', {
        tenantId,
        pickId,
        creatorId: c.creatorId,
        role: c.role,
        splitPercent: c.splitPercent,
        addedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Bankroll insights — compute Kelly-criterion sizing, risk metrics,
 * and bankroll growth projections based on a user's tailed pick history.
 */
export const bankrollInsights = query({
  args: {
    tenantId: v.string(),
    userId: v.string(),
    bankroll: v.number(),
  },
  returns: v.object({
    kellySuggestions: v.array(
      v.object({
        confidence: v.string(),
        historicalWinRate: v.number(),
        avgOdds: v.number(),
        kellyFraction: v.number(),
        suggestedUnits: v.number(),
        suggestedDollarAmount: v.number(),
      }),
    ),
    riskMetrics: v.object({
      maxDrawdown: v.number(),
      maxDrawdownPercent: v.number(),
      currentDrawdown: v.number(),
      variance: v.number(),
      sharpeRatio: v.number(),
    }),
    projection: v.object({
      next50PicksExpected: v.number(),
      next100PicksExpected: v.number(),
      breakEvenPicks: v.optional(v.number()),
    }),
    sampleSize: v.number(),
  }),
  handler: async (ctx, { tenantId, userId, bankroll }) => {
    const tails = await ctx.db
      .query('pickTails')
      .withIndex('by_tenant_user', (q) => q.eq('tenantId', tenantId).eq('userId', userId))
      .collect();

    const tailedPicks: Array<{ result: string; units: number; oddsDecimal: number; confidence: string }> = [];
    for (const tail of tails) {
      const pick = (await ctx.db.get(tail.pickId as any)) as Doc<'picks'> | null;
      if (!pick || (pick.result !== 'won' && pick.result !== 'lost')) continue;
      tailedPicks.push({
        result: pick.result,
        units: pick.units,
        oddsDecimal: pick.oddsDecimal,
        confidence: pick.confidence,
      });
    }

    // --- Kelly criterion per confidence level ---
    const confMap = new Map<string, { wins: number; total: number; oddsSum: number }>();
    for (const p of tailedPicks) {
      const entry = confMap.get(p.confidence) ?? { wins: 0, total: 0, oddsSum: 0 };
      entry.total++;
      entry.oddsSum += p.oddsDecimal;
      if (p.result === 'won') entry.wins++;
      confMap.set(p.confidence, entry);
    }

    const kellySuggestions = Array.from(confMap.entries())
      .filter(([, d]) => d.total >= 3)
      .map(([confidence, d]) => {
        const winRate = d.wins / d.total;
        const avgOdds = d.oddsSum / d.total;
        const b = avgOdds - 1;
        const q = 1 - winRate;
        const kellyFull = b > 0 ? (winRate * b - q) / b : 0;
        // Quarter-Kelly for conservative sizing
        const kellyFraction = Math.max(0, Math.round(kellyFull * 0.25 * 10000) / 10000);
        const suggestedDollarAmount = Math.round(bankroll * kellyFraction * 100) / 100;
        const unitSize = bankroll * 0.01;
        const suggestedUnits = unitSize > 0 ? Math.round((suggestedDollarAmount / unitSize) * 10) / 10 : 0;

        return {
          confidence,
          historicalWinRate: Math.round(winRate * 100) / 100,
          avgOdds: Math.round(avgOdds * 100) / 100,
          kellyFraction,
          suggestedUnits,
          suggestedDollarAmount,
        };
      })
      .sort((a, b) => b.historicalWinRate - a.historicalWinRate);

    // --- Risk metrics ---
    let runningPL = 0;
    let peak = 0;
    let maxDrawdown = 0;
    const plPerPick: number[] = [];

    for (const p of tailedPicks) {
      const pl = p.result === 'won' ? p.units * (p.oddsDecimal - 1) : -p.units;
      plPerPick.push(pl);
      runningPL += pl;
      if (runningPL > peak) peak = runningPL;
      const drawdown = peak - runningPL;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    const currentDrawdown = peak - runningPL;
    const maxDrawdownPercent = bankroll > 0 ? Math.round((maxDrawdown / bankroll) * 100 * 100) / 100 : 0;

    const n = plPerPick.length;
    const mean = n > 0 ? plPerPick.reduce((s, v) => s + v, 0) / n : 0;
    const variance = n > 1 ? plPerPick.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1) : 0;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? Math.round((mean / stdDev) * 100) / 100 : 0;

    // --- Projection ---
    const next50 = bankroll + mean * 50;
    const next100 = bankroll + mean * 100;
    const breakEvenPicks = currentDrawdown > 0 && mean > 0 ? Math.ceil(currentDrawdown / mean) : undefined;

    return {
      kellySuggestions,
      riskMetrics: {
        maxDrawdown: Math.round(maxDrawdown * 100) / 100,
        maxDrawdownPercent,
        currentDrawdown: Math.round(currentDrawdown * 100) / 100,
        variance: Math.round(variance * 100) / 100,
        sharpeRatio,
      },
      projection: {
        next50PicksExpected: Math.round(next50 * 100) / 100,
        next100PicksExpected: Math.round(next100 * 100) / 100,
        breakEvenPicks,
      },
      sampleSize: tailedPicks.length,
    };
  },
});
