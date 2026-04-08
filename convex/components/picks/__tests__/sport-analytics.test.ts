/**
 * Picks Component — Sport Analytics Query Tests
 *
 * Covers the sport-specific analytics queries:
 *   - sportDashboard: per-sport aggregate stats, pick type breakdown, top creators
 *   - sportOverview: cross-sport comparison stats
 *   - creatorStatsBySport: per-creator sport breakdown
 *
 * Run: cd convex && npx vitest --config vitest.config.ts --run components/picks/__tests__/sport-analytics.test.ts
 */

/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../schema";
import { modules } from "../testSetup.test-util";
import { api } from "../_generated/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT = "tenant-sport-001";
const CREATOR_A = "creator-a";
const CREATOR_B = "creator-b";
const CREATOR_C = "creator-c";
const GRADER = "grader-001";

async function createPick(
    t: ReturnType<typeof convexTest>,
    overrides: Partial<{
        tenantId: string;
        creatorId: string;
        event: string;
        sport: string;
        pickType: string;
        oddsDecimal: number;
        oddsAmerican: string;
        units: number;
        status: string;
    }> = {}
) {
    return t.mutation(api.functions.create, {
        tenantId: overrides.tenantId ?? TENANT,
        creatorId: overrides.creatorId ?? CREATOR_A,
        event: overrides.event ?? "Game 1",
        sport: overrides.sport ?? "NBA",
        pickType: overrides.pickType ?? "spread",
        selection: "Team -3.5",
        oddsAmerican: overrides.oddsAmerican ?? "-110",
        oddsDecimal: overrides.oddsDecimal ?? 1.91,
        units: overrides.units ?? 1,
        confidence: "medium",
        status: overrides.status,
    });
}

async function gradePick(
    t: ReturnType<typeof convexTest>,
    id: string,
    result: "won" | "lost" | "push" | "void"
) {
    return t.mutation(api.functions.grade, {
        id: id as any,
        result,
        gradedBy: GRADER,
    });
}

// ---------------------------------------------------------------------------
// sportDashboard
// ---------------------------------------------------------------------------

