import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "../schema";
import { modules } from "../testSetup.test-util";
import { api } from "../_generated/api";

const TENANT = "tenant-classification-test";
const TENANT_B = "tenant-classification-other";

// =============================================================================
// CATEGORY MUTATIONS
// =============================================================================

describe("classification/mutations — categories", () => {
    it("creates a root category with defaults", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.mutations.createCategory, {
            tenantId: TENANT, name: "Venues", slug: "venues",
        });
        expect(result.id).toBeDefined();

        const cat = await t.query(api.queries.getCategoryById, { id: result.id as any }) as any;
        expect(cat!.name).toBe("Venues");
        expect(cat!.isActive).toBe(true);
        expect(cat!.sortOrder).toBe(0);
    });

    it("creates a child category", async () => {
        const t = convexTest(schema, modules);
        const parent = await t.mutation(api.mutations.createCategory, {
            tenantId: TENANT, name: "Venues", slug: "venues",
        });
        const child = await t.mutation(api.mutations.createCategory, {
            tenantId: TENANT, name: "Meeting Rooms", slug: "meeting-rooms",
            parentId: parent.id as any,
        });
        expect(child.id).toBeDefined();

        const cat = await t.query(api.queries.getCategoryById, { id: child.id as any }) as any;
        expect(cat!.parentId).toBe(parent.id);
    });

    it("rejects duplicate slug within same tenant", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createCategory, {
            tenantId: TENANT, name: "Venues", slug: "venues",
        });
        await expect(
            t.mutation(api.mutations.createCategory, {
                tenantId: TENANT, name: "Venues 2", slug: "venues",
            })
        ).rejects.toThrow(/already exists/);
    });

    it("allows same slug in different tenants", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createCategory, {
            tenantId: TENANT, name: "Venues", slug: "venues",
        });
        const result = await t.mutation(api.mutations.createCategory, {
            tenantId: TENANT_B, name: "Venues", slug: "venues",
        });
        expect(result.id).toBeDefined();
    });

    it("updates a category", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createCategory, {
            tenantId: TENANT, name: "Old", slug: "old",
        });
        await t.mutation(api.mutations.updateCategory, {
            id: id as any, name: "New", color: "#ff0000",
        });

        const cat = await t.query(api.queries.getCategoryById, { id: id as any }) as any;
        expect(cat!.name).toBe("New");
        expect(cat!.color).toBe("#ff0000");
    });

    it("rejects slug update to existing slug", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createCategory, {
            tenantId: TENANT, name: "A", slug: "a-cat",
        });
        const { id } = await t.mutation(api.mutations.createCategory, {
            tenantId: TENANT, name: "B", slug: "b-cat",
        });
        await expect(
            t.mutation(api.mutations.updateCategory, {
                id: id as any, slug: "a-cat",
            })
        ).rejects.toThrow(/already exists/);
    });

    it("deletes a category", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createCategory, {
            tenantId: TENANT, name: "Delete Me", slug: "delete-me",
        });
        await t.mutation(api.mutations.deleteCategory, { id: id as any });

        const cat = await t.query(api.queries.getCategoryById, { id: id as any });
        expect(cat).toBeNull();
    });

    it("cascade deletes children and their attributes", async () => {
        const t = convexTest(schema, modules);
        const parent = await t.mutation(api.mutations.createCategory, {
            tenantId: TENANT, name: "Parent", slug: "parent",
        });
        const child = await t.mutation(api.mutations.createCategory, {
            tenantId: TENANT, name: "Child", slug: "child", parentId: parent.id as any,
        });
        // Add attribute to child
        await t.mutation(api.mutations.createAttributeDefinition, {
            tenantId: TENANT, categoryId: child.id as any,
            key: "capacity", name: "Capacity", type: "number",
        });
        // Add attribute to parent
        await t.mutation(api.mutations.createAttributeDefinition, {
            tenantId: TENANT, categoryId: parent.id as any,
            key: "color-attr", name: "Color", type: "string",
        });

        await t.mutation(api.mutations.deleteCategory, { id: parent.id as any });

        // Child should be deleted
        const childCat = await t.query(api.queries.getCategoryById, { id: child.id as any });
        expect(childCat).toBeNull();

        // All attributes for this tenant should be gone
        const attrs = await t.query(api.queries.listAttributeDefinitions, { tenantId: TENANT });
        expect(attrs).toHaveLength(0);
    });

    it("reorders categories by array position", async () => {
        const t = convexTest(schema, modules);
        const a = await t.mutation(api.mutations.createCategory, {
            tenantId: TENANT, name: "A", slug: "a", sortOrder: 0,
        });
        const b = await t.mutation(api.mutations.createCategory, {
            tenantId: TENANT, name: "B", slug: "b", sortOrder: 1,
        });
        const c = await t.mutation(api.mutations.createCategory, {
            tenantId: TENANT, name: "C", slug: "c", sortOrder: 2,
        });

        // Reorder: C, A, B
        await t.mutation(api.mutations.reorderCategories, {
            ids: [c.id as any, a.id as any, b.id as any],
        });

        const catC = await t.query(api.queries.getCategoryById, { id: c.id as any }) as any;
        const catA = await t.query(api.queries.getCategoryById, { id: a.id as any }) as any;
        const catB = await t.query(api.queries.getCategoryById, { id: b.id as any }) as any;
        expect(catC!.sortOrder).toBe(0);
        expect(catA!.sortOrder).toBe(1);
        expect(catB!.sortOrder).toBe(2);
    });
});

