/**
 * Creator User Journey — End-to-End Integration Tests
 *
 * These tests simulate COMPLETE user journeys through the multi-tenant
 * system, testing the full sequence a real user would go through.
 *
 * Journey 1: "New User Becomes Creator"
 *   Signup → checkEmail → create user → create tenant → verify role upgrade
 *   → verify tenant in admin view → verify creator's tenants list
 *
 * Journey 2: "Creator Manages Listing Lifecycle"
 *   Creator creates resource → submits for review → (auto-approve path) →
 *   listing published → creator pauses → resumes → listing expires (simulated)
 *   → creator renews
 *
 * Journey 3: "Manual Moderation Flow"
 *   Creator submits listing → super admin sees it in queue → rejecting it →
 *   creator fixes and resubmits → super admin approves → listing published
 *
 * Journey 4: "Subscriber Reports a Listing"
 *   Subscriber reports listing → admin reviews report queue → admin resolves report
 *
 * Journey 5: "Multi-Creator Platform Growth"
 *   Two creators create tenants → platform admin sees both → stats reflect
 *   correct counts → each creator only sees their own tenants
 */

import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import { api, components } from "../../_generated/api";
import {
    createDomainTest,
} from "./testHelper.test-util";

// =============================================================================
// HELPERS
// =============================================================================

function createJourneyTest() {
    return createDomainTest(["audit", "resources", "tenantConfig"]);
}

/**
 * Create a fresh user directly in the DB (simulates what signUp does).
 */
async function createUser(
    t: ReturnType<typeof convexTest>,
    overrides: Partial<{ email: string; name: string; role: string }> = {}
) {
    return t.run(async (ctx) => {
        return await ctx.db.insert("users", {
            email: overrides.email ?? "user@test.no",
            name: overrides.name ?? "Test User",
            role: overrides.role ?? "user",
            status: "active",
            metadata: {},
        });
    });
}

/**
 * Create a resource in the resources component (simulates a listing).
 */
async function createResource(
    t: ReturnType<typeof convexTest>,
    tenantId: string,
    overrides: Partial<{
        name: string;
        slug: string;
        categoryKey: string;
        status: string;
    }> = {}
) {
    return (t as any).mutation(components.resources.mutations.create, {
        tenantId,
        name: overrides.name ?? "Test Listing",
        slug: overrides.slug ?? "test-listing",
        categoryKey: overrides.categoryKey ?? "lokale",
        status: overrides.status ?? "draft",
    });
}

// =============================================================================
// JOURNEY 1: New User Becomes Creator
// =============================================================================

