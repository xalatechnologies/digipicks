/**
 * Picks Moderation — Convex Tests
 *
 * Covers moderation functions in components/picks/functions.ts:
 *   - reportPick (create report, duplicate guard, self-report guard, auto-flag at threshold)
 *   - moderate (set moderation status, auto-archive on reject/hide, mark reports reviewed)
 *   - listByModerationStatus (queue query, filters, sorting)
 *   - listPickReports (per-pick report list, status filter)
 *   - moderationStats (aggregate counts)
 *
 * Run: cd convex && npx vitest --config vitest.config.ts --run components/picks/__tests__/moderation.test.ts
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

const TENANT = "tenant-mod-001";
const CREATOR = "creator-mod-a";
const REPORTER_A = "reporter-a";
const REPORTER_B = "reporter-b";
const REPORTER_C = "reporter-c";
const ADMIN = "admin-mod-001";

async function createPick(
    t: ReturnType<typeof convexTest>,
    overrides: Partial<{
        tenantId: string;
        creatorId: string;
        event: string;
        sport: string;
        status: string;
    }> = {}
) {
    return t.mutation(api.functions.create, {
        tenantId: overrides.tenantId ?? TENANT,
        creatorId: overrides.creatorId ?? CREATOR,
        event: overrides.event ?? "Test Game",
        sport: overrides.sport ?? "NBA",
        pickType: "spread",
        selection: "Team A -3.5",
        oddsAmerican: "-110",
        oddsDecimal: 1.91,
        units: 1,
        confidence: "medium",
        status: overrides.status,
    });
}

// ---------------------------------------------------------------------------
// reportPick
// ---------------------------------------------------------------------------

describe("picks/moderation — reportPick", () => {
    it("creates a report and increments reportCount", async () => {
        const t = convexTest(schema, modules);
        const { id: pickId } = await createPick(t);

        const result = await t.mutation(api.functions.reportPick, {
            tenantId: TENANT,
            pickId,
            reporterId: REPORTER_A,
            reason: "spam",
        });

        expect(result.id).toBeDefined();
        expect(result.autoFlagged).toBe(false);

        const pick = await t.run(async (ctx) => ctx.db.get(pickId as any)) as any;
        expect(pick?.reportCount).toBe(1);
    });

    it("accepts details with the report", async () => {
        const t = convexTest(schema, modules);
        const { id: pickId } = await createPick(t);

        const result = await t.mutation(api.functions.reportPick, {
            tenantId: TENANT,
            pickId,
            reporterId: REPORTER_A,
            reason: "fraud",
            details: "This pick seems fabricated",
        });

        expect(result.id).toBeDefined();

        const reports = await t.query(api.functions.listPickReports, { pickId });
        expect(reports).toHaveLength(1);
        expect((reports[0] as any).details).toBe("This pick seems fabricated");
    });

    it("rejects duplicate report from same user", async () => {
        const t = convexTest(schema, modules);
        const { id: pickId } = await createPick(t);

        await t.mutation(api.functions.reportPick, {
            tenantId: TENANT,
            pickId,
            reporterId: REPORTER_A,
            reason: "spam",
        });

        await expect(
            t.mutation(api.functions.reportPick, {
                tenantId: TENANT,
                pickId,
                reporterId: REPORTER_A,
                reason: "misleading",
            })
        ).rejects.toThrow("Already reported this pick");
    });

    it("rejects self-reporting", async () => {
        const t = convexTest(schema, modules);
        const { id: pickId } = await createPick(t);

        await expect(
            t.mutation(api.functions.reportPick, {
                tenantId: TENANT,
                pickId,
                reporterId: CREATOR,
                reason: "spam",
            })
        ).rejects.toThrow("Cannot report your own pick");
    });

    it("rejects invalid report reason", async () => {
        const t = convexTest(schema, modules);
        const { id: pickId } = await createPick(t);

        await expect(
            t.mutation(api.functions.reportPick, {
                tenantId: TENANT,
                pickId,
                reporterId: REPORTER_A,
                reason: "invalid_reason",
            })
        ).rejects.toThrow("Invalid report reason");
    });

    it("auto-flags pick at 3 reports", async () => {
        const t = convexTest(schema, modules);
        const { id: pickId } = await createPick(t);

        await t.mutation(api.functions.reportPick, {
            tenantId: TENANT,
            pickId,
            reporterId: REPORTER_A,
            reason: "spam",
        });
        await t.mutation(api.functions.reportPick, {
            tenantId: TENANT,
            pickId,
            reporterId: REPORTER_B,
            reason: "misleading",
        });
        const result = await t.mutation(api.functions.reportPick, {
            tenantId: TENANT,
            pickId,
            reporterId: REPORTER_C,
            reason: "fraud",
        });

        expect(result.autoFlagged).toBe(true);

        const pick = await t.run(async (ctx) => ctx.db.get(pickId as any)) as any;
        expect(pick?.moderationStatus).toBe("flagged");
        expect(pick?.reportCount).toBe(3);
    });

    it("does not auto-flag if already moderated", async () => {
        const t = convexTest(schema, modules);
        const { id: pickId } = await createPick(t);

        // Pre-set moderation status to under_review
        await t.run(async (ctx) => {
            await ctx.db.patch(pickId as any, { moderationStatus: "under_review", reportCount: 2 });
        });

        const result = await t.mutation(api.functions.reportPick, {
            tenantId: TENANT,
            pickId,
            reporterId: REPORTER_A,
            reason: "spam",
        });

        expect(result.autoFlagged).toBe(false);

        const pick = await t.run(async (ctx) => ctx.db.get(pickId as any)) as any;
        expect(pick?.moderationStatus).toBe("under_review");
    });

    it("rejects report for wrong tenant", async () => {
        const t = convexTest(schema, modules);
        const { id: pickId } = await createPick(t);

        await expect(
            t.mutation(api.functions.reportPick, {
                tenantId: "wrong-tenant",
                pickId,
                reporterId: REPORTER_A,
                reason: "spam",
            })
        ).rejects.toThrow("Pick not found");
    });
});

// ---------------------------------------------------------------------------
// moderate
// ---------------------------------------------------------------------------

describe("picks/moderation — moderate", () => {
    it("sets moderation status and metadata", async () => {
        const t = convexTest(schema, modules);
        const { id: pickId } = await createPick(t);

        const result = await t.mutation(api.functions.moderate, {
            id: pickId as any,
            moderationStatus: "under_review",
            moderatedBy: ADMIN,
            moderationNote: "Looking into reports",
        });

        expect(result.success).toBe(true);

        const pick = await t.run(async (ctx) => ctx.db.get(pickId as any)) as any;
        expect(pick?.moderationStatus).toBe("under_review");
        expect(pick?.moderatedBy).toBe(ADMIN);
        expect(pick?.moderatedAt).toBeGreaterThan(0);
        expect(pick?.moderationNote).toBe("Looking into reports");
    });

    it("archives pick when rejected", async () => {
        const t = convexTest(schema, modules);
        const { id: pickId } = await createPick(t);

        await t.mutation(api.functions.moderate, {
            id: pickId as any,
            moderationStatus: "rejected",
            moderatedBy: ADMIN,
            moderationNote: "Fraudulent pick",
        });

        const pick = await t.run(async (ctx) => ctx.db.get(pickId as any)) as any;
        expect(pick?.moderationStatus).toBe("rejected");
        expect(pick?.status).toBe("archived");
    });

    it("archives pick when hidden", async () => {
        const t = convexTest(schema, modules);
        const { id: pickId } = await createPick(t);

        await t.mutation(api.functions.moderate, {
            id: pickId as any,
            moderationStatus: "hidden",
            moderatedBy: ADMIN,
        });

        const pick = await t.run(async (ctx) => ctx.db.get(pickId as any)) as any;
        expect(pick?.moderationStatus).toBe("hidden");
        expect(pick?.status).toBe("archived");
    });

    it("marks pending reports as reviewed on approval", async () => {
        const t = convexTest(schema, modules);
        const { id: pickId } = await createPick(t);

        // Create reports
        await t.mutation(api.functions.reportPick, {
            tenantId: TENANT,
            pickId,
            reporterId: REPORTER_A,
            reason: "spam",
        });
        await t.mutation(api.functions.reportPick, {
            tenantId: TENANT,
            pickId,
            reporterId: REPORTER_B,
            reason: "misleading",
        });

        // Approve the pick
        await t.mutation(api.functions.moderate, {
            id: pickId as any,
            moderationStatus: "approved",
            moderatedBy: ADMIN,
        });

        const reports = await t.query(api.functions.listPickReports, { pickId });
        for (const report of reports) {
            expect((report as any).status).toBe("reviewed");
            expect((report as any).reviewedBy).toBe(ADMIN);
        }
    });

    it("does not change status when set to clean", async () => {
        const t = convexTest(schema, modules);
        const { id: pickId } = await createPick(t);

        await t.mutation(api.functions.moderate, {
            id: pickId as any,
            moderationStatus: "clean",
            moderatedBy: ADMIN,
        });

        const pick = await t.run(async (ctx) => ctx.db.get(pickId as any)) as any;
        expect(pick?.status).toBe("published");
        expect(pick?.moderationStatus).toBe("clean");
    });
});

// ---------------------------------------------------------------------------
// listByModerationStatus
// ---------------------------------------------------------------------------

describe("picks/moderation — listByModerationStatus", () => {
    it("returns flagged and under_review picks by default", async () => {
        const t = convexTest(schema, modules);

        const { id: id1 } = await createPick(t, { event: "Game 1" });
        const { id: id2 } = await createPick(t, { event: "Game 2" });
        const { id: id3 } = await createPick(t, { event: "Game 3" });

        await t.run(async (ctx) => {
            await ctx.db.patch(id1 as any, { moderationStatus: "flagged", reportCount: 5 });
            await ctx.db.patch(id2 as any, { moderationStatus: "under_review", reportCount: 2 });
            await ctx.db.patch(id3 as any, { moderationStatus: "approved" });
        });

        const queue = await t.query(api.functions.listByModerationStatus, {
            tenantId: TENANT,
        });

        expect(queue).toHaveLength(2);
        // Sorted by reportCount desc
        expect((queue[0] as any).reportCount).toBe(5);
        expect((queue[1] as any).reportCount).toBe(2);
    });

    it("filters by specific moderation status", async () => {
        const t = convexTest(schema, modules);

        const { id: id1 } = await createPick(t, { event: "Game 1" });
        const { id: id2 } = await createPick(t, { event: "Game 2" });

        await t.run(async (ctx) => {
            await ctx.db.patch(id1 as any, { moderationStatus: "rejected" });
            await ctx.db.patch(id2 as any, { moderationStatus: "flagged" });
        });

        const rejected = await t.query(api.functions.listByModerationStatus, {
            tenantId: TENANT,
            moderationStatus: "rejected",
        });

        expect(rejected).toHaveLength(1);
        expect((rejected[0] as any).event).toBe("Game 1");
    });

    it("filters by creator", async () => {
        const t = convexTest(schema, modules);
        const creatorB = "creator-mod-b";

        const { id: id1 } = await createPick(t, { event: "Game 1", creatorId: CREATOR });
        const { id: id2 } = await createPick(t, { event: "Game 2", creatorId: creatorB });

        await t.run(async (ctx) => {
            await ctx.db.patch(id1 as any, { moderationStatus: "flagged" });
            await ctx.db.patch(id2 as any, { moderationStatus: "flagged" });
        });

        const queue = await t.query(api.functions.listByModerationStatus, {
            tenantId: TENANT,
            creatorId: creatorB,
        });

        expect(queue).toHaveLength(1);
        expect((queue[0] as any).creatorId).toBe(creatorB);
    });

    it("respects limit", async () => {
        const t = convexTest(schema, modules);

        for (let i = 0; i < 5; i++) {
            const { id } = await createPick(t, { event: `Game ${i}` });
            await t.run(async (ctx) => {
                await ctx.db.patch(id as any, { moderationStatus: "flagged" });
            });
        }

        const queue = await t.query(api.functions.listByModerationStatus, {
            tenantId: TENANT,
            limit: 3,
        });

        expect(queue).toHaveLength(3);
    });
});

// ---------------------------------------------------------------------------
// listPickReports
// ---------------------------------------------------------------------------

describe("picks/moderation — listPickReports", () => {
    it("returns all reports for a pick", async () => {
        const t = convexTest(schema, modules);
        const { id: pickId } = await createPick(t);

        await t.mutation(api.functions.reportPick, {
            tenantId: TENANT,
            pickId,
            reporterId: REPORTER_A,
            reason: "spam",
        });
        await t.mutation(api.functions.reportPick, {
            tenantId: TENANT,
            pickId,
            reporterId: REPORTER_B,
            reason: "fraud",
            details: "Fabricated results",
        });

        const reports = await t.query(api.functions.listPickReports, { pickId });
        expect(reports).toHaveLength(2);
    });

    it("filters by status", async () => {
        const t = convexTest(schema, modules);
        const { id: pickId } = await createPick(t);

        await t.mutation(api.functions.reportPick, {
            tenantId: TENANT,
            pickId,
            reporterId: REPORTER_A,
            reason: "spam",
        });

        // Mark as approved which reviews reports
        await t.mutation(api.functions.moderate, {
            id: pickId as any,
            moderationStatus: "approved",
            moderatedBy: ADMIN,
        });

        // Add a new report after approval
        await t.mutation(api.functions.reportPick, {
            tenantId: TENANT,
            pickId,
            reporterId: REPORTER_B,
            reason: "misleading",
        });

        const pending = await t.query(api.functions.listPickReports, {
            pickId,
            status: "pending",
        });
        expect(pending).toHaveLength(1);

        const reviewed = await t.query(api.functions.listPickReports, {
            pickId,
            status: "reviewed",
        });
        expect(reviewed).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------
// moderationStats
// ---------------------------------------------------------------------------

describe("picks/moderation — moderationStats", () => {
    it("returns aggregate moderation counts", async () => {
        const t = convexTest(schema, modules);

        const picks = [];
        for (let i = 0; i < 6; i++) {
            picks.push(await createPick(t, { event: `Game ${i}` }));
        }

        await t.run(async (ctx) => {
            await ctx.db.patch(picks[0].id as any, { moderationStatus: "flagged" });
            await ctx.db.patch(picks[1].id as any, { moderationStatus: "flagged" });
            await ctx.db.patch(picks[2].id as any, { moderationStatus: "under_review" });
            await ctx.db.patch(picks[3].id as any, { moderationStatus: "rejected" });
            await ctx.db.patch(picks[4].id as any, { moderationStatus: "hidden" });
            await ctx.db.patch(picks[5].id as any, { moderationStatus: "approved" });
        });

        // Also create a pending report
        await t.mutation(api.functions.reportPick, {
            tenantId: TENANT,
            pickId: picks[0].id,
            reporterId: REPORTER_A,
            reason: "spam",
        });

        const stats = await t.query(api.functions.moderationStats, {
            tenantId: TENANT,
        });

        expect(stats.flagged).toBe(2);
        expect(stats.underReview).toBe(1);
        expect(stats.rejected).toBe(1);
        expect(stats.hidden).toBe(1);
        expect(stats.approved).toBe(1);
        expect(stats.pendingReports).toBe(1);
    });
});
