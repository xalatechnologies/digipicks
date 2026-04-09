/**
 * Pick View Tracking Component Tests
 *
 * Covers trackView, getViewCount, and deduplication logic
 * in components/picks/functions.ts.
 *
 * Run: cd convex && npx vitest --config vitest.config.ts --run components/picks/__tests__/view-tracking.test.ts
 */

import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import schema from '../schema';
import { modules } from '../testSetup.test-util';
import { api } from '../_generated/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT = 'tenant-views-001';
const USER_A = 'user-view-a';
const USER_B = 'user-view-b';
const CREATOR = 'creator-view-001';

function setup() {
  return convexTest(schema, modules);
}

async function createPick(
  t: ReturnType<typeof convexTest>,
  overrides: Partial<{ sport: string; event: string }> = {},
) {
  return t.mutation(api.functions.create, {
    tenantId: TENANT,
    creatorId: CREATOR,
    event: overrides.event ?? 'Lakers vs Celtics',
    sport: overrides.sport ?? 'NBA',
    pickType: 'spread',
    selection: 'Lakers -3.5',
    oddsAmerican: '-110',
    oddsDecimal: 1.91,
    units: 2,
    confidence: 'medium',
  });
}

// ---------------------------------------------------------------------------
// TRACK VIEW
// ---------------------------------------------------------------------------

describe('picks component — trackView', () => {
  it('tracks a view and increments viewCount', async () => {
    const t = setup();
    const { id: pickId } = await createPick(t);

    const result = await t.mutation(api.functions.trackView, {
      tenantId: TENANT,
      pickId,
      userId: USER_A,
    });

    expect(result.alreadyViewed).toBe(false);

    const viewCount = await t.query(api.functions.getViewCount, { pickId });
    expect(viewCount).toBe(1);
  });

  it('deduplicates views from the same user', async () => {
    const t = setup();
    const { id: pickId } = await createPick(t);

    // First view
    const first = await t.mutation(api.functions.trackView, {
      tenantId: TENANT,
      pickId,
      userId: USER_A,
    });
    expect(first.alreadyViewed).toBe(false);

    // Second view from same user
    const second = await t.mutation(api.functions.trackView, {
      tenantId: TENANT,
      pickId,
      userId: USER_A,
    });
    expect(second.alreadyViewed).toBe(true);

    // viewCount should still be 1
    const viewCount = await t.query(api.functions.getViewCount, { pickId });
    expect(viewCount).toBe(1);
  });

  it('counts views from different users separately', async () => {
    const t = setup();
    const { id: pickId } = await createPick(t);

    await t.mutation(api.functions.trackView, {
      tenantId: TENANT,
      pickId,
      userId: USER_A,
    });

    await t.mutation(api.functions.trackView, {
      tenantId: TENANT,
      pickId,
      userId: USER_B,
    });

    const viewCount = await t.query(api.functions.getViewCount, { pickId });
    expect(viewCount).toBe(2);
  });

  it('throws when pick does not exist', async () => {
    const t = setup();

    await expect(
      t.mutation(api.functions.trackView, {
        tenantId: TENANT,
        pickId: 'nonexistent-pick-id',
        userId: USER_A,
      }),
    ).rejects.toThrow('Pick not found');
  });
});

// ---------------------------------------------------------------------------
// GET VIEW COUNT
// ---------------------------------------------------------------------------

describe('picks component — getViewCount', () => {
  it('returns 0 for a pick with no views', async () => {
    const t = setup();
    const { id: pickId } = await createPick(t);

    const viewCount = await t.query(api.functions.getViewCount, { pickId });
    expect(viewCount).toBe(0);
  });

  it('returns 0 for a nonexistent pick', async () => {
    const t = setup();

    const viewCount = await t.query(api.functions.getViewCount, {
      pickId: 'nonexistent-pick-id',
    });
    expect(viewCount).toBe(0);
  });
});