describe("journey/new-user-becomes-creator", () => {
    it("complete flow: signup → tenant creation → role upgrade → admin visibility", async () => {
        const t = createJourneyTest();

        // ── Step 1: Check email is available ────────────────────────────
        const emailCheck = await t.query(api.auth.signup.checkEmailAvailable, {
            email: "erik@kulturhuset.no",
        });
        expect(emailCheck.available).toBe(true);

        // ── Step 2: Create user (simulating signup) ─────────────────────
        const userId = await createUser(t, {
            email: "erik@kulturhuset.no",
            name: "Erik Johansen",
        });

        // Verify: user starts as "user" role
        const userBefore = await t.run(async (ctx) => ctx.db.get(userId));
        expect(userBefore?.role).toBe("user");
        expect(userBefore?.tenantId).toBeUndefined();

        // ── Step 3: Check slug availability ─────────────────────────────
        const slugCheck = await t.query(
            api.domain.tenantOnboarding.checkSlugAvailable,
            { slug: "kulturhuset-oslo" }
        );
        expect(slugCheck.available).toBe(true);

        // ── Step 4: Create tenant ───────────────────────────────────────
        const createResult = await t.mutation(
            api.domain.tenantOnboarding.createTenantForOwner,
            {
                userId,
                name: "Kulturhuset Oslo",
                slug: "kulturhuset-oslo",
            }
        );
        expect(createResult.success).toBe(true);
        const tenantId = createResult.tenantId!;

        // ── Step 5: Verify role upgrade ─────────────────────────────────
        const userAfter = await t.run(async (ctx) => ctx.db.get(userId));
        expect(userAfter?.role).toBe("creator");
        expect(userAfter?.tenantId).toBe(tenantId);

        // ── Step 6: Verify slug is now taken ────────────────────────────
        const slugRechk = await t.query(
            api.domain.tenantOnboarding.checkSlugAvailable,
            { slug: "kulturhuset-oslo" }
        );
        expect(slugRechk.available).toBe(false);

        // ── Step 7: Creator can see their tenant ─────────────────────────
        const myTenants = await t.query(
            api.domain.tenantOnboarding.listMyTenants,
            { userId }
        );
        expect(myTenants.length).toBe(1);
        expect(myTenants[0].name).toBe("Kulturhuset Oslo");
        expect(myTenants[0].isOwner).toBe(true);

        // ── Step 8: Platform admin sees the new tenant ──────────────────
        const allTenants = await t.query(
            api.domain.tenantOnboarding.listAllTenants,
            {}
        );
        const newTenant = allTenants.find(
            (t: any) => t.slug === "kulturhuset-oslo"
        );
        expect(newTenant).toBeDefined();
        expect(newTenant!.ownerName).toBe("Erik Johansen");
        expect(newTenant!.ownerEmail).toBe("erik@kulturhuset.no");

        // ── Step 9: Platform stats updated ──────────────────────────────
        const stats = await t.query(api.domain.platformAdmin.platformStats);
        expect(stats.tenants.total).toBe(1);
        expect(stats.tenants.active).toBe(1);
        expect(stats.users.total).toBe(1);
        expect(stats.users.creators).toBe(1);
    });
});

// =============================================================================
// JOURNEY 2: Creator Manages Listing Lifecycle
// =============================================================================

describe("journey/creator-listing-lifecycle", () => {
    it("auto-approve path: create → submit → auto-approve → pause → resume → renew", async () => {
        const t = createJourneyTest();

        // ── Setup: Create creator with tenant ────────────────────────────
        const creatorId = await createUser(t, {
            email: "venue@digipicks.test",
            name: "Venue Creator",
        });
        const { tenantId } = await t.mutation(
            api.domain.tenantOnboarding.createTenantForOwner,
            { userId: creatorId, name: "Test Venue", slug: "test-venue" }
        );

        // ── Step 1: Create a resource (listing in draft) ────────────────
        const resource = await createResource(t, tenantId! as string, {
            name: "Storsal A",
            slug: "storsal-a",
            categoryKey: "utstyr", // Low-risk → auto-approve
        });
        expect(resource.id).toBeDefined();

        // ── Step 2: Submit for review ───────────────────────────────────
        const submitResult = await t.mutation(
            api.domain.listingModeration.submitForReview,
            { resourceId: resource.id, tenantId: tenantId! as string }
        );
        expect(submitResult.success).toBe(true);
        expect(submitResult.autoApproved).toBe(true); // Low-risk category

        // ── Step 3: Creator pauses the listing ───────────────────────────
        const pauseResult = await t.mutation(
            api.domain.listingModeration.pauseListing,
            { resourceId: resource.id, tenantId: tenantId! as string }
        );
        expect(pauseResult.success).toBe(true);

        // ── Step 4: Creator resumes the listing ──────────────────────────
        const resumeResult = await t.mutation(
            api.domain.listingModeration.resumeListing,
            { resourceId: resource.id, tenantId: tenantId! as string }
        );
        expect(resumeResult.success).toBe(true);

        // ── Step 5: Creator renews the listing ───────────────────────────
        const renewResult = await t.mutation(
            api.domain.listingModeration.renewListing,
            { resourceId: resource.id, tenantId: tenantId! as string }
        );
        expect(renewResult.success).toBe(true);
        expect(renewResult.renewCount).toBe(1);

        // ── Step 6: Renew again and verify count ────────────────────────
        const renewResult2 = await t.mutation(
            api.domain.listingModeration.renewListing,
            { resourceId: resource.id, tenantId: tenantId! as string }
        );
        expect(renewResult2.renewCount).toBe(2);
    });

    it("manual-review path: submit → admin approve → published", async () => {
        const t = createJourneyTest();

        // ── Setup ───────────────────────────────────────────────────────
        const creatorId = await createUser(t, {
            email: "creator@venue.digipicks.test",
            name: "Venue Creator",
        });
        const { tenantId } = await t.mutation(
            api.domain.tenantOnboarding.createTenantForOwner,
            { userId: creatorId, name: "My Venue", slug: "my-venue" }
        );

        const superAdminId = await createUser(t, {
            email: "admin@digipicks.test",
            name: "Super Admin",
            role: "super_admin",
        });

        // ── Step 1: Create high-risk listing that requires manual review──
        const resource = await createResource(t, tenantId! as string, {
            name: "Premium Event Hall",
            slug: "premium-event-hall",
            categoryKey: "eiendom", // NOT in auto-approve set
        });

        // ── Step 2: Submit for review ───────────────────────────────────
        const submitResult = await t.mutation(
            api.domain.listingModeration.submitForReview,
            { resourceId: resource.id, tenantId: tenantId! as string }
        );
        expect(submitResult.success).toBe(true);
        expect(submitResult.autoApproved).toBe(false); // High-risk

        // ── Step 3: Super admin approves ────────────────────────────────
        const approveResult = await t.mutation(
            api.domain.listingModeration.approveListing,
            {
                resourceId: resource.id,
                tenantId: tenantId! as string,
                moderatorId: superAdminId as string,
                note: "All documents verified",
            }
        );
        expect(approveResult.success).toBe(true);
    });
});

