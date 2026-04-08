import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "../schema";
import { modules } from "../testSetup.test-util";
import { api } from "../_generated/api";

const TENANT = "tenant-compliance-test";
const USER = "user-1";

// =============================================================================
// CONSENT — MUTATIONS
// =============================================================================

describe("compliance/mutations — consent", () => {
    it("creates a consent record", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.mutations.updateConsent, {
            tenantId: TENANT,
            userId: USER,
            category: "marketing",
            isConsented: true,
            version: "1.0",
        });
        expect(result.id).toBeDefined();
    });

    it("creates consent with optional fields", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.mutations.updateConsent, {
            tenantId: TENANT,
            userId: USER,
            category: "analytics",
            isConsented: true,
            version: "1.0",
            ipAddress: "192.168.1.1",
            userAgent: "Mozilla/5.0",
        });
        expect(result.id).toBeDefined();
    });

    it("rejects invalid consent category", async () => {
        const t = convexTest(schema, modules);
        await expect(
            t.mutation(api.mutations.updateConsent, {
                tenantId: TENANT, userId: USER, category: "invalid", isConsented: true, version: "1.0",
            })
        ).rejects.toThrow("Invalid consent category");
    });

    it("prevents withdrawing necessary consent", async () => {
        const t = convexTest(schema, modules);
        await expect(
            t.mutation(api.mutations.updateConsent, {
                tenantId: TENANT, userId: USER, category: "necessary", isConsented: false, version: "1.0",
            })
        ).rejects.toThrow("Necessary consent cannot be withdrawn");
    });

    it("allows granting necessary consent", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.mutations.updateConsent, {
            tenantId: TENANT, userId: USER, category: "necessary", isConsented: true, version: "1.0",
        });
        expect(result.id).toBeDefined();
    });

    it("sets withdrawnAt when consent is withdrawn", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.updateConsent, {
            tenantId: TENANT, userId: USER, category: "marketing", isConsented: false, version: "1.0",
        });

        const record = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(record!.withdrawnAt).toBeDefined();
        expect(record!.isConsented).toBe(false);
    });
});

// =============================================================================
// CONSENT — QUERIES
// =============================================================================

describe("compliance/queries — consent", () => {
    it("gets consent for a user+category (returns latest)", async () => {
        const t = convexTest(schema, modules);
        // Insert directly with explicit timestamps to ensure ordering
        await t.run(async (ctx) => {
            await ctx.db.insert("consentRecords", {
                tenantId: TENANT, userId: USER, category: "marketing",
                isConsented: true, consentedAt: 1000, version: "1.0",
            });
            await ctx.db.insert("consentRecords", {
                tenantId: TENANT, userId: USER, category: "marketing",
                isConsented: false, consentedAt: 2000, withdrawnAt: 2000, version: "2.0",
            });
        });

        const record = await t.query(api.queries.getConsent, { userId: USER, category: "marketing" });
        expect(record).not.toBeNull();
        expect(record!.version).toBe("2.0");
    });

    it("returns null for non-existent consent", async () => {
        const t = convexTest(schema, modules);
        const record = await t.query(api.queries.getConsent, { userId: USER, category: "marketing" });
        expect(record).toBeNull();
    });

    it("lists all consent records for a user", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.updateConsent, {
            tenantId: TENANT, userId: USER, category: "marketing", isConsented: true, version: "1.0",
        });
        await t.mutation(api.mutations.updateConsent, {
            tenantId: TENANT, userId: USER, category: "analytics", isConsented: true, version: "1.0",
        });

        const records = await t.query(api.queries.listConsent, { userId: USER });
        expect(records).toHaveLength(2);
    });

    it("gets consent summary for a user", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.updateConsent, {
            tenantId: TENANT, userId: USER, category: "marketing", isConsented: true, version: "1.0",
        });
        await t.mutation(api.mutations.updateConsent, {
            tenantId: TENANT, userId: USER, category: "analytics", isConsented: false, version: "1.0",
        });

        const summary = await t.query(api.queries.getConsentSummary, { userId: USER });
        expect(summary.marketing).toBe(true);
        expect(summary.analytics).toBe(false);
        expect(summary.thirdParty).toBe(false);
        expect(summary.necessary).toBe(true); // Always true
    });

    it("consent summary defaults to false for unset categories", async () => {
        const t = convexTest(schema, modules);
        const summary = await t.query(api.queries.getConsentSummary, { userId: USER });
        expect(summary.marketing).toBe(false);
        expect(summary.analytics).toBe(false);
        expect(summary.thirdParty).toBe(false);
        expect(summary.necessary).toBe(true);
    });
});

// =============================================================================
// DSAR — MUTATIONS
// =============================================================================

