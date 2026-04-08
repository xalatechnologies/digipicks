/**
 * Pick Tailing Domain Facade Tests
 *
 * Tests the tailing facade layer (convex/domain/picks.ts) which adds:
 *   - Auth checks (requireActiveUser)
 *   - Audit logging
 *   - Event bus emission
 *   - Creator data enrichment on tailed picks
 *
 * Run: cd convex && npx vitest --config vitest.config.ts --run domain/__tests__/pickTailing.test.ts
 */

import { describe, it, expect } from "vitest";
import { api, components } from "../../_generated/api";
import { createDomainTest, seedTestTenant, seedSecondTenant } from "./testHelper.test-util";
import type { Id } from "../../_generated/dataModel";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setup() {
    return createDomainTest(["picks", "audit"]);
}

function pickArgs(tenantId: Id<"tenants">, creatorId: Id<"users">) {
    return {
        tenantId,
        creatorId,
        event: "Lakers vs Celtics",
        sport: "NBA",
        pickType: "spread",
        selection: "Lakers -3.5",
        oddsAmerican: "-110",
        oddsDecimal: 1.91,
        units: 2,
        confidence: "medium" as const,
    };
}

// ---------------------------------------------------------------------------
// TAIL PICK
// ---------------------------------------------------------------------------

describe("domain/picks — tailPick", () => {
    it("tails a pick and returns id", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);

        const { id: pickId } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

        const result = await t.mutation(api.domain.picks.tailPick, {
            tenantId,
            userId,
            pickId,
        });

        expect(result.id).toBeDefined();
    });

    it("rejects inactive user", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);

        const { id: pickId } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

        const inactiveId = await t.run(async (ctx) => {
            return ctx.db.insert("users", {
                email: "suspended@test.no",
                name: "Suspended",
                role: "user",
                status: "suspended",
                tenantId,
                metadata: {},
            });
        });

        await expect(
            t.mutation(api.domain.picks.tailPick, {
                tenantId,
                userId: inactiveId,
                pickId,
            })
        ).rejects.toThrow("User not found or inactive");
    });

    it("creates audit entry on tail", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);

        const { id: pickId } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

        await t.mutation(api.domain.picks.tailPick, {
            tenantId,
            userId,
            pickId,
        });

        const auditEntries = await t.query(
            components.audit.functions.listForTenant,
            { tenantId: tenantId as string }
        );
        const tailAudit = auditEntries.find(
            (e: any) => e.entityType === "pickTail" && e.action === "created"
        );
        expect(tailAudit).toBeDefined();
    });
});

// ---------------------------------------------------------------------------
// UNTAIL PICK
// ---------------------------------------------------------------------------