// =============================================================================
// JOURNEY 3: Moderation Rejection & Resubmission
// =============================================================================

describe("journey/moderation-rejection-resubmission", () => {
    it("submit → reject → request changes → resubmit → approve", async () => {
        const t = createJourneyTest();

        // ── Setup ───────────────────────────────────────────────────────
        const creatorId = await createUser(t, {
            email: "creator@hall.digipicks.test",
            name: "Hall Creator",
        });
        const { tenantId } = await t.mutation(
            api.domain.tenantOnboarding.createTenantForOwner,
            { userId: creatorId, name: "The Hall", slug: "the-hall" }
        );

        const adminId = await createUser(t, {
            email: "mod@digipicks.test",
            name: "Moderator",
            role: "super_admin",
        });

        const resource = await createResource(t, tenantId! as string, {
            name: "Conference Room B",
            slug: "conf-room-b",
            categoryKey: "eiendom",
        });

        // ── Step 1: Creator submits ──────────────────────────────────────
        const submit1 = await t.mutation(
            api.domain.listingModeration.submitForReview,
            { resourceId: resource.id, tenantId: tenantId! as string }
        );
        expect(submit1.success).toBe(true);
        expect(submit1.autoApproved).toBe(false);

        // ── Step 2: Admin requests changes ──────────────────────────────
        const changeResult = await t.mutation(
            api.domain.listingModeration.requestChanges,
            {
                resourceId: resource.id,
                tenantId: tenantId! as string,
                moderatorId: adminId as string,
                note: "Please add floor plan images",
            }
        );
        expect(changeResult.success).toBe(true);

        // ── Step 3: Creator "fixes" listing and resubmits ────────────────
        const submit2 = await t.mutation(
            api.domain.listingModeration.submitForReview,
            { resourceId: resource.id, tenantId: tenantId! as string }
        );
        expect(submit2.success).toBe(true);

        // ── Step 4: Admin approves this time ────────────────────────────
        const approveResult = await t.mutation(
            api.domain.listingModeration.approveListing,
            {
                resourceId: resource.id,
                tenantId: tenantId! as string,
                moderatorId: adminId as string,
                note: "Floor plan looks good",
            }
        );
        expect(approveResult.success).toBe(true);
    });

    it("submit → reject outright", async () => {
        const t = createJourneyTest();

        const creatorId = await createUser(t, {
            email: "suspicious@digipicks.test",
            name: "Suspicious User",
        });
        const { tenantId } = await t.mutation(
            api.domain.tenantOnboarding.createTenantForOwner,
            { userId: creatorId, name: "Unknown Venue", slug: "unknown-venue" }
        );

        const adminId = await createUser(t, {
            email: "admin@platform.digipicks.test",
            name: "Admin",
            role: "super_admin",
        });

        const resource = await createResource(t, tenantId! as string, {
            name: "Suspicious Listing",
            slug: "suspicious",
            categoryKey: "eiendom",
        });

        // Submit
        await t.mutation(api.domain.listingModeration.submitForReview, {
            resourceId: resource.id,
            tenantId: tenantId! as string,
        });

        // Reject
        const rejectResult = await t.mutation(
            api.domain.listingModeration.rejectListing,
            {
                resourceId: resource.id,
                tenantId: tenantId! as string,
                moderatorId: adminId as string,
                note: "Content violates terms of service",
            }
        );
        expect(rejectResult.success).toBe(true);
    });
});

