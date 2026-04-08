/**
 * Subscriptions Component — convex-test Integration Tests
 *
 * Tests membership tiers, memberships, benefit usage, stats.
 * Run: cd convex && npx vitest --config vitest.config.ts --run components/subscriptions/__tests__/subscriptions.test.ts
 */

import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../schema";
import { modules } from "../testSetup.test-util";
import { api } from "../_generated/api";

const TENANT = "tenant-sub-001";
const TENANT_B = "tenant-sub-002";
const USER_A = "user-a";
const USER_B = "user-b";

const BASIC_BENEFIT = {
    id: "b-discount-10",
    type: "discount",
    label: "10% discount on bookings",
    config: { percent: 10 },
};

const PREMIUM_BENEFIT = {
    id: "b-early-access",
    type: "early_access",
    label: "48h early access to tickets",
    config: { hours: 48 },
};

async function createTier(
    t: ReturnType<typeof convexTest>,
    overrides: Record<string, unknown> = {}
) {
    return t.mutation(api.functions.createTier, {
        tenantId: TENANT,
        name: "Standard",
        slug: `standard-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        price: 29900,
        currency: "NOK",
        billingInterval: "yearly",
        benefits: [BASIC_BENEFIT],
        ...overrides,
    });
}

async function createMembership(
    t: ReturnType<typeof convexTest>,
    tierId: string,
    overrides: Record<string, unknown> = {}
) {
    const now = Date.now();
    return t.mutation(api.functions.createMembership, {
        tenantId: TENANT,
        userId: USER_A,
        tierId,
        startDate: now,
        endDate: now + 365 * 24 * 60 * 60 * 1000, // +1 year
        ...overrides,
    });
}

// ---------------------------------------------------------------------------
// Membership Tier CRUD
// ---------------------------------------------------------------------------

describe("subscriptions — createTier", () => {
    it("creates a tier with benefits and correct defaults", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createTier(t);
        expect(id).toBeDefined();

        const tier = (await t.run(async (ctx) =>
            ctx.db.get(id as any)
        )) as any;
        expect(tier?.name).toBe("Standard");
        expect(tier?.isActive).toBe(true);
        expect(tier?.isPublic).toBe(true);
        expect(tier?.currentMemberCount).toBe(0);
        expect(tier?.isWaitlistEnabled).toBe(false);
        expect(tier?.benefits).toHaveLength(1);
        expect(tier?.benefits[0].type).toBe("discount");
    });

    it("throws for duplicate slug within same tenant", async () => {
        const t = convexTest(schema, modules);
        const slug = "dup-tier";
        await createTier(t, { slug });
        await expect(createTier(t, { slug })).rejects.toThrow(
            "already exists"
        );
    });

    it("allows same slug in different tenants", async () => {
        const t = convexTest(schema, modules);
        const slug = "shared-tier";
        const { id: id1 } = await createTier(t, { slug });
        const { id: id2 } = await createTier(t, {
            slug,
            tenantId: TENANT_B,
        });
        expect(id1).not.toBe(id2);
    });
});

describe("subscriptions — updateTier", () => {
    it("patches tier fields", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createTier(t);

        await t.mutation(api.functions.updateTier, {
            id: id as any,
            name: "Premium",
            price: 59900,
            benefits: [BASIC_BENEFIT, PREMIUM_BENEFIT],
        });

        const tier = (await t.run(async (ctx) =>
            ctx.db.get(id as any)
        )) as any;
        expect(tier?.name).toBe("Premium");
        expect(tier?.price).toBe(59900);
        expect(tier?.benefits).toHaveLength(2);
    });

    it("throws for duplicate slug on update", async () => {
        const t = convexTest(schema, modules);
        await createTier(t, { slug: "existing-slug" });
        const { id } = await createTier(t, { slug: "other-slug" });

        await expect(
            t.mutation(api.functions.updateTier, {
                id: id as any,
                slug: "existing-slug",
            })
        ).rejects.toThrow("already exists");
    });
});

describe("subscriptions — deactivate tier (isActive=false)", () => {
    it("sets isActive to false", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createTier(t);

        await t.mutation(api.functions.updateTier, {
            id: id as any,
            isActive: false,
        });

        const tier = (await t.run(async (ctx) =>
            ctx.db.get(id as any)
        )) as any;
        expect(tier?.isActive).toBe(false);
    });
});

describe("subscriptions — listTiers", () => {
    it("lists tiers for a tenant, sorted by sortOrder", async () => {
        const t = convexTest(schema, modules);
        await createTier(t, { name: "Gold", sortOrder: 2 });
        await createTier(t, { name: "Bronze", sortOrder: 0 });
        await createTier(t, { name: "Silver", sortOrder: 1 });

        const tiers = await t.query(api.functions.listTiers, {
            tenantId: TENANT,
        });
        expect(tiers.length).toBe(3);
        expect(tiers[0].name).toBe("Bronze");
        expect(tiers[1].name).toBe("Silver");
        expect(tiers[2].name).toBe("Gold");
    });

    it("filters by activeOnly", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createTier(t, { name: "Inactive" });
        await t.mutation(api.functions.updateTier, {
            id: id as any,
            isActive: false,
        });
        await createTier(t, { name: "Active" });

        const active = await t.query(api.functions.listTiers, {
            tenantId: TENANT,
            activeOnly: true,
        });
        expect(active.length).toBe(1);
        expect(active[0].name).toBe("Active");
    });

    it("filters by publicOnly", async () => {
        const t = convexTest(schema, modules);
        await createTier(t, { name: "Public", isPublic: true });
        await createTier(t, { name: "Private", isPublic: false });

        const publicTiers = await t.query(api.functions.listTiers, {
            tenantId: TENANT,
            publicOnly: true,
        });
        expect(publicTiers.length).toBe(1);
        expect(publicTiers[0].name).toBe("Public");
    });
});

describe("subscriptions — getTier", () => {
    it("returns tier by id", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createTier(t, { name: "VIP" });

        const tier = await t.query(api.functions.getTier, { id: id as any });
        expect(tier.name).toBe("VIP");
    });
});

// ---------------------------------------------------------------------------
// Memberships
// ---------------------------------------------------------------------------

describe("subscriptions — createMembership (subscribe)", () => {
    it("creates membership with pending status by default", async () => {
        const t = convexTest(schema, modules);
        const { id: tierId } = await createTier(t);
        const { id } = await createMembership(t, tierId);

        const membership = (await t.run(async (ctx) =>
            ctx.db.get(id as any)
        )) as any;
        expect(membership?.status).toBe("pending");
        expect(membership?.autoRenew).toBe(true);
        expect(membership?.presaleAccessGranted).toBe(false);
        expect(membership?.tierId).toBe(tierId);
    });

    it("creates active membership when explicitly set", async () => {
        const t = convexTest(schema, modules);
        const { id: tierId } = await createTier(t);
        const { id } = await createMembership(t, tierId, {
            status: "active",
        });

        const membership = (await t.run(async (ctx) =>
            ctx.db.get(id as any)
        )) as any;
        expect(membership?.status).toBe("active");
    });
});

describe("subscriptions — updateMembershipStatus (cancel)", () => {
    it("cancels a membership with reason", async () => {
        const t = convexTest(schema, modules);
        const { id: tierId } = await createTier(t);
        const { id } = await createMembership(t, tierId, {
            status: "active",
        });

        const now = Date.now();
        await t.mutation(api.functions.updateMembershipStatus, {
            id: id as any,
            status: "cancelled",
            cancelledAt: now,
            cancelledBy: USER_A,
            cancelReason: "Moving away",
        });

        const membership = (await t.run(async (ctx) =>
            ctx.db.get(id as any)
        )) as any;
        expect(membership?.status).toBe("cancelled");
        expect(membership?.cancelReason).toBe("Moving away");
        expect(membership?.cancelledBy).toBe(USER_A);
    });
});

describe("subscriptions — updateMembershipStatus (pause/resume)", () => {
    it("pauses and resumes a membership", async () => {
        const t = convexTest(schema, modules);
        const { id: tierId } = await createTier(t);
        const { id } = await createMembership(t, tierId, {
            status: "active",
        });

        // Pause
        await t.mutation(api.functions.updateMembershipStatus, {
            id: id as any,
            status: "paused",
        });
        let membership = (await t.run(async (ctx) =>
            ctx.db.get(id as any)
        )) as any;
        expect(membership?.status).toBe("paused");

        // Resume
        await t.mutation(api.functions.updateMembershipStatus, {
            id: id as any,
            status: "active",
        });
        membership = (await t.run(async (ctx) =>
            ctx.db.get(id as any)
        )) as any;
        expect(membership?.status).toBe("active");
    });
});

describe("subscriptions — updateMembership (renew / upgradeTier)", () => {
    it("extends end date (renew scenario)", async () => {
        const t = convexTest(schema, modules);
        const { id: tierId } = await createTier(t);
        const now = Date.now();
        const { id } = await createMembership(t, tierId, {
            status: "active",
        });

        const newEnd = now + 2 * 365 * 24 * 60 * 60 * 1000; // +2 years
        await t.mutation(api.functions.updateMembership, {
            id: id as any,
            endDate: newEnd,
            lastPaymentDate: now,
        });

        const membership = (await t.run(async (ctx) =>
            ctx.db.get(id as any)
        )) as any;
        expect(membership?.endDate).toBe(newEnd);
        expect(membership?.lastPaymentDate).toBe(now);
    });

    it("upgrades tier (stores previousTierId)", async () => {
        const t = convexTest(schema, modules);
        const { id: basicId } = await createTier(t, { name: "Basic" });
        const { id: premiumId } = await createTier(t, { name: "Premium" });
        const { id } = await createMembership(t, basicId, {
            status: "active",
        });

        await t.mutation(api.functions.updateMembership, {
            id: id as any,
            tierId: premiumId,
            previousTierId: basicId,
        });

        const membership = (await t.run(async (ctx) =>
            ctx.db.get(id as any)
        )) as any;
        expect(membership?.tierId).toBe(premiumId);
        expect(membership?.previousTierId).toBe(basicId);
    });
});

describe("subscriptions — updateTierMemberCount", () => {
    it("increments member count", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createTier(t);

        await t.mutation(api.functions.updateTierMemberCount, {
            id: id as any,
            delta: 1,
        });
        await t.mutation(api.functions.updateTierMemberCount, {
            id: id as any,
            delta: 1,
        });

        const tier = (await t.run(async (ctx) =>
            ctx.db.get(id as any)
        )) as any;
        expect(tier?.currentMemberCount).toBe(2);
    });

    it("does not go below zero", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createTier(t);

        await t.mutation(api.functions.updateTierMemberCount, {
            id: id as any,
            delta: -5,
        });

        const tier = (await t.run(async (ctx) =>
            ctx.db.get(id as any)
        )) as any;
        expect(tier?.currentMemberCount).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// Benefit Usage
// ---------------------------------------------------------------------------

describe("subscriptions — createBenefitUsage / listBenefitUsage", () => {
    it("records benefit usage and lists it", async () => {
        const t = convexTest(schema, modules);
        const { id: tierId } = await createTier(t);
        const { id: membershipId } = await createMembership(t, tierId, {
            status: "active",
        });

        const now = Date.now();
        await t.mutation(api.functions.createBenefitUsage, {
            tenantId: TENANT,
            membershipId,
            benefitId: BASIC_BENEFIT.id,
            benefitType: "discount",
            usedAt: now,
            discountAmount: 5000,
            description: "Applied 10% on booking",
        });

        const usage = await t.query(api.functions.listBenefitUsage, {
            membershipId,
        });
        expect(usage.length).toBe(1);
        expect(usage[0].benefitType).toBe("discount");
        expect(usage[0].discountAmount).toBe(5000);
    });

    it("filters by benefitType", async () => {
        const t = convexTest(schema, modules);
        const { id: tierId } = await createTier(t);
        const { id: membershipId } = await createMembership(t, tierId);
        const now = Date.now();

        await t.mutation(api.functions.createBenefitUsage, {
            tenantId: TENANT,
            membershipId,
            benefitId: "b-1",
            benefitType: "discount",
            usedAt: now,
        });
        await t.mutation(api.functions.createBenefitUsage, {
            tenantId: TENANT,
            membershipId,
            benefitId: "b-2",
            benefitType: "early_access",
            usedAt: now,
        });

        const discounts = await t.query(api.functions.listBenefitUsage, {
            membershipId,
            benefitType: "discount",
        });
        expect(discounts.length).toBe(1);
    });
});

describe("subscriptions — countBenefitUsage", () => {
    it("counts uses of a specific benefit", async () => {
        const t = convexTest(schema, modules);
        const { id: tierId } = await createTier(t);
        const { id: membershipId } = await createMembership(t, tierId);
        const now = Date.now();

        for (let i = 0; i < 3; i++) {
            await t.mutation(api.functions.createBenefitUsage, {
                tenantId: TENANT,
                membershipId,
                benefitId: BASIC_BENEFIT.id,
                benefitType: "discount",
                usedAt: now + i,
            });
        }

        const count = await t.query(api.functions.countBenefitUsage, {
            membershipId,
            benefitId: BASIC_BENEFIT.id,
        });
        expect(count).toBe(3);
    });
});

// ---------------------------------------------------------------------------
// List Members & Stats
// ---------------------------------------------------------------------------

describe("subscriptions — listMemberships", () => {
    it("lists memberships for a tenant, filters by status", async () => {
        const t = convexTest(schema, modules);
        const { id: tierId } = await createTier(t);
        await createMembership(t, tierId, {
            userId: USER_A,
            status: "active",
        });
        await createMembership(t, tierId, {
            userId: USER_B,
            status: "cancelled",
        });

        const active = await t.query(api.functions.listMemberships, {
            tenantId: TENANT,
            status: "active",
        });
        expect(active.length).toBe(1);

        const all = await t.query(api.functions.listMemberships, {
            tenantId: TENANT,
        });
        expect(all.length).toBe(2);
    });

    it("filters by tierId", async () => {
        const t = convexTest(schema, modules);
        const { id: tier1 } = await createTier(t, { name: "T1" });
        const { id: tier2 } = await createTier(t, { name: "T2" });
        await createMembership(t, tier1, { userId: USER_A });
        await createMembership(t, tier2, { userId: USER_B });

        const t1Members = await t.query(api.functions.listMemberships, {
            tenantId: TENANT,
            tierId: tier1,
        });
        expect(t1Members.length).toBe(1);
    });
});

describe("subscriptions — getMembershipStats", () => {
    it("returns aggregate stats by status and tier", async () => {
        const t = convexTest(schema, modules);
        const { id: tier1 } = await createTier(t, { name: "Basic" });
        const { id: tier2 } = await createTier(t, { name: "Premium" });

        await createMembership(t, tier1, {
            userId: USER_A,
            status: "active",
        });
        await createMembership(t, tier1, {
            userId: USER_B,
            status: "active",
        });
        await createMembership(t, tier2, {
            userId: "user-c",
            status: "cancelled",
        });

        const stats = await t.query(api.functions.getMembershipStats, {
            tenantId: TENANT,
        });
        expect(stats.total).toBe(3);
        expect(stats.byStatus.active).toBe(2);
        expect(stats.byStatus.cancelled).toBe(1);
        expect(stats.byTier[tier1]).toBe(2);
        expect(stats.byTier[tier2]).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// getMembershipByUser
// ---------------------------------------------------------------------------

describe("subscriptions — getMembershipByUser", () => {
    it("returns active membership for a user", async () => {
        const t = convexTest(schema, modules);
        const { id: tierId } = await createTier(t);
        await createMembership(t, tierId, {
            userId: USER_A,
            status: "active",
        });

        const membership = await t.query(api.functions.getMembershipByUser, {
            userId: USER_A,
        });
        expect(membership).not.toBeNull();
        expect(membership?.status).toBe("active");
    });

    it("returns null when user has no membership", async () => {
        const t = convexTest(schema, modules);
        const membership = await t.query(api.functions.getMembershipByUser, {
            userId: "nonexistent-user",
        });
        expect(membership).toBeNull();
    });

    it("returns trialing membership with correct priority", async () => {
        const t = convexTest(schema, modules);
        const { id: tierId } = await createTier(t);
        await createMembership(t, tierId, {
            userId: USER_A,
            status: "trialing",
            trialStartDate: Date.now(),
            trialEndDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
        });

        const membership = await t.query(api.functions.getMembershipByUser, {
            userId: USER_A,
        });
        expect(membership).not.toBeNull();
        expect(membership?.status).toBe("trialing");
    });
});

// ---------------------------------------------------------------------------
// Free Trial
// ---------------------------------------------------------------------------

describe("subscriptions — free trial", () => {
    it("creates membership with trialing status and trial dates", async () => {
        const t = convexTest(schema, modules);
        const { id: tierId } = await createTier(t, { trialDays: 7 });

        const now = Date.now();
        const trialEnd = now + 7 * 24 * 60 * 60 * 1000;
        const { id } = await createMembership(t, tierId, {
            status: "trialing",
            trialStartDate: now,
            trialEndDate: trialEnd,
        });

        const membership = (await t.run(async (ctx) =>
            ctx.db.get(id as any)
        )) as any;
        expect(membership?.status).toBe("trialing");
        expect(membership?.trialStartDate).toBe(now);
        expect(membership?.trialEndDate).toBe(trialEnd);
        expect(membership?.convertedFromTrial).toBe(false);
    });

    it("creates tier with trialDays", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createTier(t, { trialDays: 14 });

        const tier = (await t.run(async (ctx) =>
            ctx.db.get(id as any)
        )) as any;
        expect(tier?.trialDays).toBe(14);
    });

    it("updates tier trialDays", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createTier(t);

        await t.mutation(api.functions.updateTier, {
            id: id as any,
            trialDays: 7,
        });

        const tier = (await t.run(async (ctx) =>
            ctx.db.get(id as any)
        )) as any;
        expect(tier?.trialDays).toBe(7);
    });

    it("getUserCreatorSubscription includes trialing memberships", async () => {
        const t = convexTest(schema, modules);
        const { id: tierId } = await createTier(t);
        const creatorId = "creator-001";

        await createMembership(t, tierId, {
            userId: USER_A,
            creatorId,
            status: "trialing",
            trialStartDate: Date.now(),
            trialEndDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
        });

        const sub = await t.query(api.functions.getUserCreatorSubscription, {
            userId: USER_A,
            creatorId,
        });
        expect(sub).not.toBeNull();
        expect(sub?.status).toBe("trialing");
    });

    it("getTrialStatus returns trial metadata", async () => {
        const t = convexTest(schema, modules);
        const { id: tierId } = await createTier(t);
        const creatorId = "creator-002";
        const now = Date.now();
        const trialEnd = now + 5 * 24 * 60 * 60 * 1000;

        await createMembership(t, tierId, {
            userId: USER_A,
            creatorId,
            status: "trialing",
            trialStartDate: now,
            trialEndDate: trialEnd,
        });

        const trial = await t.query(api.functions.getTrialStatus, {
            userId: USER_A,
            creatorId,
        });
        expect(trial).not.toBeNull();
        expect(trial?.isTrialing).toBe(true);
        expect(trial?.trialStartDate).toBe(now);
        expect(trial?.trialEndDate).toBe(trialEnd);
        expect(trial?.trialDaysRemaining).toBeGreaterThanOrEqual(4);
        expect(trial?.convertedFromTrial).toBe(false);
    });

    it("getTrialStatus returns non-trialing for active membership", async () => {
        const t = convexTest(schema, modules);
        const { id: tierId } = await createTier(t);
        const creatorId = "creator-003";

        await createMembership(t, tierId, {
            userId: USER_A,
            creatorId,
            status: "active",
        });

        const trial = await t.query(api.functions.getTrialStatus, {
            userId: USER_A,
            creatorId,
        });
        expect(trial).not.toBeNull();
        expect(trial?.isTrialing).toBe(false);
        expect(trial?.trialDaysRemaining).toBe(0);
    });

    it("getTrialStatus returns null when no subscription", async () => {
        const t = convexTest(schema, modules);
        const trial = await t.query(api.functions.getTrialStatus, {
            userId: "no-one",
            creatorId: "no-creator",
        });
        expect(trial).toBeNull();
    });

    it("listExpiringTrials finds trials past their end date", async () => {
        const t = convexTest(schema, modules);
        const { id: tierId } = await createTier(t);
        const now = Date.now();

        // Expired trial
        await createMembership(t, tierId, {
            userId: USER_A,
            status: "trialing",
            trialStartDate: now - 8 * 24 * 60 * 60 * 1000,
            trialEndDate: now - 1 * 24 * 60 * 60 * 1000,
        });

        // Active trial (not expired)
        await createMembership(t, tierId, {
            userId: USER_B,
            status: "trialing",
            trialStartDate: now,
            trialEndDate: now + 7 * 24 * 60 * 60 * 1000,
        });

        const expired = await t.query(api.functions.listExpiringTrials, {
            beforeDate: now,
        });
        expect(expired.length).toBe(1);
        expect(expired[0].userId).toBe(USER_A);
    });

    it("tracks convertedFromTrial via updateMembership", async () => {
        const t = convexTest(schema, modules);
        const { id: tierId } = await createTier(t);
        const { id } = await createMembership(t, tierId, {
            status: "trialing",
            trialStartDate: Date.now(),
            trialEndDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
        });

        // Simulate trial-to-paid conversion
        await t.mutation(api.functions.updateMembershipStatus, {
            id: id as any,
            status: "active",
        });
        await t.mutation(api.functions.updateMembership, {
            id: id as any,
            convertedFromTrial: true,
        });

        const membership = (await t.run(async (ctx) =>
            ctx.db.get(id as any)
        )) as any;
        expect(membership?.status).toBe("active");
        expect(membership?.convertedFromTrial).toBe(true);
    });
});