// =============================================================================
// CATEGORY QUERIES
// =============================================================================

describe("classification/queries — categories", () => {
    it("listCategories returns only root categories by default", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createCategory, {
            tenantId: TENANT, name: "Root", slug: "root",
        });
        const parent = await t.mutation(api.mutations.createCategory, {
            tenantId: TENANT, name: "Parent", slug: "parent",
        });
        await t.mutation(api.mutations.createCategory, {
            tenantId: TENANT, name: "Child", slug: "child", parentId: parent.id as any,
        });

        const roots = await t.query(api.queries.listCategories, { tenantId: TENANT });
        expect(roots).toHaveLength(2);
        expect(roots.every((c: any) => c.parentId === undefined)).toBe(true);
    });

    it("listCategories with parentId returns children", async () => {
        const t = convexTest(schema, modules);
        const parent = await t.mutation(api.mutations.createCategory, {
            tenantId: TENANT, name: "Parent", slug: "parent",
        });
        await t.mutation(api.mutations.createCategory, {
            tenantId: TENANT, name: "Child 1", slug: "child-1", parentId: parent.id as any,
        });
        await t.mutation(api.mutations.createCategory, {
            tenantId: TENANT, name: "Child 2", slug: "child-2", parentId: parent.id as any,
        });

        const children = await t.query(api.queries.listCategories, {
            tenantId: TENANT, parentId: parent.id as any,
        });
        expect(children).toHaveLength(2);
    });

    it("getCategory by slug returns correct category", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createCategory, {
            tenantId: TENANT, name: "Events", slug: "events",
        });

        const cat = await t.query(api.queries.getCategory, { tenantId: TENANT, slug: "events" }) as any;
        expect(cat!.name).toBe("Events");
    });

    it("getCategoryTree returns nested structure", async () => {
        const t = convexTest(schema, modules);
        const parent = await t.mutation(api.mutations.createCategory, {
            tenantId: TENANT, name: "Venues", slug: "venues",
        });
        await t.mutation(api.mutations.createCategory, {
            tenantId: TENANT, name: "Rooms", slug: "rooms", parentId: parent.id as any,
        });

        const tree = await t.query(api.queries.getCategoryTree, { tenantId: TENANT });
        expect(tree).toHaveLength(1);
        expect(tree[0].name).toBe("Venues");
        expect(tree[0].children).toHaveLength(1);
        expect(tree[0].children[0].name).toBe("Rooms");
    });
});

// =============================================================================
// TAG MUTATIONS & QUERIES
// =============================================================================

describe("classification/mutations — tags", () => {
    it("creates a tag with defaults", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.mutations.createTag, {
            tenantId: TENANT, name: "Featured", slug: "featured",
        });
        expect(result.id).toBeDefined();

        const tags = await t.query(api.queries.listTags, { tenantId: TENANT });
        expect(tags).toHaveLength(1);
        expect(tags[0].isActive).toBe(true);
    });

    it("rejects duplicate tag slug within same tenant", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createTag, {
            tenantId: TENANT, name: "Featured", slug: "featured",
        });
        await expect(
            t.mutation(api.mutations.createTag, {
                tenantId: TENANT, name: "Featured Again", slug: "featured",
            })
        ).rejects.toThrow(/already exists/);
    });

    it("allows same tag slug in different tenants", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createTag, {
            tenantId: TENANT, name: "Featured", slug: "featured",
        });
        const result = await t.mutation(api.mutations.createTag, {
            tenantId: TENANT_B, name: "Featured", slug: "featured",
        });
        expect(result.id).toBeDefined();
    });

    it("updates a tag", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createTag, {
            tenantId: TENANT, name: "Old", slug: "old-tag",
        });
        await t.mutation(api.mutations.updateTag, {
            id: id as any, name: "New", color: "#00ff00",
        });

        const tag = await t.query(api.queries.getTag, { tenantId: TENANT, slug: "old-tag" }) as any;
        expect(tag!.name).toBe("New");
        expect(tag!.color).toBe("#00ff00");
    });

    it("deletes a tag", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createTag, {
            tenantId: TENANT, name: "Temp", slug: "temp-tag",
        });
        await t.mutation(api.mutations.deleteTag, { id: id as any });

        const tags = await t.query(api.queries.listTags, { tenantId: TENANT });
        expect(tags).toHaveLength(0);
    });

    it("getTag by slug returns correct tag", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createTag, {
            tenantId: TENANT, name: "Premium", slug: "premium", color: "#gold",
        });

        const tag = await t.query(api.queries.getTag, { tenantId: TENANT, slug: "premium" }) as any;
        expect(tag!.name).toBe("Premium");
        expect(tag!.color).toBe("#gold");
    });
});

