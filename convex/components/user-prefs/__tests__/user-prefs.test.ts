import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "../schema";
import { modules } from "../testSetup.test-util";
import { api } from "../_generated/api";

const TENANT = "tenant-prefs-test";
const USER = "user-1";

// =============================================================================
// FAVORITES — MUTATIONS
// =============================================================================

describe("user-prefs/mutations — favorites", () => {
    it("adds a favorite", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.functions.addFavorite, {
            tenantId: TENANT,
            userId: USER,
            resourceId: "res-1",
        });
        expect(result.id).toBeDefined();
    });

    it("adds a favorite with notes and tags", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.functions.addFavorite, {
            tenantId: TENANT,
            userId: USER,
            resourceId: "res-1",
            notes: "Great venue",
            tags: ["concert", "large"],
        });
        expect(result.id).toBeDefined();

        const favs = await t.query(api.functions.listFavorites, { userId: USER });
        expect(favs).toHaveLength(1);
        expect(favs[0].notes).toBe("Great venue");
        expect(favs[0].tags).toEqual(["concert", "large"]);
    });

    it("rejects duplicate favorite", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.functions.addFavorite, { tenantId: TENANT, userId: USER, resourceId: "res-1" });
        await expect(
            t.mutation(api.functions.addFavorite, { tenantId: TENANT, userId: USER, resourceId: "res-1" })
        ).rejects.toThrow("already in favorites");
    });

    it("allows same resource for different users", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.functions.addFavorite, { tenantId: TENANT, userId: "user-A", resourceId: "res-1" });
        const r2 = await t.mutation(api.functions.addFavorite, { tenantId: TENANT, userId: "user-B", resourceId: "res-1" });
        expect(r2.id).toBeDefined();
    });

    it("updates a favorite", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.functions.addFavorite, { tenantId: TENANT, userId: USER, resourceId: "res-1" });
        await t.mutation(api.functions.updateFavorite, { id: id as any, notes: "Updated", tags: ["new-tag"] });

        const favs = await t.query(api.functions.listFavorites, { userId: USER });
        expect(favs[0].notes).toBe("Updated");
        expect(favs[0].tags).toEqual(["new-tag"]);
    });

    it("removes a favorite", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.functions.addFavorite, { tenantId: TENANT, userId: USER, resourceId: "res-1" });
        const result = await t.mutation(api.functions.removeFavorite, { userId: USER, resourceId: "res-1" });
        expect(result.success).toBe(true);

        const favs = await t.query(api.functions.listFavorites, { userId: USER });
        expect(favs).toHaveLength(0);
    });

    it("throws removing non-existent favorite", async () => {
        const t = convexTest(schema, modules);
        await expect(
            t.mutation(api.functions.removeFavorite, { userId: USER, resourceId: "nope" })
        ).rejects.toThrow("not found");
    });

    it("toggles favorite on and off", async () => {
        const t = convexTest(schema, modules);
        const r1 = await t.mutation(api.functions.toggleFavorite, { tenantId: TENANT, userId: USER, resourceId: "res-1" });
        expect(r1.isFavorite).toBe(true);

        const r2 = await t.mutation(api.functions.toggleFavorite, { tenantId: TENANT, userId: USER, resourceId: "res-1" });
        expect(r2.isFavorite).toBe(false);

        const favs = await t.query(api.functions.listFavorites, { userId: USER });
        expect(favs).toHaveLength(0);
    });
});

// =============================================================================
// FAVORITES — QUERIES
// =============================================================================