// =============================================================================
// JOURNEY 4: User Reports a Listing
// =============================================================================

describe("journey/user-reports-listing", () => {
    it("user reports → admin sees reports → admin resolves", async () => {
        const t = createJourneyTest();

        // ── Setup: Creator creates listing, a subscriber reports it ─────
        const creatorId = await createUser(t, {
            email: "creator@venue.digipicks.test",
            name: "Venue Creator",
        });
        const { tenantId } = await t.mutation(
            api.domain.tenantOnboarding.createTenantForOwner,
            { userId: creatorId, name: "Nice Venue", slug: "nice-venue" }
        );

        const resource = await createResource(t, tenantId! as string, {
            name: "Great Hall",
            slug: "great-hall",
            categoryKey: "utstyr",
        });

        const reporterId = await createUser(t, {
            email: "reporter@digipicks.test",
            name: "Concerned Subscriber",
        });

        const adminId = await createUser(t, {
            email: "admin@digipicks.test",
            name: "Admin",
            role: "super_admin",
        });

        // ── Step 1: User reports the listing ────────────────────────────
        const reportResult = await t.mutation(
            api.domain.listingReports.reportListing,
            {
                resourceId: resource.id,
                tenantId: tenantId! as string,
                reporterId: reporterId as string,
                reason: "misleading",
                details: "Images don't match the actual venue",
            }
        );
        expect(reportResult.success).toBe(true);

        // ── Step 2: Admin views reports ─────────────────────────────────
        const reports = await t.query(
            api.domain.listingReports.listReports,
            { status: "pending" }
        );
        expect(reports).toBeDefined();
        // Should have at least one report
        const ourReport = reports.find(
            (r: any) => r.reason === "misleading"
        );
        expect(ourReport).toBeDefined();

        // ── Step 3: Admin resolves the report ───────────────────────────
        if (ourReport) {
            const resolveResult = await t.mutation(
                api.domain.listingReports.resolveReport,
                {
                    reportId: ourReport.id,
                    resolution: "user_warned",
                    adminId: adminId as string,
                    note: "Creator warned to update images",
                }
            );
            expect(resolveResult.success).toBe(true);
        }
    });
});

// =============================================================================
// JOURNEY 5: Multi-Creator Platform Growth
// =============================================================================

