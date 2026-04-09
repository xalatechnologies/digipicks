/**
 * Pick Notification Integration Tests
 *
 * Verifies that pick domain events (pick.created, pick.graded, pick.removed,
 * tail.created, copost.created) flow through the event bus and create
 * notifications in the notifications component.
 *
 * These tests exercise the full event bus → notification creation path,
 * including subscriber fan-out, preference checking, and result labelling.
 *
 * Run: cd convex && npx vitest --config vitest.config.ts --run domain/__tests__/pickNotifications.test.ts
 */

import { describe, it, expect } from 'vitest';
import { components, internal } from '../../_generated/api';
import { createDomainTest, seedTestTenant } from './testHelper.test-util';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setup() {
  return createDomainTest(['notifications', 'subscriptions', 'picks']);
}

const TENANT = 'tenant-pick-notif-001';

async function seedCreatorAndSubscriber(t: ReturnType<typeof setup>) {
  const { tenantId, userId: subscriberId, adminId: creatorId } = await seedTestTenant(t);

  // Create a tier
  const tier = await (t as any).mutation(components.subscriptions.functions.createTier, {
    tenantId: tenantId as string,
    name: 'Premium',
    slug: 'premium-picks',
    description: 'Premium picks access',
    price: 999,
    currency: 'USD',
    billingInterval: 'monthly',
    benefits: [{ id: 'picks_access', type: 'feature', label: 'Picks Access', config: {} }],
    sortOrder: 1,
    isActive: true,
    isPublic: true,
  });

  // Subscribe the user to the creator
  await (t as any).mutation(components.subscriptions.functions.createMembership, {
    tenantId: tenantId as string,
    userId: subscriberId as string,
    tierId: tier.id,
    creatorId: creatorId as string,
    memberNumber: 'M-001',
    status: 'active',
    startDate: Date.now(),
    endDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });

  return { tenantId, creatorId, subscriberId };
}

async function emitPickEvent(
  t: ReturnType<typeof setup>,
  topic: string,
  tenantId: string,
  payload: Record<string, unknown>,
) {
  return t.run(async (ctx) =>
    ctx.runMutation(internal.lib.eventBus.emit, {
      topic,
      tenantId,
      sourceComponent: 'picks',
      payload,
    }),
  );
}

async function processAllEvents(t: ReturnType<typeof setup>) {
  return t.run(async (ctx) => ctx.runMutation(internal.lib.eventBus.processEvents, { batchSize: 50 }));
}

async function getNotificationsForUser(t: ReturnType<typeof setup>, userId: string) {
  return (t as any).query(components.notifications.functions.listByUser, { userId }) as Promise<
    Array<{ type: string; title: string; body?: string; metadata?: Record<string, unknown> }>
  >;
}

// ---------------------------------------------------------------------------
// picks.pick.created → subscriber notifications
// ---------------------------------------------------------------------------

