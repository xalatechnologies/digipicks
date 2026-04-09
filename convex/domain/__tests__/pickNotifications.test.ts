/**
 * Pick Notifications — Event Bus Fan-out Tests
 *
 * Verifies that when a `picks.pick.created` or `picks.pick.graded` event is
 * emitted to the outbox, the eventBus processor fans out in-app notifications
 * to every active subscriber of that creator via the notifications component.
 *
 * Handler lives in convex/lib/eventBus.ts (Pattern A — compile-time dispatch
 * table in processEvents, consistent with how all other cross-component
 * notifications are wired in this codebase).
 *
 * Run: cd convex && npx vitest --config vitest.config.ts --run domain/__tests__/pickNotifications.test.ts
 */

import { describe, it, expect } from 'vitest';
import { components, internal } from '../../_generated/api';
import { createDomainTest } from './testHelper.test-util';

const TENANT = 'tenant-pick-notif-001';
const CREATOR = 'user-creator-001';
const SUBSCRIBER_A = 'user-sub-a';
const SUBSCRIBER_B = 'user-sub-b';
const INACTIVE_SUBSCRIBER = 'user-sub-inactive';

function setup() {
  return createDomainTest(['picks', 'subscriptions', 'notifications', 'audit']);
}

async function seedActiveMembership(
  t: ReturnType<typeof setup>,
  tierId: string,
  userId: string,
  status: string = 'active',
) {
  const membership = await (t as any).mutation(components.subscriptions.functions.createMembership, {
    tenantId: TENANT,
    userId,
    tierId,
    creatorId: CREATOR,
    memberNumber: `M-${userId}`,
    status: 'active',
    startDate: Date.now(),
    endDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });
  if (status !== 'active') {
    await (t as any).mutation(components.subscriptions.functions.updateMembershipStatus, { id: membership.id, status });
  }
  return membership.id;
}

async function seedTierAndSubscribers(t: ReturnType<typeof setup>) {
  const tier = await (t as any).mutation(components.subscriptions.functions.createTier, {
    tenantId: TENANT,
    name: 'Premium',
    slug: 'premium',
    price: 999,
    currency: 'USD',
    billingInterval: 'monthly',
    benefits: [{ id: 'picks', type: 'feature', label: 'Picks', config: {} }],
    sortOrder: 1,
    isActive: true,
    isPublic: true,
  });
  await seedActiveMembership(t, tier.id, SUBSCRIBER_A, 'active');
  await seedActiveMembership(t, tier.id, SUBSCRIBER_B, 'active');
  // Cancelled subscriber — should NOT receive notifications
  await seedActiveMembership(t, tier.id, INACTIVE_SUBSCRIBER, 'cancelled');
  return tier.id;
}

describe('pick notifications — fan out to active subscribers', () => {
  it('picks.pick.created emits a notification to every active subscriber of the creator', async () => {
    const t = setup();
    await seedTierAndSubscribers(t);

    // Emit the event directly to the outbox
    await t.run(async (ctx) =>
      ctx.runMutation(internal.lib.eventBus.emit, {
        topic: 'picks.pick.created',
        tenantId: TENANT,
        sourceComponent: 'picks',
        payload: {
          pickId: 'pick-001',
          creatorId: CREATOR,
          event: 'Lakers vs Celtics',
          sport: 'NBA',
          selection: 'Lakers -3.5',
        },
      }),
    );

    // Process the outbox
    const result = await t.run(async (ctx) => ctx.runMutation(internal.lib.eventBus.processEvents, { batchSize: 50 }));
    expect(result.processed).toBeGreaterThanOrEqual(1);
    expect(result.failed).toBe(0);

    // Each active subscriber should have 1 notification
    const notifsA = await (t as any).query(components.notifications.functions.listByUser, {
      userId: SUBSCRIBER_A,
    });
    const notifsB = await (t as any).query(components.notifications.functions.listByUser, {
      userId: SUBSCRIBER_B,
    });
    const notifsInactive = await (t as any).query(components.notifications.functions.listByUser, {
      userId: INACTIVE_SUBSCRIBER,
    });

    expect(notifsA).toHaveLength(1);
    expect(notifsB).toHaveLength(1);
    expect(notifsInactive).toHaveLength(0);

    expect(notifsA[0].type).toBe('pick_posted');
    expect(notifsA[0].title).toContain('Ny pick');
    expect(notifsA[0].link).toBe('/picks/pick-001');
    expect(notifsA[0].metadata.pickId).toBe('pick-001');
    expect(notifsA[0].metadata.creatorId).toBe(CREATOR);
  });

  it('picks.pick.graded emits a graded-result notification to every active subscriber', async () => {
    const t = setup();
    await seedTierAndSubscribers(t);

    await t.run(async (ctx) =>
      ctx.runMutation(internal.lib.eventBus.emit, {
        topic: 'picks.pick.graded',
        tenantId: TENANT,
        sourceComponent: 'picks',
        payload: {
          pickId: 'pick-002',
          creatorId: CREATOR,
          event: 'Lakers vs Celtics',
          sport: 'NBA',
          result: 'won',
          gradedBy: CREATOR,
        },
      }),
    );

    const result = await t.run(async (ctx) => ctx.runMutation(internal.lib.eventBus.processEvents, { batchSize: 50 }));
    expect(result.failed).toBe(0);

    const notifsA = await (t as any).query(components.notifications.functions.listByUser, {
      userId: SUBSCRIBER_A,
    });
    const notifsB = await (t as any).query(components.notifications.functions.listByUser, {
      userId: SUBSCRIBER_B,
    });

    expect(notifsA).toHaveLength(1);
    expect(notifsB).toHaveLength(1);
    expect(notifsA[0].type).toBe('pick_graded');
    expect(notifsA[0].title).toContain('Vunnet');
    expect(notifsA[0].metadata.result).toBe('won');
    expect(notifsA[0].metadata.pickId).toBe('pick-002');
  });
});
