/**
 * Admin Payouts — Domain Facade Tests
 *
 * Tests platform fee configuration, creator earnings, and creator payout lifecycle.
 * Run: npx vitest --config convex/vitest.config.ts domain/__tests__/adminPayouts.test.ts
 */

import { describe, it, expect } from 'vitest';
import { api } from '../../_generated/api';
import { createDomainTest, seedTestTenant } from './testHelper.test-util';

// Admin payouts operates on core tables and uses audit component for logging.
function setup() {
  return createDomainTest(['audit']);
}

// =============================================================================
// PLATFORM FEE CONFIGURATION
// =============================================================================

describe('adminPayouts — setFeeConfig', () => {
  it('creates an active fee config with percentage type', async () => {
    const t = setup();
    const { tenantId, adminId } = await seedTestTenant(t);

    const { id } = await t.mutation(api.domain.adminPayouts.setFeeConfig, {
      tenantId,
      feeType: 'percentage',
      percentageFee: 15,
      updatedBy: adminId,
    });

    expect(id).toBeDefined();

    const config = await t.query(api.domain.adminPayouts.getFeeConfig, { tenantId, userId: adminId });
    expect(config).not.toBeNull();
    expect(config!.feeType).toBe('percentage');
    expect(config!.percentageFee).toBe(15);
    expect(config!.isActive).toBe(true);
  });

  it('deactivates previous config when setting a new one', async () => {
    const t = setup();
    const { tenantId, adminId } = await seedTestTenant(t);

    await t.mutation(api.domain.adminPayouts.setFeeConfig, {
      tenantId,
      feeType: 'percentage',
      percentageFee: 10,
      updatedBy: adminId,
    });

    await t.mutation(api.domain.adminPayouts.setFeeConfig, {
      tenantId,
      feeType: 'percentage_plus_flat',
      percentageFee: 12,
      flatFee: 500,
      updatedBy: adminId,
    });

    const active = await t.query(api.domain.adminPayouts.getFeeConfig, { tenantId, userId: adminId });
    expect(active!.feeType).toBe('percentage_plus_flat');
    expect(active!.percentageFee).toBe(12);
    expect(active!.flatFee).toBe(500);

    // History should have both
    const allConfigs = await t.query(api.domain.adminPayouts.listFeeConfigs, { tenantId, userId: adminId });
    expect(allConfigs.length).toBe(2);
    const inactiveConfigs = allConfigs.filter((c) => !c.isActive);
    expect(inactiveConfigs.length).toBe(1);
  });

  it('supports flat fee type', async () => {
    const t = setup();
    const { tenantId, adminId } = await seedTestTenant(t);

    await t.mutation(api.domain.adminPayouts.setFeeConfig, {
      tenantId,
      feeType: 'flat',
      flatFee: 2500,
      updatedBy: adminId,
    });

    const config = await t.query(api.domain.adminPayouts.getFeeConfig, { tenantId, userId: adminId });
    expect(config!.feeType).toBe('flat');
    expect(config!.flatFee).toBe(2500);
  });
});

describe('adminPayouts — calculateFee', () => {
  it('calculates percentage fee correctly', async () => {
    const t = setup();
    const { tenantId, adminId } = await seedTestTenant(t);

    await t.mutation(api.domain.adminPayouts.setFeeConfig, {
      tenantId,
      feeType: 'percentage',
      percentageFee: 15,
      updatedBy: adminId,
    });

    const result = await t.query(api.domain.adminPayouts.calculateFee, {
      tenantId,
      userId: adminId,
      amount: 100000, // 1000.00 NOK in øre
    });

    expect(result.platformFee).toBe(15000); // 15% of 100000
    expect(result.netAmount).toBe(85000);
  });

  it('calculates flat fee correctly', async () => {
    const t = setup();
    const { tenantId, adminId } = await seedTestTenant(t);

    await t.mutation(api.domain.adminPayouts.setFeeConfig, {
      tenantId,
      feeType: 'flat',
      flatFee: 2500,
      updatedBy: adminId,
    });

    const result = await t.query(api.domain.adminPayouts.calculateFee, {
      tenantId,
      userId: adminId,
      amount: 100000,
    });

    expect(result.platformFee).toBe(2500);
    expect(result.netAmount).toBe(97500);
  });

  it('calculates percentage_plus_flat fee correctly', async () => {
    const t = setup();
    const { tenantId, adminId } = await seedTestTenant(t);

    await t.mutation(api.domain.adminPayouts.setFeeConfig, {
      tenantId,
      feeType: 'percentage_plus_flat',
      percentageFee: 10,
      flatFee: 500,
      updatedBy: adminId,
    });

    const result = await t.query(api.domain.adminPayouts.calculateFee, {
      tenantId,
      userId: adminId,
      amount: 100000,
    });

    expect(result.platformFee).toBe(10500); // 10000 + 500
    expect(result.netAmount).toBe(89500);
  });

  it('returns zero fee when no config exists', async () => {
    const t = setup();
    const { tenantId, adminId } = await seedTestTenant(t);

    const result = await t.query(api.domain.adminPayouts.calculateFee, {
      tenantId,
      userId: adminId,
      amount: 100000,
    });

    expect(result.platformFee).toBe(0);
    expect(result.netAmount).toBe(100000);
    expect(result.feeConfig).toBeNull();
  });
});