describe("compliance/mutations — DSAR", () => {
    it("submits a DSAR request", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.mutations.submitDSAR, {
            tenantId: TENANT, userId: USER, requestType: "access",
        });
        expect(result.id).toBeDefined();
    });

    it("submits DSAR with details", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.mutations.submitDSAR, {
            tenantId: TENANT, userId: USER, requestType: "deletion",
            details: "Please delete my account data",
        });
        expect(result.id).toBeDefined();
    });

    it("rejects invalid DSAR request type", async () => {
        const t = convexTest(schema, modules);
        await expect(
            t.mutation(api.mutations.submitDSAR, {
                tenantId: TENANT, userId: USER, requestType: "invalid",
            })
        ).rejects.toThrow("Invalid DSAR request type");
    });

    it("updates DSAR status", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.submitDSAR, {
            tenantId: TENANT, userId: USER, requestType: "access",
        });

        await t.mutation(api.mutations.updateDSARStatus, {
            id: id as any, status: "in_progress", processedBy: "admin-1",
        });

        const request = await t.query(api.queries.getDSAR, { id: id as any });
        expect(request.status).toBe("in_progress");
        expect(request.processedBy).toBe("admin-1");
    });

    it("sets completedAt when status is completed", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.submitDSAR, {
            tenantId: TENANT, userId: USER, requestType: "access",
        });

        await t.mutation(api.mutations.updateDSARStatus, {
            id: id as any, status: "completed", processedBy: "admin-1",
            responseData: { downloadUrl: "https://..." },
        });

        const request = await t.query(api.queries.getDSAR, { id: id as any });
        expect(request.status).toBe("completed");
        expect(request.completedAt).toBeDefined();
        expect(request.responseData.downloadUrl).toBe("https://...");
    });

    it("rejects invalid DSAR status", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.submitDSAR, {
            tenantId: TENANT, userId: USER, requestType: "access",
        });
        await expect(
            t.mutation(api.mutations.updateDSARStatus, {
                id: id as any, status: "bogus", processedBy: "admin-1",
            })
        ).rejects.toThrow("Invalid DSAR status");
    });
});

// =============================================================================
// DSAR — QUERIES
// =============================================================================

describe("compliance/queries — DSAR", () => {
    it("lists DSAR requests for a tenant", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.submitDSAR, { tenantId: TENANT, userId: USER, requestType: "access" });
        await t.mutation(api.mutations.submitDSAR, { tenantId: TENANT, userId: "user-2", requestType: "deletion" });

        const requests = await t.query(api.queries.listDSARRequests, { tenantId: TENANT });
        expect(requests).toHaveLength(2);
    });

    it("filters DSAR requests by status", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.submitDSAR, { tenantId: TENANT, userId: USER, requestType: "access" });
        await t.mutation(api.mutations.submitDSAR, { tenantId: TENANT, userId: "user-2", requestType: "deletion" });
        await t.mutation(api.mutations.updateDSARStatus, { id: id as any, status: "completed", processedBy: "admin-1" });

        const submitted = await t.query(api.queries.listDSARRequests, { tenantId: TENANT, status: "submitted" });
        expect(submitted).toHaveLength(1);

        const completed = await t.query(api.queries.listDSARRequests, { tenantId: TENANT, status: "completed" });
        expect(completed).toHaveLength(1);
    });

    it("filters DSAR requests by userId", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.submitDSAR, { tenantId: TENANT, userId: USER, requestType: "access" });
        await t.mutation(api.mutations.submitDSAR, { tenantId: TENANT, userId: "user-2", requestType: "deletion" });

        const userRequests = await t.query(api.queries.listDSARRequests, { tenantId: TENANT, userId: USER });
        expect(userRequests).toHaveLength(1);
    });

    it("tenant isolation for DSAR requests", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.submitDSAR, { tenantId: TENANT, userId: USER, requestType: "access" });
        await t.mutation(api.mutations.submitDSAR, { tenantId: "other-tenant", userId: USER, requestType: "deletion" });

        const tenantRequests = await t.query(api.queries.listDSARRequests, { tenantId: TENANT });
        expect(tenantRequests).toHaveLength(1);
    });
});

// =============================================================================
// POLICY VERSIONS — MUTATIONS
// =============================================================================

