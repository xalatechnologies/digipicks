import { describe, it, expect } from "vitest";
import { api, components } from "../../_generated/api";
import { createDomainTest, seedTestTenant, seedResource } from "./testHelper.test-util";

describe("domain/search", () => {
    function setup() {
        return createDomainTest(["resources", "reviews", "audit"]);
    }

    /**
     * Seed a standard set of resources for search tests.
     */
    async function seedSearchData(t: ReturnType<typeof setup>, tenantId: string) {
        await seedResource(t, tenantId, {
            name: "Festsalen, Samfunnshuset",
            slug: "festsalen",
            categoryKey: "LOKALER",
            status: "active",
            description: "Stort selskapslokale for konferanser og fester",
            metadata: { city: "Testby" },
        });
        await seedResource(t, tenantId, {
            name: "Klubbscenen, Samfunnshuset",
            slug: "klubbscenen",
            categoryKey: "LOKALER",
            status: "active",
            description: "Intimscene for konserter og standup",
            metadata: { city: "Testby" },
        });
        await seedResource(t, tenantId, {
            name: "Padelbane 1",
            slug: "padelbane-1",
            categoryKey: "SPORT",
            status: "active",
            description: "Innendørs padelbane",
            metadata: { city: "Testby" },
            subcategoryKeys: ["PADEL"],
        });
        await seedResource(t, tenantId, {
            name: "Jazzkonsert 2026",
            slug: "jazzkonsert-2026",
            categoryKey: "ARRANGEMENTER",
            status: "active",
            description: "En kveld med jazz på Elvesalen",
            metadata: { city: "Testby" },
        });
        await seedResource(t, tenantId, {
            name: "Archived Room",
            slug: "archived-room",
            categoryKey: "LOKALER",
            status: "archived",
            description: "This room is archived",
        });
    }

    // =========================================================================
    // globalSearch
    // =========================================================================

    describe("globalSearch", () => {
        it("returns matching resources by name", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            await seedSearchData(t, tenantId as string);

            const result = await t.query(api.domain.search.globalSearch, {
                tenantId,
                searchTerm: "Festsalen",
            });

            expect(result.results.length).toBeGreaterThanOrEqual(1);
            expect(result.results[0].name).toContain("Festsalen");
        });

        it("returns empty for empty search term", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            await seedSearchData(t, tenantId as string);

            const result = await t.query(api.domain.search.globalSearch, {
                tenantId,
                searchTerm: "",
            });

            expect(result.results.length).toBe(0);
            expect(result.total).toBe(0);
        });

        it("filters by categoryKey", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            await seedSearchData(t, tenantId as string);

            const result = await t.query(api.domain.search.globalSearch, {
                tenantId,
                searchTerm: "Testby",
                categoryKey: "SPORT",
            });

            for (const r of result.results) {
                expect(r.categoryKey).toBe("SPORT");
            }
        });

        it("respects limit", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            await seedSearchData(t, tenantId as string);

            const result = await t.query(api.domain.search.globalSearch, {
                tenantId,
                searchTerm: "Testby",
                limit: 1,
            });

            expect(result.results.length).toBe(1);
            expect(result.hasMore).toBe(true);
        });

        it("excludes deleted resources by default", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            // Seed a resource and soft-delete it (published -> deleted is valid)
            const resource = await seedResource(t, tenantId as string, {
                name: "Deleted Room",
                slug: "deleted-room",
                categoryKey: "LOKALER",
                status: "published",
            });
            await t.mutation(components.resources.mutations.remove, { id: resource.id as any });

            const result = await t.query(api.domain.search.globalSearch, {
                tenantId,
                searchTerm: "Deleted",
            });

            expect(result.results.length).toBe(0);
        });

        it("searches in description", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            await seedSearchData(t, tenantId as string);

            const result = await t.query(api.domain.search.globalSearch, {
                tenantId,
                searchTerm: "konferanse",
            });

            expect(result.results.length).toBeGreaterThanOrEqual(1);
        });

        it("returns category suggestions", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            await seedSearchData(t, tenantId as string);

            const result = await t.query(api.domain.search.globalSearch, {
                tenantId,
                searchTerm: "sport",
                includeCategorySuggestions: true,
            });

            expect(result.categorySuggestions.length).toBeGreaterThanOrEqual(1);
            const sportSuggestion = result.categorySuggestions.find(
                (s: any) => s.key === "SPORT"
            );
            expect(sportSuggestion).toBeDefined();
        });

        it("supports pagination offset", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            await seedSearchData(t, tenantId as string);

            const page1 = await t.query(api.domain.search.globalSearch, {
                tenantId,
                searchTerm: "Testby",
                limit: 2,
                offset: 0,
            });
            const page2 = await t.query(api.domain.search.globalSearch, {
                tenantId,
                searchTerm: "Testby",
                limit: 2,
                offset: 2,
            });

            // Pages should not overlap
            const page1Ids = new Set(page1.results.map((r: any) => r.id));
            for (const r of page2.results) {
                expect(page1Ids.has(r.id)).toBe(false);
            }
        });
    });

    // =========================================================================
    // globalSearchPublic
    // =========================================================================

    describe("globalSearchPublic", () => {
        it("searches published resources", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string, {
                name: "Public Venue",
                slug: "public-venue",
                categoryKey: "LOKALER",
                status: "draft",
            });
            // Publish it
            await t.mutation(components.resources.mutations.publish, { id: resource.id as any });

            const result = await t.query(api.domain.search.globalSearchPublic, {
                searchTerm: "Public",
            });

            expect(result.results.length).toBeGreaterThanOrEqual(1);
            expect(result.results[0].name).toBe("Public Venue");
        });

        it("does not return unpublished resources", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            await seedResource(t, tenantId as string, {
                name: "Draft Only",
                slug: "draft-only",
                categoryKey: "LOKALER",
                status: "draft",
            });

            const result = await t.query(api.domain.search.globalSearchPublic, {
                searchTerm: "Draft Only",
            });

            expect(result.results.length).toBe(0);
        });
    });

    // =========================================================================
    // typeaheadPublic
    // =========================================================================

    describe("typeaheadPublic", () => {
        it("returns suggestions matching prefix", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string, {
                name: "Festsalen",
                slug: "festsalen",
                categoryKey: "LOKALER",
                status: "draft",
            });
            await t.mutation(components.resources.mutations.publish, { id: resource.id as any });

            const result = await t.query(api.domain.search.typeaheadPublic, {
                prefix: "fest",
            });

            expect(result.suggestions.length).toBeGreaterThanOrEqual(1);
            expect(result.suggestions[0].name).toContain("Festsalen");
        });

        it("returns empty for empty prefix", async () => {
            const t = setup();
            await seedTestTenant(t);

            const result = await t.query(api.domain.search.typeaheadPublic, {
                prefix: "",
            });

            expect(result.suggestions.length).toBe(0);
        });

        it("respects limit", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            // Create and publish multiple resources
            for (let i = 0; i < 5; i++) {
                const r = await seedResource(t, tenantId as string, {
                    name: `Sal ${i}`,
                    slug: `sal-${i}`,
                    categoryKey: "LOKALER",
                    status: "draft",
                });
                await t.mutation(components.resources.mutations.publish, { id: r.id as any });
            }

            const result = await t.query(api.domain.search.typeaheadPublic, {
                prefix: "Sal",
                limit: 2,
            });

            expect(result.suggestions.length).toBe(2);
        });

        it("returns category suggestions", async () => {
            const t = setup();
            await seedTestTenant(t);

            const result = await t.query(api.domain.search.typeaheadPublic, {
                prefix: "lokal",
                includeCategorySuggestions: true,
            });

            expect(result.categorySuggestions.length).toBeGreaterThanOrEqual(1);
        });
    });

    // =========================================================================
    // typeahead
    // =========================================================================

    describe("typeahead", () => {
        it("returns tenant-scoped suggestions", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            await seedResource(t, tenantId as string, {
                name: "Festsalen", slug: "festsalen", status: "active",
            });

            const result = await t.query(api.domain.search.typeahead, {
                tenantId,
                prefix: "fest",
            });

            expect(result.length).toBeGreaterThanOrEqual(1);
            expect(result[0].name).toContain("Festsalen");
        });

        it("returns empty for empty prefix", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const result = await t.query(api.domain.search.typeahead, {
                tenantId,
                prefix: "",
            });

            expect(result.length).toBe(0);
        });

        it("filters by categoryKey", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            await seedSearchData(t, tenantId as string);

            const result = await t.query(api.domain.search.typeahead, {
                tenantId,
                prefix: "p",
                categoryKey: "SPORT",
            });

            for (const s of result) {
                expect(s.categoryKey).toBe("SPORT");
            }
        });
    });

    // =========================================================================
    // searchSuggestions
    // =========================================================================

    describe("searchSuggestions", () => {
        it("returns category and city suggestions", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            await seedSearchData(t, tenantId as string);

            const result = await t.query(api.domain.search.searchSuggestions, {
                tenantId,
            });

            expect(result.length).toBeGreaterThan(0);
            const types = result.map((s: any) => s.type);
            expect(types).toContain("category");
        });

        it("filters suggestions by prefix", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            await seedSearchData(t, tenantId as string);

            const result = await t.query(api.domain.search.searchSuggestions, {
                tenantId,
                prefix: "LOKAL",
            });

            expect(result.length).toBeGreaterThanOrEqual(1);
            for (const s of result) {
                expect(s.value.toLowerCase()).toContain("lokal");
            }
        });

        it("respects limit", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            await seedSearchData(t, tenantId as string);

            const result = await t.query(api.domain.search.searchSuggestions, {
                tenantId,
                limit: 2,
            });

            expect(result.length).toBeLessThanOrEqual(2);
        });
    });

    // =========================================================================
    // searchFacets
    // =========================================================================

    describe("searchFacets", () => {
        it("returns facet counts", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            await seedSearchData(t, tenantId as string);

            const result = await t.query(api.domain.search.searchFacets, {
                tenantId,
            });

            expect(result.total).toBeGreaterThan(0);
            expect(result.categories.length).toBeGreaterThan(0);
            // Verify category counts
            const lokalerFacet = result.categories.find((c: any) => c.key === "LOKALER");
            expect(lokalerFacet).toBeDefined();
            // 2 active LOKALER + 1 archived LOKALER (not deleted) = total depends on filter
        });

        it("filters facets by status", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            await seedSearchData(t, tenantId as string);

            const result = await t.query(api.domain.search.searchFacets, {
                tenantId,
                status: "active",
            });

            for (const s of result.statuses) {
                expect(s.key).toBe("active");
            }
        });

        it("filters facets by search term", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            await seedSearchData(t, tenantId as string);

            const result = await t.query(api.domain.search.searchFacets, {
                tenantId,
                searchTerm: "padel",
            });

            // Only the padelbane should match
            expect(result.total).toBeGreaterThanOrEqual(1);
            const sportFacet = result.categories.find((c: any) => c.key === "SPORT");
            expect(sportFacet).toBeDefined();
        });

        it("returns city facets from metadata", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            await seedSearchData(t, tenantId as string);

            const result = await t.query(api.domain.search.searchFacets, {
                tenantId,
            });

            const testCity = result.cities.find((c: any) => c.key === "Testby");
            expect(testCity).toBeDefined();
            expect(testCity!.count).toBeGreaterThanOrEqual(1);
        });
    });
});
