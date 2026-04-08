/**
 * Reviews Component — Comprehensive convex-test Tests
 *
 * Covers all functions in components/reviews/functions.ts:
 *   - create (validation, duplicate guard, auto-approval)
 *   - update (patch fields, rejected guard, rating validation, status reset)
 *   - remove (success, not-found)
 *   - moderate (approve/reject/flag + moderator tracking)
 *   - markHelpful / unmarkHelpful (idempotency)
 *   - list (tenant, resourceId, status, limit, helpfulCount enrichment)
 *   - get (success, not-found)
 *   - stats (total, averageRating, distribution, pending)
 *   - batchStats (multi-resource map)
 *   - getHelpfulCount / hasVotedHelpful
 *   - Schema index correctness (by_tenant, by_resource, by_user, by_status, by_review, by_user_review)
 *
 * Run: npx vitest run --config vitest.config.ts components/reviews/reviews.test.ts
 */

import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "vitest";
import schema from "../schema";
import { modules } from "../testSetup.test-util";
import { api } from "../_generated/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT = "tenant-rev-001";
const RESOURCE = "res-001";
const USER_A = "user-a";
const USER_B = "user-b";
const MODERATOR = "mod-001";

async function createReview(
    t: ReturnType<typeof convexTest>,
    overrides: Partial<{
        tenantId: string;
        resourceId: string;
        userId: string;
        rating: number;
        title: string;
        text: string;
    }> = {}
) {
    return t.mutation(api.functions.create, {
        tenantId: overrides.tenantId ?? TENANT,
        resourceId: overrides.resourceId ?? RESOURCE,
        userId: overrides.userId ?? USER_A,
        rating: overrides.rating ?? 4,
        title: overrides.title ?? "Great place",
        text: overrides.text ?? "Really enjoyed it.",
    });
}

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

describe("reviews/mutations — create", () => {
    it("creates a review with approved status (auto-approval) and returns id", async () => {
        const t = convexTest(schema, modules);

        const result = await createReview(t);

        expect(result.id).toBeDefined();

        const review = await t.run(async (ctx) => ctx.db.get(result.id as any)) as any;
        expect(review?.status).toBe("approved");
        expect(review?.rating).toBe(4);
        expect(review?.tenantId).toBe(TENANT);
        expect(review?.userId).toBe(USER_A);
        expect(review?.resourceId).toBe(RESOURCE);
    });

    it("throws for rating below 1", async () => {
        const t = convexTest(schema, modules);
        await expect(createReview(t, { rating: 0 })).rejects.toThrow("Rating must be between 1 and 5");
    });

    it("throws for rating above 5", async () => {
        const t = convexTest(schema, modules);
        await expect(createReview(t, { rating: 6 })).rejects.toThrow("Rating must be between 1 and 5");
    });

    it("throws when user has already reviewed the same resource", async () => {
        const t = convexTest(schema, modules);
        await createReview(t); // First review

        await expect(createReview(t)).rejects.toThrow("User has already reviewed this resource");
    });

    it("allows same user to review a different resource", async () => {
        const t = convexTest(schema, modules);
        await createReview(t, { resourceId: "res-A" });

        // Different resource — should succeed
        const result = await createReview(t, { resourceId: "res-B" });
        expect(result.id).toBeDefined();
    });

    it("allows same user to review again after their review was rejected", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createReview(t);

        // Reject the review
        await t.mutation(api.functions.moderate, {
            id: id as any,
            status: "rejected",
            moderatedBy: MODERATOR,
        });

        // Same user can submit again for same resource
        const result = await createReview(t);
        expect(result.id).toBeDefined();
    });

    it("allows different users to review the same resource", async () => {
        const t = convexTest(schema, modules);
        await createReview(t, { userId: USER_A });
        const result = await createReview(t, { userId: USER_B });
        expect(result.id).toBeDefined();
    });
});

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------

