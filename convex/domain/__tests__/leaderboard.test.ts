/**
 * Leaderboard Domain Facade Tests
 *
 * Tests the leaderboard facade (convex/domain/picks.leaderboard) which:
 *   - Delegates to picks component for aggregation
 *   - Enriches entries with creator user data (name, avatar, displayName)
 *   - Adds rank numbering
 *   - Passes filters (sport, timeframe, sortBy, limit)
 *
 * Component-level leaderboard logic (aggregation, sorting, streaks)
 * is covered in components/picks/__tests__/leaderboard.test.ts.
 *
 * Run: cd convex && npx vitest --config vitest.config.ts --run domain/__tests__/leaderboard.test.ts
 */

import { describe, it, expect } from "vitest";
import { api } from "../../_generated/api";
import { createDomainTest, seedTestTenant, seedSecondTenant } from "./testHelper.test-util";
import type { Id } from "../../_generated/dataModel";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setup() {
    return createDomainTest(["picks", "audit"]);
}

function pickArgs(tenantId: Id<"tenants">, creatorId: Id<"users">, overrides: Partial<{
    event: string;
    sport: string;
    oddsDecimal: number;
    oddsAmerican: string;
    units: number;
}> = {}) {
    return {
        tenantId,
        creatorId,
        event: overrides.event ?? "Lakers vs Celtics",
        sport: overrides.sport ?? "NBA",
        pickType: "spread" as const,
        selection: "Lakers -3.5",
        oddsAmerican: overrides.oddsAmerican ?? "-110",
        oddsDecimal: overrides.oddsDecimal ?? 1.91,
        units: overrides.units ?? 1,
        confidence: "medium" as const,
    };
}

// ---------------------------------------------------------------------------
// LEADERBOARD
// ---------------------------------------------------------------------------

describe("domain/picks — leaderboard", () => {
    it("returns empty when no graded picks", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);

        // Create a pending pick
        await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

        const entries = await t.query(api.domain.picks.leaderboard, { tenantId });

        expect(entries).toEqual([]);
    });

    it("enriches leaderboard entries with creator data", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);

        const { id } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));
        await t.mutation(api.domain.picks.grade, { id, result: "won", gradedBy: userId });

        const entries = await t.query(api.domain.picks.leaderboard, { tenantId });

        expect(entries).toHaveLength(1);
        expect(entries[0].rank).toBe(1);
        expect(entries[0].creator).toBeDefined();
        expect(entries[0].creator.name).toBe("Test User");
        expect(entries[0].creator.id).toBeDefined();
    });

    it("ranks multiple creators by ROI", async () => {
        const t = setup();
        const { tenantId, userId, adminId } = await seedTestTenant(t);

        // User: win at high odds (high ROI)
        const { id: u1 } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId, {
            oddsDecimal: 3.0,
            oddsAmerican: "+200",
            event: "High odds win",
        }));
        await t.mutation(api.domain.picks.grade, { id: u1, result: "won", gradedBy: userId });

        // Admin: win at low odds (low ROI)
        const { id: a1 } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, adminId, {
            oddsDecimal: 1.5,
            oddsAmerican: "-200",
            event: "Low odds win",
        }));
        await t.mutation(api.domain.picks.grade, { id: a1, result: "won", gradedBy: adminId });

        const entries = await t.query(api.domain.picks.leaderboard, { tenantId });

        expect(entries).toHaveLength(2);
        // User (200% ROI) should rank above Admin (50% ROI)
        expect(entries[0].creator.name).toBe("Test User");
        expect(entries[0].rank).toBe(1);
        expect(entries[1].creator.name).toBe("Test Admin");
        expect(entries[1].rank).toBe(2);
    });

    it("filters by sport", async () => {
        const t = setup();
        const { tenantId, userId, adminId } = await seedTestTenant(t);

        const { id: nba } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId, {
            sport: "NBA",
            event: "NBA game",
        }));
        await t.mutation(api.domain.picks.grade, { id: nba, result: "won", gradedBy: userId });

        const { id: nfl } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, adminId, {
            sport: "NFL",
            event: "NFL game",
        }));
        await t.mutation(api.domain.picks.grade, { id: nfl, result: "won", gradedBy: adminId });

        const nbaOnly = await t.query(api.domain.picks.leaderboard, {
            tenantId,
            sport: "NBA",
        });

        expect(nbaOnly).toHaveLength(1);
        expect(nbaOnly[0].creator.name).toBe("Test User");
    });

    it("passes sortBy to component", async () => {
        const t = setup();
        const { tenantId, userId, adminId } = await seedTestTenant(t);

        // User: 1 pick
        const { id: u1 } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId, {
            event: "U1",
        }));
        await t.mutation(api.domain.picks.grade, { id: u1, result: "won", gradedBy: userId });

        // Admin: 3 picks
        for (let i = 0; i < 3; i++) {
            const { id } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, adminId, {
                event: `A${i}`,
            }));
            await t.mutation(api.domain.picks.grade, { id, result: "won", gradedBy: adminId });
        }

        const entries = await t.query(api.domain.picks.leaderboard, {
            tenantId,
            sortBy: "totalPicks",
        });

        expect(entries[0].totalPicks).toBe(3);
        expect(entries[0].creator.name).toBe("Test Admin");
    });

    it("respects limit", async () => {
        const t = setup();
        const { tenantId, userId, adminId } = await seedTestTenant(t);

        const { id: u1 } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId, { event: "U" }));
        await t.mutation(api.domain.picks.grade, { id: u1, result: "won", gradedBy: userId });

        const { id: a1 } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, adminId, { event: "A" }));
        await t.mutation(api.domain.picks.grade, { id: a1, result: "won", gradedBy: adminId });

        const entries = await t.query(api.domain.picks.leaderboard, {
            tenantId,
            limit: 1,
        });

        expect(entries).toHaveLength(1);
    });

    it("isolates leaderboard by tenant", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);
        const { tenantId: otherTenant, userId: otherUser } = await seedSecondTenant(t);

        const { id: u1 } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId, { event: "T1" }));
        await t.mutation(api.domain.picks.grade, { id: u1, result: "won", gradedBy: userId });

        const { id: o1 } = await t.mutation(api.domain.picks.create, pickArgs(otherTenant, otherUser, { event: "T2" }));
        await t.mutation(api.domain.picks.grade, { id: o1, result: "won", gradedBy: otherUser });

        const entries = await t.query(api.domain.picks.leaderboard, { tenantId });

        expect(entries).toHaveLength(1);
        expect(entries[0].creator.name).toBe("Test User");
    });
});
