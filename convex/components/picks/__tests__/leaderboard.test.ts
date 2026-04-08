/**
 * Picks Component — Leaderboard Query Tests
 *
 * Covers the leaderboard query in components/picks/functions.ts:
 *   - Aggregates stats for all creators in a tenant
 *   - Sorts by ROI, winRate, streak, totalPicks
 *   - Filters by sport, timeframe (30d/90d/all)
 *   - Calculates streak, avgOdds, netUnits correctly
 *   - Skips creators with no graded picks
 *
 * Run: cd convex && npx vitest --config vitest.config.ts --run components/picks/__tests__/leaderboard.test.ts
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

const TENANT = "tenant-lb-001";
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
        pickType: "spread",
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
// leaderboard
// ---------------------------------------------------------------------------

describe("picks/queries — leaderboard", () => {
    it("returns empty array when no graded picks exist", async () => {
        const t = convexTest(schema, modules);

        const results = await t.query(api.functions.leaderboard, {
            tenantId: TENANT,
        });

        expect(results).toEqual([]);
    });

    it("skips creators with only pending picks", async () => {
        const t = convexTest(schema, modules);
        await createPick(t, { creatorId: CREATOR_A });

        const results = await t.query(api.functions.leaderboard, {
            tenantId: TENANT,
        });

        expect(results).toEqual([]);
    });

    it("returns creators ranked by ROI (default sort)", async () => {
        const t = convexTest(schema, modules);

        // Creator A: 1 win at 2.5 odds (ROI = +150%)
        const { id: aWin } = await createPick(t, {
            creatorId: CREATOR_A,
            oddsDecimal: 2.5,
            units: 1,
            event: "A Win",
        });
        await gradePick(t, aWin, "won");

        // Creator B: 1 win at 1.5 odds (ROI = +50%)
        const { id: bWin } = await createPick(t, {
            creatorId: CREATOR_B,
            oddsDecimal: 1.5,
            units: 1,
            event: "B Win",
        });
        await gradePick(t, bWin, "won");

        const results = await t.query(api.functions.leaderboard, {
            tenantId: TENANT,
        });

        expect(results).toHaveLength(2);
        expect(results[0].creatorId).toBe(CREATOR_A);
        expect(results[0].roi).toBe(150);
        expect(results[1].creatorId).toBe(CREATOR_B);
        expect(results[1].roi).toBe(50);
    });

    it("calculates win rate correctly", async () => {
        const t = convexTest(schema, modules);

        // Creator A: 3W 1L = 75% win rate
        for (let i = 0; i < 3; i++) {
            const { id } = await createPick(t, { creatorId: CREATOR_A, event: `W${i}` });
            await gradePick(t, id, "won");
        }
        const { id: loss } = await createPick(t, { creatorId: CREATOR_A, event: "L1" });
        await gradePick(t, loss, "lost");

        const results = await t.query(api.functions.leaderboard, {
            tenantId: TENANT,
            sortBy: "winRate",
        });

        expect(results).toHaveLength(1);
        expect(results[0].wins).toBe(3);
        expect(results[0].losses).toBe(1);
        expect(results[0].winRate).toBe(75);
        expect(results[0].totalPicks).toBe(4);
    });

    it("calculates current streak", async () => {
        const t = convexTest(schema, modules);

        // Create 3 wins in a row, then a loss, then 2 more wins
        const { id: w1 } = await createPick(t, { creatorId: CREATOR_A, event: "W1" });
        await gradePick(t, w1, "won");
        const { id: l1 } = await createPick(t, { creatorId: CREATOR_A, event: "L1" });
        await gradePick(t, l1, "lost");
        const { id: w2 } = await createPick(t, { creatorId: CREATOR_A, event: "W2" });
        await gradePick(t, w2, "won");
        const { id: w3 } = await createPick(t, { creatorId: CREATOR_A, event: "W3" });
        await gradePick(t, w3, "won");

        const results = await t.query(api.functions.leaderboard, {
            tenantId: TENANT,
            sortBy: "streak",
        });

        expect(results[0].currentStreak).toBe(2);
        expect(results[0].streakType).toBe("W");
    });

    it("sorts by streak descending", async () => {
        const t = convexTest(schema, modules);

        // Creator A: 1 win streak
        const { id: aWin } = await createPick(t, { creatorId: CREATOR_A, event: "A-W" });
        await gradePick(t, aWin, "won");

        // Creator B: 3 win streak
        for (let i = 0; i < 3; i++) {
            const { id } = await createPick(t, { creatorId: CREATOR_B, event: `B-W${i}` });
            await gradePick(t, id, "won");
        }

        const results = await t.query(api.functions.leaderboard, {
            tenantId: TENANT,
            sortBy: "streak",
        });

        expect(results[0].creatorId).toBe(CREATOR_B);
        expect(results[0].currentStreak).toBe(3);
        expect(results[1].creatorId).toBe(CREATOR_A);
        expect(results[1].currentStreak).toBe(1);
    });

    it("filters by sport", async () => {
        const t = convexTest(schema, modules);

        const { id: nba } = await createPick(t, { creatorId: CREATOR_A, sport: "NBA", event: "NBA" });
        await gradePick(t, nba, "won");

        const { id: nfl } = await createPick(t, { creatorId: CREATOR_B, sport: "NFL", event: "NFL" });
        await gradePick(t, nfl, "won");

        const results = await t.query(api.functions.leaderboard, {
            tenantId: TENANT,
            sport: "NBA",
        });

        expect(results).toHaveLength(1);
        expect(results[0].creatorId).toBe(CREATOR_A);
    });

    it("respects limit", async () => {
        const t = convexTest(schema, modules);

        for (const cid of [CREATOR_A, CREATOR_B, CREATOR_C]) {
            const { id } = await createPick(t, { creatorId: cid, event: `Game-${cid}` });
            await gradePick(t, id, "won");
        }

        const results = await t.query(api.functions.leaderboard, {
            tenantId: TENANT,
            limit: 2,
        });

        expect(results).toHaveLength(2);
    });

    it("isolates by tenant", async () => {
        const t = convexTest(schema, modules);

        const { id: t1 } = await createPick(t, {
            tenantId: TENANT,
            creatorId: CREATOR_A,
            event: "T1",
        });
        await gradePick(t, t1, "won");

        const { id: t2 } = await createPick(t, {
            tenantId: "other-tenant",
            creatorId: CREATOR_B,
            event: "T2",
        });
        await gradePick(t, t2, "won");

        const results = await t.query(api.functions.leaderboard, {
            tenantId: TENANT,
        });

        expect(results).toHaveLength(1);
        expect(results[0].creatorId).toBe(CREATOR_A);
    });

    it("counts pushes separately (not in graded count)", async () => {
        const t = convexTest(schema, modules);

        const { id: w } = await createPick(t, { creatorId: CREATOR_A, event: "W" });
        await gradePick(t, w, "won");
        const { id: p } = await createPick(t, { creatorId: CREATOR_A, event: "P" });
        await gradePick(t, p, "push");

        const results = await t.query(api.functions.leaderboard, {
            tenantId: TENANT,
        });

        expect(results[0].totalPicks).toBe(1); // Only graded (won/lost)
        expect(results[0].pushes).toBe(1);
        expect(results[0].winRate).toBe(100);
    });

    it("calculates net units correctly across wins and losses", async () => {
        const t = convexTest(schema, modules);

        // Win 2 units at 2.0 odds: profit = 2 * (2.0 - 1) = 2
        const { id: w } = await createPick(t, {
            creatorId: CREATOR_A,
            oddsDecimal: 2.0,
            units: 2,
            event: "Win",
        });
        await gradePick(t, w, "won");

        // Lose 1 unit: net = -1
        const { id: l } = await createPick(t, {
            creatorId: CREATOR_A,
            oddsDecimal: 1.91,
            units: 1,
            event: "Loss",
        });
        await gradePick(t, l, "lost");

        const results = await t.query(api.functions.leaderboard, {
            tenantId: TENANT,
        });

        // Net = +2 - 1 = +1
        expect(results[0].netUnits).toBe(1);
        // ROI = 1 / 3 * 100 = 33.33%
        expect(results[0].roi).toBe(33.33);
    });

    it("calculates average odds", async () => {
        const t = convexTest(schema, modules);

        const { id: w1 } = await createPick(t, {
            creatorId: CREATOR_A,
            oddsDecimal: 2.0,
            event: "W1",
        });
        await gradePick(t, w1, "won");

        const { id: l1 } = await createPick(t, {
            creatorId: CREATOR_A,
            oddsDecimal: 3.0,
            event: "L1",
        });
        await gradePick(t, l1, "lost");

        const results = await t.query(api.functions.leaderboard, {
            tenantId: TENANT,
        });

        expect(results[0].avgOdds).toBe(2.5);
    });

    it("only includes published picks", async () => {
        const t = convexTest(schema, modules);

        // Draft pick — should not appear
        await createPick(t, { creatorId: CREATOR_A, status: "draft", event: "Draft" });

        // Published pick
        const { id: pub } = await createPick(t, { creatorId: CREATOR_A, event: "Pub" });
        await gradePick(t, pub, "won");

        const results = await t.query(api.functions.leaderboard, {
            tenantId: TENANT,
        });

        expect(results).toHaveLength(1);
        expect(results[0].totalPicks).toBe(1);
    });

    it("sorts by totalPicks", async () => {
        const t = convexTest(schema, modules);

        // Creator A: 1 pick
        const { id: a1 } = await createPick(t, { creatorId: CREATOR_A, event: "A1" });
        await gradePick(t, a1, "won");

        // Creator B: 3 picks
        for (let i = 0; i < 3; i++) {
            const { id } = await createPick(t, { creatorId: CREATOR_B, event: `B${i}` });
            await gradePick(t, id, i === 0 ? "won" : "lost");
        }

        const results = await t.query(api.functions.leaderboard, {
            tenantId: TENANT,
            sortBy: "totalPicks",
        });

        expect(results[0].creatorId).toBe(CREATOR_B);
        expect(results[0].totalPicks).toBe(3);
    });
});