describe("reviews/mutations — update", () => {
    it("updates rating and text, resets status to pending", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createReview(t);

        // Approve it first
        await t.mutation(api.functions.moderate, {
            id: id as any,
            status: "approved",
            moderatedBy: MODERATOR,
        });

        // Now update
        await t.mutation(api.functions.update, {
            id: id as any,
            rating: 3,
            text: "Changed my mind.",
        });

        const review = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(review?.rating).toBe(3);
        expect(review?.text).toBe("Changed my mind.");
        expect(review?.status).toBe("pending"); // reset to pending on edit
    });

    it("throws when updating a rejected review", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createReview(t);
        await t.mutation(api.functions.moderate, {
            id: id as any,
            status: "rejected",
            moderatedBy: MODERATOR,
        });

        await expect(
            t.mutation(api.functions.update, { id: id as any, rating: 5 })
        ).rejects.toThrow("Cannot update a rejected review");
    });

    it("throws when updating with invalid rating", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createReview(t);

        await expect(
            t.mutation(api.functions.update, { id: id as any, rating: 0 })
        ).rejects.toThrow("Rating must be between 1 and 5");
    });

    it("throws when review does not exist", async () => {
        const t = convexTest(schema, modules);
        const fakeId = await t.run(async (ctx) => {
            const id = await ctx.db.insert("reviews", {
                tenantId: TENANT, resourceId: RESOURCE, userId: USER_A,
                rating: 4, status: "pending", metadata: {},
            });
            await ctx.db.delete(id);
            return id;
        });

        await expect(
            t.mutation(api.functions.update, { id: fakeId as any, rating: 3 })
        ).rejects.toThrow("Review not found");
    });
});

// ---------------------------------------------------------------------------
// remove
// ---------------------------------------------------------------------------

describe("reviews/mutations — remove", () => {
    it("permanently removes a review", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createReview(t);

        await t.mutation(api.functions.remove, { id: id as any });

        const review = await t.run(async (ctx) => ctx.db.get(id as any));
        expect(review).toBeNull();
    });

    it("throws when review does not exist", async () => {
        const t = convexTest(schema, modules);
        const fakeId = await t.run(async (ctx) => {
            const id = await ctx.db.insert("reviews", {
                tenantId: TENANT, resourceId: RESOURCE, userId: USER_A,
                rating: 4, status: "pending", metadata: {},
            });
            await ctx.db.delete(id);
            return id;
        });

        await expect(
            t.mutation(api.functions.remove, { id: fakeId as any })
        ).rejects.toThrow("Review not found");
    });
});

// ---------------------------------------------------------------------------
// moderate
// ---------------------------------------------------------------------------

describe("reviews/mutations — moderate", () => {
    it("approves a review and records moderator + timestamp", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createReview(t);

        await t.mutation(api.functions.moderate, {
            id: id as any,
            status: "approved",
            moderatedBy: MODERATOR,
            moderationNote: "Looks good",
        });

        const review = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(review?.status).toBe("approved");
        expect(review?.moderatedBy).toBe(MODERATOR);
        expect(review?.moderationNote).toBe("Looks good");
        expect(review?.moderatedAt).toBeDefined();
    });

    it("rejects a review with a note", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createReview(t);

        await t.mutation(api.functions.moderate, {
            id: id as any,
            status: "rejected",
            moderatedBy: MODERATOR,
            moderationNote: "Inappropriate content",
        });

        const review = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(review?.status).toBe("rejected");
        expect(review?.moderationNote).toBe("Inappropriate content");
    });

    it("flags a review for further review", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createReview(t);

        await t.mutation(api.functions.moderate, {
            id: id as any,
            status: "flagged",
            moderatedBy: MODERATOR,
        });

        const review = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(review?.status).toBe("flagged");
    });

    it("throws when review does not exist", async () => {
        const t = convexTest(schema, modules);
        const fakeId = await t.run(async (ctx) => {
            const id = await ctx.db.insert("reviews", {
                tenantId: TENANT, resourceId: RESOURCE, userId: USER_A,
                rating: 4, status: "pending", metadata: {},
            });
            await ctx.db.delete(id);
            return id;
        });

        await expect(
            t.mutation(api.functions.moderate, {
                id: fakeId as any,
                status: "approved",
                moderatedBy: MODERATOR,
            })
        ).rejects.toThrow("Review not found");
    });
});

// ---------------------------------------------------------------------------
// markHelpful / unmarkHelpful / hasVotedHelpful / getHelpfulCount
// ---------------------------------------------------------------------------

