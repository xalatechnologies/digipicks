/**
 * Security Hardening Regression Tests (Phase 2)
 *
 * Tests the security invariants added in commit b168888:
 *   S3: Ownership checks — only pick creator can update/remove
 *   S6: Feed scoping — feedFollowing returns [] without userId,
 *       feedForYou gates picks for non-subscribers
 *
 * Run: cd convex && npx vitest --config vitest.config.ts --run domain/__tests__/securityHardening.test.ts
 */

import { describe, it, expect } from "vitest";
import { api, components } from "../../_generated/api";
import { createDomainTest, seedTestTenant, seedSecondTenant } from "./testHelper.test-util";
import type { Id } from "../../_generated/dataModel";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setup() {
    return createDomainTest(["picks", "audit", "subscriptions"]);
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

async function seedSecondUser(t: ReturnType<typeof setup>, tenantId: Id<"tenants">) {
    return t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
            email: "other-creator@test.no",
            name: "Other Creator",
            role: "user",
            status: "active",
            tenantId,
            metadata: {},
        });
        await ctx.db.insert("tenantUsers", {
            tenantId,
            userId,
            status: "active",
            joinedAt: Date.now(),
        });
        return userId;
    });
}

async function seedMembership(
    t: ReturnType<typeof setup>,
    tenantId: string,
    userId: string,
    creatorId: string,
) {
    const tier = await (t as any).mutation(
        components.subscriptions.functions.createTier,
        {
            tenantId,
            name: "Premium",
            slug: `premium-${Date.now()}`,
            description: "Premium access",
            price: 999,
            currency: "USD",
            billingInterval: "monthly",
            benefits: [
                { id: "picks_access", type: "feature", label: "Full Pick Access", config: {} },
            ],
            sortOrder: 1,
            isActive: true,
            isPublic: true,
        }
    );

    const membership = await (t as any).mutation(
        components.subscriptions.functions.createMembership,
        {
            tenantId,
            userId,
            tierId: tier.id,
            creatorId,
            memberNumber: `M-${Date.now()}`,
            status: "active",
            startDate: Date.now(),
            endDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
        }
    );

    return { tierId: tier.id, membershipId: membership.id };
}

// ---------------------------------------------------------------------------
// S3: OWNERSHIP CHECKS
// ---------------------------------------------------------------------------

describe("security — S3: ownership checks on update/remove", () => {
    it("rejects update by non-creator", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);
        const otherUser = await seedSecondUser(t, tenantId);

        const { id } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

        await expect(
            t.mutation(api.domain.picks.update, {
                id,
                callerId: otherUser,
                analysis: "Hacked analysis",
            })
        ).rejects.toThrow("Not authorized");
    });

    it("allows update by the pick creator", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);

        const { id } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

        await t.mutation(api.domain.picks.update, {
            id,
            callerId: userId,
            analysis: "Legit update",
        });

        const updated = await t.query(api.domain.picks.get, { id });
        expect(updated.analysis).toBe("Legit update");
    });

    it("rejects remove by non-creator", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);
        const otherUser = await seedSecondUser(t, tenantId);

        const { id } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

        await expect(
            t.mutation(api.domain.picks.remove, { id, callerId: otherUser })
        ).rejects.toThrow("Not authorized");
    });

    it("allows remove by the pick creator", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);

        const { id } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

        const result = await t.mutation(api.domain.picks.remove, { id, callerId: userId });
        expect(result.success).toBe(true);
    });

    it("rejects update by inactive user even if they are the creator", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);

        const { id } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

        // Suspend the user
        await t.run(async (ctx) => {
            await ctx.db.patch(userId, { status: "suspended" });
        });

        await expect(
            t.mutation(api.domain.picks.update, { id, callerId: userId, analysis: "Nope" })
        ).rejects.toThrow("User not found or inactive");
    });
});

// ---------------------------------------------------------------------------
// S6: FEED SCOPING
// ---------------------------------------------------------------------------

