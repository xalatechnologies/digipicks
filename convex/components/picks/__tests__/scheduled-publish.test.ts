/**
 * Scheduled Pick Publishing — Convex Tests
 *
 * Covers:
 *   - create with scheduledPublishAt sets status to draft
 *   - update can set/clear scheduledPublishAt
 *   - scanScheduledForPublishing returns due picks
 *   - scanScheduledForPublishing excludes future picks
 *   - scanScheduledForPublishing excludes published picks
 *
 * Run: cd convex && npx vitest --config vitest.config.ts --run components/picks/__tests__/scheduled-publish.test.ts
 */

import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import schema from '../schema';
import { modules } from '../testSetup.test-util';
import { api } from '../_generated/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT = 'tenant-sched-001';
const CREATOR = 'creator-sched-a';

const BASE_PICK = {
  tenantId: TENANT,
  creatorId: CREATOR,
  event: 'Lakers vs Celtics',
  sport: 'NBA',
  pickType: 'spread',
  selection: 'Lakers -3.5',
  oddsAmerican: '-110',
  oddsDecimal: 1.91,
  units: 1,
  confidence: 'medium',
} as const;

// ---------------------------------------------------------------------------
// create with scheduledPublishAt
// ---------------------------------------------------------------------------

describe('picks/scheduled-publish — create', () => {
  it('forces status to draft when scheduledPublishAt is set', async () => {
    const t = convexTest(schema, modules);
    const futureTime = Date.now() + 60_000;

    const result = await t.mutation(api.functions.create, {
      ...BASE_PICK,
      scheduledPublishAt: futureTime,
      status: 'published', // should be overridden to draft
    });

    expect(result.id).toBeDefined();

    const pick = (await t.run(async (ctx) => ctx.db.get(result.id as any))) as any;
    expect(pick?.status).toBe('draft');
    expect(pick?.scheduledPublishAt).toBe(futureTime);
  });

  it('creates with published status when scheduledPublishAt is not set', async () => {
    const t = convexTest(schema, modules);

    const result = await t.mutation(api.functions.create, {
      ...BASE_PICK,
    });

    const pick = (await t.run(async (ctx) => ctx.db.get(result.id as any))) as any;
    expect(pick?.status).toBe('published');
    expect(pick?.scheduledPublishAt).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// update with scheduledPublishAt
// ---------------------------------------------------------------------------

describe('picks/scheduled-publish — update', () => {
  it('can set scheduledPublishAt on a draft pick', async () => {
    const t = convexTest(schema, modules);
    const futureTime = Date.now() + 120_000;

    const { id } = await t.mutation(api.functions.create, {
      ...BASE_PICK,
      status: 'draft',
    });

    await t.mutation(api.functions.update, {
      id: id as any,
      scheduledPublishAt: futureTime,
    });

    const pick = (await t.run(async (ctx) => ctx.db.get(id as any))) as any;
    expect(pick?.scheduledPublishAt).toBe(futureTime);
  });
});

// ---------------------------------------------------------------------------
// scanScheduledForPublishing
// ---------------------------------------------------------------------------

describe('picks/scheduled-publish — scanScheduledForPublishing', () => {
  it('returns draft picks whose scheduledPublishAt has passed', async () => {
    const t = convexTest(schema, modules);
    const pastTime = Date.now() - 60_000;

    await t.mutation(api.functions.create, {
      ...BASE_PICK,
      scheduledPublishAt: pastTime,
    });

    const due = await t.query(api.functions.scanScheduledForPublishing, {
      now: Date.now(),
    });

    expect(due).toHaveLength(1);
    expect((due[0] as any).status).toBe('draft');
    expect((due[0] as any).scheduledPublishAt).toBe(pastTime);
  });

  it('excludes picks scheduled for the future', async () => {
    const t = convexTest(schema, modules);
    const futureTime = Date.now() + 600_000;

    await t.mutation(api.functions.create, {
      ...BASE_PICK,
      scheduledPublishAt: futureTime,
    });

    const due = await t.query(api.functions.scanScheduledForPublishing, {
      now: Date.now(),
    });

    expect(due).toHaveLength(0);
  });

  it('excludes already-published picks', async () => {
    const t = convexTest(schema, modules);

    // Create without scheduling (published by default)
    await t.mutation(api.functions.create, {
      ...BASE_PICK,
    });

    const due = await t.query(api.functions.scanScheduledForPublishing, {
      now: Date.now(),
    });

    expect(due).toHaveLength(0);
  });

  it('excludes draft picks without scheduledPublishAt', async () => {
    const t = convexTest(schema, modules);

    await t.mutation(api.functions.create, {
      ...BASE_PICK,
      status: 'draft',
    });

    const due = await t.query(api.functions.scanScheduledForPublishing, {
      now: Date.now(),
    });

    expect(due).toHaveLength(0);
  });
});