// =============================================================================
// CREATOR EARNINGS
// =============================================================================

describe('adminPayouts — recordEarnings', () => {
  it('creates an earnings record for a new creator-period', async () => {
    const t = setup();
    const { tenantId, adminId, userId } = await seedTestTenant(t);

    const result = await t.mutation((api.domain.adminPayouts as any).recordEarnings, {
      tenantId,
      creatorId: userId,
      period: '2026-04',
      grossAmount: 100000,
      platformFeeAmount: 15000,
    });

    expect(result.id).toBeDefined();
    expect(result.updated).toBe(false);

    const earnings = await t.query(api.domain.adminPayouts.listCreatorEarnings, {
      tenantId,
      userId: adminId,
      creatorId: userId,
      period: '2026-04',
    });

    expect(earnings.length).toBe(1);
    expect(earnings[0].grossRevenue).toBe(100000);
    expect(earnings[0].platformFees).toBe(15000);
    expect(earnings[0].netEarnings).toBe(85000);
    expect(earnings[0].subscriberCount).toBe(1);
  });

  it('accumulates earnings for same creator-period', async () => {
    const t = setup();
    const { tenantId, adminId, userId } = await seedTestTenant(t);

    await t.mutation((api.domain.adminPayouts as any).recordEarnings, {
      tenantId,
      creatorId: userId,
      period: '2026-04',
      grossAmount: 50000,
      platformFeeAmount: 7500,
    });

    const result = await t.mutation((api.domain.adminPayouts as any).recordEarnings, {
      tenantId,
      creatorId: userId,
      period: '2026-04',
      grossAmount: 30000,
      platformFeeAmount: 4500,
    });

    expect(result.updated).toBe(true);

    const earnings = await t.query(api.domain.adminPayouts.listCreatorEarnings, {
      tenantId,
      userId: adminId,
      creatorId: userId,
      period: '2026-04',
    });

    expect(earnings.length).toBe(1);
    expect(earnings[0].grossRevenue).toBe(80000);
    expect(earnings[0].platformFees).toBe(12000);
    expect(earnings[0].netEarnings).toBe(68000);
    expect(earnings[0].subscriberCount).toBe(2);
  });
});

describe('adminPayouts — getCreatorEarningsSummary', () => {
  it('aggregates earnings across periods', async () => {
    const t = setup();
    const { tenantId, adminId, userId } = await seedTestTenant(t);

    await t.mutation((api.domain.adminPayouts as any).recordEarnings, {
      tenantId,
      creatorId: userId,
      period: '2026-03',
      grossAmount: 100000,
      platformFeeAmount: 15000,
    });

    await t.mutation((api.domain.adminPayouts as any).recordEarnings, {
      tenantId,
      creatorId: userId,
      period: '2026-04',
      grossAmount: 120000,
      platformFeeAmount: 18000,
    });

    const summary = await t.query(api.domain.adminPayouts.getCreatorEarningsSummary, {
      tenantId,
      userId: adminId,
      creatorId: userId,
    });

    expect(summary.totalGrossRevenue).toBe(220000);
    expect(summary.totalPlatformFees).toBe(33000);
    expect(summary.totalNetEarnings).toBe(187000);
    expect(summary.totalPaidOut).toBe(0);
    expect(summary.pendingPayout).toBe(187000);
    expect(summary.periodCount).toBe(2);
  });
});

describe('adminPayouts — getDashboardStats', () => {
  it('returns platform-wide dashboard stats', async () => {
    const t = setup();
    const { tenantId, userId, adminId } = await seedTestTenant(t);

    await t.mutation((api.domain.adminPayouts as any).recordEarnings, {
      tenantId,
      creatorId: userId,
      period: '2026-04',
      grossAmount: 100000,
      platformFeeAmount: 15000,
    });

    await t.mutation((api.domain.adminPayouts as any).recordEarnings, {
      tenantId,
      creatorId: adminId,
      period: '2026-04',
      grossAmount: 200000,
      platformFeeAmount: 30000,
    });

    const stats = await t.query(api.domain.adminPayouts.getDashboardStats, {
      tenantId,
      userId: adminId,
      period: '2026-04',
    });

    expect(stats.totalGrossRevenue).toBe(300000);
    expect(stats.totalPlatformFees).toBe(45000);
    expect(stats.totalCreatorEarnings).toBe(255000);
    expect(stats.activeCreators).toBe(2);
  });
});