describe("journey/multi-creator-platform-growth", () => {
    it("two creators create tenants → platform admin sees correct aggregates", async () => {
        const t = createJourneyTest();

        // ── Super Admin already exists ──────────────────────────────────
        const superAdminId = await createUser(t, {
            email: "super@test.example.com",
            name: "Platform Admin",
            role: "super_admin",
        });

        // ── Creator 1: Kulturhuset ───────────────────────────────────────
        const creator1Id = await createUser(t, {
            email: "erik@kulturhuset.digipicks.test",
            name: "Erik Johansen",
        });
        const tenant1 = await t.mutation(
            api.domain.tenantOnboarding.createTenantForOwner,
            { userId: creator1Id, name: "Kulturhuset", slug: "kulturhuset" }
        );
        expect(tenant1.success).toBe(true);

        // ── Creator 2: Festlokalet ──────────────────────────────────────
        const creator2Id = await createUser(t, {
            email: "anna@festlokalet.digipicks.test",
            name: "Anna Svendsen",
        });
        const tenant2 = await t.mutation(
            api.domain.tenantOnboarding.createTenantForOwner,
            { userId: creator2Id, name: "Festlokalet", slug: "festlokalet" }
        );
        expect(tenant2.success).toBe(true);

        // ── Verify platform-wide stats ──────────────────────────────────
        const stats = await t.query(api.domain.platformAdmin.platformStats);
        expect(stats.tenants.total).toBe(2);
        expect(stats.tenants.active).toBe(2);
        expect(stats.users.total).toBe(3); // super admin + 2 creators
        expect(stats.users.creators).toBe(2);

        // ── Each creator sees only their tenant ─────────────────────────
        const creator1Tenants = await t.query(
            api.domain.tenantOnboarding.listMyTenants,
            { userId: creator1Id }
        );
        expect(creator1Tenants.length).toBe(1);
        expect(creator1Tenants[0].name).toBe("Kulturhuset");

        const creator2Tenants = await t.query(
            api.domain.tenantOnboarding.listMyTenants,
            { userId: creator2Id }
        );
        expect(creator2Tenants.length).toBe(1);
        expect(creator2Tenants[0].name).toBe("Festlokalet");

        // ── Platform admin sees all ─────────────────────────────────────
        const allTenants = await t.query(
            api.domain.tenantOnboarding.listAllTenants,
            {}
        );
        expect(allTenants.length).toBe(2);

        const allUsers = await t.query(
            api.domain.platformAdmin.listAllUsers,
            {}
        );
        expect(allUsers.length).toBe(3);

        // ── Creator 1 creates a listing, Creator 2 cannot see it ────────
        await createResource(t, tenant1.tenantId! as string, {
            name: "Storsal A",
            slug: "storsal-a",
        });

        // Creator 2's tenant listings should be empty
        const creator2Listings = await t.query(
            api.domain.listingModeration.listByTenantAndStatus,
            { tenantId: tenant2.tenantId! as string }
        );
        expect(creator2Listings.length).toBe(0);
    });
});

// =============================================================================
// JOURNEY 6: Onboarding Progress Tracking
// =============================================================================

describe("journey/onboarding-progress", () => {
    it("tracks tenant onboarding steps", async () => {
        const t = createJourneyTest();

        // ── Create creator + tenant ──────────────────────────────────────
        const creatorId = await createUser(t, {
            email: "new@venue.digipicks.test",
            name: "New Creator",
        });
        const { tenantId } = await t.mutation(
            api.domain.tenantOnboarding.createTenantForOwner,
            { userId: creatorId, name: "Fresh Venue", slug: "fresh-venue" }
        );

        // ── Step 1: Initially at "tenant_created" ───────────────────────
        const tenants = await t.query(
            api.domain.tenantOnboarding.listAllTenants,
            {}
        );
        const freshTenant = tenants.find((t: any) => t.slug === "fresh-venue");
        expect(freshTenant?.onboardingStep).toBe("tenant_created");

        // ── Step 2: Update to "first_listing_created" ───────────────────
        await t.mutation(api.domain.tenantOnboarding.updateOnboardingStep, {
            tenantId: tenantId!,
            step: "first_listing_created",
        });

        // ── Step 3: Update to "onboarding_complete" ─────────────────────
        await t.mutation(api.domain.tenantOnboarding.updateOnboardingStep, {
            tenantId: tenantId!,
            step: "onboarding_complete",
        });

        // ── Verify final state ──────────────────────────────────────────
        const updated = await t.query(
            api.domain.tenantOnboarding.listAllTenants,
            {}
        );
        const completedTenant = updated.find(
            (t: any) => t.slug === "fresh-venue"
        );
        expect(completedTenant?.onboardingStep).toBe("onboarding_complete");
    });
});

