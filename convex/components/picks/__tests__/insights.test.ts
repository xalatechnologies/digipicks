/**
 * Picks Component — Insight Function Tests
 *
 * Covers performancePredictions and bankrollInsights edge cases:
 *   - Zero picks
 *   - All wins / all losses
 *   - Bankroll = 0
 *   - Mixed results with streak analysis
 *   - Confidence calibration and Kelly criterion
 *
 * Run: cd convex && npx vitest --config vitest.config.ts --run components/picks/__tests__/insights.test.ts
 */

import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import schema from '../schema';
import { modules } from '../testSetup.test-util';
import { api } from '../_generated/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT = 'tenant-insights-001';
const CREATOR = 'creator-insights-a';
const USER = 'user-insights-001';

async function seedPick(
  t: ReturnType<typeof convexTest>,
  overrides: Partial<{
    tenantId: string;
    creatorId: string;
    event: string;
    sport: string;
    league: string;
    pickType: string;
    selection: string;
    oddsAmerican: string;
    oddsDecimal: number;
    units: number;
    confidence: string;
    result: string;
    status: string;
  }> = {},
) {
  return t.run(async (ctx) => {
    return ctx.db.insert('picks', {
      tenantId: overrides.tenantId ?? TENANT,
      creatorId: overrides.creatorId ?? CREATOR,
      event: overrides.event ?? 'TeamA vs TeamB',
      sport: overrides.sport ?? 'NBA',
      league: overrides.league,
      pickType: overrides.pickType ?? 'spread',
      selection: overrides.selection ?? 'TeamA -3.5',
      oddsAmerican: overrides.oddsAmerican ?? '-110',
      oddsDecimal: overrides.oddsDecimal ?? 1.91,
      units: overrides.units ?? 1,
      confidence: overrides.confidence ?? 'medium',
      result: overrides.result ?? 'pending',
      status: overrides.status ?? 'published',
    });
  });
}

async function seedTail(
  t: ReturnType<typeof convexTest>,
  pickId: string,
  overrides: Partial<{
    tenantId: string;
    userId: string;
  }> = {},
) {
  return t.run(async (ctx) => {
    return ctx.db.insert('pickTails', {
      tenantId: overrides.tenantId ?? TENANT,
      userId: overrides.userId ?? USER,
      pickId,
      tailedAt: Date.now(),
    });
  });
}

// ---------------------------------------------------------------------------
// performancePredictions
// ---------------------------------------------------------------------------