// =============================================================================
// CREATOR PAYOUTS
// =============================================================================

describe('adminPayouts — requestCreatorPayout', () => {
  it('creates a pending payout with fee calculation', async () => {
    const t = setup();
    const { tenantId, adminId, userId } = await seedTestTenant(t);

    // Set up fee config
    await t.mutation(api.domain.adminPayouts.setFeeConfig, {
      tenantId,
      feeType: 'percentage',
      percentageFee: 15,
      updatedBy: adminId,
    });

    const { id, platformFee, netAmount } = await t.mutation(api.domain.adminPayouts.requestCreatorPayout, {
      tenantId,
      creatorId: userId,
      amount: 100000,
      stripeAccountId: 'acct_test_123',
      requestedBy: adminId,
    });

    expect(id).toBeDefined();
    expect(platformFee).toBe(15000);
    expect(netAmount).toBe(85000);

    const payout = await t.query(api.domain.adminPayouts.getCreatorPayout, {
      payoutId: id,
      tenantId,
      userId: adminId,
    });

    expect(payout.status).toBe('pending');
    expect(payout.amount).toBe(100000);
    expect(payout.platformFee).toBe(15000);
    expect(payout.netAmount).toBe(85000);
    expect(payout.stripeAccountId).toBe('acct_test_123');
  });

  it('throws when amount is zero or negative', async () => {
    const t = setup();
    const { tenantId, adminId, userId } = await seedTestTenant(t);

    await expect(
      t.mutation(api.domain.adminPayouts.requestCreatorPayout, {
        tenantId,
        creatorId: userId,
        amount: 0,
        stripeAccountId: 'acct_test_123',
        requestedBy: adminId,
      }),
    ).rejects.toThrow('Payout amount must be positive');
  });

  it('creates payout with zero fee when no config exists', async () => {
    const t = setup();
    const { tenantId, adminId, userId } = await seedTestTenant(t);

    const { platformFee, netAmount } = await t.mutation(api.domain.adminPayouts.requestCreatorPayout, {
      tenantId,
      creatorId: userId,
      amount: 100000,
      stripeAccountId: 'acct_test_123',
      requestedBy: adminId,
    });

    expect(platformFee).toBe(0);
    expect(netAmount).toBe(100000);
  });
});

describe('adminPayouts — updateCreatorPayoutStatus', () => {
  it('transitions payout to completed', async () => {
    const t = setup();
    const { tenantId, adminId, userId } = await seedTestTenant(t);

    const { id } = await t.mutation(api.domain.adminPayouts.requestCreatorPayout, {
      tenantId,
      creatorId: userId,
      amount: 100000,
      stripeAccountId: 'acct_test_123',
      requestedBy: adminId,
    });

    await t.mutation(api.domain.adminPayouts.updateCreatorPayoutStatus, {
      payoutId: id,
      status: 'completed',
      stripeTransferId: 'tr_test_456',
      updatedBy: adminId,
    });

    const payout = await t.query(api.domain.adminPayouts.getCreatorPayout, {
      payoutId: id,
      tenantId,
      userId: adminId,
    });

    expect(payout.status).toBe('completed');
    expect(payout.stripeTransferId).toBe('tr_test_456');
    expect(payout.processedAt).toBeGreaterThan(0);
  });

  it('transitions payout to failed with reason', async () => {
    const t = setup();
    const { tenantId, adminId, userId } = await seedTestTenant(t);

    const { id } = await t.mutation(api.domain.adminPayouts.requestCreatorPayout, {
      tenantId,
      creatorId: userId,
      amount: 100000,
      stripeAccountId: 'acct_test_123',
      requestedBy: adminId,
    });

    await t.mutation(api.domain.adminPayouts.updateCreatorPayoutStatus, {
      payoutId: id,
      status: 'failed',
      failureReason: 'Stripe account restricted',
      updatedBy: adminId,
    });

    const payout = await t.query(api.domain.adminPayouts.getCreatorPayout, {
      payoutId: id,
      tenantId,
      userId: adminId,
    });

    expect(payout.status).toBe('failed');
    expect(payout.failureReason).toBe('Stripe account restricted');
  });
});

