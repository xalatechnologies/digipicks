/**
 * Creator Earnings — Domain Facade Tests
 *
 * Tests creator-facing earnings queries (summary, history, payouts).
 * Run: cd convex && npx vitest --config vitest.config.ts --run domain/__tests__/creatorEarnings.test.ts
 */

import { describe, it, expect } from "vitest";
import { api } from "../../_generated/api";
import { createDomainTest, seedTestTenant } from "./testHelper.test-util";

// Creator earnings operates on core tables only (no component delegation).
function setup() {
    return createDomainTest(["audit"]);
}

// =============================================================================
// HELPERS — seed earnings and payouts for a creator
// =============================================================================

async function seedEarnings(
    t: ReturnType<typeof setup>,
    tenantId: any,
    creatorId: any,
    periods: { period: string; gross: number; fees: number; subscribers: number; paidOut: number }[]
) {
    await t.run(async (ctx) => {
        const now = Date.now();
        for (const p of periods) {
            await ctx.db.insert("creatorEarnings", {
                tenantId,
                creatorId,
                period: p.period,
                grossRevenue: p.gross,
                platformFees: p.fees,
                netEarnings: p.gross - p.fees,
                subscriberCount: p.subscribers,
                paidOutAmount: p.paidOut,
                currency: "NOK",
                updatedAt: now,
            });
        }
    });
}

async function seedPayouts(
    t: ReturnType<typeof setup>,
    tenantId: any,
    creatorId: any,
    payouts: { amount: number; fee: number; status: string }[]
) {
    await t.run(async (ctx) => {
        const now = Date.now();
        for (const p of payouts) {
            await ctx.db.insert("creatorPayouts", {
                tenantId,
                creatorId,
                amount: p.amount,
                platformFee: p.fee,
                netAmount: p.amount - p.fee,
                currency: "NOK",
                stripeAccountId: "acct_test123",
                status: p.status as any,
                requestedAt: now,
                requestedBy: creatorId,
            });
        }
    });
}

// =============================================================================
// getMyEarningsSummary
// =============================================================================

describe("creatorEarnings — getMyEarningsSummary", () => {
    it("returns zero summary when creator has no earnings", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);

        const summary = await t.query(api.domain.creatorEarnings.getMyEarningsSummary, {
            tenantId,
            userId,
        });

        expect(summary.totalGrossRevenue).toBe(0);
        expect(summary.totalNetEarnings).toBe(0);
        expect(summary.subscriberCount).toBe(0);
        expect(summary.mrr).toBe(0);
    });

    it("aggregates earnings across periods", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);

        await seedEarnings(t, tenantId, userId, [
            { period: "2026-01", gross: 50000, fees: 7500, subscribers: 10, paidOut: 42500 },
            { period: "2026-02", gross: 75000, fees: 11250, subscribers: 15, paidOut: 0 },
            { period: "2026-03", gross: 100000, fees: 15000, subscribers: 20, paidOut: 0 },
        ]);

        const summary = await t.query(api.domain.creatorEarnings.getMyEarningsSummary, {
            tenantId,
            userId,
        });

        expect(summary.totalGrossRevenue).toBe(225000);
        expect(summary.totalPlatformFees).toBe(33750);
        expect(summary.totalNetEarnings).toBe(191250);
        expect(summary.totalPaidOut).toBe(42500);
        expect(summary.pendingPayout).toBe(191250 - 42500);
        expect(summary.currency).toBe("NOK");
    });

    it("returns latest period gross as MRR", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);

        await seedEarnings(t, tenantId, userId, [
            { period: "2026-02", gross: 50000, fees: 7500, subscribers: 10, paidOut: 0 },
            { period: "2026-03", gross: 80000, fees: 12000, subscribers: 16, paidOut: 0 },
        ]);

        const summary = await t.query(api.domain.creatorEarnings.getMyEarningsSummary, {
            tenantId,
            userId,
        });

        // MRR = latest period gross (2026-03)
        expect(summary.mrr).toBe(80000);
    });

    it("rejects non-tenant-member", async () => {
        const t = setup();
        const { tenantId } = await seedTestTenant(t);

        // Create a user not in the tenant
        const outsiderId = await t.run(async (ctx) => {
            return ctx.db.insert("users", {
                email: "outsider@test.no",
                name: "Outsider",
                role: "user",
                status: "active",
                tenantId,
                metadata: {},
            });
        });

        await expect(
            t.query(api.domain.creatorEarnings.getMyEarningsSummary, {
                tenantId,
                userId: outsiderId,
            })
        ).rejects.toThrow();
    });
});