describe("compliance/mutations — policies", () => {
    it("publishes a policy", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.mutations.publishPolicy, {
            tenantId: TENANT, policyType: "privacy", title: "Privacy Policy",
            content: "We respect your privacy.", version: "1.0", publishedBy: "admin-1",
        });
        expect(result.id).toBeDefined();
    });

    it("rejects invalid policy type", async () => {
        const t = convexTest(schema, modules);
        await expect(
            t.mutation(api.mutations.publishPolicy, {
                tenantId: TENANT, policyType: "invalid", title: "X",
                content: "X", version: "1.0", publishedBy: "admin-1",
            })
        ).rejects.toThrow("Invalid policy type");
    });

    it("auto-unpublishes previous version when publishing new", async () => {
        const t = convexTest(schema, modules);
        const v1 = await t.mutation(api.mutations.publishPolicy, {
            tenantId: TENANT, policyType: "privacy", title: "V1",
            content: "Version 1", version: "1.0", publishedBy: "admin-1",
        });
        const v2 = await t.mutation(api.mutations.publishPolicy, {
            tenantId: TENANT, policyType: "privacy", title: "V2",
            content: "Version 2", version: "2.0", publishedBy: "admin-1",
        });

        const current = await t.query(api.queries.getPolicy, { tenantId: TENANT, policyType: "privacy" });
        expect(current.version).toBe("2.0");
        expect(current.isPublished).toBe(true);
        expect(current.previousVersionId).toBeDefined();

        // V1 should be unpublished
        const v1Data = await t.run(async (ctx) => ctx.db.get(v1.id as any)) as any;
        expect(v1Data!.isPublished).toBe(false);
    });

    it("rollback restores a previous version", async () => {
        const t = convexTest(schema, modules);
        const v1 = await t.mutation(api.mutations.publishPolicy, {
            tenantId: TENANT, policyType: "terms", title: "V1",
            content: "V1", version: "1.0", publishedBy: "admin-1",
        });
        await t.mutation(api.mutations.publishPolicy, {
            tenantId: TENANT, policyType: "terms", title: "V2",
            content: "V2", version: "2.0", publishedBy: "admin-1",
        });

        await t.mutation(api.mutations.rollbackPolicy, { id: v1.id as any });

        const current = await t.query(api.queries.getPolicy, { tenantId: TENANT, policyType: "terms" });
        expect(current.version).toBe("1.0");
        expect(current.isPublished).toBe(true);
    });
});

// =============================================================================
// POLICY VERSIONS — QUERIES
// =============================================================================

describe("compliance/queries — policies", () => {
    it("gets current published policy", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.publishPolicy, {
            tenantId: TENANT, policyType: "privacy", title: "Privacy",
            content: "Content", version: "1.0", publishedBy: "admin-1",
        });

        const policy = await t.query(api.queries.getPolicy, { tenantId: TENANT, policyType: "privacy" });
        expect(policy).not.toBeNull();
        expect(policy.title).toBe("Privacy");
    });

    it("returns null for non-existent policy type", async () => {
        const t = convexTest(schema, modules);
        const policy = await t.query(api.queries.getPolicy, { tenantId: TENANT, policyType: "cookies" });
        expect(policy).toBeNull();
    });

    it("lists all published policies for a tenant", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.publishPolicy, {
            tenantId: TENANT, policyType: "privacy", title: "Privacy",
            content: "C", version: "1.0", publishedBy: "admin-1",
        });
        await t.mutation(api.mutations.publishPolicy, {
            tenantId: TENANT, policyType: "terms", title: "Terms",
            content: "C", version: "1.0", publishedBy: "admin-1",
        });

        const policies = await t.query(api.queries.listPolicies, { tenantId: TENANT });
        expect(policies).toHaveLength(2);
    });

    it("gets policy history for a type", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.publishPolicy, {
            tenantId: TENANT, policyType: "privacy", title: "V1",
            content: "C1", version: "1.0", publishedBy: "admin-1",
        });
        await t.mutation(api.mutations.publishPolicy, {
            tenantId: TENANT, policyType: "privacy", title: "V2",
            content: "C2", version: "2.0", publishedBy: "admin-1",
        });

        const history = await t.query(api.queries.getPolicyHistory, { tenantId: TENANT, policyType: "privacy" });
        expect(history).toHaveLength(2);
        // Newest first
        expect(history[0].version).toBe("2.0");
        expect(history[1].version).toBe("1.0");
    });
});

// =============================================================================
// SCHEMA INDEXES
// =============================================================================

describe("compliance/schema — indexes", () => {
    it("consentRecords by_user_category index works", async () => {
        const t = convexTest(schema, modules);
        await t.run(async (ctx) => {
            await ctx.db.insert("consentRecords", {
                tenantId: TENANT, userId: USER, category: "marketing",
                isConsented: true, consentedAt: Date.now(), version: "1.0",
            });
            const found = await ctx.db.query("consentRecords")
                .withIndex("by_user_category", (q) => q.eq("userId", USER).eq("category", "marketing"))
                .first();
            expect(found).not.toBeNull();
        });
    });

    it("dsarRequests by_status index works", async () => {
        const t = convexTest(schema, modules);
        await t.run(async (ctx) => {
            await ctx.db.insert("dsarRequests", {
                tenantId: TENANT, userId: USER, requestType: "access",
                status: "submitted", submittedAt: Date.now(),
            });
            const found = await ctx.db.query("dsarRequests")
                .withIndex("by_status", (q) => q.eq("tenantId", TENANT).eq("status", "submitted"))
                .first();
            expect(found).not.toBeNull();
        });
    });

    it("policyVersions by_published index works", async () => {
        const t = convexTest(schema, modules);
        await t.run(async (ctx) => {
            await ctx.db.insert("policyVersions", {
                tenantId: TENANT, policyType: "privacy", version: "1.0",
                title: "P", content: "C", isPublished: true, publishedAt: Date.now(),
            });
            const found = await ctx.db.query("policyVersions")
                .withIndex("by_published", (q) => q.eq("tenantId", TENANT).eq("isPublished", true))
                .first();
            expect(found).not.toBeNull();
        });
    });
});