describe('adminPayouts — listCreatorPayouts', () => {
  it('lists payouts for a tenant', async () => {
    const t = setup();
    const { tenantId, adminId, userId } = await seedTestTenant(t);

    await t.mutation(api.domain.adminPayouts.requestCreatorPayout, {
      tenantId,
      creatorId: userId,
      amount: 50000,
      stripeAccountId: 'acct_1',
      requestedBy: adminId,
    });

    await t.mutation(api.domain.adminPayouts.requestCreatorPayout, {
      tenantId,
      creatorId: userId,
      amount: 75000,
      stripeAccountId: 'acct_1',
      requestedBy: adminId,
    });

    const payouts = await t.query(api.domain.adminPayouts.listCreatorPayouts, {
      tenantId,
      userId: adminId,
    });

    expect(payouts.length).toBe(2);
  });

  it('filters by creator', async () => {
    const t = setup();
    const { tenantId, adminId, userId } = await seedTestTenant(t);

    await t.mutation(api.domain.adminPayouts.requestCreatorPayout, {
      tenantId,
      creatorId: userId,
      amount: 50000,
      stripeAccountId: 'acct_1',
      requestedBy: adminId,
    });

    await t.mutation(api.domain.adminPayouts.requestCreatorPayout, {
      tenantId,
      creatorId: adminId,
      amount: 75000,
      stripeAccountId: 'acct_2',
      requestedBy: adminId,
    });

    const payouts = await t.query(api.domain.adminPayouts.listCreatorPayouts, {
      tenantId,
      userId: adminId,
      creatorId: userId,
    });

    expect(payouts.length).toBe(1);
    expect(payouts[0].creatorId).toBe(userId);
  });

  it('filters by status', async () => {
    const t = setup();
    const { tenantId, adminId, userId } = await seedTestTenant(t);

    const { id } = await t.mutation(api.domain.adminPayouts.requestCreatorPayout, {
      tenantId,
      creatorId: userId,
      amount: 50000,
      stripeAccountId: 'acct_1',
      requestedBy: adminId,
    });

    await t.mutation(api.domain.adminPayouts.updateCreatorPayoutStatus, {
      payoutId: id,
      status: 'completed',
      stripeTransferId: 'tr_1',
      updatedBy: adminId,
    });

    await t.mutation(api.domain.adminPayouts.requestCreatorPayout, {
      tenantId,
      creatorId: userId,
      amount: 75000,
      stripeAccountId: 'acct_1',
      requestedBy: adminId,
    });

    const pending = await t.query(api.domain.adminPayouts.listCreatorPayouts, {
      tenantId,
      userId: adminId,
      status: 'pending',
    });

    expect(pending.length).toBe(1);
    expect(pending[0].status).toBe('pending');
  });
});

// =============================================================================
// INTERNAL MUTATIONS (used by Stripe transfer action)
// =============================================================================

describe('adminPayouts — internal payout lifecycle', () => {
  it('markPayoutProcessing updates status', async () => {
    const t = setup();
    const { tenantId, adminId, userId } = await seedTestTenant(t);

    const { id } = await t.mutation(api.domain.adminPayouts.requestCreatorPayout, {
      tenantId,
      creatorId: userId,
      amount: 100000,
      stripeAccountId: 'acct_1',
      requestedBy: adminId,
    });

    await t.mutation((api.domain.adminPayouts as any).markPayoutProcessing, {
      payoutId: id,
    });

    const payout = await t.query(api.domain.adminPayouts.getCreatorPayout, {
      payoutId: id,
      tenantId,
      userId: adminId,
    });

    expect(payout.status).toBe('processing');
  });

  it('completeCreatorPayout sets status and stripeTransferId', async () => {
    const t = setup();
    const { tenantId, adminId, userId } = await seedTestTenant(t);

    const { id } = await t.mutation(api.domain.adminPayouts.requestCreatorPayout, {
      tenantId,
      creatorId: userId,
      amount: 100000,
      stripeAccountId: 'acct_1',
      requestedBy: adminId,
    });

    await t.mutation((api.domain.adminPayouts as any).completeCreatorPayout, {
      payoutId: id,
      stripeTransferId: 'tr_abc_123',
    });

    const payout = await t.query(api.domain.adminPayouts.getCreatorPayout, {
      payoutId: id,
      tenantId,
      userId: adminId,
    });

    expect(payout.status).toBe('completed');
    expect(payout.stripeTransferId).toBe('tr_abc_123');
    expect(payout.processedAt).toBeGreaterThan(0);
  });

  it('failCreatorPayout sets status and reason', async () => {
    const t = setup();
    const { tenantId, adminId, userId } = await seedTestTenant(t);

    const { id } = await t.mutation(api.domain.adminPayouts.requestCreatorPayout, {
      tenantId,
      creatorId: userId,
      amount: 100000,
      stripeAccountId: 'acct_1',
      requestedBy: adminId,
    });

    await t.mutation((api.domain.adminPayouts as any).failCreatorPayout, {
      payoutId: id,
      failureReason: 'Insufficient funds',
    });

    const payout = await t.query(api.domain.adminPayouts.getCreatorPayout, {
      payoutId: id,
      tenantId,
      userId: adminId,
    });

    expect(payout.status).toBe('failed');
    expect(payout.failureReason).toBe('Insufficient funds');
  });
});