// =============================================================================
// JOURNEY 7: Creator Payout Flow
// =============================================================================

describe("journey/creator-payout-flow", () => {
    it("add bank account → request payout → verify balance", async () => {
        const t = createJourneyTest();

        // ── Setup: Create creator with tenant ────────────────────────────
        const creatorId = await createUser(t, {
            email: "payout-creator@venue.digipicks.test",
            name: "Payout Creator",
        });
        const { tenantId } = await t.mutation(
            api.domain.tenantOnboarding.createTenantForOwner,
            { userId: creatorId, name: "Payout Venue", slug: "payout-venue" }
        );

        // ── Step 1: No bank accounts initially ──────────────────────────
        const initialAccounts = await t.query(
            api.domain.payouts.listBankAccounts,
            { tenantId: tenantId! }
        );
        expect(initialAccounts.length).toBe(0);

        // ── Step 2: Add a bank account ──────────────────────────────────
        const addResult = await t.mutation(
            api.domain.payouts.addBankAccount,
            {
                tenantId: tenantId!,
                accountNumber: "1234.56.78901",
                accountName: "Payout Creator",
                isDefault: true,
            }
        );
        expect(addResult.success).toBe(true);

        // ── Step 3: Verify bank account exists ──────────────────────────
        const accounts = await t.query(
            api.domain.payouts.listBankAccounts,
            { tenantId: tenantId! }
        );
        expect(accounts.length).toBe(1);
        expect(accounts[0].accountNumber).toBe("1234.56.78901");
        expect(accounts[0].isDefault).toBe(true);

        // ── Step 4: Check initial balance ───────────────────────────────
        const balance = await t.query(
            api.domain.payouts.getBalance,
            { tenantId: tenantId! }
        );
        expect(balance.totalPaidOut).toBe(0);
        expect(balance.totalPending).toBe(0);
        expect(balance.currency).toBe("NOK");

        // ── Step 5: Request a payout ────────────────────────────────────
        const payoutResult = await t.mutation(
            api.domain.payouts.requestPayout,
            {
                tenantId: tenantId!,
                amount: 5000,
                bankAccountId: accounts[0]._id,
                requestedBy: creatorId,
            }
        );
        expect(payoutResult.success).toBe(true);

        // ── Step 6: Verify payout appears in list ───────────────────────
        const payouts = await t.query(
            api.domain.payouts.list,
            { tenantId: tenantId!, limit: 10 }
        );
        expect(payouts.length).toBe(1);
        expect(payouts[0].amount).toBe(5000);
        expect(payouts[0].status).toBe("pending");

        // ── Step 7: Check balance reflects pending payout ───────────────
        const updatedBalance = await t.query(
            api.domain.payouts.getBalance,
            { tenantId: tenantId! }
        );
        expect(updatedBalance.totalPending).toBe(5000);

        // ── Step 8: Add second bank account ─────────────────────────────
        await t.mutation(api.domain.payouts.addBankAccount, {
            tenantId: tenantId!,
            accountNumber: "9876.54.32100",
            accountName: "Savings Account",
            isDefault: false,
        });

        const allAccounts = await t.query(
            api.domain.payouts.listBankAccounts,
            { tenantId: tenantId! }
        );
        expect(allAccounts.length).toBe(2);

        // ── Step 9: Remove second bank account ──────────────────────────
        const secondAccount = allAccounts.find(
            (a: any) => a.accountNumber === "9876.54.32100"
        );
        if (secondAccount) {
            const removeResult = await t.mutation(
                api.domain.payouts.removeBankAccount,
                { id: secondAccount._id }
            );
            expect(removeResult.success).toBe(true);
        }

        const finalAccounts = await t.query(
            api.domain.payouts.listBankAccounts,
            { tenantId: tenantId! }
        );
        expect(finalAccounts.length).toBe(1);
    });
});

// =============================================================================
// JOURNEY 8: License Lifecycle
// =============================================================================