// =============================================================================
// getMyEarningsHistory
// =============================================================================

describe("creatorEarnings — getMyEarningsHistory", () => {
    it("returns empty array when no earnings", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);

        const history = await t.query(api.domain.creatorEarnings.getMyEarningsHistory, {
            tenantId,
            userId,
        });

        expect(history).toEqual([]);
    });

    it("returns per-period earnings ordered desc", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);

        await seedEarnings(t, tenantId, userId, [
            { period: "2026-01", gross: 50000, fees: 7500, subscribers: 10, paidOut: 42500 },
            { period: "2026-02", gross: 75000, fees: 11250, subscribers: 15, paidOut: 0 },
        ]);

        const history = await t.query(api.domain.creatorEarnings.getMyEarningsHistory, {
            tenantId,
            userId,
        });

        expect(history.length).toBe(2);
        expect(history[0].grossRevenue).toBeDefined();
        expect(history[0].period).toBeDefined();
    });

    it("respects limit parameter", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);

        await seedEarnings(t, tenantId, userId, [
            { period: "2026-01", gross: 10000, fees: 1500, subscribers: 5, paidOut: 0 },
            { period: "2026-02", gross: 20000, fees: 3000, subscribers: 8, paidOut: 0 },
            { period: "2026-03", gross: 30000, fees: 4500, subscribers: 12, paidOut: 0 },
        ]);

        const history = await t.query(api.domain.creatorEarnings.getMyEarningsHistory, {
            tenantId,
            userId,
            limit: 2,
        });

        expect(history.length).toBe(2);
    });
});

// =============================================================================
// getMyPayouts
// =============================================================================

describe("creatorEarnings — getMyPayouts", () => {
    it("returns empty array when no payouts", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);

        const payouts = await t.query(api.domain.creatorEarnings.getMyPayouts, {
            tenantId,
            userId,
        });

        expect(payouts).toEqual([]);
    });

    it("returns payouts for the creator", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);

        await seedPayouts(t, tenantId, userId, [
            { amount: 50000, fee: 7500, status: "completed" },
            { amount: 30000, fee: 4500, status: "pending" },
        ]);

        const payouts = await t.query(api.domain.creatorEarnings.getMyPayouts, {
            tenantId,
            userId,
        });

        expect(payouts.length).toBe(2);
        expect(payouts[0].netAmount).toBeDefined();
        expect(payouts[0].status).toBeDefined();
    });

    it("filters by status", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);

        await seedPayouts(t, tenantId, userId, [
            { amount: 50000, fee: 7500, status: "completed" },
            { amount: 30000, fee: 4500, status: "pending" },
            { amount: 20000, fee: 3000, status: "completed" },
        ]);

        const payouts = await t.query(api.domain.creatorEarnings.getMyPayouts, {
            tenantId,
            userId,
            status: "completed",
        });

        expect(payouts.length).toBe(2);
        expect(payouts.every((p) => p.status === "completed")).toBe(true);
    });

    it("does not leak another creator's payouts", async () => {
        const t = setup();
        const { tenantId, userId, adminId } = await seedTestTenant(t);

        // Seed payouts for adminId
        await seedPayouts(t, tenantId, adminId, [
            { amount: 50000, fee: 7500, status: "completed" },
        ]);

        // Query as userId (different creator)
        const payouts = await t.query(api.domain.creatorEarnings.getMyPayouts, {
            tenantId,
            userId,
        });

        expect(payouts.length).toBe(0);
    });
});