// =============================================================================
// ATTRIBUTE DEFINITION MUTATIONS & QUERIES
// =============================================================================

describe("classification/mutations — attributeDefinitions", () => {
    it("creates an attribute definition with defaults", async () => {
        const t = convexTest(schema, modules);
        const cat = await t.mutation(api.mutations.createCategory, {
            tenantId: TENANT, name: "Venues", slug: "venues",
        });
        const result = await t.mutation(api.mutations.createAttributeDefinition, {
            tenantId: TENANT, categoryId: cat.id as any,
            key: "capacity", name: "Capacity", type: "number",
        });
        expect(result.id).toBeDefined();

        const attr = await t.query(api.queries.getAttributeDefinition, {
            tenantId: TENANT, key: "capacity",
        }) as any;
        expect(attr!.name).toBe("Capacity");
        expect(attr!.isRequired).toBe(false);
        expect(attr!.sortOrder).toBe(0);
    });

    it("rejects duplicate attribute key within same tenant", async () => {
        const t = convexTest(schema, modules);
        const cat = await t.mutation(api.mutations.createCategory, {
            tenantId: TENANT, name: "Venues", slug: "venues",
        });
        await t.mutation(api.mutations.createAttributeDefinition, {
            tenantId: TENANT, categoryId: cat.id as any,
            key: "capacity", name: "Capacity", type: "number",
        });
        await expect(
            t.mutation(api.mutations.createAttributeDefinition, {
                tenantId: TENANT, categoryId: cat.id as any,
                key: "capacity", name: "Capacity 2", type: "string",
            })
        ).rejects.toThrow(/already exists/);
    });

    it("updates an attribute definition", async () => {
        const t = convexTest(schema, modules);
        const cat = await t.mutation(api.mutations.createCategory, {
            tenantId: TENANT, name: "Venues", slug: "venues",
        });
        const { id } = await t.mutation(api.mutations.createAttributeDefinition, {
            tenantId: TENANT, categoryId: cat.id as any,
            key: "size", name: "Size", type: "string",
        });
        await t.mutation(api.mutations.updateAttributeDefinition, {
            id: id as any, name: "Room Size", isRequired: true,
        });

        const attr = await t.query(api.queries.getAttributeDefinition, {
            tenantId: TENANT, key: "size",
        }) as any;
        expect(attr!.name).toBe("Room Size");
        expect(attr!.isRequired).toBe(true);
    });

    it("deletes an attribute definition", async () => {
        const t = convexTest(schema, modules);
        const cat = await t.mutation(api.mutations.createCategory, {
            tenantId: TENANT, name: "Venues", slug: "venues",
        });
        const { id } = await t.mutation(api.mutations.createAttributeDefinition, {
            tenantId: TENANT, categoryId: cat.id as any,
            key: "remove-me", name: "Remove", type: "string",
        });
        await t.mutation(api.mutations.deleteAttributeDefinition, { id: id as any });

        const attrs = await t.query(api.queries.listAttributeDefinitions, { tenantId: TENANT });
        expect(attrs).toHaveLength(0);
    });

    it("listAttributeDefinitions filters by categoryId", async () => {
        const t = convexTest(schema, modules);
        const catA = await t.mutation(api.mutations.createCategory, {
            tenantId: TENANT, name: "A", slug: "a",
        });
        const catB = await t.mutation(api.mutations.createCategory, {
            tenantId: TENANT, name: "B", slug: "b",
        });
        await t.mutation(api.mutations.createAttributeDefinition, {
            tenantId: TENANT, categoryId: catA.id as any,
            key: "attr-a", name: "Attr A", type: "string",
        });
        await t.mutation(api.mutations.createAttributeDefinition, {
            tenantId: TENANT, categoryId: catB.id as any,
            key: "attr-b", name: "Attr B", type: "number",
        });

        const attrsA = await t.query(api.queries.listAttributeDefinitions, {
            tenantId: TENANT, categoryId: catA.id as any,
        });
        expect(attrsA).toHaveLength(1);
        expect(attrsA[0].key).toBe("attr-a");
    });
});

// =============================================================================
// SCHEMA INDEXES
// =============================================================================

describe("classification/schema — indexes", () => {
    it("categories by_tenant index works", async () => {
        const t = convexTest(schema, modules);
        await t.run(async (ctx) => {
            await ctx.db.insert("categories", {
                tenantId: TENANT, name: "Direct", slug: "direct",
                sortOrder: 0, isActive: true,
            });
            const found = await ctx.db.query("categories")
                .withIndex("by_tenant", (q) => q.eq("tenantId", TENANT)).collect();
            expect(found).toHaveLength(1);
        });
    });

    it("tags by_tenant_slug index works", async () => {
        const t = convexTest(schema, modules);
        await t.run(async (ctx) => {
            await ctx.db.insert("tags", {
                tenantId: TENANT, name: "Test", slug: "test-idx",
                isActive: true,
            });
            const found = await ctx.db.query("tags")
                .withIndex("by_tenant_slug", (q) => q.eq("tenantId", TENANT).eq("slug", "test-idx"))
                .collect();
            expect(found).toHaveLength(1);
        });
    });
});