describe("reviews/mutations — markHelpful + unmarkHelpful", () => {
    it("marks a review as helpful", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createReview(t);

        const result = await t.mutation(api.functions.markHelpful, {
            tenantId: TENANT,
            reviewId: id,
            userId: USER_B,
        });

        expect(result.success).toBe(true);
    });

    it("returns false (idempotent) when already voted", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createReview(t);

        await t.mutation(api.functions.markHelpful, { tenantId: TENANT, reviewId: id, userId: USER_B });
        const result = await t.mutation(api.functions.markHelpful, { tenantId: TENANT, reviewId: id, userId: USER_B });

        expect(result.success).toBe(false);
    });

    it("unmarks a helpful vote", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createReview(t);

        await t.mutation(api.functions.markHelpful, { tenantId: TENANT, reviewId: id, userId: USER_B });
        const result = await t.mutation(api.functions.unmarkHelpful, { reviewId: id, userId: USER_B });

        expect(result.success).toBe(true);
    });

    it("returns false when unmarking a vote that doesn't exist", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createReview(t);

        const result = await t.mutation(api.functions.unmarkHelpful, { reviewId: id, userId: USER_B });
        expect(result.success).toBe(false);
    });

    it("hasVotedHelpful returns true after voting", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createReview(t);

        await t.mutation(api.functions.markHelpful, { tenantId: TENANT, reviewId: id, userId: USER_B });

        const voted = await t.query(api.functions.hasVotedHelpful, { userId: USER_B, reviewId: id });
        expect(voted).toBe(true);
    });

    it("getHelpfulCount returns correct count", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createReview(t);

        await t.mutation(api.functions.markHelpful, { tenantId: TENANT, reviewId: id, userId: USER_B });
        await t.mutation(api.functions.markHelpful, { tenantId: TENANT, reviewId: id, userId: "user-c" });

        const count = await t.query(api.functions.getHelpfulCount, { reviewId: id });
        expect(count).toBe(2);
    });
});

// ---------------------------------------------------------------------------
// list query
// ---------------------------------------------------------------------------

describe("reviews/queries — list", () => {
    it("returns all reviews for a tenant", async () => {
        const t = convexTest(schema, modules);

        await createReview(t, { userId: USER_A, resourceId: "res-1" });
        await createReview(t, { userId: USER_B, resourceId: "res-2" });

        const reviews = await t.query(api.functions.list, { tenantId: TENANT });
        expect(reviews.length).toBe(2);
        reviews.forEach((r: any) => {
            expect(r.tenantId).toBe(TENANT);
            expect(r.helpfulCount).toBeDefined(); // enriched
        });
    });

    it("filters by resourceId", async () => {
        const t = convexTest(schema, modules);

        await createReview(t, { userId: USER_A, resourceId: "res-X" });
        await createReview(t, { userId: USER_B, resourceId: "res-Y" });

        const reviews = await t.query(api.functions.list, { tenantId: TENANT, resourceId: "res-X" });
        expect(reviews.length).toBe(1);
        expect(reviews[0].resourceId).toBe("res-X");
    });

    it("filters by status", async () => {
        const t = convexTest(schema, modules);

        // Both reviews are auto-approved on create
        const { id } = await createReview(t, { userId: USER_A, resourceId: "res-1" });
        await createReview(t, { userId: USER_B, resourceId: "res-2" });

        // Reject one so we have mixed statuses to filter
        await t.mutation(api.functions.moderate, {
            id: id as any, status: "rejected", moderatedBy: MODERATOR,
        });

        const approved = await t.query(api.functions.list, { tenantId: TENANT, status: "approved" });
        expect(approved.length).toBe(1);
        expect(approved[0].status).toBe("approved");
    });

    it("respects limit", async () => {
        const t = convexTest(schema, modules);
        await createReview(t, { userId: USER_A, resourceId: "res-1" });
        await createReview(t, { userId: USER_B, resourceId: "res-2" });
        await createReview(t, { userId: "user-c", resourceId: "res-3" });

        const reviews = await t.query(api.functions.list, { tenantId: TENANT, limit: 2 });
        expect(reviews.length).toBe(2);
    });

    it("tenant isolation — does not return reviews from other tenants", async () => {
        const t = convexTest(schema, modules);
        await createReview(t, { tenantId: TENANT });
        await createReview(t, { tenantId: "other-tenant", userId: USER_B });

        const reviews = await t.query(api.functions.list, { tenantId: TENANT });
        expect(reviews.length).toBe(1);
        expect(reviews[0].tenantId).toBe(TENANT);
    });
});