describe("journey/license-lifecycle", () => {
    it("activate trial → check status → record billing", async () => {
        const t = createJourneyTest();

        // ── Setup: Create creator with tenant ────────────────────────────
        const creatorId = await createUser(t, {
            email: "license-creator@venue.digipicks.test",
            name: "License Creator",
        });
        const { tenantId } = await t.mutation(
            api.domain.tenantOnboarding.createTenantForOwner,
            { userId: creatorId, name: "License Venue", slug: "license-venue" }
        );

        // ── Step 1: Check initial license status ────────────────────────
        const initialStatus = await t.query(
            api.domain.licensing.getStatus,
            { tenantId: tenantId! }
        );
        expect(initialStatus!.licenseStatus).toBe("active");
        expect(initialStatus!.isInTrial).toBe(false);
        expect(initialStatus!.activeCount).toBe(0);
        expect(initialStatus!.pricePerObject).toBe(100); // Default

        // ── Step 2: Activate trial ──────────────────────────────────────
        const trialResult = await t.mutation(
            api.domain.licensing.activateTrial,
            { tenantId: tenantId! }
        );
        expect(trialResult.success).toBe(true);

        // ── Step 3: Verify trial is active ──────────────────────────────
        const trialStatus = await t.query(
            api.domain.licensing.getStatus,
            { tenantId: tenantId! }
        );
        expect(trialStatus!.licenseStatus).toBe("trial");
        expect(trialStatus!.isInTrial).toBe(true);
        expect(trialStatus!.trialDaysRemaining).toBeGreaterThan(0);
        expect(trialStatus!.trialDaysRemaining).toBeLessThanOrEqual(30);

        // ── Step 4: No billing history yet ──────────────────────────────
        const initialBilling = await t.query(
            api.domain.licensing.listBillingHistory,
            { tenantId: tenantId!, limit: 10 }
        );
        expect(initialBilling.length).toBe(0);

        // ── Step 5: Record a billing entry ──────────────────────────────
        const billingResult = await t.mutation(
            api.domain.licensing.recordBilling,
            {
                tenantId: tenantId!,
                objectCount: 3,
                amount: 300,
                period: "2026-03",
            }
        );
        expect(billingResult.success).toBe(true);

        // ── Step 6: Verify billing appears in history ───────────────────
        const billingHistory = await t.query(
            api.domain.licensing.listBillingHistory,
            { tenantId: tenantId!, limit: 10 }
        );
        expect(billingHistory.length).toBe(1);
        expect(billingHistory[0].period).toBe("2026-03");
        expect(billingHistory[0].amount).toBe(300);
        expect(billingHistory[0].objectCount).toBe(3);
        expect(billingHistory[0].status).toBe("pending");

        // ── Step 7: Mark billing as paid ────────────────────────────────
        const updateResult = await t.mutation(
            api.domain.licensing.updateBillingStatus,
            {
                billingId: billingHistory[0]._id,
                status: "paid",
            }
        );
        expect(updateResult.success).toBe(true);

        // ── Step 8: Verify paid status ──────────────────────────────────
        const updatedBilling = await t.query(
            api.domain.licensing.listBillingHistory,
            { tenantId: tenantId!, limit: 10 }
        );
        expect(updatedBilling[0].status).toBe("paid");
    });

    it("cannot activate trial twice", async () => {
        const t = createJourneyTest();

        const creatorId = await createUser(t, {
            email: "double-trial@venue.digipicks.test",
            name: "Double Trial",
        });
        const { tenantId } = await t.mutation(
            api.domain.tenantOnboarding.createTenantForOwner,
            { userId: creatorId, name: "Trial Venue", slug: "trial-venue" }
        );

        // First trial activation
        const first = await t.mutation(
            api.domain.licensing.activateTrial,
            { tenantId: tenantId! }
        );
        expect(first.success).toBe(true);

        // Second trial activation should fail
        const second = await t.mutation(
            api.domain.licensing.activateTrial,
            { tenantId: tenantId! }
        );
        expect(second.success).toBe(false);
    });
});