describe("user-prefs/queries — favorites", () => {
    it("lists favorites for a user", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.functions.addFavorite, { tenantId: TENANT, userId: USER, resourceId: "res-1" });
        await t.mutation(api.functions.addFavorite, { tenantId: TENANT, userId: USER, resourceId: "res-2" });

        const favs = await t.query(api.functions.listFavorites, { userId: USER });
        expect(favs).toHaveLength(2);
    });

    it("filters favorites by tags", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.functions.addFavorite, { tenantId: TENANT, userId: USER, resourceId: "res-1", tags: ["concert"] });
        await t.mutation(api.functions.addFavorite, { tenantId: TENANT, userId: USER, resourceId: "res-2", tags: ["lecture"] });

        const filtered = await t.query(api.functions.listFavorites, { userId: USER, tags: ["concert"] });
        expect(filtered).toHaveLength(1);
        expect(filtered[0].resourceId).toBe("res-1");
    });

    it("checks isFavorite — true", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.functions.addFavorite, { tenantId: TENANT, userId: USER, resourceId: "res-1" });
        const result = await t.query(api.functions.isFavorite, { userId: USER, resourceId: "res-1" });
        expect(result.isFavorite).toBe(true);
        expect(result.favorite).not.toBeNull();
    });

    it("checks isFavorite — false", async () => {
        const t = convexTest(schema, modules);
        const result = await t.query(api.functions.isFavorite, { userId: USER, resourceId: "nope" });
        expect(result.isFavorite).toBe(false);
        expect(result.favorite).toBeNull();
    });
});

// =============================================================================
// SAVED FILTERS — MUTATIONS
// =============================================================================

describe("user-prefs/mutations — saved filters", () => {
    it("creates a saved filter", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.functions.createFilter, {
            tenantId: TENANT,
            userId: USER,
            name: "My Search",
            type: "listing",
            filters: { category: "LOKALER", priceRange: [0, 5000] },
        });
        expect(result.id).toBeDefined();
    });

    it("updates a saved filter", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.functions.createFilter, {
            tenantId: TENANT, userId: USER, name: "Old", type: "listing", filters: {},
        });
        await t.mutation(api.functions.updateFilter, { id: id as any, name: "New", isDefault: true });

        const filters = await t.query(api.functions.listFilters, { userId: USER });
        expect(filters[0].name).toBe("New");
        expect(filters[0].isDefault).toBe(true);
    });

    it("removes a saved filter", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.functions.createFilter, {
            tenantId: TENANT, userId: USER, name: "X", type: "listing", filters: {},
        });
        const result = await t.mutation(api.functions.removeFilter, { id: id as any });
        expect(result.success).toBe(true);

        const filters = await t.query(api.functions.listFilters, { userId: USER });
        expect(filters).toHaveLength(0);
    });
});

// =============================================================================
// SAVED FILTERS — QUERIES
// =============================================================================

describe("user-prefs/queries — saved filters", () => {
    it("lists filters for a user", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.functions.createFilter, { tenantId: TENANT, userId: USER, name: "A", type: "listing", filters: {} });
        await t.mutation(api.functions.createFilter, { tenantId: TENANT, userId: USER, name: "B", type: "booking", filters: {} });

        const all = await t.query(api.functions.listFilters, { userId: USER });
        expect(all).toHaveLength(2);
    });

    it("filters by type", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.functions.createFilter, { tenantId: TENANT, userId: USER, name: "A", type: "listing", filters: {} });
        await t.mutation(api.functions.createFilter, { tenantId: TENANT, userId: USER, name: "B", type: "booking", filters: {} });

        const listings = await t.query(api.functions.listFilters, { userId: USER, type: "listing" });
        expect(listings).toHaveLength(1);
        expect(listings[0].name).toBe("A");
    });
});

// =============================================================================
// SCHEMA INDEXES
// =============================================================================

describe("user-prefs/schema — indexes", () => {
    it("favorites by_user_resource index works for uniqueness", async () => {
        const t = convexTest(schema, modules);
        await t.run(async (ctx) => {
            await ctx.db.insert("favorites", { tenantId: TENANT, userId: USER, resourceId: "res-1", tags: [], metadata: {} });
            const found = await ctx.db.query("favorites")
                .withIndex("by_user_resource", (q) => q.eq("userId", USER).eq("resourceId", "res-1"))
                .first();
            expect(found).not.toBeNull();
        });
    });

    it("savedFilters by_user index works", async () => {
        const t = convexTest(schema, modules);
        await t.run(async (ctx) => {
            await ctx.db.insert("savedFilters", { tenantId: TENANT, userId: USER, name: "F", type: "listing", filters: {} });
            const found = await ctx.db.query("savedFilters")
                .withIndex("by_user", (q) => q.eq("userId", USER))
                .collect();
            expect(found).toHaveLength(1);
        });
    });
});