// ---------------------------------------------------------------------------
// get query
// ---------------------------------------------------------------------------

describe("reviews/queries — get", () => {
    it("returns a review by id", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createReview(t);

        const review = await t.query(api.functions.get, { id: id as any });
        expect(review._id).toBe(id);
        expect(review.rating).toBe(4);
    });

    it("throws when review does not exist", async () => {
        const t = convexTest(schema, modules);
        const fakeId = await t.run(async (ctx) => {
            const id = await ctx.db.insert("reviews", {
                tenantId: TENANT, resourceId: RESOURCE, userId: USER_A,
                rating: 4, status: "pending", metadata: {},
            });
            await ctx.db.delete(id);
            return id;
        });

        await expect(
            t.query(api.functions.get, { id: fakeId as any })
        ).rejects.toThrow("Review not found");
    });
});

// ---------------------------------------------------------------------------
// stats query
// ---------------------------------------------------------------------------

describe("reviews/queries — stats", () => {
    it("returns zero stats for a resource with no reviews", async () => {
        const t = convexTest(schema, modules);

        const stats = await t.query(api.functions.stats, { resourceId: "empty-res" });
        expect(stats.total).toBe(0);
        expect(stats.averageRating).toBe(0);
        expect(stats.pending).toBe(0);
    });

    it("only counts approved reviews in average and total", async () => {
        const t = convexTest(schema, modules);

        // Both reviews are auto-approved on create
        const { id: id1 } = await createReview(t, { userId: USER_A, rating: 5 });
        const { id: id2 } = await createReview(t, { userId: USER_B, rating: 3 });

        // Reject id2 so only id1 counts in stats
        await t.mutation(api.functions.moderate, { id: id2 as any, status: "rejected", moderatedBy: MODERATOR });

        const stats = await t.query(api.functions.stats, { resourceId: RESOURCE });
        expect(stats.total).toBe(1); // only approved
        expect(stats.averageRating).toBe(5);
        expect(stats.pending).toBe(0);
    });

    it("computes correct average over multiple approved reviews", async () => {
        const t = convexTest(schema, modules);

        const { id: r1 } = await createReview(t, { userId: USER_A, rating: 5 });
        const { id: r2 } = await createReview(t, { userId: USER_B, rating: 3 });
        const { id: r3 } = await createReview(t, { userId: "user-c", rating: 4 });

        for (const id of [r1, r2, r3]) {
            await t.mutation(api.functions.moderate, { id: id as any, status: "approved", moderatedBy: MODERATOR });
        }

        const stats = await t.query(api.functions.stats, { resourceId: RESOURCE });
        expect(stats.total).toBe(3);
        expect(stats.averageRating).toBe(4); // (5+3+4)/3 = 4.0
        expect(stats.distribution[5]).toBe(1);
        expect(stats.distribution[3]).toBe(1);
        expect(stats.distribution[4]).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// batchStats query
// ---------------------------------------------------------------------------

describe("reviews/queries — batchStats", () => {
    it("returns a map of resourceId → stats for multiple resources", async () => {
        const t = convexTest(schema, modules);

        const res1Reviews = [
            await createReview(t, { userId: USER_A, resourceId: "r1", rating: 4 }),
            await createReview(t, { userId: USER_B, resourceId: "r1", rating: 2 }),
        ];
        const res2Reviews = [
            await createReview(t, { userId: "user-c", resourceId: "r2", rating: 5 }),
        ];

        for (const r of [...res1Reviews, ...res2Reviews]) {
            await t.mutation(api.functions.moderate, { id: r.id as any, status: "approved", moderatedBy: MODERATOR });
        }

        const batchResult = await t.query(api.functions.batchStats, { resourceIds: ["r1", "r2"] });

        expect(batchResult["r1"].total).toBe(2);
        expect(batchResult["r1"].averageRating).toBe(3); // (4+2)/2
        expect(batchResult["r2"].total).toBe(1);
        expect(batchResult["r2"].averageRating).toBe(5);
    });

    it("returns zero stats for resources with no reviews", async () => {
        const t = convexTest(schema, modules);
        const result = await t.query(api.functions.batchStats, { resourceIds: ["nonexistent-1", "nonexistent-2"] });
        expect(result["nonexistent-1"].total).toBe(0);
        expect(result["nonexistent-2"].averageRating).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// Schema — index correctness
// ---------------------------------------------------------------------------

describe("reviews schema — index correctness", () => {
    it("by_tenant index returns only reviews for the given tenant", async () => {
        const t = convexTest(schema, modules);

        await t.run(async (ctx) => {
            await ctx.db.insert("reviews", { tenantId: TENANT, resourceId: RESOURCE, userId: USER_A, rating: 4, status: "pending", metadata: {} });
            await ctx.db.insert("reviews", { tenantId: "other-tenant", resourceId: RESOURCE, userId: USER_B, rating: 3, status: "pending", metadata: {} });
        });

        const reviews = await t.run(async (ctx) =>
            ctx.db.query("reviews").withIndex("by_tenant", (q) => q.eq("tenantId", TENANT)).collect()
        );
        expect(reviews.length).toBe(1);
        expect(reviews[0].tenantId).toBe(TENANT);
    });

    it("by_resource index allows filtering reviews for a specific resource", async () => {
        const t = convexTest(schema, modules);

        await t.run(async (ctx) => {
            await ctx.db.insert("reviews", { tenantId: TENANT, resourceId: "res-A", userId: USER_A, rating: 5, status: "pending", metadata: {} });
            await ctx.db.insert("reviews", { tenantId: TENANT, resourceId: "res-B", userId: USER_B, rating: 3, status: "pending", metadata: {} });
        });

        const reviews = await t.run(async (ctx) =>
            ctx.db.query("reviews").withIndex("by_resource", (q) => q.eq("resourceId", "res-A")).collect()
        );
        expect(reviews.length).toBe(1);
        expect(reviews[0].resourceId).toBe("res-A");
    });

    it("by_user index allows querying reviews by a specific user", async () => {
        const t = convexTest(schema, modules);

        await t.run(async (ctx) => {
            await ctx.db.insert("reviews", { tenantId: TENANT, resourceId: "res-1", userId: USER_A, rating: 5, status: "pending", metadata: {} });
            await ctx.db.insert("reviews", { tenantId: TENANT, resourceId: "res-2", userId: USER_B, rating: 3, status: "pending", metadata: {} });
        });

        const reviews = await t.run(async (ctx) =>
            ctx.db.query("reviews").withIndex("by_user", (q) => q.eq("userId", USER_A)).collect()
        );
        expect(reviews.length).toBe(1);
        expect(reviews[0].userId).toBe(USER_A);
    });

    it("by_status index allows filtering by tenant + status", async () => {
        const t = convexTest(schema, modules);

        await t.run(async (ctx) => {
            await ctx.db.insert("reviews", { tenantId: TENANT, resourceId: "res-1", userId: USER_A, rating: 5, status: "approved", metadata: {} });
            await ctx.db.insert("reviews", { tenantId: TENANT, resourceId: "res-2", userId: USER_B, rating: 3, status: "pending", metadata: {} });
        });

        const approved = await t.run(async (ctx) =>
            ctx.db.query("reviews").withIndex("by_status", (q) => q.eq("tenantId", TENANT).eq("status", "approved")).collect()
        );
        expect(approved.length).toBe(1);
        expect(approved[0].status).toBe("approved");
    });

    it("helpfulVotes by_review index allows querying votes for a review", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createReview(t);

        await t.mutation(api.functions.markHelpful, { tenantId: TENANT, reviewId: id, userId: USER_B });

        const votes = await t.run(async (ctx) =>
            ctx.db.query("helpfulVotes").withIndex("by_review", (q) => q.eq("reviewId", id)).collect()
        );
        expect(votes.length).toBe(1);
        expect(votes[0].reviewId).toBe(id);
    });

    it("helpfulVotes by_user_review index allows querying if a user voted on a review", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createReview(t);

        await t.mutation(api.functions.markHelpful, { tenantId: TENANT, reviewId: id, userId: USER_B });

        const vote = await t.run(async (ctx) =>
            ctx.db.query("helpfulVotes").withIndex("by_user_review", (q) => q.eq("userId", USER_B).eq("reviewId", id)).first()
        );
        expect(vote).not.toBeNull();
        expect(vote?.userId).toBe(USER_B);
    });
});
