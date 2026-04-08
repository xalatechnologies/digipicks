/**
 * Picks Component — Convex Tests
 *
 * Covers all functions in components/picks/functions.ts:
 *   - create (validation, sport/pickType/confidence, defaults)
 *   - update (patch fields, graded pick guard, validation)
 *   - grade (result transitions, already graded guard)
 *   - remove (success, not-found)
 *   - list (tenant, creatorId, sport, result, status filters, limit)
 *   - get (success, not-found)
 *   - creatorStats (win rate, ROI, net units, record breakdown)
 *
 * Run: cd convex && npx vitest --config vitest.config.ts --run components/picks/__tests__/picks.test.ts
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

const TENANT = "tenant-pick-001";
const CREATOR_A = "creator-a";
const CREATOR_B = "creator-b";
const GRADER = "grader-001";

async function createPick(
    t: ReturnType<typeof convexTest>,
    overrides: Partial<{
        tenantId: string;
        creatorId: string;
        event: string;
        sport: string;
        pickType: string;
        selection: string;
        oddsAmerican: string;
        oddsDecimal: number;
        units: number;
        confidence: string;
        analysis: string;
        status: string;
    }> = {}
) {
    return t.mutation(api.functions.create, {
        tenantId: overrides.tenantId ?? TENANT,
        creatorId: overrides.creatorId ?? CREATOR_A,
        event: overrides.event ?? "Lakers vs Celtics",
        sport: overrides.sport ?? "NBA",
        pickType: overrides.pickType ?? "spread",
        selection: overrides.selection ?? "Lakers -3.5",
        oddsAmerican: overrides.oddsAmerican ?? "-110",
        oddsDecimal: overrides.oddsDecimal ?? 1.91,
        units: overrides.units ?? 1,
        confidence: overrides.confidence ?? "medium",
        analysis: overrides.analysis,
        status: overrides.status,
    });
}

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

describe("picks/mutations — create", () => {
    it("creates a pick with published status and returns id", async () => {
        const t = convexTest(schema, modules);

        const result = await createPick(t);

        expect(result.id).toBeDefined();

        const pick = await t.run(async (ctx) => ctx.db.get(result.id as any)) as any;
        expect(pick?.status).toBe("published");
        expect(pick?.result).toBe("pending");
        expect(pick?.tenantId).toBe(TENANT);
        expect(pick?.creatorId).toBe(CREATOR_A);
        expect(pick?.event).toBe("Lakers vs Celtics");
        expect(pick?.sport).toBe("NBA");
        expect(pick?.oddsAmerican).toBe("-110");
        expect(pick?.oddsDecimal).toBe(1.91);
        expect(pick?.units).toBe(1);
        expect(pick?.confidence).toBe("medium");
    });

    it("defaults to published status when not specified", async () => {
        const t = convexTest(schema, modules);

        const result = await createPick(t, { status: undefined });

        const pick = await t.run(async (ctx) => ctx.db.get(result.id as any)) as any;
        expect(pick?.status).toBe("published");
    });

    it("creates with draft status when specified", async () => {
        const t = convexTest(schema, modules);

        const result = await createPick(t, { status: "draft" });

        const pick = await t.run(async (ctx) => ctx.db.get(result.id as any)) as any;
        expect(pick?.status).toBe("draft");
    });

    it("throws for invalid sport", async () => {
        const t = convexTest(schema, modules);
        await expect(createPick(t, { sport: "InvalidSport" })).rejects.toThrow("Invalid sport");
    });

    it("throws for invalid pick type", async () => {
        const t = convexTest(schema, modules);
        await expect(createPick(t, { pickType: "invalid" })).rejects.toThrow("Invalid pick type");
    });

    it("throws for invalid confidence", async () => {
        const t = convexTest(schema, modules);
        await expect(createPick(t, { confidence: "ultra" })).rejects.toThrow("Invalid confidence");
    });

    it("throws for zero units", async () => {
        const t = convexTest(schema, modules);
        await expect(createPick(t, { units: 0 })).rejects.toThrow("Units must be greater than 0");
    });

    it("throws for negative units", async () => {
        const t = convexTest(schema, modules);
        await expect(createPick(t, { units: -1 })).rejects.toThrow("Units must be greater than 0");
    });

    it("throws for odds below 1.01", async () => {
        const t = convexTest(schema, modules);
        await expect(createPick(t, { oddsDecimal: 1.0 })).rejects.toThrow("Decimal odds must be at least 1.01");
    });

    it("accepts all valid sports", async () => {
        const t = convexTest(schema, modules);
        const sports = ["NBA", "NFL", "MLB", "NHL", "Soccer", "UFC", "Tennis", "Golf", "NCAAB", "NCAAF", "Other"];
        for (const sport of sports) {
            const result = await createPick(t, { sport, event: `${sport} game` });
            expect(result.id).toBeDefined();
        }
    });

    it("accepts all valid pick types", async () => {
        const t = convexTest(schema, modules);
        const types = ["spread", "moneyline", "total", "prop", "parlay_leg"];
        for (const pickType of types) {
            const result = await createPick(t, { pickType, event: `${pickType} pick` });
            expect(result.id).toBeDefined();
        }
    });
});

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------

describe("picks/mutations — update", () => {
    it("updates pick fields", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createPick(t);

        await t.mutation(api.functions.update, {
            id: id as any,
            event: "Warriors vs Lakers",
            analysis: "LeBron is rested",
        });

        const pick = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(pick?.event).toBe("Warriors vs Lakers");
        expect(pick?.analysis).toBe("LeBron is rested");
    });

    it("throws when editing odds/units/selection on a graded pick", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createPick(t);

        // Grade first
        await t.mutation(api.functions.grade, {
            id: id as any,
            result: "won",
            gradedBy: GRADER,
        });

        await expect(
            t.mutation(api.functions.update, { id: id as any, oddsAmerican: "+200" })
        ).rejects.toThrow("Cannot edit odds, units, or selection on a graded pick");
    });

    it("allows editing analysis on a graded pick", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createPick(t);

        await t.mutation(api.functions.grade, {
            id: id as any,
            result: "won",
            gradedBy: GRADER,
        });

        // This should work - only analysis/status edits on graded picks
        await t.mutation(api.functions.update, {
            id: id as any,
            analysis: "Updated analysis",
        });

        const pick = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(pick?.analysis).toBe("Updated analysis");
    });

    it("throws for invalid sport on update", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createPick(t);

        await expect(
            t.mutation(api.functions.update, { id: id as any, sport: "Invalid" })
        ).rejects.toThrow("Invalid sport");
    });
});

// ---------------------------------------------------------------------------
// grade
// ---------------------------------------------------------------------------

describe("picks/mutations — grade", () => {
    it("grades a pick as won", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createPick(t);

        await t.mutation(api.functions.grade, {
            id: id as any,
            result: "won",
            gradedBy: GRADER,
        });

        const pick = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(pick?.result).toBe("won");
        expect(pick?.resultAt).toBeDefined();
        expect(pick?.gradedBy).toBe(GRADER);
    });

    it("grades a pick as lost", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createPick(t);

        await t.mutation(api.functions.grade, {
            id: id as any,
            result: "lost",
            gradedBy: GRADER,
        });

        const pick = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(pick?.result).toBe("lost");
    });

    it("grades a pick as push", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createPick(t);

        await t.mutation(api.functions.grade, {
            id: id as any,
            result: "push",
            gradedBy: GRADER,
        });

        const pick = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(pick?.result).toBe("push");
    });

    it("throws when grading an already graded pick", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createPick(t);

        await t.mutation(api.functions.grade, {
            id: id as any,
            result: "won",
            gradedBy: GRADER,
        });

        await expect(
            t.mutation(api.functions.grade, { id: id as any, result: "lost", gradedBy: GRADER })
        ).rejects.toThrow("Pick already graded");
    });
});

// ---------------------------------------------------------------------------
// remove
// ---------------------------------------------------------------------------

describe("picks/mutations — remove", () => {
    it("deletes a pick", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createPick(t);

        await t.mutation(api.functions.remove, { id: id as any });

        const pick = await t.run(async (ctx) => ctx.db.get(id as any));
        expect(pick).toBeNull();
    });

    it("throws for non-existent pick", async () => {
        const t = convexTest(schema, modules);
        // Create a pick to get a valid ID format, then delete it
        const { id } = await createPick(t);
        await t.mutation(api.functions.remove, { id: id as any });
        await expect(
            t.mutation(api.functions.remove, { id: id as any })
        ).rejects.toThrow("Pick not found");
    });
});

// ---------------------------------------------------------------------------
// list
// ---------------------------------------------------------------------------

describe("picks/queries — list", () => {
    it("lists picks for a tenant", async () => {
        const t = convexTest(schema, modules);
        await createPick(t, { event: "Game 1" });
        await createPick(t, { event: "Game 2" });
        await createPick(t, { tenantId: "other-tenant", event: "Other Game" });

        const picks = await t.query(api.functions.list, { tenantId: TENANT });

        expect(picks).toHaveLength(2);
    });

    it("filters by creatorId", async () => {
        const t = convexTest(schema, modules);
        await createPick(t, { creatorId: CREATOR_A, event: "A1" });
        await createPick(t, { creatorId: CREATOR_B, event: "B1" });

        const picks = await t.query(api.functions.list, {
            tenantId: TENANT,
            creatorId: CREATOR_A,
        });

        expect(picks).toHaveLength(1);
        expect((picks[0] as any).creatorId).toBe(CREATOR_A);
    });

    it("filters by sport", async () => {
        const t = convexTest(schema, modules);
        await createPick(t, { sport: "NBA", event: "NBA Game" });
        await createPick(t, { sport: "NFL", event: "NFL Game" });

        const picks = await t.query(api.functions.list, {
            tenantId: TENANT,
            sport: "NFL",
        });

        expect(picks).toHaveLength(1);
        expect((picks[0] as any).sport).toBe("NFL");
    });

    it("filters by result", async () => {
        const t = convexTest(schema, modules);
        const { id: wonId } = await createPick(t, { event: "Won game" });
        await createPick(t, { event: "Pending game" });

        await t.mutation(api.functions.grade, { id: wonId as any, result: "won", gradedBy: GRADER });

        const picks = await t.query(api.functions.list, {
            tenantId: TENANT,
            result: "won",
        });

        expect(picks).toHaveLength(1);
    });

    it("filters by status", async () => {
        const t = convexTest(schema, modules);
        await createPick(t, { event: "Published", status: "published" });
        await createPick(t, { event: "Draft", status: "draft" });

        const picks = await t.query(api.functions.list, {
            tenantId: TENANT,
            status: "published",
        });

        expect(picks).toHaveLength(1);
    });

    it("respects limit", async () => {
        const t = convexTest(schema, modules);
        for (let i = 0; i < 5; i++) {
            await createPick(t, { event: `Game ${i}` });
        }

        const picks = await t.query(api.functions.list, {
            tenantId: TENANT,
            limit: 2,
        });

        expect(picks).toHaveLength(2);
    });

    it("returns picks sorted newest first", async () => {
        const t = convexTest(schema, modules);
        await createPick(t, { event: "First" });
        await createPick(t, { event: "Second" });

        const picks = await t.query(api.functions.list, { tenantId: TENANT });

        expect((picks[0] as any).event).toBe("Second");
        expect((picks[1] as any).event).toBe("First");
    });
});

// ---------------------------------------------------------------------------
// get
// ---------------------------------------------------------------------------

describe("picks/queries — get", () => {
    it("returns a pick by id", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createPick(t);

        const pick = await t.query(api.functions.get, { id: id as any });

        expect((pick as any).event).toBe("Lakers vs Celtics");
    });

    it("throws for non-existent pick", async () => {
        const t = convexTest(schema, modules);
        // Create a pick to get a valid ID format, then delete it
        const { id } = await createPick(t);
        await t.mutation(api.functions.remove, { id: id as any });
        await expect(
            t.query(api.functions.get, { id: id as any })
        ).rejects.toThrow("Pick not found");
    });
});

// ---------------------------------------------------------------------------
// creatorStats
// ---------------------------------------------------------------------------

describe("picks/queries — creatorStats", () => {
    it("returns correct stats for a creator", async () => {
        const t = convexTest(schema, modules);

        // Create 5 picks
        const picks = [];
        for (let i = 0; i < 5; i++) {
            const result = await createPick(t, { event: `Game ${i}` });
            picks.push(result.id);
        }

        // Grade: 3 won, 1 lost, 1 pending
        await t.mutation(api.functions.grade, { id: picks[0] as any, result: "won", gradedBy: GRADER });
        await t.mutation(api.functions.grade, { id: picks[1] as any, result: "won", gradedBy: GRADER });
        await t.mutation(api.functions.grade, { id: picks[2] as any, result: "won", gradedBy: GRADER });
        await t.mutation(api.functions.grade, { id: picks[3] as any, result: "lost", gradedBy: GRADER });
        // picks[4] stays pending

        const stats = await t.query(api.functions.creatorStats, {
            tenantId: TENANT,
            creatorId: CREATOR_A,
        });

        expect(stats.totalPicks).toBe(5);
        expect(stats.wins).toBe(3);
        expect(stats.losses).toBe(1);
        expect(stats.pending).toBe(1);
        expect(stats.winRate).toBe(0.75); // 3/4 graded
        // netUnits: 3 wins * 1 * (1.91-1) = 2.73, 1 loss * 1 = -1 => +1.73
        expect(stats.netUnits).toBe(1.73);
    });

    it("returns zeros for creator with no picks", async () => {
        const t = convexTest(schema, modules);

        const stats = await t.query(api.functions.creatorStats, {
            tenantId: TENANT,
            creatorId: "no-picks-creator",
        });

        expect(stats.totalPicks).toBe(0);
        expect(stats.wins).toBe(0);
        expect(stats.losses).toBe(0);
        expect(stats.winRate).toBe(0);
        expect(stats.netUnits).toBe(0);
        expect(stats.roi).toBe(0);
    });

    it("excludes draft picks from stats", async () => {
        const t = convexTest(schema, modules);

        await createPick(t, { event: "Published", status: "published" });
        await createPick(t, { event: "Draft", status: "draft" });

        const stats = await t.query(api.functions.creatorStats, {
            tenantId: TENANT,
            creatorId: CREATOR_A,
        });

        expect(stats.totalPicks).toBe(1); // Only published
    });

    it("calculates ROI correctly", async () => {
        const t = convexTest(schema, modules);

        // 2u at +150 (3.5 decimal) - win
        const { id: winId } = await createPick(t, {
            event: "Win game",
            oddsAmerican: "+150",
            oddsDecimal: 2.5,
            units: 2,
        });
        // 1u at -110 (1.91 decimal) - loss
        const { id: lossId } = await createPick(t, {
            event: "Loss game",
            oddsAmerican: "-110",
            oddsDecimal: 1.91,
            units: 1,
        });

        await t.mutation(api.functions.grade, { id: winId as any, result: "won", gradedBy: GRADER });
        await t.mutation(api.functions.grade, { id: lossId as any, result: "lost", gradedBy: GRADER });

        const stats = await t.query(api.functions.creatorStats, {
            tenantId: TENANT,
            creatorId: CREATOR_A,
        });

        // netUnits = 2 * (2.5 - 1) - 1 = 3 - 1 = 2
        expect(stats.netUnits).toBe(2);
        // totalWagered = 2 + 1 = 3
        // ROI = 2/3 * 100 = 66.67
        expect(stats.roi).toBe(66.67);
    });
});

// ---------------------------------------------------------------------------
// listPublishedFeed
// ---------------------------------------------------------------------------

describe("picks/queries — listPublishedFeed", () => {
    it("returns only published picks", async () => {
        const t = convexTest(schema, modules);
        await createPick(t, { event: "Published", status: "published" });
        await createPick(t, { event: "Draft", status: "draft" });

        const picks = await t.query(api.functions.listPublishedFeed, {
            tenantId: TENANT,
        });

        expect(picks).toHaveLength(1);
        expect((picks[0] as any).event).toBe("Published");
    });

    it("filters by creatorIds", async () => {
        const t = convexTest(schema, modules);
        await createPick(t, { creatorId: CREATOR_A, event: "A pick" });
        await createPick(t, { creatorId: CREATOR_B, event: "B pick" });

        const picks = await t.query(api.functions.listPublishedFeed, {
            tenantId: TENANT,
            creatorIds: [CREATOR_A],
        });

        expect(picks).toHaveLength(1);
        expect((picks[0] as any).creatorId).toBe(CREATOR_A);
    });

    it("returns all published picks when no creatorIds", async () => {
        const t = convexTest(schema, modules);
        await createPick(t, { creatorId: CREATOR_A, event: "A pick" });
        await createPick(t, { creatorId: CREATOR_B, event: "B pick" });

        const picks = await t.query(api.functions.listPublishedFeed, {
            tenantId: TENANT,
        });

        expect(picks).toHaveLength(2);
    });

    it("filters by sport", async () => {
        const t = convexTest(schema, modules);
        await createPick(t, { sport: "NBA", event: "NBA Game" });
        await createPick(t, { sport: "NFL", event: "NFL Game" });

        const picks = await t.query(api.functions.listPublishedFeed, {
            tenantId: TENANT,
            sport: "NFL",
        });

        expect(picks).toHaveLength(1);
        expect((picks[0] as any).sport).toBe("NFL");
    });

    it("filters by result", async () => {
        const t = convexTest(schema, modules);
        const { id: wonId } = await createPick(t, { event: "Won" });
        await createPick(t, { event: "Pending" });

        await t.mutation(api.functions.grade, {
            id: wonId as any,
            result: "won",
            gradedBy: GRADER,
        });

        const picks = await t.query(api.functions.listPublishedFeed, {
            tenantId: TENANT,
            result: "won",
        });

        expect(picks).toHaveLength(1);
    });

    it("respects limit", async () => {
        const t = convexTest(schema, modules);
        for (let i = 0; i < 5; i++) {
            await createPick(t, { event: `Game ${i}` });
        }

        const picks = await t.query(api.functions.listPublishedFeed, {
            tenantId: TENANT,
            limit: 3,
        });

        expect(picks).toHaveLength(3);
    });

    it("defaults to limit of 20", async () => {
        const t = convexTest(schema, modules);
        for (let i = 0; i < 25; i++) {
            await createPick(t, { event: `Game ${i}` });
        }

        const picks = await t.query(api.functions.listPublishedFeed, {
            tenantId: TENANT,
        });

        expect(picks).toHaveLength(20);
    });

    it("returns picks sorted newest first", async () => {
        const t = convexTest(schema, modules);
        await createPick(t, { event: "First" });
        await createPick(t, { event: "Second" });

        const picks = await t.query(api.functions.listPublishedFeed, {
            tenantId: TENANT,
        });

        expect((picks[0] as any).event).toBe("Second");
        expect((picks[1] as any).event).toBe("First");
    });

    it("isolates by tenant", async () => {
        const t = convexTest(schema, modules);
        await createPick(t, { tenantId: TENANT, event: "Tenant A" });
        await createPick(t, { tenantId: "other-tenant", event: "Other" });

        const picks = await t.query(api.functions.listPublishedFeed, {
            tenantId: TENANT,
        });

        expect(picks).toHaveLength(1);
        expect((picks[0] as any).event).toBe("Tenant A");
    });
});

// ---------------------------------------------------------------------------
// leaderboard
// ---------------------------------------------------------------------------

describe("picks/queries — leaderboard", () => {
    it("ranks creators by ROI (default sort)", async () => {
        const t = convexTest(schema, modules);

        // Creator A: 1 win at +150 (2.5 dec), 1u => net = 1.5, wagered = 1, ROI = 150%
        const { id: aWin } = await createPick(t, {
            creatorId: CREATOR_A,
            event: "A Win",
            oddsDecimal: 2.5,
            oddsAmerican: "+150",
            units: 1,
        });
        await t.mutation(api.functions.grade, { id: aWin as any, result: "won", gradedBy: GRADER });

        // Creator B: 1 win at -110 (1.91 dec), 1u => net = 0.91, wagered = 1, ROI = 91%
        const { id: bWin } = await createPick(t, {
            creatorId: CREATOR_B,
            event: "B Win",
            oddsDecimal: 1.91,
            oddsAmerican: "-110",
            units: 1,
        });
        await t.mutation(api.functions.grade, { id: bWin as any, result: "won", gradedBy: GRADER });

        const entries = await t.query(api.functions.leaderboard, { tenantId: TENANT });

        expect(entries).toHaveLength(2);
        expect(entries[0].creatorId).toBe(CREATOR_A); // Higher ROI
        expect(entries[1].creatorId).toBe(CREATOR_B);
    });

    it("sorts by winRate when specified", async () => {
        const t = convexTest(schema, modules);

        // Creator A: 1W 1L = 50% win rate
        const { id: aW } = await createPick(t, { creatorId: CREATOR_A, event: "A1" });
        const { id: aL } = await createPick(t, { creatorId: CREATOR_A, event: "A2" });
        await t.mutation(api.functions.grade, { id: aW as any, result: "won", gradedBy: GRADER });
        await t.mutation(api.functions.grade, { id: aL as any, result: "lost", gradedBy: GRADER });

        // Creator B: 2W 0L = 100% win rate
        const { id: bW1 } = await createPick(t, { creatorId: CREATOR_B, event: "B1" });
        const { id: bW2 } = await createPick(t, { creatorId: CREATOR_B, event: "B2" });
        await t.mutation(api.functions.grade, { id: bW1 as any, result: "won", gradedBy: GRADER });
        await t.mutation(api.functions.grade, { id: bW2 as any, result: "won", gradedBy: GRADER });

        const entries = await t.query(api.functions.leaderboard, {
            tenantId: TENANT,
            sortBy: "winRate",
        });

        expect(entries[0].creatorId).toBe(CREATOR_B);
        expect(entries[0].winRate).toBe(100);
    });

    it("excludes creators with no graded picks", async () => {
        const t = convexTest(schema, modules);

        // Only pending picks
        await createPick(t, { creatorId: CREATOR_A, event: "Pending" });

        const entries = await t.query(api.functions.leaderboard, { tenantId: TENANT });

        expect(entries).toHaveLength(0);
    });

    it("filters by sport", async () => {
        const t = convexTest(schema, modules);

        const { id: nbaId } = await createPick(t, { sport: "NBA", event: "NBA Win" });
        const { id: nflId } = await createPick(t, { sport: "NFL", event: "NFL Win" });
        await t.mutation(api.functions.grade, { id: nbaId as any, result: "won", gradedBy: GRADER });
        await t.mutation(api.functions.grade, { id: nflId as any, result: "won", gradedBy: GRADER });

        const entries = await t.query(api.functions.leaderboard, {
            tenantId: TENANT,
            sport: "NBA",
        });

        expect(entries).toHaveLength(1);
    });

    it("respects limit", async () => {
        const t = convexTest(schema, modules);

        // Create graded picks for 3 creators
        for (const creator of [CREATOR_A, CREATOR_B, "creator-c"]) {
            const { id } = await createPick(t, { creatorId: creator, event: `${creator} pick` });
            await t.mutation(api.functions.grade, { id: id as any, result: "won", gradedBy: GRADER });
        }

        const entries = await t.query(api.functions.leaderboard, {
            tenantId: TENANT,
            limit: 2,
        });

        expect(entries).toHaveLength(2);
    });

    it("calculates streak correctly", async () => {
        const t = convexTest(schema, modules);

        // Create 3 wins in a row for creator A
        for (let i = 0; i < 3; i++) {
            const { id } = await createPick(t, { creatorId: CREATOR_A, event: `Win ${i}` });
            await t.mutation(api.functions.grade, { id: id as any, result: "won", gradedBy: GRADER });
        }

        const entries = await t.query(api.functions.leaderboard, { tenantId: TENANT });

        expect(entries[0].currentStreak).toBe(3);
        expect(entries[0].streakType).toBe("W");
    });
});

// ---------------------------------------------------------------------------
// tailPick / untailPick / isTailed
// ---------------------------------------------------------------------------

const USER_A = "user-a";
const USER_B = "user-b";

describe("picks/mutations — tailPick", () => {
    it("tails a pick and returns id", async () => {
        const t = convexTest(schema, modules);
        const { id: pickId } = await createPick(t);

        const result = await t.mutation(api.functions.tailPick, {
            tenantId: TENANT,
            userId: USER_A,
            pickId,
        });

        expect(result.id).toBeDefined();
    });

    it("prevents duplicate tailing", async () => {
        const t = convexTest(schema, modules);
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

    it("throws for non-existent pick", async () => {
        const t = convexTest(schema, modules);
        const { id: pickId } = await createPick(t);
        await t.mutation(api.functions.remove, { id: pickId as any });

        await expect(
            t.mutation(api.functions.tailPick, {
                tenantId: TENANT,
                userId: USER_A,
                pickId,
            })
        ).rejects.toThrow("Pick not found");
    });

    it("stores optional startingBankroll", async () => {
        const t = convexTest(schema, modules);
        const { id: pickId } = await createPick(t);

        const result = await t.mutation(api.functions.tailPick, {
            tenantId: TENANT,
            userId: USER_A,
            pickId,
            startingBankroll: 100,
        });

        expect(result.id).toBeDefined();
    });
});

describe("picks/mutations — untailPick", () => {
    it("untails a pick", async () => {
        const t = convexTest(schema, modules);
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

    it("throws for non-tailed pick", async () => {
        const t = convexTest(schema, modules);
        const { id: pickId } = await createPick(t);

        await expect(
            t.mutation(api.functions.untailPick, {
                userId: USER_A,
                pickId,
            })
        ).rejects.toThrow("Not tailed");
    });
});

describe("picks/queries — isTailed", () => {
    it("returns true when tailed", async () => {
        const t = convexTest(schema, modules);
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

    it("returns false when not tailed", async () => {
        const t = convexTest(schema, modules);
        const { id: pickId } = await createPick(t);

        const result = await t.query(api.functions.isTailed, {
            userId: USER_A,
            pickId,
        });

        expect(result).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// listTailed
// ---------------------------------------------------------------------------

describe("picks/queries — listTailed", () => {
    it("lists tailed picks for a user", async () => {
        const t = convexTest(schema, modules);
        const { id: pick1 } = await createPick(t, { event: "Game 1" });
        const { id: pick2 } = await createPick(t, { event: "Game 2" });

        await t.mutation(api.functions.tailPick, { tenantId: TENANT, userId: USER_A, pickId: pick1 });
        await t.mutation(api.functions.tailPick, { tenantId: TENANT, userId: USER_A, pickId: pick2 });

        const tails = await t.query(api.functions.listTailed, {
            tenantId: TENANT,
            userId: USER_A,
        });

        expect(tails).toHaveLength(2);
    });

    it("isolates by user", async () => {
        const t = convexTest(schema, modules);
        const { id: pickId } = await createPick(t);

        await t.mutation(api.functions.tailPick, { tenantId: TENANT, userId: USER_A, pickId });

        const tails = await t.query(api.functions.listTailed, {
            tenantId: TENANT,
            userId: USER_B,
        });

        expect(tails).toHaveLength(0);
    });

    it("filters by sport", async () => {
        const t = convexTest(schema, modules);
        const { id: nba } = await createPick(t, { sport: "NBA", event: "NBA" });
        const { id: nfl } = await createPick(t, { sport: "NFL", event: "NFL" });

        await t.mutation(api.functions.tailPick, { tenantId: TENANT, userId: USER_A, pickId: nba });
        await t.mutation(api.functions.tailPick, { tenantId: TENANT, userId: USER_A, pickId: nfl });

        const tails = await t.query(api.functions.listTailed, {
            tenantId: TENANT,
            userId: USER_A,
            sport: "NBA",
        });

        expect(tails).toHaveLength(1);
        expect((tails[0] as any).sport).toBe("NBA");
    });

    it("filters by result", async () => {
        const t = convexTest(schema, modules);
        const { id: wonId } = await createPick(t, { event: "Won" });
        const { id: pendingId } = await createPick(t, { event: "Pending" });

        await t.mutation(api.functions.grade, { id: wonId as any, result: "won", gradedBy: GRADER });

        await t.mutation(api.functions.tailPick, { tenantId: TENANT, userId: USER_A, pickId: wonId });
        await t.mutation(api.functions.tailPick, { tenantId: TENANT, userId: USER_A, pickId: pendingId });

        const tails = await t.query(api.functions.listTailed, {
            tenantId: TENANT,
            userId: USER_A,
            result: "won",
        });

        expect(tails).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------
// personalStats
// ---------------------------------------------------------------------------

describe("picks/queries — personalStats", () => {
    it("returns correct stats for tailed picks", async () => {
        const t = convexTest(schema, modules);

        // Create and grade picks
        const { id: wonId } = await createPick(t, {
            event: "Won",
            oddsDecimal: 2.0,
            units: 2,
        });
        const { id: lostId } = await createPick(t, {
            event: "Lost",
            oddsDecimal: 1.91,
            units: 1,
        });
        const { id: pendingId } = await createPick(t, { event: "Pending" });

        await t.mutation(api.functions.grade, { id: wonId as any, result: "won", gradedBy: GRADER });
        await t.mutation(api.functions.grade, { id: lostId as any, result: "lost", gradedBy: GRADER });

        // User tails all three
        await t.mutation(api.functions.tailPick, { tenantId: TENANT, userId: USER_A, pickId: wonId });
        await t.mutation(api.functions.tailPick, { tenantId: TENANT, userId: USER_A, pickId: lostId });
        await t.mutation(api.functions.tailPick, { tenantId: TENANT, userId: USER_A, pickId: pendingId });

        const stats = await t.query(api.functions.personalStats, {
            tenantId: TENANT,
            userId: USER_A,
        });

        expect(stats.totalTailed).toBe(3);
        expect(stats.wins).toBe(1);
        expect(stats.losses).toBe(1);
        expect(stats.pending).toBe(1);
        // Won: 2 * (2.0-1) = 2, Lost: -1 => net = 1
        expect(stats.netUnits).toBe(1);
        expect(stats.winRate).toBe(0.5);
    });

    it("calculates bankroll from starting amount", async () => {
        const t = convexTest(schema, modules);

        const { id: wonId } = await createPick(t, {
            event: "Won",
            oddsDecimal: 2.0,
            units: 1,
        });
        await t.mutation(api.functions.grade, { id: wonId as any, result: "won", gradedBy: GRADER });
        await t.mutation(api.functions.tailPick, { tenantId: TENANT, userId: USER_A, pickId: wonId });

        const stats = await t.query(api.functions.personalStats, {
            tenantId: TENANT,
            userId: USER_A,
            startingBankroll: 100,
        });

        // Won: 1 * (2.0-1) = 1 => bankroll = 100 + 1 = 101
        expect(stats.currentBankroll).toBe(101);
    });

    it("includes sport breakdown", async () => {
        const t = convexTest(schema, modules);

        const { id: nbaId } = await createPick(t, { sport: "NBA", event: "NBA Win", oddsDecimal: 2.0, units: 1 });
        const { id: nflId } = await createPick(t, { sport: "NFL", event: "NFL Loss", oddsDecimal: 1.91, units: 1 });

        await t.mutation(api.functions.grade, { id: nbaId as any, result: "won", gradedBy: GRADER });
        await t.mutation(api.functions.grade, { id: nflId as any, result: "lost", gradedBy: GRADER });

        await t.mutation(api.functions.tailPick, { tenantId: TENANT, userId: USER_A, pickId: nbaId });
        await t.mutation(api.functions.tailPick, { tenantId: TENANT, userId: USER_A, pickId: nflId });

        const stats = await t.query(api.functions.personalStats, {
            tenantId: TENANT,
            userId: USER_A,
        });

        expect(stats.sportBreakdown).toHaveLength(2);
        const nba = stats.sportBreakdown.find((s: any) => s.sport === "NBA");
        expect(nba?.wins).toBe(1);
        expect(nba?.losses).toBe(0);
    });

    it("returns zeros for user with no tails", async () => {
        const t = convexTest(schema, modules);

        const stats = await t.query(api.functions.personalStats, {
            tenantId: TENANT,
            userId: "no-tails-user",
        });

        expect(stats.totalTailed).toBe(0);
        expect(stats.wins).toBe(0);
        expect(stats.netUnits).toBe(0);
        expect(stats.sportBreakdown).toHaveLength(0);
    });
});
