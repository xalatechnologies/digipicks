/**
 * Picks Domain Facade Tests
 *
 * Tests the facade layer (convex/domain/picks.ts) which adds:
 *   - Auth checks (requireActiveUser)
 *   - Rate limiting (createPick: 20/hour per creator)
 *   - Audit logging via audit component
 *   - Event bus emission
 *   - Creator data enrichment (user name/email)
 *
 * Component-level logic (validation, graded-pick guards, stats math)
 * is covered in components/picks/__tests__/picks.test.ts.
 *
 * Run: cd convex && npx vitest --config vitest.config.ts --run domain/__tests__/picks.test.ts
 */

import { describe, it, expect } from 'vitest';
import { api, components } from '../../_generated/api';
import { createDomainTest, seedTestTenant, seedSecondTenant } from './testHelper.test-util';
import type { Id } from '../../_generated/dataModel';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setup() {
  return createDomainTest(['picks', 'audit']);
}

function setupWithSubscriptions() {
  return createDomainTest(['picks', 'audit', 'subscriptions']);
}

async function seedMembership(
  t: ReturnType<typeof setupWithSubscriptions>,
  tenantId: string,
  userId: string,
  overrides: Partial<{
    status: string;
    lastPaymentDate: number;
    failedPaymentCount: number;
    creatorId: string;
  }> = {},
) {
  // Create a tier first
  const tier = await (t as any).mutation(components.subscriptions.functions.createTier, {
    tenantId,
    name: 'Premium',
    slug: 'premium',
    description: 'Premium access',
    price: 999,
    currency: 'USD',
    billingInterval: 'monthly',
    benefits: [{ id: 'picks_access', type: 'feature', label: 'Full Pick Access', config: {} }],
    sortOrder: 1,
    isActive: true,
    isPublic: true,
  });

  // Create a membership (always starts as pending/active)
  const membership = await (t as any).mutation(components.subscriptions.functions.createMembership, {
    tenantId,
    userId,
    tierId: tier.id,
    creatorId: overrides.creatorId,
    memberNumber: 'M-001',
    status: 'active',
    startDate: Date.now(),
    endDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });

  // Apply payment-related fields via updateMembership
  if (overrides.lastPaymentDate !== undefined || overrides.failedPaymentCount !== undefined) {
    await (t as any).mutation(components.subscriptions.functions.updateMembership, {
      id: membership.id,
      lastPaymentDate: overrides.lastPaymentDate,
      failedPaymentCount: overrides.failedPaymentCount,
    });
  }

  // Set status if not "active"
  if (overrides.status && overrides.status !== 'active') {
    await (t as any).mutation(components.subscriptions.functions.updateMembershipStatus, {
      id: membership.id,
      status: overrides.status,
    });
  }

  return { tierId: tier.id, membershipId: membership.id };
}

function pickArgs(tenantId: Id<'tenants'>, creatorId: Id<'users'>) {
  return {
    tenantId,
    creatorId,
    event: 'Lakers vs Celtics',
    sport: 'NBA',
    pickType: 'spread',
    selection: 'Lakers -3.5',
    oddsAmerican: '-110',
    oddsDecimal: 1.91,
    units: 2,
    confidence: 'medium' as const,
  };
}

// ---------------------------------------------------------------------------
// CREATE
// ---------------------------------------------------------------------------

