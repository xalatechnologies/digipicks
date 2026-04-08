import { describe, it, expect } from "vitest";
import { api, components } from "../../_generated/api";
import { createDomainTest, seedTestTenant } from "./testHelper.test-util";

describe("domain/classification", () => {
    function setup() {
        return createDomainTest(["classification", "audit"]);
    }

    // =========================================================================
    // CATEGORY CREATION
    // =========================================================================

    describe("createCategory", () => {
        it("creates a category via facade", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const result = await t.mutation(api.domain.classification.createCategory, {
                tenantId,
                name: "Venues",
                slug: "venues",
            });

            expect(result.id).toBeDefined();
        });

        it("creates an audit entry on category creation", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id: categoryId } = await t.mutation(api.domain.classification.createCategory, {
                tenantId,
                name: "Events",
                slug: "events",
            });

            const entries = await t.query(components.audit.functions.listForTenant, {
                tenantId: tenantId as string,
            });

            const catEntry = entries.find(
                (e: any) => e.entityType === "classification_category" && e.entityId === categoryId
            );
            expect(catEntry).toBeDefined();
            expect(catEntry.action).toBe("category_created");
        });
    });

    // =========================================================================
    // CATEGORY QUERIES
    // =========================================================================

    describe("listCategories", () => {
        it("returns categories for a tenant", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            await t.mutation(api.domain.classification.createCategory, {
                tenantId,
                name: "Venues",
                slug: "venues",
            });
            await t.mutation(api.domain.classification.createCategory, {
                tenantId,
                name: "Events",
                slug: "events",
            });

            const categories = await t.query(api.domain.classification.listCategories, {
                tenantId,
            });

            expect(categories.length).toBe(2);
        });
    });

    describe("getCategoryTree", () => {
        it("returns nested category tree via facade", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const parent = await t.mutation(api.domain.classification.createCategory, {
                tenantId,
                name: "Venues",
                slug: "venues",
            });
            await t.mutation(api.domain.classification.createCategory, {
                tenantId,
                name: "Meeting Rooms",
                slug: "meeting-rooms",
                parentId: parent.id,
            });

            const tree = await t.query(api.domain.classification.getCategoryTree, {
                tenantId,
            });

            expect(tree).toHaveLength(1);
            expect(tree[0].name).toBe("Venues");
            expect(tree[0].children).toHaveLength(1);
            expect(tree[0].children[0].name).toBe("Meeting Rooms");
        });
    });

    // =========================================================================
    // TENANT ISOLATION
    // =========================================================================

    describe("tenant isolation", () => {
        it("does not return categories from another tenant", async () => {
            const t = setup();
            const { tenantId: tenantA } = await seedTestTenant(t);

            // Create second tenant inline
            const tenantB = await t.run(async (ctx) => {
                return ctx.db.insert("tenants", {
                    name: "Other Tenant",
                    slug: "other",
                    status: "active",
                    settings: {},
                    seatLimits: { max: 50 },
                    featureFlags: { classification: true },
                    enabledCategories: ["ALLE"],
                });
            });

            await t.mutation(api.domain.classification.createCategory, {
                tenantId: tenantA,
                name: "Tenant A Category",
                slug: "a-cat",
            });
            await t.mutation(api.domain.classification.createCategory, {
                tenantId: tenantB,
                name: "Tenant B Category",
                slug: "b-cat",
            });

            const catsA = await t.query(api.domain.classification.listCategories, { tenantId: tenantA });
            const catsB = await t.query(api.domain.classification.listCategories, { tenantId: tenantB });

            expect(catsA).toHaveLength(1);
            expect(catsA[0].name).toBe("Tenant A Category");
            expect(catsB).toHaveLength(1);
            expect(catsB[0].name).toBe("Tenant B Category");
        });
    });

    // =========================================================================
    // TAGS
    // =========================================================================

    describe("tags", () => {
        it("creates and lists tags via facade", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            await t.mutation(api.domain.classification.createTag, {
                tenantId,
                name: "Featured",
                slug: "featured",
                color: "#ff0000",
            });

            const tags = await t.query(api.domain.classification.listTags, { tenantId });
            expect(tags).toHaveLength(1);
            expect(tags[0].name).toBe("Featured");
        });

        it("gets a tag by slug via facade", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            await t.mutation(api.domain.classification.createTag, {
                tenantId,
                name: "Premium",
                slug: "premium",
            });

            const tag = await t.query(api.domain.classification.getTag, {
                tenantId,
                slug: "premium",
            });
            expect(tag).toBeDefined();
            expect(tag.name).toBe("Premium");
        });
    });

    // =========================================================================
    // ATTRIBUTE DEFINITIONS
    // =========================================================================

    describe("attributeDefinitions", () => {
        it("creates and lists attribute definitions via facade", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const cat = await t.mutation(api.domain.classification.createCategory, {
                tenantId,
                name: "Venues",
                slug: "venues",
            });

            await t.mutation(api.domain.classification.createAttributeDefinition, {
                tenantId,
                categoryId: cat.id,
                key: "capacity",
                name: "Capacity",
                type: "number",
                isRequired: true,
            });

            const attrs = await t.query(api.domain.classification.listAttributeDefinitions, {
                tenantId,
            });

            expect(attrs).toHaveLength(1);
            expect(attrs[0].key).toBe("capacity");
            expect(attrs[0].isRequired).toBe(true);
        });

        it("gets attribute definition by key via facade", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const cat = await t.mutation(api.domain.classification.createCategory, {
                tenantId,
                name: "Events",
                slug: "events",
            });

            await t.mutation(api.domain.classification.createAttributeDefinition, {
                tenantId,
                categoryId: cat.id,
                key: "max-attendees",
                name: "Max Attendees",
                type: "number",
            });

            const attr = await t.query(api.domain.classification.getAttributeDefinition, {
                tenantId,
                key: "max-attendees",
            });

            expect(attr).toBeDefined();
            expect(attr.name).toBe("Max Attendees");
        });
    });
});