describe('pick notifications — picks.pick.created', () => {
  it('creates notification for active subscribers when creator publishes a pick', async () => {
    const t = setup();
    const { tenantId, creatorId, subscriberId } = await seedCreatorAndSubscriber(t);

    await emitPickEvent(t, 'picks.pick.created', tenantId as string, {
      pickId: 'pick-001',
      creatorId: creatorId as string,
      sport: 'Football',
      event: 'Man Utd vs Arsenal',
    });

    const result = await processAllEvents(t);
    expect(result.processed).toBeGreaterThanOrEqual(1);

    const notifications = await getNotificationsForUser(t, subscriberId as string);
    expect(notifications.length).toBe(1);
    expect(notifications[0].type).toBe('pick_posted');
    expect(notifications[0].title).toBe('Ny pick publisert!');
    expect(notifications[0].body).toContain('Football');
    expect(notifications[0].body).toContain('Man Utd vs Arsenal');
  });

  it('does not notify users without active subscription to the creator', async () => {
    const t = setup();
    const { tenantId, adminId: creatorId } = await seedTestTenant(t);

    // Create a second user who is NOT subscribed
    const nonSubscriberId = await t.run(async (ctx) =>
      ctx.db.insert('users', {
        email: 'notsub@test.no',
        name: 'Not Subscribed',
        role: 'user',
        status: 'active',
        tenantId,
        metadata: {},
      }),
    );

    await emitPickEvent(t, 'picks.pick.created', tenantId as string, {
      pickId: 'pick-002',
      creatorId: creatorId as string,
      sport: 'Basketball',
      event: 'Lakers vs Celtics',
    });

    await processAllEvents(t);

    const notifications = await getNotificationsForUser(t, nonSubscriberId as string);
    expect(notifications.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// picks.pick.graded → subscriber notifications with result labels
// ---------------------------------------------------------------------------

describe('pick notifications — picks.pick.graded', () => {
  it('creates notification with Norwegian result label for graded picks', async () => {
    const t = setup();
    const { tenantId, creatorId, subscriberId } = await seedCreatorAndSubscriber(t);

    await emitPickEvent(t, 'picks.pick.graded', tenantId as string, {
      pickId: 'pick-003',
      creatorId: creatorId as string,
      sport: 'Football',
      event: 'Liverpool vs Chelsea',
      result: 'won',
    });

    await processAllEvents(t);

    const notifications = await getNotificationsForUser(t, subscriberId as string);
    expect(notifications.length).toBe(1);
    expect(notifications[0].type).toBe('pick_graded');
    expect(notifications[0].title).toContain('Vunnet');
  });

  it('handles lost result label correctly', async () => {
    const t = setup();
    const { tenantId, creatorId, subscriberId } = await seedCreatorAndSubscriber(t);

    await emitPickEvent(t, 'picks.pick.graded', tenantId as string, {
      pickId: 'pick-004',
      creatorId: creatorId as string,
      sport: 'NFL',
      event: 'Chiefs vs Eagles',
      result: 'lost',
    });

    await processAllEvents(t);

    const notifications = await getNotificationsForUser(t, subscriberId as string);
    expect(notifications.length).toBe(1);
    expect(notifications[0].title).toContain('Tapt');
  });

  it('handles push result label', async () => {
    const t = setup();
    const { tenantId, creatorId, subscriberId } = await seedCreatorAndSubscriber(t);

    await emitPickEvent(t, 'picks.pick.graded', tenantId as string, {
      pickId: 'pick-005',
      creatorId: creatorId as string,
      sport: 'NBA',
      event: 'Bucks vs Heat',
      result: 'push',
    });

    await processAllEvents(t);

    const notifications = await getNotificationsForUser(t, subscriberId as string);
    expect(notifications.length).toBe(1);
    expect(notifications[0].title).toContain('Push');
  });
});

// ---------------------------------------------------------------------------
// picks.pick.removed → subscriber notifications
// ---------------------------------------------------------------------------

describe('pick notifications — picks.pick.removed', () => {
  it('notifies subscribers when a pick is removed', async () => {
    const t = setup();
    const { tenantId, creatorId, subscriberId } = await seedCreatorAndSubscriber(t);

    await emitPickEvent(t, 'picks.pick.removed', tenantId as string, {
      pickId: 'pick-006',
      creatorId: creatorId as string,
      sport: 'Tennis',
      event: 'Djokovic vs Nadal',
    });

    await processAllEvents(t);

    const notifications = await getNotificationsForUser(t, subscriberId as string);
    expect(notifications.length).toBe(1);
    expect(notifications[0].type).toBe('pick_removed');
    expect(notifications[0].title).toBe('Pick fjernet');
  });
});

// ---------------------------------------------------------------------------
// picks.tail.created → creator notification
// ---------------------------------------------------------------------------

describe('pick notifications — picks.tail.created', () => {
  it('notifies the creator when someone tails their pick', async () => {
    const t = setup();
    const { tenantId, creatorId, subscriberId } = await seedCreatorAndSubscriber(t);

    // Create the pick in the component so safeGetPick can find it
    const pick = await (t as any).mutation(components.picks.functions.create, {
      tenantId: tenantId as string,
      creatorId: creatorId as string,
      event: 'Man Utd vs Arsenal',
      sport: 'Soccer',
      league: 'Premier League',
      pickType: 'spread',
      selection: 'Man Utd -1.5',
      oddsAmerican: '-110',
      oddsDecimal: 1.91,
      units: 1,
      confidence: 'high',
      analysis: 'Strong home form',
      eventDate: Date.now() + 86400000,
      status: 'published',
    });

    await emitPickEvent(t, 'picks.tail.created', tenantId as string, {
      pickId: pick.id,
      userId: subscriberId as string,
    });

    await processAllEvents(t);

    const notifications = await getNotificationsForUser(t, creatorId as string);
    expect(notifications.length).toBe(1);
    expect(notifications[0].type).toBe('pick_tailed');
    expect(notifications[0].title).toBe('Noen fulgte din pick!');
  });
});

// ---------------------------------------------------------------------------
// Notification preferences — opt-out respected
// ---------------------------------------------------------------------------

describe('pick notifications — preference opt-out', () => {
  it('does not create notification when user has disabled picks category', async () => {
    const t = setup();
    const { tenantId, creatorId, subscriberId } = await seedCreatorAndSubscriber(t);

    // Disable picks notifications for the subscriber
    await (t as any).mutation(components.notifications.functions.updatePreference, {
      tenantId: tenantId as string,
      userId: subscriberId as string,
      channel: 'in_app',
      category: 'picks',
      enabled: false,
    });

    await emitPickEvent(t, 'picks.pick.created', tenantId as string, {
      pickId: 'pick-opt-out',
      creatorId: creatorId as string,
      sport: 'Football',
      event: 'Opt Out Test',
    });

    await processAllEvents(t);

    const notifications = await getNotificationsForUser(t, subscriberId as string);
    expect(notifications.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// picks.copost.created — deduped fan-out across collaborators
// ---------------------------------------------------------------------------

describe('pick notifications — picks.copost.created', () => {
  it('notifies subscribers of all collaborators without duplicates', async () => {
    const t = setup();
    const { tenantId, creatorId, subscriberId } = await seedCreatorAndSubscriber(t);

    // Create a second creator
    const creator2Id = await t.run(async (ctx) =>
      ctx.db.insert('users', {
        email: 'creator2@test.no',
        name: 'Creator 2',
        role: 'user',
        status: 'active',
        tenantId,
        metadata: {},
      }),
    );

    // Subscribe the same user to creator2
    const tier2 = await (t as any).mutation(components.subscriptions.functions.createTier, {
      tenantId: tenantId as string,
      name: 'Pro',
      slug: 'pro-picks',
      description: 'Pro picks access',
      price: 1999,
      currency: 'USD',
      billingInterval: 'monthly',
      benefits: [{ id: 'pro_picks', type: 'feature', label: 'Pro Picks', config: {} }],
      sortOrder: 2,
      isActive: true,
      isPublic: true,
    });

    await (t as any).mutation(components.subscriptions.functions.createMembership, {
      tenantId: tenantId as string,
      userId: subscriberId as string,
      tierId: tier2.id,
      creatorId: creator2Id as string,
      memberNumber: 'M-002',
      status: 'active',
      startDate: Date.now(),
      endDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });

    // Emit copost event with both collaborators
    await emitPickEvent(t, 'picks.copost.created', tenantId as string, {
      pickId: 'copost-001',
      sport: 'Football',
      event: 'Co-post Derby',
      collaborators: [{ creatorId: creatorId as string }, { creatorId: creator2Id as string }],
    });

    await processAllEvents(t);

    // Subscriber follows both creators but should only get ONE notification
    const notifications = await getNotificationsForUser(t, subscriberId as string);
    expect(notifications.length).toBe(1);
    expect(notifications[0].type).toBe('copost_new_pick');
  });
});
