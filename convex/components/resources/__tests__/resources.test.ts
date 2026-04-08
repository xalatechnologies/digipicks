/**
 * Resources Component — Comprehensive convex-test Tests
 *
 * Tests the real Convex mutation and query functions in:
 *   components/resources/mutations.ts
 *   components/resources/queries.ts
 *
 * Uses convex-test with the real schema so all schema validators and
 * the status state machine run against actual function code.
 *
 * Run: npx vitest --config convex/vitest.config.ts components/resources/resources.test.ts
 */

import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../schema";
import { modules } from "../testSetup.test-util";
import { api } from "../_generated/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT = "tenant-001";
const TENANT_B = "tenant-002";

async function createResource(t: ReturnType<typeof convexTest>, overrides: Record<string, unknown> = {}) {
    return t.mutation(api.mutations.create, {
        tenantId: TENANT,
        name: "Meeting Room A",
        slug: `room-a-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        categoryKey: "lokale",
        ...overrides,
    });
}

// ---------------------------------------------------------------------------
// Create (upsert by slug)
// ---------------------------------------------------------------------------

describe("resources/mutations — create", () => {
    it("creates a resource with draft status by default", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createResource(t);
        const resource = await t.run(async (ctx) => ctx.db.get(id as any));
        expect(resource?.status).toBe("draft");
    });

    it("allows specifying a custom initial status", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createResource(t, { status: "published" });
        const resource = await t.run(async (ctx) => ctx.db.get(id as any));
        expect(resource?.status).toBe("published");
    });

    it("upserts (updates) when same slug + tenantId already exists", async () => {
        const t = convexTest(schema, modules);
        const slug = `room-upsert-${Date.now()}`;

        const { id: id1 } = await t.mutation(api.mutations.create, {
            tenantId: TENANT,
            name: "Original Name",
            slug,
            categoryKey: "lokale",
        });

        const { id: id2 } = await t.mutation(api.mutations.create, {
            tenantId: TENANT,
            name: "Updated Name",
            slug,
            categoryKey: "lokale",
        });

        // Same document should be updated
        expect(id1).toBe(id2);
        const resource = await t.run(async (ctx) => ctx.db.get(id1 as any));
        expect(resource?.name).toBe("Updated Name");
    });

    it("creates two separate resources when slugs differ", async () => {
        const t = convexTest(schema, modules);
        const base = Date.now();

        const { id: id1 } = await t.mutation(api.mutations.create, {
            tenantId: TENANT,
            name: "Room A",
            slug: `room-a-${base}`,
            categoryKey: "lokale",
        });
        const { id: id2 } = await t.mutation(api.mutations.create, {
            tenantId: TENANT,
            name: "Room B",
            slug: `room-b-${base}`,
            categoryKey: "lokale",
        });

        expect(id1).not.toBe(id2);
    });

    it("same slug on different tenants creates separate resources", async () => {
        const t = convexTest(schema, modules);
        const slug = `shared-slug-${Date.now()}`;

        const { id: id1 } = await t.mutation(api.mutations.create, { tenantId: TENANT, name: "A", slug, categoryKey: "lokale" });
        const { id: id2 } = await t.mutation(api.mutations.create, { tenantId: TENANT_B, name: "B", slug, categoryKey: "lokale" });

        expect(id1).not.toBe(id2);
    });

    it("persists all promoted fields", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.create, {
            tenantId: TENANT,
            name: "Conference Room",
            slug: `conf-${Date.now()}`,
            categoryKey: "lokale",
            capacity: 50,
            visibility: "public",
            location: { city: "Oslo", country: "Norway" },
        });

        const resource = await t.run(async (ctx) => ctx.db.get(id as any));
        expect(resource?.capacity).toBe(50);
        expect(resource?.visibility).toBe("public");
        expect(resource?.location?.city).toBe("Oslo");
    });
});

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

describe("resources/mutations — update", () => {
    it("patches name and description", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createResource(t);

        await t.mutation(api.mutations.update, {
            id: id as any,
            name: "New Name",
            description: "New description",
        });

        const resource = await t.run(async (ctx) => ctx.db.get(id as any));
        expect(resource?.name).toBe("New Name");
        expect(resource?.description).toBe("New description");
    });

    it("deep-merges metadata on update (preserves existing keys)", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.create, {
            tenantId: TENANT,
            name: "Room",
            slug: `mergetest-${Date.now()}`,
            categoryKey: "lokale",
            metadata: { originalKey: "keepMe" },
        });

        await t.mutation(api.mutations.update, {
            id: id as any,
            metadata: { newKey: "addedValue" },
        });

        const resource = await t.run(async (ctx) => ctx.db.get(id as any));
        expect((resource?.metadata as any).originalKey).toBe("keepMe");
        expect((resource?.metadata as any).newKey).toBe("addedValue");
    });

    it("throws when resource does not exist", async () => {
        const t = convexTest(schema, modules);

        const staleId = await t.run(async (ctx) => {
            const id = await ctx.db.insert("resources", {
                tenantId: TENANT, name: "R", slug: "stale", categoryKey: "lokale",
                timeMode: "PERIOD", features: [], status: "draft",
                requiresApproval: false, images: [], pricing: {}, metadata: {},
            });
            await ctx.db.delete(id);
            return id;
        });

        await expect(
            t.mutation(api.mutations.update, { id: staleId, name: "Won't work" })
        ).rejects.toThrow("Resource not found");
    });
});

// ---------------------------------------------------------------------------
// Status state machine
// ---------------------------------------------------------------------------

describe("resources/mutations — status machine", () => {
    it("draft → published via publish()", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createResource(t);

        await t.mutation(api.mutations.publish, { id: id as any });

        const resource = await t.run(async (ctx) => ctx.db.get(id as any));
        expect(resource?.status).toBe("published");
    });

    it("published → draft via unpublish()", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createResource(t, { status: "published" });

        await t.mutation(api.mutations.unpublish, { id: id as any });

        const resource = await t.run(async (ctx) => ctx.db.get(id as any));
        expect(resource?.status).toBe("draft");
    });

    it("draft → archived via archive()", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createResource(t);

        await t.mutation(api.mutations.archive, { id: id as any });

        const resource = await t.run(async (ctx) => ctx.db.get(id as any));
        expect(resource?.status).toBe("archived");
    });

    it("archived → draft via restore()", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createResource(t, { status: "archived" });

        await t.mutation(api.mutations.restore, { id: id as any });

        const resource = await t.run(async (ctx) => ctx.db.get(id as any));
        expect(resource?.status).toBe("draft");
    });

    it("draft → deleted via remove()", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createResource(t);

        await t.mutation(api.mutations.remove, { id: id as any });

        const resource = await t.run(async (ctx) => ctx.db.get(id as any));
        expect(resource?.status).toBe("deleted");
    });

    it("published → deleted via remove()", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createResource(t, { status: "published" });

        await t.mutation(api.mutations.remove, { id: id as any });

        const resource = await t.run(async (ctx) => ctx.db.get(id as any));
        expect(resource?.status).toBe("deleted");
    });

    it("rejects invalid transition: deleted → published is not allowed", async () => {
        const t = convexTest(schema, modules);
        // Start from draft, walk through archive → restore → remove to reach deleted
        const { id } = await createResource(t); // → draft

        await t.mutation(api.mutations.archive, { id: id as any }); // draft → archived
        await t.mutation(api.mutations.restore, { id: id as any }); // archived → draft
        await t.mutation(api.mutations.remove, { id: id as any });  // draft → deleted

        // deleted → published is an invalid transition
        await expect(
            t.mutation(api.mutations.publish, { id: id as any })
        ).rejects.toThrow(/Invalid status transition/);
    });

    it("throws when target resource does not exist (remove)", async () => {
        const t = convexTest(schema, modules);

        const staleId = await t.run(async (ctx) => {
            const id = await ctx.db.insert("resources", {
                tenantId: TENANT, name: "R", slug: "stale2", categoryKey: "lokale",
                timeMode: "PERIOD", features: [], status: "draft",
                requiresApproval: false, images: [], pricing: {}, metadata: {},
            });
            await ctx.db.delete(id);
            return id;
        });

        await expect(
            t.mutation(api.mutations.remove, { id: staleId })
        ).rejects.toThrow("Resource not found");
    });
});

// ---------------------------------------------------------------------------
// hardDelete
// ---------------------------------------------------------------------------

describe("resources/mutations — hardDelete", () => {
    it("permanently removes the resource row", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createResource(t);

        await t.mutation(api.mutations.hardDelete, { id: id as any });

        const gone = await t.run(async (ctx) => ctx.db.get(id as any));
        expect(gone).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// cloneResource
// ---------------------------------------------------------------------------

describe("resources/mutations — cloneResource", () => {
    it("creates a new resource with a -copy slug", async () => {
        const t = convexTest(schema, modules);
        const slug = `original-${Date.now()}`;
        const { id: originalId } = await t.mutation(api.mutations.create, {
            tenantId: TENANT,
            name: "Original",
            slug,
            categoryKey: "lokale",
        });

        const result = await t.mutation(api.mutations.cloneResource, { id: originalId as any });

        expect(result.slug).toContain("copy");
        expect(result.id).not.toBe(originalId);
    });

    it("generates a unique slug when -copy already exists", async () => {
        const t = convexTest(schema, modules);
        const slug = `dup-${Date.now()}`;

        const { id: originalId } = await t.mutation(api.mutations.create, {
            tenantId: TENANT, name: "Original", slug, categoryKey: "lokale",
        });

        // Clone once
        const first = await t.mutation(api.mutations.cloneResource, { id: originalId as any });
        // Clone again — should get a numbered suffix
        const second = await t.mutation(api.mutations.cloneResource, { id: originalId as any });

        expect(first.slug).not.toBe(second.slug);
    });
});

// ---------------------------------------------------------------------------
// Schema index correctness
// ---------------------------------------------------------------------------

describe("resources schema — index correctness", () => {
    it("by_slug index returns only resources for the given tenant", async () => {
        const t = convexTest(schema, modules);
        const slug = `idx-test-${Date.now()}`;

        await t.mutation(api.mutations.create, { tenantId: TENANT, name: "A", slug, categoryKey: "lokale" });
        await t.mutation(api.mutations.create, { tenantId: TENANT_B, name: "B", slug, categoryKey: "lokale" });

        const result = await t.run(async (ctx) =>
            ctx.db.query("resources")
                .withIndex("by_slug", (q) => q.eq("tenantId", TENANT).eq("slug", slug))
                .collect()
        );

        expect(result.length).toBe(1);
        expect(result[0].tenantId).toBe(TENANT);
    });

    it("by_tenant index returns all resources for a tenant", async () => {
        const t = convexTest(schema, modules);
        const base = Date.now();

        await t.mutation(api.mutations.create, { tenantId: TENANT, name: "R1", slug: `r1-${base}`, categoryKey: "lokale" });
        await t.mutation(api.mutations.create, { tenantId: TENANT, name: "R2", slug: `r2-${base}`, categoryKey: "lokale" });
        await t.mutation(api.mutations.create, { tenantId: TENANT_B, name: "R3", slug: `r3-${base}`, categoryKey: "lokale" });

        const result = await t.run(async (ctx) =>
            ctx.db.query("resources")
                .withIndex("by_tenant", (q) => q.eq("tenantId", TENANT))
                .collect()
        );

        expect(result.length).toBeGreaterThanOrEqual(2);
        result.forEach((r) => expect(r.tenantId).toBe(TENANT));
    });

    it("by_status index returns only matched resources", async () => {
        const t = convexTest(schema, modules);
        const base = Date.now();

        await t.mutation(api.mutations.create, { tenantId: TENANT, name: "Draft", slug: `d-${base}`, categoryKey: "lokale" });
        await t.mutation(api.mutations.create, { tenantId: TENANT, name: "Published", slug: `p-${base}`, categoryKey: "lokale", status: "published" });

        const published = await t.run(async (ctx) =>
            ctx.db.query("resources")
                .withIndex("by_status", (q) => q.eq("status", "published"))
                .collect()
        );

        published.forEach((r) => expect(r.status).toBe("published"));
    });

    it("by_category index allows filtering by categoryKey", async () => {
        const t = convexTest(schema, modules);
        const base = Date.now();

        await t.mutation(api.mutations.create, { tenantId: TENANT, name: "Hall", slug: `hall-${base}`, categoryKey: "arrangement" });
        await t.mutation(api.mutations.create, { tenantId: TENANT, name: "Room", slug: `room-${base}`, categoryKey: "lokale" });

        const halls = await t.run(async (ctx) =>
            ctx.db.query("resources")
                .withIndex("by_category", (q) => q.eq("categoryKey", "arrangement"))
                .collect()
        );

        halls.forEach((r) => expect(r.categoryKey).toBe("arrangement"));
    });

    it("by_venue index is queryable", async () => {
        const t = convexTest(schema, modules);
        const venueId = "venue-001";

        await t.run(async (ctx) =>
            ctx.db.insert("resources", {
                tenantId: TENANT,
                name: "Event at Venue",
                slug: `event-${Date.now()}`,
                categoryKey: "arrangement",
                timeMode: "PERIOD",
                features: [],
                status: "draft",
                requiresApproval: false,
                images: [],
                pricing: {},
                metadata: {},
                venueId,
            })
        );

        const events = await t.run(async (ctx) =>
            ctx.db.query("resources")
                .withIndex("by_venue", (q) => q.eq("venueId", venueId))
                .collect()
        );

        expect(events.length).toBe(1);
        expect(events[0].venueId).toBe(venueId);
    });
});

// ---------------------------------------------------------------------------
// Cascade deletion on resources
// ---------------------------------------------------------------------------

describe("resources — cascade deletion chain (hardDelete)", () => {
    it("after hardDelete the resource id is no longer accessible", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createResource(t);

        await t.mutation(api.mutations.hardDelete, { id: id as any });

        const gone = await t.run(async (ctx) => ctx.db.get(id as any));
        expect(gone).toBeNull();
    });

    it("hardDelete does not affect resources in other tenants", async () => {
        const t = convexTest(schema, modules);
        const base = Date.now();

        const { id: deleteTarget } = await t.mutation(api.mutations.create, {
            tenantId: TENANT, name: "Delete Me", slug: `del-${base}`, categoryKey: "lokale",
        });
        const { id: keepTarget } = await t.mutation(api.mutations.create, {
            tenantId: TENANT_B, name: "Keep Me", slug: `keep-${base}`, categoryKey: "lokale",
        });

        await t.mutation(api.mutations.hardDelete, { id: deleteTarget as any });

        const kept = await t.run(async (ctx) => ctx.db.get(keepTarget as any));
        expect(kept).not.toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Event-venue fields
// ---------------------------------------------------------------------------

describe("resources/mutations — event-venue fields", () => {
    it("persists event-specific fields (subtitle, eventDate, venueId, etc.)", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.create, {
            tenantId: TENANT,
            name: "Jazz Night",
            slug: `jazz-${Date.now()}`,
            categoryKey: "arrangement",
            subtitle: "An evening of jazz",
            eventDate: "2026-03-15",
            startTime: "19:00",
            endTime: "21:30",
            venueId: "venue-001",
            duration: 150,
            priceMax: 500,
            ageLimit: 18,
            tags: ["jazz", "live"],
        });

        const resource = await t.run(async (ctx) => ctx.db.get(id as any));
        expect(resource?.subtitle).toBe("An evening of jazz");
        expect(resource?.eventDate).toBe("2026-03-15");
        expect(resource?.startTime).toBe("19:00");
        expect(resource?.endTime).toBe("21:30");
        expect(resource?.venueId).toBe("venue-001");
        expect(resource?.duration).toBe(150);
        expect(resource?.priceMax).toBe(500);
        expect(resource?.ageLimit).toBe(18);
        expect(resource?.tags).toEqual(["jazz", "live"]);
    });

    it("persists ticketUrl and venueBookingId on update", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createResource(t, { categoryKey: "arrangement" });

        await t.mutation(api.mutations.update, {
            id: id as any,
            ticketUrl: "https://tickets.example.com/event-1",
            venueBookingId: "booking-venue-123",
        });

        const resource = await t.run(async (ctx) => ctx.db.get(id as any));
        expect(resource?.ticketUrl).toBe("https://tickets.example.com/event-1");
        expect(resource?.venueBookingId).toBe("booking-venue-123");
    });

    it("by_venue_date index is queryable", async () => {
        const t = convexTest(schema, modules);

        await t.run(async (ctx) =>
            ctx.db.insert("resources", {
                tenantId: TENANT, name: "Event at Venue", slug: `evt-${Date.now()}`,
                categoryKey: "arrangement", timeMode: "PERIOD", features: [],
                status: "published", requiresApproval: false, images: [], pricing: {}, metadata: {},
                venueId: "venue-001", eventDate: "2026-03-15",
            })
        );

        const results = await t.run(async (ctx) =>
            ctx.db.query("resources")
                .withIndex("by_venue_date", (q) => q.eq("venueId", "venue-001").eq("eventDate", "2026-03-15"))
                .collect()
        );
        expect(results.length).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

describe("resources/queries — list", () => {
    it("returns resources for a tenant, excluding deleted", async () => {
        const t = convexTest(schema, modules);
        const base = Date.now();

        await t.mutation(api.mutations.create, { tenantId: TENANT, name: "Active", slug: `active-${base}`, categoryKey: "lokale" });
        const { id: delId } = await t.mutation(api.mutations.create, { tenantId: TENANT, name: "ToDelete", slug: `del-${base}`, categoryKey: "lokale" });
        await t.mutation(api.mutations.remove, { id: delId as any });

        const results = await t.query(api.queries.list, { tenantId: TENANT });
        expect(results.every((r: any) => r.status !== "deleted")).toBe(true);
    });

    it("filters by categoryKey", async () => {
        const t = convexTest(schema, modules);
        const base = Date.now();

        await t.mutation(api.mutations.create, { tenantId: TENANT, name: "Room", slug: `room-${base}`, categoryKey: "lokale" });
        await t.mutation(api.mutations.create, { tenantId: TENANT, name: "Event", slug: `event-${base}`, categoryKey: "arrangement" });

        const lokaler = await t.query(api.queries.list, { tenantId: TENANT, categoryKey: "lokale" });
        lokaler.forEach((r: any) => expect(r.categoryKey).toBe("lokale"));
    });
});

describe("resources/queries — listPublic", () => {
    it("returns only published resources", async () => {
        const t = convexTest(schema, modules);
        const base = Date.now();

        await t.mutation(api.mutations.create, { tenantId: TENANT, name: "Pub", slug: `pub-${base}`, categoryKey: "lokale", status: "published" });
        await t.mutation(api.mutations.create, { tenantId: TENANT, name: "Draft", slug: `draft-${base}`, categoryKey: "lokale" });

        const results = await t.query(api.queries.listPublic, { tenantId: TENANT });
        results.forEach((r: any) => expect(r.status).toBe("published"));
    });
});

describe("resources/queries — getBySlug", () => {
    it("returns a resource by tenant + slug", async () => {
        const t = convexTest(schema, modules);
        const slug = `byslug-${Date.now()}`;

        await t.mutation(api.mutations.create, { tenantId: TENANT, name: "BySlug", slug, categoryKey: "lokale" });

        const resource = await t.query(api.queries.getBySlug, { tenantId: TENANT, slug });
        expect(resource).not.toBeNull();
        expect(resource!.name).toBe("BySlug");
    });

    it("returns null for non-existent slug", async () => {
        const t = convexTest(schema, modules);

        const resource = await t.query(api.queries.getBySlug, { tenantId: TENANT, slug: "nope" });
        expect(resource).toBeNull();
    });
});

describe("resources/queries — listByVenueSlug", () => {
    it("returns published resources for a venue slug", async () => {
        const t = convexTest(schema, modules);
        const base = Date.now();

        await t.run(async (ctx) => {
            await ctx.db.insert("resources", {
                tenantId: TENANT, name: "Event at Venue", slug: `vslug-${base}`,
                categoryKey: "arrangement", timeMode: "PERIOD", features: [],
                status: "published", requiresApproval: false, images: [], pricing: {}, metadata: {},
                venueSlug: "hovedscenen",
            });
            await ctx.db.insert("resources", {
                tenantId: TENANT, name: "Draft at Venue", slug: `vslug-draft-${base}`,
                categoryKey: "arrangement", timeMode: "PERIOD", features: [],
                status: "draft", requiresApproval: false, images: [], pricing: {}, metadata: {},
                venueSlug: "hovedscenen",
            });
        });

        const results = await t.query(api.queries.listByVenueSlug, { tenantId: TENANT, venueSlug: "hovedscenen" });
        expect(results.length).toBe(1);
        expect(results[0].status).toBe("published");
    });
});

// ---------------------------------------------------------------------------
// importResource
// ---------------------------------------------------------------------------

describe("resources/mutations — importResource", () => {
    const importBase = {
        timeMode: "PERIOD", features: [] as any[], status: "draft",
        requiresApproval: false, images: [] as any[], pricing: {}, metadata: {},
    };

    it("imports a resource with explicit fields", async () => {
        const t = convexTest(schema, modules);
        const slug = `import-${Date.now()}`;

        const { id } = await t.mutation(api.mutations.importResource, {
            tenantId: TENANT, name: "Imported Room", slug,
            categoryKey: "lokale", capacity: 100, ...importBase,
        });

        const resource = await t.run(async (ctx) => ctx.db.get(id as any));
        expect(resource?.name).toBe("Imported Room");
        expect(resource?.capacity).toBe(100);
    });

    it("upserts when slug already exists", async () => {
        const t = convexTest(schema, modules);
        const slug = `import-upsert-${Date.now()}`;

        const { id: id1 } = await t.mutation(api.mutations.importResource, {
            tenantId: TENANT, name: "Original", slug, categoryKey: "lokale", ...importBase,
        });
        const { id: id2 } = await t.mutation(api.mutations.importResource, {
            tenantId: TENANT, name: "Updated", slug, categoryKey: "lokale", ...importBase,
        });

        expect(id1).toBe(id2);
        const resource = await t.run(async (ctx) => ctx.db.get(id1 as any));
        expect(resource?.name).toBe("Updated");
    });
});