describe("security — S6: feed scoping", () => {
    it("feedFollowing returns empty array without userId", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);

        await t.mutation(api.domain.picks.create, {
            ...pickArgs(tenantId, userId),
            status: "published",
        });

        const feed = await t.query(api.domain.picks.feedFollowing, { tenantId });
        expect(feed).toEqual([]);
    });

    it("feedFollowing only shows picks from subscribed creators", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);
        const creator2 = await seedSecondUser(t, tenantId);

        // Create picks from both creators
        await t.mutation(api.domain.picks.create, {
            ...pickArgs(tenantId, userId),
            event: "Creator1 pick",
            status: "published",
        });
        await t.mutation(api.domain.picks.create, {
            ...pickArgs(tenantId, creator2),
            event: "Creator2 pick",
            status: "published",
        });

        // Subscriber only subscribes to creator1 (userId)
        const subscriber = await t.run(async (ctx) => {
            const subId = await ctx.db.insert("users", {
                email: "subscriber@test.no",
                name: "Subscriber",
                role: "user",
                status: "active",
                tenantId,
                metadata: {},
            });
            await ctx.db.insert("tenantUsers", {
                tenantId,
                userId: subId,
                status: "active",
                joinedAt: Date.now(),
            });
            return subId;
        });

        await seedMembership(t, tenantId as string, subscriber as string, userId as string);

        const feed = await t.query(api.domain.picks.feedFollowing, {
            tenantId,
            userId: subscriber as string,
        });

        // Should only contain picks from userId, not creator2
        expect(feed.length).toBeGreaterThan(0);
        for (const pick of feed) {
            expect(pick.creatorId).toBe(userId as string);
        }
    });

    it("feedForYou gates picks for non-subscribers", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);

        await t.mutation(api.domain.picks.create, {
            ...pickArgs(tenantId, userId),
            status: "published",
        });

        const viewer = await t.run(async (ctx) => {
            const vId = await ctx.db.insert("users", {
                email: "viewer@test.no",
                name: "Viewer",
                role: "user",
                status: "active",
                tenantId,
                metadata: {},
            });
            await ctx.db.insert("tenantUsers", {
                tenantId,
                userId: vId,
                status: "active",
                joinedAt: Date.now(),
            });
            return vId;
        });

        const feed = await t.query(api.domain.picks.feedForYou, {
            tenantId,
            userId: viewer as string,
        });

        expect(feed.length).toBeGreaterThan(0);
        // Non-subscriber should see locked picks with redacted fields
        for (const pick of feed) {
            expect(pick.isUnlocked).toBe(false);
            expect(pick.selection).toBeNull();
            expect(pick.oddsAmerican).toBeNull();
            expect(pick.units).toBeNull();
            expect(pick.analysis).toBeNull();
        }
    });

    it("feedForYou unlocks picks for subscribers", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);

        await t.mutation(api.domain.picks.create, {
            ...pickArgs(tenantId, userId),
            status: "published",
        });

        const subscriber = await t.run(async (ctx) => {
            const subId = await ctx.db.insert("users", {
                email: "sub@test.no",
                name: "Sub",
                role: "user",
                status: "active",
                tenantId,
                metadata: {},
            });
            await ctx.db.insert("tenantUsers", {
                tenantId,
                userId: subId,
                status: "active",
                joinedAt: Date.now(),
            });
            return subId;
        });

        await seedMembership(t, tenantId as string, subscriber as string, userId as string);

        const feed = await t.query(api.domain.picks.feedForYou, {
            tenantId,
            userId: subscriber as string,
        });

        expect(feed.length).toBeGreaterThan(0);
        const subscribedPick = feed.find((p: any) => p.creatorId === (userId as string));
        expect(subscribedPick).toBeDefined();
        expect(subscribedPick.isUnlocked).toBe(true);
        expect(subscribedPick.selection).toBe("Lakers -3.5");
    });

    it("feedForYou unlocks own picks for creators", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);

        await t.mutation(api.domain.picks.create, {
            ...pickArgs(tenantId, userId),
            status: "published",
        });

        const feed = await t.query(api.domain.picks.feedForYou, {
            tenantId,
            userId: userId as string,
        });

        expect(feed.length).toBeGreaterThan(0);
        expect(feed[0].isUnlocked).toBe(true);
        expect(feed[0].selection).toBe("Lakers -3.5");
    });
});

// ---------------------------------------------------------------------------
// AUDIT + EVENT BUS DATA INTEGRITY
// ---------------------------------------------------------------------------

describe("security — audit and event integrity", () => {
    it("create includes tenantId and userId in audit", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);

        const { id } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));

        const auditEntries = await t.query(
            components.audit.functions.listForTenant,
            { tenantId: tenantId as string }
        );
        const entry = auditEntries.find(
            (e: any) => e.entityType === "pick" && e.entityId === id && e.action === "created"
        );

        expect(entry).toBeDefined();
        expect(entry.tenantId).toBe(tenantId as string);
        expect(entry.userId).toBe(userId as string);
    });

    it("update includes userId (callerId) in audit", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);

        const { id } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));
        await t.mutation(api.domain.picks.update, { id, callerId: userId, analysis: "Updated" });

        const auditEntries = await t.query(
            components.audit.functions.listForTenant,
            { tenantId: tenantId as string }
        );
        const entry = auditEntries.find(
            (e: any) => e.entityType === "pick" && e.action === "updated"
        );

        expect(entry).toBeDefined();
        expect(entry.userId).toBe(userId as string);
    });

    it("remove creates audit entry with event emission", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);

        const { id } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));
        await t.mutation(api.domain.picks.remove, { id, callerId: userId });

        const auditEntries = await t.query(
            components.audit.functions.listForTenant,
            { tenantId: tenantId as string }
        );
        const removeAudit = auditEntries.find(
            (e: any) => e.entityType === "pick" && e.action === "removed"
        );
        expect(removeAudit).toBeDefined();
        expect(removeAudit.userId).toBe(userId as string);
        expect(removeAudit.tenantId).toBe(tenantId as string);
    });

    it("grade includes tenantId from pick in audit", async () => {
        const t = setup();
        const { tenantId, userId } = await seedTestTenant(t);

        const { id } = await t.mutation(api.domain.picks.create, pickArgs(tenantId, userId));
        await t.mutation(api.domain.picks.grade, { id, result: "won", gradedBy: userId });

        const auditEntries = await t.query(
            components.audit.functions.listForTenant,
            { tenantId: tenantId as string }
        );
        const entry = auditEntries.find(
            (e: any) => e.entityType === "pick" && e.action === "graded"
        );
        expect(entry).toBeDefined();
        expect(entry.tenantId).toBe(tenantId as string);
        expect(entry.userId).toBe(userId as string);
    });
});