describe('picks/queries — performancePredictions', () => {
  it('returns zero defaults when creator has no picks', async () => {
    const t = convexTest(schema, modules);

    const result = await t.query(api.functions.performancePredictions, {
      tenantId: TENANT,
      creatorId: CREATOR,
    });

    expect(result.sampleSize).toBe(0);
    expect(result.currentStreak).toEqual({ type: 'none', length: 0 });
    expect(result.longestWinStreak).toBe(0);
    expect(result.longestLossStreak).toBe(0);
    expect(result.overallWinRate).toBe(0);
    expect(result.recentWinRate).toBe(0);
    expect(result.trend).toBe('stable');
    expect(result.confidenceCalibration).toEqual([]);
    expect(result.bestEdges).toEqual([]);
    expect(result.pickTypeBreakdown).toEqual([]);
  });

  it('handles all wins correctly', async () => {
    const t = convexTest(schema, modules);

    for (let i = 0; i < 5; i++) {
      await seedPick(t, { result: 'won', confidence: 'high', oddsDecimal: 2.0, units: 1 });
    }

    const result = await t.query(api.functions.performancePredictions, {
      tenantId: TENANT,
      creatorId: CREATOR,
    });

    expect(result.sampleSize).toBe(5);
    expect(result.overallWinRate).toBe(1);
    expect(result.recentWinRate).toBe(1);
    expect(result.currentStreak).toEqual({ type: 'win', length: 5 });
    expect(result.longestWinStreak).toBe(5);
    expect(result.longestLossStreak).toBe(0);
    expect(result.trend).toBe('stable');
  });

  it('handles all losses correctly', async () => {
    const t = convexTest(schema, modules);

    for (let i = 0; i < 5; i++) {
      await seedPick(t, { result: 'lost', confidence: 'medium', oddsDecimal: 1.91, units: 1 });
    }

    const result = await t.query(api.functions.performancePredictions, {
      tenantId: TENANT,
      creatorId: CREATOR,
    });

    expect(result.sampleSize).toBe(5);
    expect(result.overallWinRate).toBe(0);
    expect(result.recentWinRate).toBe(0);
    expect(result.currentStreak).toEqual({ type: 'loss', length: 5 });
    expect(result.longestWinStreak).toBe(0);
    expect(result.longestLossStreak).toBe(5);
  });

  it('ignores pending and push results in graded calculations', async () => {
    const t = convexTest(schema, modules);

    await seedPick(t, { result: 'won' });
    await seedPick(t, { result: 'pending' });
    await seedPick(t, { result: 'push' });
    await seedPick(t, { result: 'lost' });

    const result = await t.query(api.functions.performancePredictions, {
      tenantId: TENANT,
      creatorId: CREATOR,
    });

    // Only won and lost count as graded
    expect(result.sampleSize).toBe(2);
    expect(result.overallWinRate).toBe(0.5);
  });

  it('computes streak correctly for mixed results', async () => {
    const t = convexTest(schema, modules);

    // Sequence: W W W L L W
    await seedPick(t, { result: 'won' });
    await seedPick(t, { result: 'won' });
    await seedPick(t, { result: 'won' });
    await seedPick(t, { result: 'lost' });
    await seedPick(t, { result: 'lost' });
    await seedPick(t, { result: 'won' });

    const result = await t.query(api.functions.performancePredictions, {
      tenantId: TENANT,
      creatorId: CREATOR,
    });

    expect(result.longestWinStreak).toBe(3);
    expect(result.longestLossStreak).toBe(2);
    expect(result.currentStreak).toEqual({ type: 'win', length: 1 });
  });

  it('computes confidence calibration breakdown', async () => {
    const t = convexTest(schema, modules);

    // 3 high-confidence picks: 2 wins, 1 loss
    await seedPick(t, { result: 'won', confidence: 'high', oddsDecimal: 2.0, units: 2 });
    await seedPick(t, { result: 'won', confidence: 'high', oddsDecimal: 2.0, units: 2 });
    await seedPick(t, { result: 'lost', confidence: 'high', oddsDecimal: 2.0, units: 2 });

    // 2 low-confidence: 1 win, 1 loss
    await seedPick(t, { result: 'won', confidence: 'low', oddsDecimal: 3.0, units: 1 });
    await seedPick(t, { result: 'lost', confidence: 'low', oddsDecimal: 3.0, units: 1 });

    const result = await t.query(api.functions.performancePredictions, {
      tenantId: TENANT,
      creatorId: CREATOR,
    });

    expect(result.confidenceCalibration.length).toBe(2);

    const highConf = result.confidenceCalibration.find((c) => c.confidence === 'high');
    expect(highConf).toBeDefined();
    expect(highConf!.picks).toBe(3);
    expect(highConf!.winRate).toBeCloseTo(0.67, 1);

    const lowConf = result.confidenceCalibration.find((c) => c.confidence === 'low');
    expect(lowConf).toBeDefined();
    expect(lowConf!.picks).toBe(2);
    expect(lowConf!.winRate).toBe(0.5);
  });

  it('computes pick type breakdown', async () => {
    const t = convexTest(schema, modules);

    await seedPick(t, { result: 'won', pickType: 'spread', oddsDecimal: 1.91, units: 1 });
    await seedPick(t, { result: 'lost', pickType: 'spread', oddsDecimal: 1.91, units: 1 });
    await seedPick(t, { result: 'won', pickType: 'moneyline', oddsDecimal: 2.5, units: 1 });

    const result = await t.query(api.functions.performancePredictions, {
      tenantId: TENANT,
      creatorId: CREATOR,
    });

    expect(result.pickTypeBreakdown.length).toBe(2);
    const spread = result.pickTypeBreakdown.find((p) => p.pickType === 'spread');
    expect(spread!.picks).toBe(2);
    expect(spread!.winRate).toBe(0.5);

    const ml = result.pickTypeBreakdown.find((p) => p.pickType === 'moneyline');
    expect(ml!.picks).toBe(1);
    expect(ml!.winRate).toBe(1);
  });

  it('only includes bestEdges with >= 5 picks in a combo', async () => {
    const t = convexTest(schema, modules);

    // 4 picks in NBA/spread — should NOT appear (below threshold)
    for (let i = 0; i < 4; i++) {
      await seedPick(t, { result: 'won', sport: 'NBA', pickType: 'spread', oddsDecimal: 1.91, units: 1 });
    }

    // 5 picks in NFL/moneyline — should appear
    for (let i = 0; i < 5; i++) {
      await seedPick(t, { result: 'won', sport: 'NFL', pickType: 'moneyline', oddsDecimal: 2.0, units: 1 });
    }

    const result = await t.query(api.functions.performancePredictions, {
      tenantId: TENANT,
      creatorId: CREATOR,
    });

    // Only NFL/moneyline meets threshold
    expect(result.bestEdges.length).toBe(1);
    expect(result.bestEdges[0].sport).toBe('NFL');
    expect(result.bestEdges[0].pickType).toBe('moneyline');
  });

  it('detects improving trend when recent wins > overall average', async () => {
    const t = convexTest(schema, modules);

    // 20 picks total: first 10 are losses, last 10 are wins
    for (let i = 0; i < 10; i++) {
      await seedPick(t, { result: 'lost', oddsDecimal: 1.91, units: 1 });
    }
    for (let i = 0; i < 10; i++) {
      await seedPick(t, { result: 'won', oddsDecimal: 1.91, units: 1 });
    }

    const result = await t.query(api.functions.performancePredictions, {
      tenantId: TENANT,
      creatorId: CREATOR,
    });

    expect(result.overallWinRate).toBe(0.5);
    expect(result.recentWinRate).toBe(1);
    expect(result.trend).toBe('improving');
  });
});