describe("picks/queries — sportDashboard", () => {
    it("returns zero stats when no picks exist for sport", async () => {
        const t = convexTest(schema, modules);

        const result = await t.query(api.functions.sportDashboard, {
            tenantId: TENANT,
            sport: "NBA",
        });

        expect(result.sport).toBe("NBA");
        expect(result.totalPicks).toBe(0);
        expect(result.wins).toBe(0);
        expect(result.losses).toBe(0);
        expect(result.winRate).toBe(0);
        expect(result.totalCreators).toBe(0);
        expect(result.pickTypeBreakdown).toEqual([]);
        expect(result.topCreators).toEqual([]);
    });

    it("calculates aggregate stats for a sport", async () => {
        const t = convexTest(schema, modules);

        // 2 wins, 1 loss for NBA
        const { id: w1 } = await createPick(t, { sport: "NBA", creatorId: CREATOR_A, event: "W1", oddsDecimal: 2.0, units: 1 });
        await gradePick(t, w1, "won");
        const { id: w2 } = await createPick(t, { sport: "NBA", creatorId: CREATOR_B, event: "W2", oddsDecimal: 1.5, units: 2 });
        await gradePick(t, w2, "won");
        const { id: l1 } = await createPick(t, { sport: "NBA", creatorId: CREATOR_A, event: "L1", oddsDecimal: 1.91, units: 1 });
        await gradePick(t, l1, "lost");

        // NFL pick — should NOT appear
        const { id: nfl } = await createPick(t, { sport: "NFL", creatorId: CREATOR_A, event: "NFL1" });
        await gradePick(t, nfl, "won");

        const result = await t.query(api.functions.sportDashboard, {
            tenantId: TENANT,
            sport: "NBA",
        });

        expect(result.sport).toBe("NBA");
        expect(result.totalPicks).toBe(3);
        expect(result.gradedPicks).toBe(3);
        expect(result.wins).toBe(2);
        expect(result.losses).toBe(1);
        expect(result.totalCreators).toBe(2);
    });

    it("calculates pick type breakdown", async () => {
        const t = convexTest(schema, modules);

        const { id: s1 } = await createPick(t, { sport: "NBA", pickType: "spread", event: "S1" });
        await gradePick(t, s1, "won");
        const { id: m1 } = await createPick(t, { sport: "NBA", pickType: "moneyline", event: "M1" });
        await gradePick(t, m1, "lost");
        const { id: s2 } = await createPick(t, { sport: "NBA", pickType: "spread", event: "S2" });
        await gradePick(t, s2, "won");

        const result = await t.query(api.functions.sportDashboard, {
            tenantId: TENANT,
            sport: "NBA",
        });

        expect(result.pickTypeBreakdown).toHaveLength(2);

        const spread = result.pickTypeBreakdown.find((pt: any) => pt.pickType === "spread");
        expect(spread).toBeDefined();
        expect(spread!.count).toBe(2);
        expect(spread!.wins).toBe(2);
        expect(spread!.losses).toBe(0);

        const ml = result.pickTypeBreakdown.find((pt: any) => pt.pickType === "moneyline");
        expect(ml).toBeDefined();
        expect(ml!.count).toBe(1);
        expect(ml!.losses).toBe(1);
    });

    it("returns top creators sorted by ROI", async () => {
        const t = convexTest(schema, modules);

        // Creator A: win at 3.0 odds (ROI = 200%)
        const { id: a1 } = await createPick(t, { sport: "NBA", creatorId: CREATOR_A, event: "A1", oddsDecimal: 3.0, units: 1 });
        await gradePick(t, a1, "won");

        // Creator B: win at 1.5 odds (ROI = 50%)
        const { id: b1 } = await createPick(t, { sport: "NBA", creatorId: CREATOR_B, event: "B1", oddsDecimal: 1.5, units: 1 });
        await gradePick(t, b1, "won");

        const result = await t.query(api.functions.sportDashboard, {
            tenantId: TENANT,
            sport: "NBA",
        });

        expect(result.topCreators).toHaveLength(2);
        expect(result.topCreators[0].creatorId).toBe(CREATOR_A);
        expect(result.topCreators[0].roi).toBe(200);
        expect(result.topCreators[1].creatorId).toBe(CREATOR_B);
        expect(result.topCreators[1].roi).toBe(50);
    });

    it("includes pending picks count", async () => {
        const t = convexTest(schema, modules);

        await createPick(t, { sport: "NBA", event: "Pending1" });
        const { id: w } = await createPick(t, { sport: "NBA", event: "Won1" });
        await gradePick(t, w, "won");

        const result = await t.query(api.functions.sportDashboard, {
            tenantId: TENANT,
            sport: "NBA",
        });

        expect(result.totalPicks).toBe(2);
        expect(result.gradedPicks).toBe(1);
        expect(result.pendingPicks).toBe(1);
    });

    it("isolates by tenant", async () => {
        const t = convexTest(schema, modules);

        const { id: t1 } = await createPick(t, { tenantId: TENANT, sport: "NBA", event: "T1" });
        await gradePick(t, t1, "won");
        const { id: t2 } = await createPick(t, { tenantId: "other-tenant", sport: "NBA", event: "T2" });
        await gradePick(t, t2, "won");

        const result = await t.query(api.functions.sportDashboard, {
            tenantId: TENANT,
            sport: "NBA",
        });

        expect(result.totalPicks).toBe(1);
        expect(result.totalCreators).toBe(1);
    });

    it("excludes draft picks", async () => {
        const t = convexTest(schema, modules);

        await createPick(t, { sport: "NBA", status: "draft", event: "Draft" });
        const { id: pub } = await createPick(t, { sport: "NBA", event: "Pub" });
        await gradePick(t, pub, "won");

        const result = await t.query(api.functions.sportDashboard, {
            tenantId: TENANT,
            sport: "NBA",
        });

        expect(result.totalPicks).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// sportOverview
// ---------------------------------------------------------------------------

describe("picks/queries — sportOverview", () => {
    it("returns empty array when no picks exist", async () => {
        const t = convexTest(schema, modules);

        const results = await t.query(api.functions.sportOverview, {
            tenantId: TENANT,
        });

        expect(results).toEqual([]);
    });

    it("returns stats for each sport sorted by total picks", async () => {
        const t = convexTest(schema, modules);

        // 2 NBA picks
        const { id: nba1 } = await createPick(t, { sport: "NBA", event: "NBA1" });
        await gradePick(t, nba1, "won");
        const { id: nba2 } = await createPick(t, { sport: "NBA", event: "NBA2" });
        await gradePick(t, nba2, "lost");

        // 3 NFL picks
        for (let i = 0; i < 3; i++) {
            const { id } = await createPick(t, { sport: "NFL", event: `NFL${i}` });
            await gradePick(t, id, "won");
        }

        // 1 MLB pick
        const { id: mlb } = await createPick(t, { sport: "MLB", event: "MLB1" });
        await gradePick(t, mlb, "won");

        const results = await t.query(api.functions.sportOverview, {
            tenantId: TENANT,
        });

        expect(results).toHaveLength(3);
        expect(results[0].sport).toBe("NFL");
        expect(results[0].totalPicks).toBe(3);
        expect(results[1].sport).toBe("NBA");
        expect(results[1].totalPicks).toBe(2);
        expect(results[2].sport).toBe("MLB");
        expect(results[2].totalPicks).toBe(1);
    });

    it("calculates win rate and ROI per sport", async () => {
        const t = convexTest(schema, modules);

        // NBA: 1 win at 2.0 (ROI = 100%), win rate = 100%
        const { id: nba } = await createPick(t, { sport: "NBA", oddsDecimal: 2.0, units: 1, event: "NBA" });
        await gradePick(t, nba, "won");

        // NFL: 1 loss (ROI = -100%), win rate = 0%
        const { id: nfl } = await createPick(t, { sport: "NFL", oddsDecimal: 1.91, units: 1, event: "NFL" });
        await gradePick(t, nfl, "lost");

        const results = await t.query(api.functions.sportOverview, {
            tenantId: TENANT,
        });

        const nbaResult = results.find((r: any) => r.sport === "NBA");
        expect(nbaResult!.winRate).toBe(100);
        expect(nbaResult!.roi).toBe(100);

        const nflResult = results.find((r: any) => r.sport === "NFL");
        expect(nflResult!.winRate).toBe(0);
        expect(nflResult!.roi).toBe(-100);
    });

    it("counts unique creators per sport", async () => {
        const t = convexTest(schema, modules);

        const { id: a1 } = await createPick(t, { sport: "NBA", creatorId: CREATOR_A, event: "A1" });
        await gradePick(t, a1, "won");
        const { id: b1 } = await createPick(t, { sport: "NBA", creatorId: CREATOR_B, event: "B1" });
        await gradePick(t, b1, "won");
        const { id: a2 } = await createPick(t, { sport: "NFL", creatorId: CREATOR_A, event: "A2" });
        await gradePick(t, a2, "won");

        const results = await t.query(api.functions.sportOverview, {
            tenantId: TENANT,
        });

        const nba = results.find((r: any) => r.sport === "NBA");
        expect(nba!.totalCreators).toBe(2);

        const nfl = results.find((r: any) => r.sport === "NFL");
        expect(nfl!.totalCreators).toBe(1);
    });

    it("isolates by tenant", async () => {
        const t = convexTest(schema, modules);

        const { id: t1 } = await createPick(t, { tenantId: TENANT, sport: "NBA", event: "T1" });
        await gradePick(t, t1, "won");
        const { id: t2 } = await createPick(t, { tenantId: "other-tenant", sport: "NBA", event: "T2" });
        await gradePick(t, t2, "won");

        const results = await t.query(api.functions.sportOverview, {
            tenantId: TENANT,
        });

        expect(results).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------
// creatorStatsBySport
// ---------------------------------------------------------------------------

describe("picks/queries — creatorStatsBySport", () => {
    it("returns empty array when creator has no picks", async () => {
        const t = convexTest(schema, modules);

        const results = await t.query(api.functions.creatorStatsBySport, {
            tenantId: TENANT,
            creatorId: CREATOR_A,
        });

        expect(results).toEqual([]);
    });

    it("breaks down stats by sport", async () => {
        const t = convexTest(schema, modules);

        // NBA: 2W 1L
        const { id: nba1 } = await createPick(t, { sport: "NBA", creatorId: CREATOR_A, oddsDecimal: 2.0, units: 1, event: "NBA-W1" });
        await gradePick(t, nba1, "won");
        const { id: nba2 } = await createPick(t, { sport: "NBA", creatorId: CREATOR_A, oddsDecimal: 2.0, units: 1, event: "NBA-W2" });
        await gradePick(t, nba2, "won");
        const { id: nba3 } = await createPick(t, { sport: "NBA", creatorId: CREATOR_A, oddsDecimal: 1.91, units: 1, event: "NBA-L1" });
        await gradePick(t, nba3, "lost");

        // NFL: 1W
        const { id: nfl1 } = await createPick(t, { sport: "NFL", creatorId: CREATOR_A, oddsDecimal: 1.5, units: 2, event: "NFL-W1" });
        await gradePick(t, nfl1, "won");

        const results = await t.query(api.functions.creatorStatsBySport, {
            tenantId: TENANT,
            creatorId: CREATOR_A,
        });

        expect(results).toHaveLength(2);

        // Sorted by totalPicks desc
        expect(results[0].sport).toBe("NBA");
        expect(results[0].totalPicks).toBe(3);
        expect(results[0].wins).toBe(2);
        expect(results[0].losses).toBe(1);

        expect(results[1].sport).toBe("NFL");
        expect(results[1].totalPicks).toBe(1);
        expect(results[1].wins).toBe(1);
        expect(results[1].losses).toBe(0);
        expect(results[1].winRate).toBe(100);
    });

    it("calculates ROI per sport", async () => {
        const t = convexTest(schema, modules);

        // NBA: 1 win at 3.0 odds (profit = 2.0, wagered = 1, ROI = 200%)
        const { id: nba } = await createPick(t, { sport: "NBA", creatorId: CREATOR_A, oddsDecimal: 3.0, units: 1, event: "NBA" });
        await gradePick(t, nba, "won");

        // NFL: 1 loss (net = -1, wagered = 1, ROI = -100%)
        const { id: nfl } = await createPick(t, { sport: "NFL", creatorId: CREATOR_A, oddsDecimal: 1.91, units: 1, event: "NFL" });
        await gradePick(t, nfl, "lost");

        const results = await t.query(api.functions.creatorStatsBySport, {
            tenantId: TENANT,
            creatorId: CREATOR_A,
        });

        const nbaStats = results.find((r: any) => r.sport === "NBA");
        expect(nbaStats!.roi).toBe(200);
        expect(nbaStats!.netUnits).toBe(2);

        const nflStats = results.find((r: any) => r.sport === "NFL");
        expect(nflStats!.roi).toBe(-100);
        expect(nflStats!.netUnits).toBe(-1);
    });

    it("counts pushes separately", async () => {
        const t = convexTest(schema, modules);

        const { id: w } = await createPick(t, { sport: "NBA", creatorId: CREATOR_A, event: "W" });
        await gradePick(t, w, "won");
        const { id: p } = await createPick(t, { sport: "NBA", creatorId: CREATOR_A, event: "P" });
        await gradePick(t, p, "push");

        const results = await t.query(api.functions.creatorStatsBySport, {
            tenantId: TENANT,
            creatorId: CREATOR_A,
        });

        expect(results[0].totalPicks).toBe(2);
        expect(results[0].pushes).toBe(1);
        expect(results[0].winRate).toBe(100); // Push not included in win rate calc
    });

    it("only includes the specified creator's picks", async () => {
        const t = convexTest(schema, modules);

        const { id: a } = await createPick(t, { sport: "NBA", creatorId: CREATOR_A, event: "A" });
        await gradePick(t, a, "won");
        const { id: b } = await createPick(t, { sport: "NBA", creatorId: CREATOR_B, event: "B" });
        await gradePick(t, b, "won");

        const results = await t.query(api.functions.creatorStatsBySport, {
            tenantId: TENANT,
            creatorId: CREATOR_A,
        });

        expect(results).toHaveLength(1);
        expect(results[0].totalPicks).toBe(1);
    });

    it("calculates average odds per sport", async () => {
        const t = convexTest(schema, modules);

        const { id: w1 } = await createPick(t, { sport: "NBA", creatorId: CREATOR_A, oddsDecimal: 2.0, event: "W1" });
        await gradePick(t, w1, "won");
        const { id: l1 } = await createPick(t, { sport: "NBA", creatorId: CREATOR_A, oddsDecimal: 3.0, event: "L1" });
        await gradePick(t, l1, "lost");

        const results = await t.query(api.functions.creatorStatsBySport, {
            tenantId: TENANT,
            creatorId: CREATOR_A,
        });

        expect(results[0].avgOdds).toBe(2.5);
    });

    it("excludes draft picks", async () => {
        const t = convexTest(schema, modules);

        await createPick(t, { sport: "NBA", creatorId: CREATOR_A, status: "draft", event: "Draft" });
        const { id: pub } = await createPick(t, { sport: "NBA", creatorId: CREATOR_A, event: "Pub" });
        await gradePick(t, pub, "won");

        const results = await t.query(api.functions.creatorStatsBySport, {
            tenantId: TENANT,
            creatorId: CREATOR_A,
        });

        expect(results).toHaveLength(1);
        expect(results[0].totalPicks).toBe(1);
    });
});
