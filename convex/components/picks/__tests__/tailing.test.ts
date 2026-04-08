/**
 * Pick Tailing Component Tests
 *
 * Covers tail/untail/isTailed/listTailed/personalStats in components/picks/functions.ts.
 *
 * Run: cd convex && npx vitest --config vitest.config.ts --run components/picks/__tests__/tailing.test.ts
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

const TENANT = "tenant-tail-001";
const USER_A = "user-a";
const USER_B = "user-b";
const CREATOR = "creator-001";

function setup() {
    return convexTest(schema, modules);
}

async function createPick(
    t: ReturnType<typeof convexTest>,
    overrides: Partial<{
        sport: string;
        event: string;
        oddsDecimal: number;
        oddsAmerican: string;
        units: number;
    }> = {}
) {
    return t.mutation(api.functions.create, {
        tenantId: TENANT,
        creatorId: CREATOR,
        event: overrides.event ?? "Lakers vs Celtics",
        sport: overrides.sport ?? "NBA",
        pickType: "spread",
        selection: "Lakers -3.5",
        oddsAmerican: overrides.oddsAmerican ?? "-110",
        oddsDecimal: overrides.oddsDecimal ?? 1.91,
        units: overrides.units ?? 2,
        confidence: "medium",
    });
}

// ---------------------------------------------------------------------------
// TAIL / UNTAIL
// ---------------------------------------------------------------------------

describe("picks component — tailPick", () => {
    it("tails a pick and returns id", async () => {
        const t = setup();
        const { id: pickId } = await createPick(t);

        const result = await t.mutation(api.functions.tailPick, {
            tenantId: TENANT,
            userId: USER_A,
            pickId,
        });

        expect(result.id).toBeDefined();
    });

    it("rejects duplicate tail", async () => {
        const t = setup();
        const { id: pickId } = await createPick(t);

        await t.mutation(api.functions.tailPick, {
            tenantId: TENANT,
            userId: USER_A,
            pickId,
        });

        await expect(
            t.mutation(api.functions.tailPick, {
                tenantId: TENANT,
                userId: USER_A,
                pickId,
            })
        ).rejects.toThrow("Already tailed this pick");
    });

    it("allows different users to tail same pick", async () => {
        const t = setup();
        const { id: pickId } = await createPick(t);

        const a = await t.mutation(api.functions.tailPick, {
            tenantId: TENANT,
            userId: USER_A,
            pickId,
        });
        const b = await t.mutation(api.functions.tailPick, {
            tenantId: TENANT,
            userId: USER_B,
            pickId,
        });

        expect(a.id).toBeDefined();
        expect(b.id).toBeDefined();
        expect(a.id).not.toBe(b.id);
    });

    it("rejects tailing non-existent pick", async () => {
        const t = setup();

        await expect(
            t.mutation(api.functions.tailPick, {
                tenantId: TENANT,
                userId: USER_A,
                pickId: "nonexistent",
            })
        ).rejects.toThrow();
    });
});

describe("picks component — untailPick", () => {
    it("untails a tailed pick", async () => {
        const t = setup();
        const { id: pickId } = await createPick(t);

        await t.mutation(api.functions.tailPick, {
            tenantId: TENANT,
            userId: USER_A,
            pickId,
        });

        const result = await t.mutation(api.functions.untailPick, {
            userId: USER_A,
            pickId,
        });

        expect(result.success).toBe(true);
    });

    it("rejects untailing a pick not tailed", async () => {
        const t = setup();
        const { id: pickId } = await createPick(t);

        await expect(
            t.mutation(api.functions.untailPick, {
                userId: USER_A,
                pickId,
            })
        ).rejects.toThrow("Not tailed");
    });
});

// ---------------------------------------------------------------------------
// IS TAILED
// ---------------------------------------------------------------------------

describe("picks component — isTailed", () => {
    it("returns false when not tailed", async () => {
        const t = setup();
        const { id: pickId } = await createPick(t);

        const result = await t.query(api.functions.isTailed, {
            userId: USER_A,
            pickId,
        });

        expect(result).toBe(false);
    });

    it("returns true when tailed", async () => {
        const t = setup();
        const { id: pickId } = await createPick(t);

        await t.mutation(api.functions.tailPick, {
            tenantId: TENANT,
            userId: USER_A,
            pickId,
        });

        const result = await t.query(api.functions.isTailed, {
            userId: USER_A,
            pickId,
        });

        expect(result).toBe(true);
    });

    it("returns false after untail", async () => {
        const t = setup();
        const { id: pickId } = await createPick(t);

        await t.mutation(api.functions.tailPick, {
            tenantId: TENANT,
            userId: USER_A,
            pickId,
        });
        await t.mutation(api.functions.untailPick, {
            userId: USER_A,
            pickId,
        });

        const result = await t.query(api.functions.isTailed, {
            userId: USER_A,
            pickId,
        });

        expect(result).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// LIST TAILED
// ---------------------------------------------------------------------------

describe("picks component — listTailed", () => {
    it("returns tailed picks for a user", async () => {
        const t = setup();
        const { id: pickId1 } = await createPick(t, { event: "Game 1" });
        const { id: pickId2 } = await createPick(t, { event: "Game 2" });

        await t.mutation(api.functions.tailPick, { tenantId: TENANT, userId: USER_A, pickId: pickId1 });
        await t.mutation(api.functions.tailPick, { tenantId: TENANT, userId: USER_A, pickId: pickId2 });

        const result = await t.query(api.functions.listTailed, {
            tenantId: TENANT,
            userId: USER_A,
        });

        expect(result).toHaveLength(2);
    });

    it("isolates by user", async () => {
        const t = setup();
        const { id: pickId } = await createPick(t);

        await t.mutation(api.functions.tailPick, { tenantId: TENANT, userId: USER_A, pickId });

        const resultA = await t.query(api.functions.listTailed, { tenantId: TENANT, userId: USER_A });
        const resultB = await t.query(api.functions.listTailed, { tenantId: TENANT, userId: USER_B });

        expect(resultA).toHaveLength(1);
        expect(resultB).toHaveLength(0);
    });

    it("filters by sport", async () => {
        const t = setup();
        const { id: nbaId } = await createPick(t, { sport: "NBA", event: "NBA game" });
        const { id: nflId } = await createPick(t, { sport: "NFL", event: "NFL game" });

        await t.mutation(api.functions.tailPick, { tenantId: TENANT, userId: USER_A, pickId: nbaId });
        await t.mutation(api.functions.tailPick, { tenantId: TENANT, userId: USER_A, pickId: nflId });

        const nflOnly = await t.query(api.functions.listTailed, {
            tenantId: TENANT,
            userId: USER_A,
            sport: "NFL",
        });

        expect(nflOnly).toHaveLength(1);
        expect(nflOnly[0].sport).toBe("NFL");
    });

    it("filters by result", async () => {
        const t = setup();
        const { id: pickId1 } = await createPick(t, { event: "Won game" });
        const { id: pickId2 } = await createPick(t, { event: "Pending game" });

        await t.mutation(api.functions.tailPick, { tenantId: TENANT, userId: USER_A, pickId: pickId1 });
        await t.mutation(api.functions.tailPick, { tenantId: TENANT, userId: USER_A, pickId: pickId2 });

        await t.mutation(api.functions.grade, { id: pickId1 as any, result: "won", gradedBy: CREATOR });

        const wonOnly = await t.query(api.functions.listTailed, {
            tenantId: TENANT,
            userId: USER_A,
            result: "won",
        });

        expect(wonOnly).toHaveLength(1);
        expect(wonOnly[0].result).toBe("won");
    });
});

// ---------------------------------------------------------------------------
// PERSONAL STATS
// ---------------------------------------------------------------------------

describe("picks component — personalStats", () => {
    it("returns correct stats for tailed picks", async () => {
        const t = setup();
        // Pick 1: won at -110 (1.91 decimal), 2 units → profit = 2 * 0.91 = 1.82
        const { id: pickId1 } = await createPick(t, { event: "Won game", oddsDecimal: 1.91, units: 2 });
        // Pick 2: lost at +150 (2.50 decimal), 1 unit → loss = -1
        const { id: pickId2 } = await createPick(t, { event: "Lost game", oddsDecimal: 2.50, units: 1 });
        // Pick 3: pending
        const { id: pickId3 } = await createPick(t, { event: "Pending game" });

        await t.mutation(api.functions.tailPick, { tenantId: TENANT, userId: USER_A, pickId: pickId1 });
        await t.mutation(api.functions.tailPick, { tenantId: TENANT, userId: USER_A, pickId: pickId2 });
        await t.mutation(api.functions.tailPick, { tenantId: TENANT, userId: USER_A, pickId: pickId3 });

        await t.mutation(api.functions.grade, { id: pickId1 as any, result: "won", gradedBy: CREATOR });
        await t.mutation(api.functions.grade, { id: pickId2 as any, result: "lost", gradedBy: CREATOR });

        const stats = await t.query(api.functions.personalStats, {
            tenantId: TENANT,
            userId: USER_A,
        });

        expect(stats.totalTailed).toBe(3);
        expect(stats.wins).toBe(1);
        expect(stats.losses).toBe(1);
        expect(stats.pending).toBe(1);
        expect(stats.winRate).toBe(0.5);
        expect(stats.netUnits).toBe(0.82); // 1.82 - 1.0
        expect(stats.totalWagered).toBe(3); // 2 + 1
    });

    it("calculates bankroll correctly", async () => {
        const t = setup();
        const { id: pickId1 } = await createPick(t, { event: "Won game", oddsDecimal: 2.0, units: 5 });

        await t.mutation(api.functions.tailPick, { tenantId: TENANT, userId: USER_A, pickId: pickId1 });
        await t.mutation(api.functions.grade, { id: pickId1 as any, result: "won", gradedBy: CREATOR });

        const stats = await t.query(api.functions.personalStats, {
            tenantId: TENANT,
            userId: USER_A,
            startingBankroll: 100,
        });

        // Won 5u at 2.0 odds → profit = 5 * (2.0-1) = 5u, bankroll = 100 + 5 = 105
        expect(stats.currentBankroll).toBe(105);
    });

    it("returns sport breakdown", async () => {
        const t = setup();
        const { id: nbaId } = await createPick(t, { sport: "NBA", event: "NBA game", oddsDecimal: 2.0, units: 1 });
        const { id: nflId } = await createPick(t, { sport: "NFL", event: "NFL game", oddsDecimal: 1.5, units: 2 });

        await t.mutation(api.functions.tailPick, { tenantId: TENANT, userId: USER_A, pickId: nbaId });
        await t.mutation(api.functions.tailPick, { tenantId: TENANT, userId: USER_A, pickId: nflId });

        await t.mutation(api.functions.grade, { id: nbaId as any, result: "won", gradedBy: CREATOR });
        await t.mutation(api.functions.grade, { id: nflId as any, result: "lost", gradedBy: CREATOR });

        const stats = await t.query(api.functions.personalStats, {
            tenantId: TENANT,
            userId: USER_A,
        });

        expect(stats.sportBreakdown).toHaveLength(2);
        const nba = stats.sportBreakdown.find((s: any) => s.sport === "NBA");
        const nfl = stats.sportBreakdown.find((s: any) => s.sport === "NFL");
        expect(nba).toBeDefined();
        expect(nba!.wins).toBe(1);
        expect(nba!.netUnits).toBe(1);
        expect(nfl).toBeDefined();
        expect(nfl!.losses).toBe(1);
        expect(nfl!.netUnits).toBe(-2);
    });

    it("returns empty stats for user with no tails", async () => {
        const t = setup();

        const stats = await t.query(api.functions.personalStats, {
            tenantId: TENANT,
            userId: USER_A,
        });

        expect(stats.totalTailed).toBe(0);
        expect(stats.wins).toBe(0);
        expect(stats.netUnits).toBe(0);
        expect(stats.sportBreakdown).toHaveLength(0);
    });
});