// ---------------------------------------------------------------------------
// bankrollInsights
// ---------------------------------------------------------------------------

describe('picks/queries — bankrollInsights', () => {
  it('returns zero defaults when user has no tailed picks', async () => {
    const t = convexTest(schema, modules);

    const result = await t.query(api.functions.bankrollInsights, {
      tenantId: TENANT,
      userId: USER,
      bankroll: 1000,
    });

    expect(result.sampleSize).toBe(0);
    expect(result.kellySuggestions).toEqual([]);
    expect(result.riskMetrics.maxDrawdown).toBe(0);
    expect(result.riskMetrics.variance).toBe(0);
    expect(result.riskMetrics.sharpeRatio).toBe(0);
    expect(result.projection.next50PicksExpected).toBe(1000);
    expect(result.projection.next100PicksExpected).toBe(1000);
  });

  it('returns zero dollar amounts when bankroll is 0', async () => {
    const t = convexTest(schema, modules);

    // Seed a pick and a tail
    const pickId = await seedPick(t, { result: 'won', oddsDecimal: 2.0, units: 1, confidence: 'high' });
    await seedTail(t, pickId as string);
    // Need at least 3 picks per confidence level for Kelly
    const pickId2 = await seedPick(t, { result: 'won', oddsDecimal: 2.0, units: 1, confidence: 'high' });
    await seedTail(t, pickId2 as string);
    const pickId3 = await seedPick(t, { result: 'won', oddsDecimal: 2.0, units: 1, confidence: 'high' });
    await seedTail(t, pickId3 as string);

    const result = await t.query(api.functions.bankrollInsights, {
      tenantId: TENANT,
      userId: USER,
      bankroll: 0,
    });

    expect(result.sampleSize).toBe(3);
    // With bankroll=0, Kelly dollar suggestions should be 0
    for (const k of result.kellySuggestions) {
      expect(k.suggestedDollarAmount).toBe(0);
      expect(k.suggestedUnits).toBe(0);
    }
    expect(result.riskMetrics.maxDrawdownPercent).toBe(0);
  });

  it('computes Kelly suggestions for tailed picks with enough samples', async () => {
    const t = convexTest(schema, modules);

    // 4 tailed picks at high confidence: 3 wins, 1 loss
    for (let i = 0; i < 3; i++) {
      const id = await seedPick(t, { result: 'won', oddsDecimal: 2.0, units: 1, confidence: 'high' });
      await seedTail(t, id as string);
    }
    const lossId = await seedPick(t, { result: 'lost', oddsDecimal: 2.0, units: 1, confidence: 'high' });
    await seedTail(t, lossId as string);

    const result = await t.query(api.functions.bankrollInsights, {
      tenantId: TENANT,
      userId: USER,
      bankroll: 10000,
    });

    expect(result.sampleSize).toBe(4);
    expect(result.kellySuggestions.length).toBe(1);

    const highKelly = result.kellySuggestions[0];
    expect(highKelly.confidence).toBe('high');
    expect(highKelly.historicalWinRate).toBe(0.75);
    expect(highKelly.avgOdds).toBe(2);
    expect(highKelly.kellyFraction).toBeGreaterThan(0);
    expect(highKelly.suggestedDollarAmount).toBeGreaterThan(0);
  });

  it('computes risk metrics: max drawdown, variance, sharpe', async () => {
    const t = convexTest(schema, modules);

    // W, L, L, W sequence → drawdown occurs after the two losses
    const p1 = await seedPick(t, { result: 'won', oddsDecimal: 2.0, units: 2, confidence: 'medium' });
    await seedTail(t, p1 as string);
    const p2 = await seedPick(t, { result: 'lost', oddsDecimal: 2.0, units: 2, confidence: 'medium' });
    await seedTail(t, p2 as string);
    const p3 = await seedPick(t, { result: 'lost', oddsDecimal: 2.0, units: 2, confidence: 'medium' });
    await seedTail(t, p3 as string);
    const p4 = await seedPick(t, { result: 'won', oddsDecimal: 2.0, units: 2, confidence: 'medium' });
    await seedTail(t, p4 as string);

    const result = await t.query(api.functions.bankrollInsights, {
      tenantId: TENANT,
      userId: USER,
      bankroll: 1000,
    });

    expect(result.sampleSize).toBe(4);
    expect(result.riskMetrics.maxDrawdown).toBeGreaterThan(0);
    expect(result.riskMetrics.variance).toBeGreaterThan(0);
    // Sharpe can be 0 or non-zero depending on mean vs std
    expect(typeof result.riskMetrics.sharpeRatio).toBe('number');
  });

  it('handles all wins in tailed picks', async () => {
    const t = convexTest(schema, modules);

    for (let i = 0; i < 3; i++) {
      const id = await seedPick(t, { result: 'won', oddsDecimal: 2.0, units: 1, confidence: 'high' });
      await seedTail(t, id as string);
    }

    const result = await t.query(api.functions.bankrollInsights, {
      tenantId: TENANT,
      userId: USER,
      bankroll: 5000,
    });

    expect(result.sampleSize).toBe(3);
    expect(result.riskMetrics.maxDrawdown).toBe(0);
    expect(result.riskMetrics.currentDrawdown).toBe(0);
    expect(result.projection.next50PicksExpected).toBeGreaterThan(5000);
    expect(result.projection.breakEvenPicks).toBeUndefined();
  });

  it('handles all losses in tailed picks', async () => {
    const t = convexTest(schema, modules);

    for (let i = 0; i < 3; i++) {
      const id = await seedPick(t, { result: 'lost', oddsDecimal: 1.91, units: 1, confidence: 'low' });
      await seedTail(t, id as string);
    }

    const result = await t.query(api.functions.bankrollInsights, {
      tenantId: TENANT,
      userId: USER,
      bankroll: 5000,
    });

    expect(result.sampleSize).toBe(3);
    expect(result.riskMetrics.maxDrawdown).toBeGreaterThan(0);
    expect(result.projection.next50PicksExpected).toBeLessThan(5000);
    // Kelly should suggest 0 for negative-edge confidence
    for (const k of result.kellySuggestions) {
      expect(k.kellyFraction).toBe(0);
    }
  });

  it('filters below-threshold confidence levels from Kelly suggestions', async () => {
    const t = convexTest(schema, modules);

    // Only 2 tailed picks at "low" confidence — below the 3-pick threshold
    for (let i = 0; i < 2; i++) {
      const id = await seedPick(t, { result: 'won', oddsDecimal: 2.0, units: 1, confidence: 'low' });
      await seedTail(t, id as string);
    }

    const result = await t.query(api.functions.bankrollInsights, {
      tenantId: TENANT,
      userId: USER,
      bankroll: 1000,
    });

    // Not enough samples for Kelly
    expect(result.kellySuggestions.length).toBe(0);
    expect(result.sampleSize).toBe(2);
  });

  it('only includes graded picks (won/lost) from tailed picks', async () => {
    const t = convexTest(schema, modules);

    const won = await seedPick(t, { result: 'won', oddsDecimal: 2.0, units: 1, confidence: 'high' });
    await seedTail(t, won as string);
    const pending = await seedPick(t, { result: 'pending', oddsDecimal: 2.0, units: 1, confidence: 'high' });
    await seedTail(t, pending as string);
    const push = await seedPick(t, { result: 'push', oddsDecimal: 2.0, units: 1, confidence: 'high' });
    await seedTail(t, push as string);

    const result = await t.query(api.functions.bankrollInsights, {
      tenantId: TENANT,
      userId: USER,
      bankroll: 1000,
    });

    // Only the "won" pick counts
    expect(result.sampleSize).toBe(1);
  });
});