describe('domain/picks — create', () => {
  it('creates a pick and returns id', async () => {
    const t = setup();
    const { tenantId, userId } = await seedTestTenant(t);

    const result = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

    expect(result.id).toBeDefined();
  });

  it('rejects inactive user', async () => {
    const t = setup();
    const { tenantId } = await seedTestTenant(t);

    const inactiveId = await t.run(async (ctx) => {
      return ctx.db.insert('users', {
        email: 'suspended@test.no',
        name: 'Suspended',
        role: 'user',
        status: 'suspended',
        tenantId,
        metadata: {},
      });
    });

    await expect(t.mutation(api.domain.picks.create, pickArgs(tenantId, inactiveId))).rejects.toThrow(
      'User not found or inactive',
    );
  });

  it('creates audit entry on pick creation', async () => {
    const t = setup();
    const { tenantId, userId } = await seedTestTenant(t);

    const result = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

    const auditEntries = await t.query(components.audit.functions.listForTenant, { tenantId: tenantId as string });
    const pickAudit = auditEntries.find((e: any) => e.entityType === 'pick' && e.entityId === result.id);
    expect(pickAudit).toBeDefined();
    expect(pickAudit.action).toBe('created');
  });

  it('rate limits at 20 picks per hour', async () => {
    const t = setup();
    const { tenantId, userId } = await seedTestTenant(t);

    // Create 20 picks (should all succeed)
    for (let i = 0; i < 20; i++) {
      await t.mutation(api.domain.picks.create, {
        ...pickArgs(tenantId, userId),
        event: `Game ${i}`,
      });
    }

    // 21st pick should be rate limited
    await expect(
      t.mutation(api.domain.picks.create, {
        ...pickArgs(tenantId, userId),
        event: 'One too many',
      }),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// LIST + GET (enrichment)
// ---------------------------------------------------------------------------

describe('domain/picks — list & get', () => {
  it('enriches picks with creator data', async () => {
    const t = setup();
    const { tenantId, userId } = await seedTestTenant(t);

    await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

    const picks = await t.query(api.domain.picks.list, { tenantId });

    expect(picks).toHaveLength(1);
    expect(picks[0].creator).toBeDefined();
    expect(picks[0].creator.name).toBe('Test User');
    expect(picks[0].creator.email).toBe('user@test.no');
  });

  it('get enriches single pick with creator data', async () => {
    const t = setup();
    const { tenantId, userId } = await seedTestTenant(t);

    const { id } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

    const pick = await t.query(api.domain.picks.get, { id });

    expect(pick.creator).toBeDefined();
    expect(pick.creator.name).toBe('Test User');
  });

  it('list filters by sport', async () => {
    const t = setup();
    const { tenantId, userId } = await seedTestTenant(t);

    await t.mutation(api.domain.picks.create, {
      ...pickArgs(tenantId, userId),
      sport: 'NBA',
      event: 'NBA game',
    });
    await t.mutation(api.domain.picks.create, {
      ...pickArgs(tenantId, userId),
      sport: 'NFL',
      event: 'NFL game',
    });

    const nflPicks = await t.query(api.domain.picks.list, {
      tenantId,
      sport: 'NFL',
    });

    expect(nflPicks).toHaveLength(1);
    expect(nflPicks[0].sport).toBe('NFL');
  });

  it('list isolates by tenant', async () => {
    const t = setup();
    const { tenantId, userId } = await seedTestTenant(t);
    const { tenantId: otherTenant, userId: otherUser } = await seedSecondTenant(t);

    await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));
    await t.mutation(api.domain.picks.create, pickArgs(otherTenant, otherUser));

    const picks = await t.query(api.domain.picks.list, { tenantId });

    expect(picks).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// CREATOR STATS
// ---------------------------------------------------------------------------

describe('domain/picks — creatorStats', () => {
  it('returns stats via facade', async () => {
    const t = setup();
    const { tenantId, userId } = await seedTestTenant(t);

    const { id: wonId } = await t.mutation(api.domain.picks.create, {
      ...pickArgs(tenantId, userId),
      event: 'Won game',
    });
    await t.mutation(api.domain.picks.create, {
      ...pickArgs(tenantId, userId),
      event: 'Pending game',
    });

    await t.mutation(api.domain.picks.grade, {
      id: wonId,
      result: 'won',
      gradedBy: userId,
    });

    const stats = await t.query(api.domain.picks.creatorStats, {
      tenantId,
      creatorId: userId as string,
    });

    expect(stats.totalPicks).toBe(2);
    expect(stats.wins).toBe(1);
    expect(stats.pending).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// UPDATE
// ---------------------------------------------------------------------------

describe('domain/picks — update', () => {
  it('updates a pending pick', async () => {
    const t = setup();
    const { tenantId, userId } = await seedTestTenant(t);

    const { id } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

    await t.mutation(api.domain.picks.update, {
      id,
      callerId: userId,
      analysis: 'Strong home court advantage',
    });

    const updated = await t.query(api.domain.picks.get, { id });
    expect(updated.analysis).toBe('Strong home court advantage');
  });

  it('creates audit entry on update', async () => {
    const t = setup();
    const { tenantId, userId } = await seedTestTenant(t);

    const { id } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

    await t.mutation(api.domain.picks.update, { id, callerId: userId, analysis: 'New analysis' });

    const auditEntries = await t.query(components.audit.functions.listForTenant, { tenantId: tenantId as string });
    const updateAudit = auditEntries.find((e: any) => e.entityType === 'pick' && e.action === 'updated');
    expect(updateAudit).toBeDefined();
  });

  it('rejects editing odds on graded pick (immutability)', async () => {
    const t = setup();
    const { tenantId, userId } = await seedTestTenant(t);

    const { id } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

    await t.mutation(api.domain.picks.grade, {
      id,
      result: 'won',
      gradedBy: userId,
    });

    await expect(t.mutation(api.domain.picks.update, { id, callerId: userId, oddsAmerican: '+200' })).rejects.toThrow(
      'Cannot edit odds, units, or selection on a graded pick',
    );
  });
});

// ---------------------------------------------------------------------------
// GRADE
// ---------------------------------------------------------------------------

describe('domain/picks — grade', () => {
  it('grades a pick and creates audit entry', async () => {
    const t = setup();
    const { tenantId, userId } = await seedTestTenant(t);

    const { id } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

    const result = await t.mutation(api.domain.picks.grade, {
      id,
      result: 'lost',
      gradedBy: userId,
    });

    expect(result.success).toBe(true);

    const auditEntries = await t.query(components.audit.functions.listForTenant, { tenantId: tenantId as string });
    const gradeAudit = auditEntries.find((e: any) => e.entityType === 'pick' && e.action === 'graded');
    expect(gradeAudit).toBeDefined();
    expect(gradeAudit.newState?.result).toBe('lost');
  });

  it('rejects grading by inactive user', async () => {
    const t = setup();
    const { tenantId, userId } = await seedTestTenant(t);

    const { id } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

    const inactiveId = await t.run(async (ctx) => {
      return ctx.db.insert('users', {
        email: 'gone@test.no',
        name: 'Gone',
        role: 'user',
        status: 'suspended',
        tenantId,
        metadata: {},
      });
    });

    await expect(
      t.mutation(api.domain.picks.grade, {
        id,
        result: 'won',
        gradedBy: inactiveId,
      }),
    ).rejects.toThrow('User not found or inactive');
  });

  it('rejects re-grading (immutability)', async () => {
    const t = setup();
    const { tenantId, userId } = await seedTestTenant(t);

    const { id } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

    await t.mutation(api.domain.picks.grade, {
      id,
      result: 'won',
      gradedBy: userId,
    });

    await expect(
      t.mutation(api.domain.picks.grade, {
        id,
        result: 'lost',
        gradedBy: userId,
      }),
    ).rejects.toThrow('Pick already graded');
  });

  it('supports all result types (won/lost/push/void)', async () => {
    const t = setup();
    const { tenantId, userId } = await seedTestTenant(t);

    const results = ['won', 'lost', 'push', 'void'] as const;

    for (const resultVal of results) {
      const { id } = await t.mutation(api.domain.picks.create, {
        ...pickArgs(tenantId, userId),
        event: `Game ${resultVal}`,
      });
      const res = await t.mutation(api.domain.picks.grade, {
        id,
        result: resultVal,
        gradedBy: userId,
      });
      expect(res.success).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// REMOVE
// ---------------------------------------------------------------------------

describe('domain/picks — remove', () => {
  it('removes a pick and creates audit entry', async () => {
    const t = setup();
    const { tenantId, userId } = await seedTestTenant(t);

    const { id } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

    const result = await t.mutation(api.domain.picks.remove, { id, callerId: userId });
    expect(result.success).toBe(true);

    const auditEntries = await t.query(components.audit.functions.listForTenant, { tenantId: tenantId as string });
    const removeAudit = auditEntries.find((e: any) => e.entityType === 'pick' && e.action === 'removed');
    expect(removeAudit).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// SUBSCRIPTION GATING
// ---------------------------------------------------------------------------

describe('domain/picks — subscription gating', () => {
  it('returns ungated picks when no viewerId (dashboard context)', async () => {
    const t = setupWithSubscriptions();
    const { tenantId, userId } = await seedTestTenant(t);

    await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

    const picks = await t.query(api.domain.picks.list, { tenantId });

    expect(picks).toHaveLength(1);
    expect(picks[0].isGated).toBe(false);
    expect(picks[0].selection).toBe('Lakers -3.5');
    expect(picks[0].oddsAmerican).toBe('-110');
    expect(picks[0].units).toBe(2);
  });

  it('gates premium fields for viewer without subscription', async () => {
    const t = setupWithSubscriptions();
    const { tenantId, userId } = await seedTestTenant(t);

    await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

    // Create a viewer with no subscription
    const viewerId = await t.run(async (ctx) => {
      return ctx.db.insert('users', {
        email: 'viewer@test.no',
        name: 'Viewer',
        role: 'user',
        status: 'active',
        tenantId,
        metadata: {},
      });
    });

    const picks = await t.query(api.domain.picks.list, {
      tenantId,
      viewerId: viewerId as string,
    });

    expect(picks).toHaveLength(1);
    expect(picks[0].isGated).toBe(true);
    expect(picks[0].selection).toBeNull();
    expect(picks[0].oddsAmerican).toBeNull();
    expect(picks[0].oddsDecimal).toBeNull();
    expect(picks[0].units).toBeNull();
    expect(picks[0].analysis).toBeNull();
    // Non-gated fields still present
    expect(picks[0].event).toBe('Lakers vs Celtics');
    expect(picks[0].sport).toBe('NBA');
    expect(picks[0].confidence).toBe('medium');
    expect(picks[0].creator).toBeDefined();
  });

  it('returns full picks for viewer with active subscription', async () => {
    const t = setupWithSubscriptions();
    const { tenantId, userId } = await seedTestTenant(t);

    await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

    // Create subscriber
    const subscriberId = await t.run(async (ctx) => {
      return ctx.db.insert('users', {
        email: 'sub@test.no',
        name: 'Subscriber',
        role: 'user',
        status: 'active',
        tenantId,
        metadata: {},
      });
    });

    await seedMembership(t, tenantId as string, subscriberId as string, {
      status: 'active',
      creatorId: userId as string,
    });

    const picks = await t.query(api.domain.picks.list, {
      tenantId,
      viewerId: subscriberId as string,
    });

    expect(picks).toHaveLength(1);
    expect(picks[0].isGated).toBe(false);
    expect(picks[0].selection).toBe('Lakers -3.5');
    expect(picks[0].oddsAmerican).toBe('-110');
    expect(picks[0].units).toBe(2);
  });

  it('grants access during 24h grace period after payment failure', async () => {
    const t = setupWithSubscriptions();
    const { tenantId, userId } = await seedTestTenant(t);

    await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

    const subscriberId = await t.run(async (ctx) => {
      return ctx.db.insert('users', {
        email: 'pastdue@test.no',
        name: 'PastDue',
        role: 'user',
        status: 'active',
        tenantId,
        metadata: {},
      });
    });

    // past_due but last payment was 12h ago (within 24h grace period)
    await seedMembership(t, tenantId as string, subscriberId as string, {
      status: 'past_due',
      lastPaymentDate: Date.now() - 12 * 60 * 60 * 1000, // 12h ago
      failedPaymentCount: 1,
      creatorId: userId as string,
    });

    const picks = await t.query(api.domain.picks.list, {
      tenantId,
      viewerId: subscriberId as string,
    });

    expect(picks[0].isGated).toBe(false);
    expect(picks[0].selection).toBe('Lakers -3.5');
  });

  it('gates picks after grace period expires', async () => {
    const t = setupWithSubscriptions();
    const { tenantId, userId } = await seedTestTenant(t);

    await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

    const subscriberId = await t.run(async (ctx) => {
      return ctx.db.insert('users', {
        email: 'expired@test.no',
        name: 'Expired',
        role: 'user',
        status: 'active',
        tenantId,
        metadata: {},
      });
    });

    // past_due but last payment was 48h ago (beyond grace period)
    await seedMembership(t, tenantId as string, subscriberId as string, {
      status: 'past_due',
      lastPaymentDate: Date.now() - 48 * 60 * 60 * 1000, // 48h ago
      failedPaymentCount: 2,
      creatorId: userId as string,
    });

    const picks = await t.query(api.domain.picks.list, {
      tenantId,
      viewerId: subscriberId as string,
    });

    expect(picks[0].isGated).toBe(true);
    expect(picks[0].selection).toBeNull();
  });

  it('gates single pick via get with viewerId', async () => {
    const t = setupWithSubscriptions();
    const { tenantId, userId } = await seedTestTenant(t);

    const { id } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

    const viewerId = await t.run(async (ctx) => {
      return ctx.db.insert('users', {
        email: 'anon@test.no',
        name: 'Anon',
        role: 'user',
        status: 'active',
        tenantId,
        metadata: {},
      });
    });

    const pick = await t.query(api.domain.picks.get, {
      id,
      viewerId: viewerId as string,
    });

    expect(pick.isGated).toBe(true);
    expect(pick.selection).toBeNull();
    expect(pick.event).toBe('Lakers vs Celtics');
  });

  it('returns ungated single pick for subscriber via get', async () => {
    const t = setupWithSubscriptions();
    const { tenantId, userId } = await seedTestTenant(t);

    const { id } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

    const subscriberId = await t.run(async (ctx) => {
      return ctx.db.insert('users', {
        email: 'sub2@test.no',
        name: 'Sub2',
        role: 'user',
        status: 'active',
        tenantId,
        metadata: {},
      });
    });

    await seedMembership(t, tenantId as string, subscriberId as string, {
      status: 'active',
      creatorId: userId as string,
    });

    const pick = await t.query(api.domain.picks.get, {
      id,
      viewerId: subscriberId as string,
    });

    expect(pick.isGated).toBe(false);
    expect(pick.selection).toBe('Lakers -3.5');
  });
});

// ---------------------------------------------------------------------------
// CREATOR PROFILE
// ---------------------------------------------------------------------------

describe('domain/picks — creatorProfile', () => {
  it('returns creator profile with user info and stats', async () => {
    const t = setup();
    const { tenantId, userId } = await seedTestTenant(t);

    await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

    const profile = await t.query(api.domain.picks.creatorProfile, {
      tenantId,
      creatorId: userId as string,
    });

    expect(profile).not.toBeNull();
    expect(profile!.name).toBe('Test User');
    expect(profile!.stats).toBeDefined();
    expect(profile!.stats.totalPicks).toBe(1);
    expect(profile!.recentPicks).toHaveLength(1);
  });

  it('returns null for inactive creator', async () => {
    const t = setup();
    const { tenantId } = await seedTestTenant(t);

    const inactiveId = await t.run(async (ctx) => {
      return ctx.db.insert('users', {
        email: 'inactive@test.no',
        name: 'Inactive',
        role: 'user',
        status: 'suspended',
        tenantId,
        metadata: {},
      });
    });

    const profile = await t.query(api.domain.picks.creatorProfile, {
      tenantId,
      creatorId: inactiveId as string,
    });

    expect(profile).toBeNull();
  });

  it('gates recent picks for non-subscriber viewer', async () => {
    const t = setupWithSubscriptions();
    const { tenantId, userId } = await seedTestTenant(t);

    await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

    const viewerId = await t.run(async (ctx) => {
      return ctx.db.insert('users', {
        email: 'viewer@test.no',
        name: 'Viewer',
        role: 'user',
        status: 'active',
        tenantId,
        metadata: {},
      });
    });

    const profile = await t.query(api.domain.picks.creatorProfile, {
      tenantId,
      creatorId: userId as string,
      viewerId: viewerId as string,
    });

    expect(profile).not.toBeNull();
    expect(profile!.stats).toBeDefined(); // Stats always visible
    expect(profile!.recentPicks).toHaveLength(1);
    expect(profile!.recentPicks[0].isGated).toBe(true);
    expect(profile!.recentPicks[0].selection).toBeNull();
  });

  it('returns ungated picks for subscriber viewer', async () => {
    const t = setupWithSubscriptions();
    const { tenantId, userId } = await seedTestTenant(t);

    await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

    const subscriberId = await t.run(async (ctx) => {
      return ctx.db.insert('users', {
        email: 'sub@test.no',
        name: 'Sub',
        role: 'user',
        status: 'active',
        tenantId,
        metadata: {},
      });
    });

    await seedMembership(t, tenantId as string, subscriberId as string, {
      status: 'active',
      creatorId: userId as string,
    });

    const profile = await t.query(api.domain.picks.creatorProfile, {
      tenantId,
      creatorId: userId as string,
      viewerId: subscriberId as string,
    });

    expect(profile!.recentPicks[0].isGated).toBe(false);
    expect(profile!.recentPicks[0].selection).toBe('Lakers -3.5');
  });

  it('limits recent picks to 10', async () => {
    const t = setup();
    const { tenantId, userId } = await seedTestTenant(t);

    for (let i = 0; i < 15; i++) {
      await t.mutation(api.domain.picks.create, {
        ...pickArgs(tenantId, userId),
        event: `Game ${i}`,
      });
    }

    const profile = await t.query(api.domain.picks.creatorProfile, {
      tenantId,
      creatorId: userId as string,
    });

    expect(profile!.recentPicks).toHaveLength(10);
  });
});
