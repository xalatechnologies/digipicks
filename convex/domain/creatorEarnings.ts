/**
 * Creator Earnings Facade — Creator-facing earnings queries
 *
 * Unlike adminPayouts.ts (admin-only), these queries let a creator
 * view their own earnings, subscriber counts, and payout history.
 * Auth: requireActiveUser + requireTenantMember + creator === caller.
 */

import { query } from '../_generated/server';
import { v } from 'convex/values';
import { requireActiveUser, requireTenantMember } from '../lib/auth';

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get the calling creator's earnings summary — aggregated across all periods.
 */
export const getMyEarningsSummary = query({
  args: {
    tenantId: v.id('tenants'),
    userId: v.id('users'),
  },
  handler: async (ctx, { tenantId, userId }) => {
    await requireActiveUser(ctx, userId);
    await requireTenantMember(ctx, userId, tenantId);

    const earnings = await ctx.db
      .query('creatorEarnings')
      .withIndex('by_creator', (q) => q.eq('tenantId', tenantId).eq('creatorId', userId))
      .collect();

    const totalGross = earnings.reduce((sum, e) => sum + e.grossRevenue, 0);
    const totalFees = earnings.reduce((sum, e) => sum + e.platformFees, 0);
    const totalNet = earnings.reduce((sum, e) => sum + e.netEarnings, 0);
    const totalPaidOut = earnings.reduce((sum, e) => sum + e.paidOutAmount, 0);
    const latestSubscriberCount =
      earnings.length > 0 ? earnings.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0].subscriberCount : 0;

    // Calculate MRR from latest period
    const sortedByPeriod = [...earnings].sort((a, b) => b.period.localeCompare(a.period));
    const latestPeriod = sortedByPeriod[0];
    const mrr = latestPeriod?.grossRevenue ?? 0;

    return {
      totalGrossRevenue: totalGross,
      totalPlatformFees: totalFees,
      totalNetEarnings: totalNet,
      totalPaidOut,
      pendingPayout: totalNet - totalPaidOut,
      subscriberCount: latestSubscriberCount,
      mrr,
      currency: earnings[0]?.currency ?? 'NOK',
      periodCount: earnings.length,
    };
  },
});

/**
 * Get the calling creator's earnings history — per-period breakdown.
 */
export const getMyEarningsHistory = query({
  args: {
    tenantId: v.id('tenants'),
    userId: v.id('users'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, userId, limit = 12 }) => {
    await requireActiveUser(ctx, userId);
    await requireTenantMember(ctx, userId, tenantId);

    const earnings = await ctx.db
      .query('creatorEarnings')
      .withIndex('by_creator', (q) => q.eq('tenantId', tenantId).eq('creatorId', userId))
      .order('desc')
      .take(limit);

    return earnings;
  },
});

/**
 * Get the calling creator's payout history.
 */
export const getMyPayouts = query({
  args: {
    tenantId: v.id('tenants'),
    userId: v.id('users'),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, userId, status, limit = 50 }) => {
    await requireActiveUser(ctx, userId);
    await requireTenantMember(ctx, userId, tenantId);

    let payouts = await ctx.db
      .query('creatorPayouts')
      .withIndex('by_creator', (q) => q.eq('tenantId', tenantId).eq('creatorId', userId))
      .order('desc')
      .take(limit);

    if (status) {
      payouts = payouts.filter((p) => p.status === status);
    }

    return payouts;
  },
});