describe("domain/picks — untailPick", () => {
    it("untails a tailed pick", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);

        const { id: pickId } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

        await t.mutation(api.domain.picks.tailPick, {
            tenantId,
            userId,
            pickId,
        });

        const result = await t.mutation(api.domain.picks.untailPick, {
            userId,
            pickId,
        });

        expect(result.success).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// IS TAILED
// ---------------------------------------------------------------------------

describe("domain/picks — isTailed", () => {
    it("returns false when not tailed", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);

        const { id: pickId } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

        const result = await t.query(api.domain.picks.isTailed, {
            userId: userId as string,
            pickId,
        });

        expect(result).toBe(false);
    });

    it("returns true when tailed", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);

        const { id: pickId } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

        await t.mutation(api.domain.picks.tailPick, {
            tenantId,
            userId,
            pickId,
        });

        const result = await t.query(api.domain.picks.isTailed, {
            userId: userId as string,
            pickId,
        });

        expect(result).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// MY TAILED PICKS (enrichment)
// ---------------------------------------------------------------------------

describe("domain/picks — myTailedPicks", () => {
    it("returns tailed picks enriched with creator data", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);

        const { id: pickId } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

        await t.mutation(api.domain.picks.tailPick, {
            tenantId,
            userId,
            pickId,
        });

        const picks = await t.query(api.domain.picks.myTailedPicks, {
            tenantId,
            userId: userId as string,
        });

        expect(picks).toHaveLength(1);
        expect(picks[0].creator).toBeDefined();
        expect(picks[0].creator.name).toBe("Test User");
        expect(picks[0].tailedAt).toBeDefined();
    });

    it("filters by sport", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);

        const { id: nbaId } = await t.mutation(api.domain.picks.create, {
            ...pickArgs(tenantId, userId),
            sport: "NBA",
            event: "NBA game",
        });
        const { id: nflId } = await t.mutation(api.domain.picks.create, {
            ...pickArgs(tenantId, userId),
            sport: "NFL",
            event: "NFL game",
        });

        await t.mutation(api.domain.picks.tailPick, { tenantId, userId, pickId: nbaId });
        await t.mutation(api.domain.picks.tailPick, { tenantId, userId, pickId: nflId });

        const nflOnly = await t.query(api.domain.picks.myTailedPicks, {
            tenantId,
            userId: userId as string,
            sport: "NFL",
        });

        expect(nflOnly).toHaveLength(1);
        expect(nflOnly[0].sport).toBe("NFL");
    });

    it("isolates by user", async () => {
        const t = setup();
        const { tenantId, userId, adminId } = await seedTestTenant(t);

        const { id: pickId } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

        await t.mutation(api.domain.picks.tailPick, { tenantId, userId, pickId });

        const userPicks = await t.query(api.domain.picks.myTailedPicks, {
            tenantId,
            userId: userId as string,
        });
        const adminPicks = await t.query(api.domain.picks.myTailedPicks, {
            tenantId,
            userId: adminId as string,
        });

        expect(userPicks).toHaveLength(1);
        expect(adminPicks).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// MY TRACKER STATS
// ---------------------------------------------------------------------------

describe("domain/picks — myTrackerStats", () => {
    it("returns correct P/L stats", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);

        // Create and tail picks
        const { id: wonId } = await t.mutation(api.domain.picks.create, {
            ...pickArgs(tenantId, userId),
            event: "Won game",
            oddsDecimal: 2.0,
            units: 5,
        });
        const { id: lostId } = await t.mutation(api.domain.picks.create, {
            ...pickArgs(tenantId, userId),
            event: "Lost game",
            oddsDecimal: 1.5,
            units: 3,
        });

        await t.mutation(api.domain.picks.tailPick, { tenantId, userId, pickId: wonId });
        await t.mutation(api.domain.picks.tailPick, { tenantId, userId, pickId: lostId });

        await t.mutation(api.domain.picks.grade, { id: wonId, result: "won", gradedBy: userId });
        await t.mutation(api.domain.picks.grade, { id: lostId, result: "lost", gradedBy: userId });

        const stats = await t.query(api.domain.picks.myTrackerStats, {
            tenantId,
            userId: userId as string,
        });

        expect(stats.totalTailed).toBe(2);
        expect(stats.wins).toBe(1);
        expect(stats.losses).toBe(1);
        // Won 5u at 2.0 → profit 5, Lost 3u → net = 5 - 3 = 2
        expect(stats.netUnits).toBe(2);
        expect(stats.totalWagered).toBe(8);
    });

    it("calculates bankroll with starting balance", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);

        const { id: pickId } = await t.mutation(api.domain.picks.create, {
            ...pickArgs(tenantId, userId),
            oddsDecimal: 3.0,
            units: 10,
        });

        await t.mutation(api.domain.picks.tailPick, { tenantId, userId, pickId });
        await t.mutation(api.domain.picks.grade, { id: pickId, result: "won", gradedBy: userId });

        const stats = await t.query(api.domain.picks.myTrackerStats, {
            tenantId,
            userId: userId as string,
            startingBankroll: 100,
        });

        // Won 10u at 3.0 → profit = 10*(3-1) = 20, bankroll = 100 + 20 = 120
        expect(stats.currentBankroll).toBe(120);
    });
});
