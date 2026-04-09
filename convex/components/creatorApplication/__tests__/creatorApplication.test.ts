/**
 * Creator Application Component — Convex Tests
 *
 * Covers all functions in components/creatorApplication/functions.ts:
 *   - submit (create, duplicate prevention)
 *   - approve (status transition, guards)
 *   - reject (status transition, guards)
 *   - requestMoreInfo (status transition, guards)
 *   - resubmit (ownership, status guard, field updates)
 *   - list (tenant, status filter, limit)
 *   - get (success, not-found)
 *   - getByUser (latest application lookup)
 *
 * Run: cd convex && npx vitest --config vitest.config.ts --run components/creatorApplication/__tests__/creatorApplication.test.ts
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

const TENANT = "tenant-app-001";
const USER_A = "user-a";
const USER_B = "user-b";
const ADMIN = "admin-001";

async function submitApplication(
    t: ReturnType<typeof convexTest>,
    overrides: Partial<{
        tenantId: string;
        userId: string;
        displayName: string;
        bio: string;
        niche: string;
        specialties: string[];
        performanceProof: string;
        trackRecordUrl: string;
        socialLinks: Record<string, string>;
    }> = {}
) {
    return t.mutation(api.functions.submit, {
        tenantId: overrides.tenantId ?? TENANT,
        userId: overrides.userId ?? USER_A,
        displayName: overrides.displayName ?? "BetKing",
        bio: overrides.bio ?? "Professional NFL handicapper with 5 years experience",
        niche: overrides.niche ?? "NFL",
        specialties: overrides.specialties,
        performanceProof: overrides.performanceProof,
        trackRecordUrl: overrides.trackRecordUrl,
        socialLinks: overrides.socialLinks as any,
    });
}

// ---------------------------------------------------------------------------
// submit
// ---------------------------------------------------------------------------

describe("creatorApplication/mutations — submit", () => {
    it("creates a new application with pending status", async () => {
        const t = convexTest(schema, modules);

        const result = await submitApplication(t);

        expect(result.id).toBeDefined();

        const app = (await t.run(async (ctx) =>
            ctx.db.get(result.id as any)
        )) as any;
        expect(app?.status).toBe("pending");
        expect(app?.tenantId).toBe(TENANT);
        expect(app?.userId).toBe(USER_A);
        expect(app?.displayName).toBe("BetKing");
        expect(app?.niche).toBe("NFL");
        expect(app?.submittedAt).toBeGreaterThan(0);
    });

    it("stores optional fields when provided", async () => {
        const t = convexTest(schema, modules);

        const result = await submitApplication(t, {
            specialties: ["spreads", "props"],
            performanceProof: "Verified +30 units last season",
            trackRecordUrl: "https://tracker.example/betking",
            socialLinks: { twitter: "@betking", website: "https://betking.com" },
        });

        const app = (await t.run(async (ctx) =>
            ctx.db.get(result.id as any)
        )) as any;
        expect(app?.specialties).toEqual(["spreads", "props"]);
        expect(app?.performanceProof).toBe("Verified +30 units last season");
        expect(app?.trackRecordUrl).toBe("https://tracker.example/betking");
        expect(app?.socialLinks?.twitter).toBe("@betking");
    });

    it("rejects if user already has a pending application", async () => {
        const t = convexTest(schema, modules);

        await submitApplication(t);

        await expect(submitApplication(t)).rejects.toThrow(
            "You already have a pending application"
        );
    });

    it("rejects if user is already an approved creator", async () => {
        const t = convexTest(schema, modules);

        const result = await submitApplication(t);

        // Manually approve it
        await t.mutation(api.functions.approve, {
            id: result.id,
            reviewedBy: ADMIN,
        });

        await expect(submitApplication(t)).rejects.toThrow(
            "You are already an approved creator"
        );
    });

    it("allows submission after rejection", async () => {
        const t = convexTest(schema, modules);

        const first = await submitApplication(t);
        await t.mutation(api.functions.reject, {
            id: first.id,
            reviewedBy: ADMIN,
            reviewNote: "Insufficient track record",
        });

        const second = await submitApplication(t);
        expect(second.id).toBeDefined();
        expect(second.id).not.toBe(first.id);

        const app = (await t.run(async (ctx) =>
            ctx.db.get(second.id as any)
        )) as any;
        expect(app?.previousApplicationId).toBe(first.id);
    });

    it("allows different users to submit independently", async () => {
        const t = convexTest(schema, modules);

        const resultA = await submitApplication(t, { userId: USER_A });
        const resultB = await submitApplication(t, { userId: USER_B });

        expect(resultA.id).not.toBe(resultB.id);
    });
});

// ---------------------------------------------------------------------------
// approve
// ---------------------------------------------------------------------------

describe("creatorApplication/mutations — approve", () => {
    it("approves a pending application", async () => {
        const t = convexTest(schema, modules);

        const { id } = await submitApplication(t);
        const result = await t.mutation(api.functions.approve, {
            id,
            reviewedBy: ADMIN,
            reviewNote: "Great track record",
        });

        expect(result.success).toBe(true);

        const app = (await t.run(async (ctx) =>
            ctx.db.get(id as any)
        )) as any;
        expect(app?.status).toBe("approved");
        expect(app?.reviewedBy).toBe(ADMIN);
        expect(app?.reviewNote).toBe("Great track record");
        expect(app?.reviewedAt).toBeGreaterThan(0);
    });

    it("approves a more_info_requested application", async () => {
        const t = convexTest(schema, modules);

        const { id } = await submitApplication(t);
        await t.mutation(api.functions.requestMoreInfo, {
            id,
            reviewedBy: ADMIN,
            reviewNote: "Need more proof",
        });
        const result = await t.mutation(api.functions.approve, {
            id,
            reviewedBy: ADMIN,
        });

        expect(result.success).toBe(true);
    });

    it("rejects approve on already approved application", async () => {
        const t = convexTest(schema, modules);

        const { id } = await submitApplication(t);
        await t.mutation(api.functions.approve, { id, reviewedBy: ADMIN });

        await expect(
            t.mutation(api.functions.approve, { id, reviewedBy: ADMIN })
        ).rejects.toThrow('Cannot approve application with status "approved"');
    });

    it("rejects approve on rejected application", async () => {
        const t = convexTest(schema, modules);

        const { id } = await submitApplication(t);
        await t.mutation(api.functions.reject, { id, reviewedBy: ADMIN });

        await expect(
            t.mutation(api.functions.approve, { id, reviewedBy: ADMIN })
        ).rejects.toThrow('Cannot approve application with status "rejected"');
    });

    it("throws on non-existent application", async () => {
        const t = convexTest(schema, modules);

        await expect(
            t.mutation(api.functions.approve, {
                id: "nonexistent",
                reviewedBy: ADMIN,
            })
        ).rejects.toThrow("Application not found");
    });
});

// ---------------------------------------------------------------------------
// reject
// ---------------------------------------------------------------------------

describe("creatorApplication/mutations — reject", () => {
    it("rejects a pending application", async () => {
        const t = convexTest(schema, modules);

        const { id } = await submitApplication(t);
        const result = await t.mutation(api.functions.reject, {
            id,
            reviewedBy: ADMIN,
            reviewNote: "Not enough experience",
        });

        expect(result.success).toBe(true);

        const app = (await t.run(async (ctx) =>
            ctx.db.get(id as any)
        )) as any;
        expect(app?.status).toBe("rejected");
        expect(app?.reviewNote).toBe("Not enough experience");
    });

    it("rejects an already approved application throws", async () => {
        const t = convexTest(schema, modules);

        const { id } = await submitApplication(t);
        await t.mutation(api.functions.approve, { id, reviewedBy: ADMIN });

        await expect(
            t.mutation(api.functions.reject, { id, reviewedBy: ADMIN })
        ).rejects.toThrow('Cannot reject application with status "approved"');
    });
});

// ---------------------------------------------------------------------------
// requestMoreInfo
// ---------------------------------------------------------------------------

describe("creatorApplication/mutations — requestMoreInfo", () => {
    it("transitions pending to more_info_requested", async () => {
        const t = convexTest(schema, modules);

        const { id } = await submitApplication(t);
        const result = await t.mutation(api.functions.requestMoreInfo, {
            id,
            reviewedBy: ADMIN,
            reviewNote: "Please provide your Action Network profile",
        });

        expect(result.success).toBe(true);

        const app = (await t.run(async (ctx) =>
            ctx.db.get(id as any)
        )) as any;
        expect(app?.status).toBe("more_info_requested");
        expect(app?.reviewNote).toBe(
            "Please provide your Action Network profile"
        );
    });

    it("rejects if application not pending", async () => {
        const t = convexTest(schema, modules);

        const { id } = await submitApplication(t);
        await t.mutation(api.functions.approve, { id, reviewedBy: ADMIN });

        await expect(
            t.mutation(api.functions.requestMoreInfo, {
                id,
                reviewedBy: ADMIN,
                reviewNote: "Need more info",
            })
        ).rejects.toThrow(
            'Cannot request more info for application with status "approved"'
        );
    });
});

// ---------------------------------------------------------------------------
// resubmit
// ---------------------------------------------------------------------------

describe("creatorApplication/mutations — resubmit", () => {
    it("resubmits after more_info_requested", async () => {
        const t = convexTest(schema, modules);

        const { id } = await submitApplication(t);
        await t.mutation(api.functions.requestMoreInfo, {
            id,
            reviewedBy: ADMIN,
            reviewNote: "Need track record URL",
        });

        const result = await t.mutation(api.functions.resubmit, {
            id,
            userId: USER_A,
            trackRecordUrl: "https://tracker.example/betking",
            bio: "Updated bio with verified stats",
        });

        expect(result.success).toBe(true);

        const app = (await t.run(async (ctx) =>
            ctx.db.get(id as any)
        )) as any;
        expect(app?.status).toBe("pending");
        expect(app?.trackRecordUrl).toBe("https://tracker.example/betking");
        expect(app?.bio).toBe("Updated bio with verified stats");
        expect(app?.resubmittedAt).toBeGreaterThan(0);
        // Original fields preserved
        expect(app?.displayName).toBe("BetKing");
        expect(app?.niche).toBe("NFL");
    });

    it("resubmits after rejection", async () => {
        const t = convexTest(schema, modules);

        const { id } = await submitApplication(t);
        await t.mutation(api.functions.reject, {
            id,
            reviewedBy: ADMIN,
        });

        const result = await t.mutation(api.functions.resubmit, {
            id,
            userId: USER_A,
            displayName: "BetKing Pro",
        });

        expect(result.success).toBe(true);
        const app = (await t.run(async (ctx) =>
            ctx.db.get(id as any)
        )) as any;
        expect(app?.status).toBe("pending");
        expect(app?.displayName).toBe("BetKing Pro");
    });

    it("rejects resubmit by wrong user", async () => {
        const t = convexTest(schema, modules);

        const { id } = await submitApplication(t);
        await t.mutation(api.functions.requestMoreInfo, {
            id,
            reviewedBy: ADMIN,
            reviewNote: "Need more info",
        });

        await expect(
            t.mutation(api.functions.resubmit, {
                id,
                userId: USER_B,
            })
        ).rejects.toThrow("You can only resubmit your own application");
    });

    it("rejects resubmit on pending application", async () => {
        const t = convexTest(schema, modules);

        const { id } = await submitApplication(t);

        await expect(
            t.mutation(api.functions.resubmit, {
                id,
                userId: USER_A,
            })
        ).rejects.toThrow(
            'Cannot resubmit application with status "pending"'
        );
    });
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

describe("creatorApplication/queries — list", () => {
    it("returns applications for a tenant", async () => {
        const t = convexTest(schema, modules);

        await submitApplication(t, { userId: USER_A });
        await submitApplication(t, { userId: USER_B });

        const list = await t.query(api.functions.list, { tenantId: TENANT });
        expect(list).toHaveLength(2);
    });

    it("filters by status", async () => {
        const t = convexTest(schema, modules);

        const { id: app1 } = await submitApplication(t, { userId: USER_A });
        await submitApplication(t, { userId: USER_B });

        await t.mutation(api.functions.approve, {
            id: app1,
            reviewedBy: ADMIN,
        });

        const pending = await t.query(api.functions.list, {
            tenantId: TENANT,
            status: "pending",
        });
        expect(pending).toHaveLength(1);

        const approved = await t.query(api.functions.list, {
            tenantId: TENANT,
            status: "approved",
        });
        expect(approved).toHaveLength(1);
    });

    it("respects limit", async () => {
        const t = convexTest(schema, modules);

        await submitApplication(t, { userId: USER_A });
        await submitApplication(t, { userId: USER_B });

        const list = await t.query(api.functions.list, {
            tenantId: TENANT,
            limit: 1,
        });
        expect(list).toHaveLength(1);
    });

    it("returns empty array for tenant with no applications", async () => {
        const t = convexTest(schema, modules);

        const list = await t.query(api.functions.list, {
            tenantId: "tenant-empty",
        });
        expect(list).toEqual([]);
    });
});

describe("creatorApplication/queries — get", () => {
    it("returns application by ID", async () => {
        const t = convexTest(schema, modules);

        const { id } = await submitApplication(t);
        const app = await t.query(api.functions.get, { id });

        expect(app).not.toBeNull();
        expect(app?.displayName).toBe("BetKing");
    });

    it("returns null for non-existent ID", async () => {
        const t = convexTest(schema, modules);

        const app = await t.query(api.functions.get, { id: "nonexistent" });
        expect(app).toBeNull();
    });
});

describe("creatorApplication/queries — getByUser", () => {
    it("returns latest application for a user in a tenant", async () => {
        const t = convexTest(schema, modules);

        await submitApplication(t);

        const app = await t.query(api.functions.getByUser, {
            tenantId: TENANT,
            userId: USER_A,
        });

        expect(app).not.toBeNull();
        expect(app?.displayName).toBe("BetKing");
    });

    it("returns null when user has no application", async () => {
        const t = convexTest(schema, modules);

        const app = await t.query(api.functions.getByUser, {
            tenantId: TENANT,
            userId: "user-none",
        });

        expect(app).toBeNull();
    });
});
