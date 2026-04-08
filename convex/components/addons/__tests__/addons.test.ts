/**
 * Addons Component — convex-test Integration Tests
 *
 * Tests addon CRUD, resource-addon and booking-addon associations.
 * Run: npx vitest --config convex/vitest.config.ts components/addons/addons.test.ts
 */

import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../schema";
import { modules } from "../testSetup.test-util";
import { api } from "../_generated/api";

const TENANT = "tenant-001";
const TENANT_B = "tenant-002";
const RESOURCE = "resource-001";
const BOOKING = "booking-001";

async function createAddon(t: ReturnType<typeof convexTest>, overrides: Record<string, unknown> = {}) {
    return t.mutation(api.mutations.create, {
        tenantId: TENANT,
        name: "Projector",
        slug: `projector-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        priceType: "fixed",
        price: 50000,
        currency: "NOK",
        ...overrides,
    });
}

// ---------------------------------------------------------------------------
// Addon CRUD
// ---------------------------------------------------------------------------

describe("addons/mutations — create", () => {
    it("creates an addon with defaults", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createAddon(t);
        expect(id).toBeDefined();
        const addon = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(addon?.isActive).toBe(true);
        expect(addon?.requiresApproval).toBe(false);
        expect(addon?.displayOrder).toBe(0);
        expect(addon?.price).toBe(50000);
    });

    it("throws for duplicate slug within same tenant", async () => {
        const t = convexTest(schema, modules);
        const slug = "dup-slug";
        await t.mutation(api.mutations.create, {
            tenantId: TENANT, name: "A", slug, priceType: "fixed", price: 100, currency: "NOK",
        });
        await expect(
            t.mutation(api.mutations.create, {
                tenantId: TENANT, name: "B", slug, priceType: "fixed", price: 200, currency: "NOK",
            })
        ).rejects.toThrow("already exists");
    });

    it("allows same slug in different tenants", async () => {
        const t = convexTest(schema, modules);
        const slug = "shared-slug";
        const { id: id1 } = await t.mutation(api.mutations.create, {
            tenantId: TENANT, name: "A", slug, priceType: "fixed", price: 100, currency: "NOK",
        });
        const { id: id2 } = await t.mutation(api.mutations.create, {
            tenantId: TENANT_B, name: "B", slug, priceType: "fixed", price: 200, currency: "NOK",
        });
        expect(id1).not.toBe(id2);
    });

    it("persists optional fields", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createAddon(t, {
            category: "equipment",
            description: "HD projector",
            maxQuantity: 3,
            requiresApproval: true,
            leadTimeHours: 24,
        });
        const addon = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(addon?.category).toBe("equipment");
        expect(addon?.maxQuantity).toBe(3);
        expect(addon?.requiresApproval).toBe(true);
        expect(addon?.leadTimeHours).toBe(24);
    });
});

describe("addons/mutations — update", () => {
    it("updates addon fields", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createAddon(t);
        await t.mutation(api.mutations.update, {
            id: id as any,
            name: "Updated Projector",
            price: 75000,
        });
        const addon = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(addon?.name).toBe("Updated Projector");
        expect(addon?.price).toBe(75000);
    });

    it("throws when addon not found", async () => {
        const t = convexTest(schema, modules);
        const staleId = await t.run(async (ctx) => {
            const id = await ctx.db.insert("addons", {
                tenantId: TENANT, name: "X", slug: "x", priceType: "fixed",
                price: 0, currency: "NOK", requiresApproval: false,
                images: [], displayOrder: 0, isActive: true, metadata: {},
            });
            await ctx.db.delete(id);
            return id;
        });
        await expect(
            t.mutation(api.mutations.update, { id: staleId, name: "Y" })
        ).rejects.toThrow("Addon not found");
    });
});

describe("addons/mutations — remove", () => {
    it("deletes an addon with no booking associations", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createAddon(t);
        await t.mutation(api.mutations.remove, { id: id as any });
        const gone = await t.run(async (ctx) => ctx.db.get(id as any));
        expect(gone).toBeNull();
    });

    it("throws when addon has active booking associations", async () => {
        const t = convexTest(schema, modules);
        const { id: addonId } = await createAddon(t);
        // Create a booking addon association
        await t.run(async (ctx) => {
            await ctx.db.insert("bookingAddons", {
                tenantId: TENANT, bookingId: BOOKING, addonId: addonId as any,
                quantity: 1, unitPrice: 50000, totalPrice: 50000,
                currency: "NOK", status: "confirmed", metadata: {},
            });
        });
        await expect(
            t.mutation(api.mutations.remove, { id: addonId as any })
        ).rejects.toThrow("active booking associations");
    });

    it("removes associated resource-addons when deleting", async () => {
        const t = convexTest(schema, modules);
        const { id: addonId } = await createAddon(t);
        await t.mutation(api.mutations.addToResource, {
            tenantId: TENANT, resourceId: RESOURCE, addonId: addonId as any,
        });
        await t.mutation(api.mutations.remove, { id: addonId as any });
        const remaining = await t.run(async (ctx) =>
            ctx.db.query("resourceAddons")
                .withIndex("by_addon", (q) => q.eq("addonId", addonId as any))
                .collect()
        );
        expect(remaining.length).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// Resource-addon associations
// ---------------------------------------------------------------------------

describe("addons/mutations — addToResource", () => {
    it("associates an addon with a resource", async () => {
        const t = convexTest(schema, modules);
        const { id: addonId } = await createAddon(t);
        const { id } = await t.mutation(api.mutations.addToResource, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            addonId: addonId as any,
        });
        expect(id).toBeDefined();
        const assoc = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(assoc?.isRequired).toBe(false);
        expect(assoc?.isRecommended).toBe(false);
    });

    it("throws when addon already associated", async () => {
        const t = convexTest(schema, modules);
        const { id: addonId } = await createAddon(t);
        await t.mutation(api.mutations.addToResource, {
            tenantId: TENANT, resourceId: RESOURCE, addonId: addonId as any,
        });
        await expect(
            t.mutation(api.mutations.addToResource, {
                tenantId: TENANT, resourceId: RESOURCE, addonId: addonId as any,
            })
        ).rejects.toThrow("already associated");
    });

    it("throws when addon does not exist", async () => {
        const t = convexTest(schema, modules);
        const staleId = await t.run(async (ctx) => {
            const id = await ctx.db.insert("addons", {
                tenantId: TENANT, name: "X", slug: "x", priceType: "fixed",
                price: 0, currency: "NOK", requiresApproval: false,
                images: [], displayOrder: 0, isActive: true, metadata: {},
            });
            await ctx.db.delete(id);
            return id;
        });
        await expect(
            t.mutation(api.mutations.addToResource, {
                tenantId: TENANT, resourceId: RESOURCE, addonId: staleId,
            })
        ).rejects.toThrow("Addon not found");
    });
});

describe("addons/mutations — removeFromResource", () => {
    it("removes an addon-resource association", async () => {
        const t = convexTest(schema, modules);
        const { id: addonId } = await createAddon(t);
        await t.mutation(api.mutations.addToResource, {
            tenantId: TENANT, resourceId: RESOURCE, addonId: addonId as any,
        });
        await t.mutation(api.mutations.removeFromResource, {
            resourceId: RESOURCE, addonId: addonId as any,
        });
        const remaining = await t.run(async (ctx) =>
            ctx.db.query("resourceAddons")
                .withIndex("by_resource", (q) => q.eq("resourceId", RESOURCE))
                .collect()
        );
        expect(remaining.length).toBe(0);
    });

    it("throws when not associated", async () => {
        const t = convexTest(schema, modules);
        const { id: addonId } = await createAddon(t);
        await expect(
            t.mutation(api.mutations.removeFromResource, {
                resourceId: RESOURCE, addonId: addonId as any,
            })
        ).rejects.toThrow("not associated");
    });
});

// ---------------------------------------------------------------------------
// Booking-addon associations
// ---------------------------------------------------------------------------

describe("addons/mutations — addToBooking", () => {
    it("adds an addon to a booking with calculated price", async () => {
        const t = convexTest(schema, modules);
        const { id: addonId } = await createAddon(t, { price: 10000 });
        const { id } = await t.mutation(api.mutations.addToBooking, {
            tenantId: TENANT,
            bookingId: BOOKING,
            addonId: addonId as any,
            quantity: 2,
        });
        const ba = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(ba?.unitPrice).toBe(10000);
        expect(ba?.totalPrice).toBe(20000);
        expect(ba?.status).toBe("confirmed"); // no approval required
    });

    it("sets pending status when addon requires approval", async () => {
        const t = convexTest(schema, modules);
        const { id: addonId } = await createAddon(t, { requiresApproval: true });
        const { id } = await t.mutation(api.mutations.addToBooking, {
            tenantId: TENANT, bookingId: BOOKING, addonId: addonId as any, quantity: 1,
        });
        const ba = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(ba?.status).toBe("pending");
    });

    it("throws for quantity exceeding maxQuantity", async () => {
        const t = convexTest(schema, modules);
        const { id: addonId } = await createAddon(t, { maxQuantity: 3 });
        await expect(
            t.mutation(api.mutations.addToBooking, {
                tenantId: TENANT, bookingId: BOOKING, addonId: addonId as any, quantity: 5,
            })
        ).rejects.toThrow("exceeds maximum");
    });

    it("throws for quantity less than 1", async () => {
        const t = convexTest(schema, modules);
        const { id: addonId } = await createAddon(t);
        await expect(
            t.mutation(api.mutations.addToBooking, {
                tenantId: TENANT, bookingId: BOOKING, addonId: addonId as any, quantity: 0,
            })
        ).rejects.toThrow("at least 1");
    });

    it("throws when addon is inactive", async () => {
        const t = convexTest(schema, modules);
        const { id: addonId } = await createAddon(t);
        await t.mutation(api.mutations.update, { id: addonId as any, isActive: false });
        await expect(
            t.mutation(api.mutations.addToBooking, {
                tenantId: TENANT, bookingId: BOOKING, addonId: addonId as any, quantity: 1,
            })
        ).rejects.toThrow("not active");
    });

    it("throws for duplicate addon on same booking", async () => {
        const t = convexTest(schema, modules);
        const { id: addonId } = await createAddon(t);
        await t.mutation(api.mutations.addToBooking, {
            tenantId: TENANT, bookingId: BOOKING, addonId: addonId as any, quantity: 1,
        });
        await expect(
            t.mutation(api.mutations.addToBooking, {
                tenantId: TENANT, bookingId: BOOKING, addonId: addonId as any, quantity: 1,
            })
        ).rejects.toThrow("already added");
    });
});

describe("addons/mutations — updateBookingAddon", () => {
    it("updates quantity and recalculates total", async () => {
        const t = convexTest(schema, modules);
        const { id: addonId } = await createAddon(t, { price: 10000 });
        const { id } = await t.mutation(api.mutations.addToBooking, {
            tenantId: TENANT, bookingId: BOOKING, addonId: addonId as any, quantity: 1,
        });
        await t.mutation(api.mutations.updateBookingAddon, {
            id: id as any, quantity: 3,
        });
        const ba = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(ba?.quantity).toBe(3);
        expect(ba?.totalPrice).toBe(30000);
    });

    it("throws when updating cancelled booking addon", async () => {
        const t = convexTest(schema, modules);
        const { id: addonId } = await createAddon(t);
        const { id } = await t.mutation(api.mutations.addToBooking, {
            tenantId: TENANT, bookingId: BOOKING, addonId: addonId as any, quantity: 1,
        });
        await t.run(async (ctx) => ctx.db.patch(id as any, { status: "cancelled" }));
        await expect(
            t.mutation(api.mutations.updateBookingAddon, { id: id as any, quantity: 2 })
        ).rejects.toThrow("cancelled");
    });
});

describe("addons/mutations — removeFromBooking", () => {
    it("deletes a booking addon", async () => {
        const t = convexTest(schema, modules);
        const { id: addonId } = await createAddon(t);
        const { id } = await t.mutation(api.mutations.addToBooking, {
            tenantId: TENANT, bookingId: BOOKING, addonId: addonId as any, quantity: 1,
        });
        await t.mutation(api.mutations.removeFromBooking, { id: id as any });
        const gone = await t.run(async (ctx) => ctx.db.get(id as any));
        expect(gone).toBeNull();
    });
});

describe("addons/mutations — approve", () => {
    it("approves a pending booking addon", async () => {
        const t = convexTest(schema, modules);
        const { id: addonId } = await createAddon(t, { requiresApproval: true });
        const { id } = await t.mutation(api.mutations.addToBooking, {
            tenantId: TENANT, bookingId: BOOKING, addonId: addonId as any, quantity: 1,
        });
        await t.mutation(api.mutations.approve, { id: id as any });
        const ba = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(ba?.status).toBe("approved");
    });

    it("throws for non-pending status", async () => {
        const t = convexTest(schema, modules);
        const { id: addonId } = await createAddon(t);
        const { id } = await t.mutation(api.mutations.addToBooking, {
            tenantId: TENANT, bookingId: BOOKING, addonId: addonId as any, quantity: 1,
        }); // status = "confirmed" (no approval needed)
        await expect(
            t.mutation(api.mutations.approve, { id: id as any })
        ).rejects.toThrow("Cannot approve");
    });
});

describe("addons/mutations — reject", () => {
    it("rejects a pending booking addon with reason", async () => {
        const t = convexTest(schema, modules);
        const { id: addonId } = await createAddon(t, { requiresApproval: true });
        const { id } = await t.mutation(api.mutations.addToBooking, {
            tenantId: TENANT, bookingId: BOOKING, addonId: addonId as any, quantity: 1,
        });
        await t.mutation(api.mutations.reject, { id: id as any, reason: "Not available" });
        const ba = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(ba?.status).toBe("rejected");
        expect(ba?.notes).toContain("Not available");
    });

    it("throws for non-pending status", async () => {
        const t = convexTest(schema, modules);
        const { id: addonId } = await createAddon(t);
        const { id } = await t.mutation(api.mutations.addToBooking, {
            tenantId: TENANT, bookingId: BOOKING, addonId: addonId as any, quantity: 1,
        });
        await expect(
            t.mutation(api.mutations.reject, { id: id as any })
        ).rejects.toThrow("Cannot reject");
    });
});

// ---------------------------------------------------------------------------
// Addon queries
// ---------------------------------------------------------------------------

describe("addons/queries — list", () => {
    it("returns addons for a tenant", async () => {
        const t = convexTest(schema, modules);
        await createAddon(t);
        await createAddon(t, { tenantId: TENANT_B });
        const results = await t.query(api.queries.list, { tenantId: TENANT });
        expect(results.length).toBe(1);
    });

    it("filters by category", async () => {
        const t = convexTest(schema, modules);
        await createAddon(t, { category: "equipment" });
        await createAddon(t, { category: "catering" });
        const results = await t.query(api.queries.list, { tenantId: TENANT, category: "equipment" });
        expect(results.length).toBe(1);
        expect(results[0].category).toBe("equipment");
    });

    it("filters by active status", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createAddon(t);
        await t.mutation(api.mutations.update, { id: id as any, isActive: false });
        await createAddon(t);
        const active = await t.query(api.queries.list, { tenantId: TENANT, isActive: true });
        expect(active.length).toBe(1);
    });
});

describe("addons/queries — get", () => {
    it("returns an addon by id", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createAddon(t, { name: "Special Projector" });
        const addon = await t.query(api.queries.get, { id: id as any });
        expect(addon.name).toBe("Special Projector");
    });

    it("throws when not found", async () => {
        const t = convexTest(schema, modules);
        const staleId = await t.run(async (ctx) => {
            const id = await ctx.db.insert("addons", {
                tenantId: TENANT, name: "X", slug: "x", priceType: "fixed",
                price: 0, currency: "NOK", requiresApproval: false,
                images: [], displayOrder: 0, isActive: true, metadata: {},
            });
            await ctx.db.delete(id);
            return id;
        });
        await expect(
            t.query(api.queries.get, { id: staleId })
        ).rejects.toThrow("Addon not found");
    });
});

describe("addons/queries — listForResource", () => {
    it("returns addons with effective price", async () => {
        const t = convexTest(schema, modules);
        const { id: addonId } = await createAddon(t, { price: 10000 });
        await t.mutation(api.mutations.addToResource, {
            tenantId: TENANT, resourceId: RESOURCE, addonId: addonId as any,
            customPrice: 8000,
        });
        const results = await t.query(api.queries.listForResource, { resourceId: RESOURCE });
        expect(results.length).toBe(1);
        expect(results[0].effectivePrice).toBe(8000); // custom price overrides
    });
});

describe("addons/queries — listForBooking", () => {
    it("returns booking addons with addon details", async () => {
        const t = convexTest(schema, modules);
        const { id: addonId } = await createAddon(t, { name: "Coffee" });
        await t.mutation(api.mutations.addToBooking, {
            tenantId: TENANT, bookingId: BOOKING, addonId: addonId as any, quantity: 2,
        });
        const results = await t.query(api.queries.listForBooking, { bookingId: BOOKING });
        expect(results.length).toBe(1);
        expect(results[0].addon?.name).toBe("Coffee");
        expect(results[0].quantity).toBe(2);
    });
});

// ---------------------------------------------------------------------------
// Schema index correctness
// ---------------------------------------------------------------------------

describe("addons schema — index correctness", () => {
    it("by_slug enforces tenant + slug uniqueness lookups", async () => {
        const t = convexTest(schema, modules);
        const slug = `idx-slug-${Date.now()}`;
        await createAddon(t, { slug });
        const result = await t.run(async (ctx) =>
            ctx.db.query("addons")
                .withIndex("by_slug", (q) => q.eq("tenantId", TENANT).eq("slug", slug))
                .first()
        );
        expect(result).not.toBeNull();
    });

    it("by_booking index on bookingAddons", async () => {
        const t = convexTest(schema, modules);
        const { id: addonId } = await createAddon(t);
        await t.mutation(api.mutations.addToBooking, {
            tenantId: TENANT, bookingId: BOOKING, addonId: addonId as any, quantity: 1,
        });
        const results = await t.run(async (ctx) =>
            ctx.db.query("bookingAddons")
                .withIndex("by_booking", (q) => q.eq("bookingId", BOOKING))
                .collect()
        );
        expect(results.length).toBe(1);
    });

    it("by_resource index on resourceAddons", async () => {
        const t = convexTest(schema, modules);
        const { id: addonId } = await createAddon(t);
        await t.mutation(api.mutations.addToResource, {
            tenantId: TENANT, resourceId: RESOURCE, addonId: addonId as any,
        });
        const results = await t.run(async (ctx) =>
            ctx.db.query("resourceAddons")
                .withIndex("by_resource", (q) => q.eq("resourceId", RESOURCE))
                .collect()
        );
        expect(results.length).toBe(1);
    });
});
