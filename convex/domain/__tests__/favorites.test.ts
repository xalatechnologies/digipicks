import { describe, it, expect } from "vitest";
import { api, components } from "../../_generated/api";
import { createDomainTest, seedTestTenant, seedSecondTenant, seedResource } from "./testHelper.test-util";

describe("domain/favorites", () => {
    function setup() {
        return createDomainTest(["userPrefs", "resources"]);
    }

    // =========================================================================
    // ADD
    // =========================================================================

    describe("add", () => {
        it("adds a favorite with required fields", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            const result = await t.mutation(api.domain.favorites.add, {
                tenantId,
                userId,
                resourceId: resource.id,
            });

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
        });

        it("adds a favorite with notes and tags", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            const result = await t.mutation(api.domain.favorites.add, {
                tenantId,
                userId,
                resourceId: resource.id,
                notes: "Best venue for concerts",
                tags: ["concert", "large"],
            });

            expect(result.id).toBeDefined();
        });

        it("throws on duplicate add (resource already in favorites)", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            await t.mutation(api.domain.favorites.add, {
                tenantId,
                userId,
                resourceId: resource.id,
            });

            await expect(
                t.mutation(api.domain.favorites.add, {
                    tenantId,
                    userId,
                    resourceId: resource.id,
                })
            ).rejects.toThrow("Resource already in favorites");
        });
    });

    // =========================================================================
    // LIST
    // =========================================================================

    describe("list", () => {
        it("returns favorites enriched with resource data", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string, {
                name: "Elvesalen",
                slug: "elvesalen",
            });

            await t.mutation(api.domain.favorites.add, {
                tenantId,
                userId,
                resourceId: resource.id,
            });

            const favorites = await t.query(api.domain.favorites.list, {
                userId,
            });

            expect(favorites.length).toBe(1);
            expect(favorites[0].resource).toBeDefined();
            expect(favorites[0].resource.name).toBe("Elvesalen");
        });

        it("filters out dead favorites (deleted resource)", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            // Add a favorite with a fake resource ID (resource does not exist)
            await t.mutation(components.userPrefs.functions.addFavorite, {
                tenantId: tenantId as string,
                userId: userId as string,
                resourceId: "nonexistent-resource-id",
            });

            const favorites = await t.query(api.domain.favorites.list, {
                userId,
            });

            // Should be filtered out since resource doesn't exist
            expect(favorites.length).toBe(0);
        });

        it("returns multiple favorites for a user", async () => {
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

            await t.mutation(api.domain.favorites.add, {
                tenantId,
                userId,
                resourceId: res1.id,
            });
            await t.mutation(api.domain.favorites.add, {
                tenantId,
                userId,
                resourceId: res2.id,
            });

            const favorites = await t.query(api.domain.favorites.list, {
                userId,
            });

            expect(favorites.length).toBe(2);
        });
    });

    // =========================================================================
    // IS FAVORITE
    // =========================================================================

    describe("isFavorite", () => {
        it("returns true when resource is favorited", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            await t.mutation(api.domain.favorites.add, {
                tenantId,
                userId,
                resourceId: resource.id,
            });

            const result = await t.query(api.domain.favorites.isFavorite, {
                userId,
                resourceId: resource.id,
            });

            expect(result.isFavorite).toBe(true);
            expect(result.favorite).toBeDefined();
        });

        it("returns false when resource is not favorited", async () => {
            const t = setup();
            const { userId } = await seedTestTenant(t);

            const result = await t.query(api.domain.favorites.isFavorite, {
                userId,
                resourceId: "some-resource-id",
            });

            expect(result.isFavorite).toBe(false);
            expect(result.favorite).toBeNull();
        });
    });

    // =========================================================================
    // UPDATE
    // =========================================================================

    describe("update", () => {
        it("updates notes and tags on a favorite", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            const { id } = await t.mutation(api.domain.favorites.add, {
                tenantId,
                userId,
                resourceId: resource.id,
                notes: "Initial notes",
                tags: ["initial"],
            });

            const result = await t.mutation(api.domain.favorites.update, {
                id,
                notes: "Updated notes",
                tags: ["updated", "concert"],
            });

            expect(result.success).toBe(true);
        });
    });

    // =========================================================================
    // REMOVE
    // =========================================================================

    describe("remove", () => {
        it("removes a favorite by userId + resourceId", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            await t.mutation(api.domain.favorites.add, {
                tenantId,
                userId,
                resourceId: resource.id,
            });

            const removed = await t.mutation(api.domain.favorites.remove, {
                userId,
                resourceId: resource.id,
            });

            expect(removed.success).toBe(true);

            const check = await t.query(api.domain.favorites.isFavorite, {
                userId,
                resourceId: resource.id,
            });
            expect(check.isFavorite).toBe(false);
        });

        it("throws when removing a non-existent favorite", async () => {
            const t = setup();
            const { userId } = await seedTestTenant(t);

            await expect(
                t.mutation(api.domain.favorites.remove, {
                    userId,
                    resourceId: "nonexistent",
                })
            ).rejects.toThrow();
        });
    });

    // =========================================================================
    // TOGGLE
    // =========================================================================

    describe("toggle", () => {
        it("toggles on (adds favorite)", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            const result = await t.mutation(api.domain.favorites.toggle, {
                tenantId,
                userId,
                resourceId: resource.id,
            });

            expect(result.isFavorite).toBe(true);
        });

        it("toggles off (removes favorite)", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            // First toggle ON
            await t.mutation(api.domain.favorites.toggle, {
                tenantId,
                userId,
                resourceId: resource.id,
            });

            // Second toggle OFF
            const result = await t.mutation(api.domain.favorites.toggle, {
                tenantId,
                userId,
                resourceId: resource.id,
            });

            expect(result.isFavorite).toBe(false);
        });
    });
});
