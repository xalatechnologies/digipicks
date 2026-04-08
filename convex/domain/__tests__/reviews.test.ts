import { describe, it, expect } from "vitest";
import { api, components } from "../../_generated/api";
import { createDomainTest, seedTestTenant, seedResource } from "./testHelper.test-util";

describe("domain/reviews", () => {
    function setup() {
        return createDomainTest(["reviews", "resources", "audit", "rbac"]);
    }

    /**
     * Grant the "review:moderate" permission to a user via RBAC component.
     */
    async function grantModeratePermission(
        t: ReturnType<typeof setup>,
        tenantId: string,
        userId: string
    ) {
        const role = await t.mutation(components.rbac.mutations.createRole, {
            tenantId,
            name: "Moderator",
            permissions: ["review:moderate"],
            isSystem: true,
        });
        await t.mutation(components.rbac.mutations.assignRole, {
            tenantId,
            userId,
            roleId: role.id as any,
        });
        return role;
    }

    // =========================================================================
    // CREATE
    // =========================================================================

    describe("create", () => {
        it("creates a review with required fields", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            const result = await t.mutation(api.domain.reviews.create, {
                tenantId,
                resourceId: resource.id,
                userId,
                rating: 4,
                title: "Great venue",
                text: "Really enjoyed the space",
            });

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
        });

        it("rejects review from inactive user", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            // Create an inactive user
            const inactiveUserId = await t.run(async (ctx) => {
                return ctx.db.insert("users", {
                    email: "inactive@test.no",
                    name: "Inactive",
                    role: "user",
                    status: "suspended",
                    tenantId,
                    metadata: {},
                });
            });

            await expect(
                t.mutation(api.domain.reviews.create, {
                    tenantId,
                    resourceId: resource.id,
                    userId: inactiveUserId,
                    rating: 3,
                })
            ).rejects.toThrow("User not found or inactive");
        });

        it("creates audit entry when review is created", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            const review = await t.mutation(api.domain.reviews.create, {
                tenantId,
                resourceId: resource.id,
                userId,
                rating: 5,
            });

            // Verify audit trail was created
            const auditEntries = await t.query(
                components.audit.functions.listForTenant,
                { tenantId: tenantId as string }
            );
            expect(auditEntries.length).toBeGreaterThanOrEqual(1);
            const reviewAudit = auditEntries.find(
                (e: any) => e.entityType === "review" && e.entityId === review.id
            );
            expect(reviewAudit).toBeDefined();
            expect(reviewAudit.action).toBe("created");
        });
    });

    // =========================================================================
    // LIST
    // =========================================================================

    describe("list", () => {
        it("returns reviews for a tenant", async () => {
            const t = setup();
            const { tenantId, userId, adminId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            await t.mutation(api.domain.reviews.create, {
                tenantId,
                resourceId: resource.id,
                userId,
                rating: 4,
                title: "Review 1",
            });
            // Use adminId for second review (same user can't review same resource twice)
            await t.mutation(api.domain.reviews.create, {
                tenantId,
                resourceId: resource.id,
                userId: adminId,
                rating: 5,
                title: "Review 2",
            });

            const reviews = await t.query(api.domain.reviews.list, {
                tenantId,
            });

            expect(reviews.length).toBe(2);
        });

        it("enriches reviews with user names", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            await t.mutation(api.domain.reviews.create, {
                tenantId,
                resourceId: resource.id,
                userId,
                rating: 4,
            });

            const reviews = await t.query(api.domain.reviews.list, {
                tenantId,
            });

            expect(reviews.length).toBe(1);
            expect(reviews[0].user).toBeDefined();
            expect(reviews[0].user.name).toBe("Test User");
            expect(reviews[0].user.email).toBe("user@test.no");
        });

        it("enriches reviews with resource name", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string, {
                name: "Elvesalen",
                slug: "elvesalen",
            });

            await t.mutation(api.domain.reviews.create, {
                tenantId,
                resourceId: resource.id,
                userId,
                rating: 3,
            });

            const reviews = await t.query(api.domain.reviews.list, {
                tenantId,
            });

            expect(reviews.length).toBe(1);
            expect(reviews[0].resourceName).toBe("Elvesalen");
        });

        it("filters by resourceId", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);
            const res1 = await seedResource(t, tenantId as string, {
                name: "Venue A",
                slug: "venue-a",
            });
            const res2 = await seedResource(t, tenantId as string, {
                name: "Venue B",
                slug: "venue-b",
            });

            await t.mutation(api.domain.reviews.create, {
                tenantId,
                resourceId: res1.id,
                userId,
                rating: 4,
            });
            await t.mutation(api.domain.reviews.create, {
                tenantId,
                resourceId: res2.id,
                userId,
                rating: 5,
            });

            const filtered = await t.query(api.domain.reviews.list, {
                tenantId,
                resourceId: res1.id,
            });

            expect(filtered.length).toBe(1);
        });
    });

    // =========================================================================
    // GET
    // =========================================================================

    describe("get", () => {
        it("returns a single review enriched with user and resource data", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string, {
                name: "Festsalen",
                slug: "festsalen",
            });

            const { id } = await t.mutation(api.domain.reviews.create, {
                tenantId,
                resourceId: resource.id,
                userId,
                rating: 5,
                title: "Amazing",
            });

            const review = await t.query(api.domain.reviews.get, { id });

            expect(review.rating).toBe(5);
            expect(review.title).toBe("Amazing");
            expect(review.user).toBeDefined();
            expect(review.user.name).toBe("Test User");
            expect(review.resource).toBeDefined();
            expect(review.resource.name).toBe("Festsalen");
        });
    });

    // =========================================================================
    // STATS
    // =========================================================================

    describe("stats", () => {
        it("returns correct stats for approved reviews", async () => {
            const t = setup();
            const { tenantId, userId, adminId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            await grantModeratePermission(t, tenantId as string, adminId as string);

            const r1 = await t.mutation(api.domain.reviews.create, {
                tenantId,
                resourceId: resource.id,
                userId,
                rating: 4,
            });
            const r2 = await t.mutation(api.domain.reviews.create, {
                tenantId,
                resourceId: resource.id,
                userId: adminId,
                rating: 2,
            });

            // Approve both reviews so they count in stats
            await t.mutation(api.domain.reviews.moderate, {
                id: r1.id,
                status: "approved",
                moderatedBy: adminId,
            });
            await t.mutation(api.domain.reviews.moderate, {
                id: r2.id,
                status: "approved",
                moderatedBy: adminId,
            });

            const stats = await t.query(api.domain.reviews.stats, {
                resourceId: resource.id,
            });

            expect(stats.total).toBe(2);
            expect(stats.averageRating).toBe(3);
        });

        it("counts pending reviews separately", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            await t.mutation(api.domain.reviews.create, {
                tenantId,
                resourceId: resource.id,
                userId,
                rating: 3,
            });

            const stats = await t.query(api.domain.reviews.stats, {
                resourceId: resource.id,
            });

            expect(stats.total).toBe(1); // Auto-approved on create
            expect(stats.pending).toBe(0);
        });
    });

    // =========================================================================
    // UPDATE
    // =========================================================================

    describe("update", () => {
        it("updates review rating and text", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            const { id } = await t.mutation(api.domain.reviews.create, {
                tenantId,
                resourceId: resource.id,
                userId,
                rating: 3,
                title: "OK",
            });

            await t.mutation(api.domain.reviews.update, {
                id,
                rating: 5,
                title: "Actually great",
            });

            const updated = await t.query(api.domain.reviews.get, { id });
            expect(updated.rating).toBe(5);
            expect(updated.title).toBe("Actually great");
        });
    });

    // =========================================================================
    // REMOVE
    // =========================================================================

    describe("remove", () => {
        it("removes a review", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            const { id } = await t.mutation(api.domain.reviews.create, {
                tenantId,
                resourceId: resource.id,
                userId,
                rating: 2,
            });

            await t.mutation(api.domain.reviews.remove, { id });

            const list = await t.query(api.domain.reviews.list, { tenantId });
            expect(list.length).toBe(0);
        });
    });

    // =========================================================================
    // HELPFUL VOTES
    // =========================================================================

    describe("markHelpful / unmarkHelpful", () => {
        it("marks a review as helpful", async () => {
            const t = setup();
            const { tenantId, userId, adminId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            const { id: reviewId } = await t.mutation(
                api.domain.reviews.create,
                {
                    tenantId,
                    resourceId: resource.id,
                    userId,
                    rating: 4,
                }
            );

            const result = await t.mutation(api.domain.reviews.markHelpful, {
                tenantId,
                reviewId,
                userId: adminId,
            });

            expect(result.success).toBe(true);
        });

        it("unmarks a helpful vote", async () => {
            const t = setup();
            const { tenantId, userId, adminId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            const { id: reviewId } = await t.mutation(
                api.domain.reviews.create,
                {
                    tenantId,
                    resourceId: resource.id,
                    userId,
                    rating: 5,
                }
            );

            await t.mutation(api.domain.reviews.markHelpful, {
                tenantId,
                reviewId,
                userId: adminId,
            });

            const result = await t.mutation(api.domain.reviews.unmarkHelpful, {
                reviewId,
                userId: adminId,
            });

            expect(result.success).toBe(true);
        });
    });

    // =========================================================================
    // MODERATE
    // =========================================================================

    describe("moderate", () => {
        it("moderates a review with permission", async () => {
            const t = setup();
            const { tenantId, userId, adminId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            await grantModeratePermission(t, tenantId as string, adminId as string);

            const { id } = await t.mutation(api.domain.reviews.create, {
                tenantId,
                resourceId: resource.id,
                userId,
                rating: 1,
                text: "Spam review",
            });

            const result = await t.mutation(api.domain.reviews.moderate, {
                id,
                status: "rejected",
                moderatedBy: adminId,
                moderationNote: "This is spam",
            });

            expect(result.success).toBe(true);
        });

        it("rejects moderation without permission", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            const { id } = await t.mutation(api.domain.reviews.create, {
                tenantId,
                resourceId: resource.id,
                userId,
                rating: 2,
            });

            // userId has no review:moderate permission
            await expect(
                t.mutation(api.domain.reviews.moderate, {
                    id,
                    status: "approved",
                    moderatedBy: userId,
                })
            ).rejects.toThrow("Permission denied");
        });

        it("creates audit entry for moderation", async () => {
            const t = setup();
            const { tenantId, userId, adminId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            await grantModeratePermission(t, tenantId as string, adminId as string);

            const { id } = await t.mutation(api.domain.reviews.create, {
                tenantId,
                resourceId: resource.id,
                userId,
                rating: 3,
            });

            await t.mutation(api.domain.reviews.moderate, {
                id,
                status: "approved",
                moderatedBy: adminId,
            });

            const auditEntries = await t.query(
                components.audit.functions.listForTenant,
                { tenantId: tenantId as string }
            );

            const modAudit = auditEntries.find(
                (e: any) => e.action === "moderated_approved" && e.entityId === id
            );
            expect(modAudit).toBeDefined();
        });
    });
});
