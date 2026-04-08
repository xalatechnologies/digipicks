import { describe, it, expect } from "vitest";
import { api } from "../../_generated/api";
import { createDomainTest, seedTestTenant, seedResource } from "./testHelper.test-util";

describe("domain/addons", () => {
    function setup() {
        return createDomainTest(["addons", "resources", "audit"]);
    }

    /**
     * Create an addon via the facade.
     */
    async function createTestAddon(
        t: ReturnType<typeof setup>,
        tenantId: any,
        overrides: Partial<{
            name: string;
            slug: string;
            category: string;
            priceType: string;
            price: number;
            currency: string;
            requiresApproval: boolean;
            maxQuantity: number;
        }> = {}
    ) {
        return t.mutation(api.domain.addons.create, {
            tenantId,
            name: overrides.name ?? "Projector",
            slug: overrides.slug ?? `projector-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            category: overrides.category,
            priceType: overrides.priceType ?? "fixed",
            price: overrides.price ?? 500,
            currency: overrides.currency ?? "NOK",
            requiresApproval: overrides.requiresApproval,
            maxQuantity: overrides.maxQuantity,
        });
    }

    // =========================================================================
    // LIST
    // =========================================================================

    describe("list", () => {
        it("lists addons for a tenant", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            await createTestAddon(t, tenantId, { name: "Projector", slug: "projector" });
            await createTestAddon(t, tenantId, { name: "Microphone", slug: "microphone" });

            const addons = await t.query(api.domain.addons.list, {
                tenantId,
            });

            expect(addons.length).toBe(2);
        });

        it("filters by category", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            await createTestAddon(t, tenantId, {
                name: "Projector",
                slug: "projector",
                category: "equipment",
            });
            await createTestAddon(t, tenantId, {
                name: "Catering",
                slug: "catering",
                category: "services",
            });

            const equipment = await t.query(api.domain.addons.list, {
                tenantId,
                category: "equipment",
            });

            expect(equipment.length).toBe(1);
            expect(equipment[0].name).toBe("Projector");
        });

        it("returns empty array when no addons exist", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const addons = await t.query(api.domain.addons.list, {
                tenantId,
            });

            expect(addons).toEqual([]);
        });
    });

    // =========================================================================
    // GET
    // =========================================================================

    describe("get", () => {
        it("returns addon by ID", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await createTestAddon(t, tenantId, {
                name: "Sound System",
                slug: "sound-system",
                price: 1200,
            });

            const addon = await t.query(api.domain.addons.get, { id });

            expect(addon).toBeDefined();
            expect(addon.name).toBe("Sound System");
            expect(addon.price).toBe(1200);
        });

        it("throws for non-existent addon", async () => {
            const t = setup();
            await seedTestTenant(t);

            await expect(
                t.query(api.domain.addons.get, { id: "nonexistent" })
            ).rejects.toThrow();
        });
    });

    // =========================================================================
    // CREATE
    // =========================================================================

    describe("create", () => {
        it("creates addon with required fields", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const result = await createTestAddon(t, tenantId, {
                name: "Whiteboard",
                slug: "whiteboard",
            });

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
        });

        it("rejects duplicate slug within tenant", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            await createTestAddon(t, tenantId, {
                name: "Projector",
                slug: "projector-unique",
            });

            await expect(
                createTestAddon(t, tenantId, {
                    name: "Another Projector",
                    slug: "projector-unique",
                })
            ).rejects.toThrow("already exists");
        });
    });

    // =========================================================================
    // UPDATE
    // =========================================================================

    describe("update", () => {
        it("updates addon fields", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await createTestAddon(t, tenantId, {
                name: "Projector",
                slug: "projector-update",
                price: 500,
            });

            await t.mutation(api.domain.addons.update, {
                id,
                name: "HD Projector",
                price: 750,
            });

            const updated = await t.query(api.domain.addons.get, { id });
            expect(updated.name).toBe("HD Projector");
            expect(updated.price).toBe(750);
        });

        it("deactivates an addon", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await createTestAddon(t, tenantId, {
                name: "Old Projector",
                slug: "old-projector",
            });

            await t.mutation(api.domain.addons.update, {
                id,
                isActive: false,
            });

            const updated = await t.query(api.domain.addons.get, { id });
            expect(updated.isActive).toBe(false);
        });
    });

    // =========================================================================
    // REMOVE
    // =========================================================================

    describe("remove", () => {
        it("removes an addon", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await createTestAddon(t, tenantId, {
                name: "Temporary Addon",
                slug: "temporary-addon",
            });

            const result = await t.mutation(api.domain.addons.remove, { id });
            expect(result.success).toBe(true);

            const addons = await t.query(api.domain.addons.list, { tenantId });
            expect(addons.length).toBe(0);
        });

        it("fails if addon has active booking associations", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id: addonId } = await createTestAddon(t, tenantId, {
                name: "Booked Addon",
                slug: "booked-addon",
            });

            // Add addon to a booking
            await t.mutation(api.domain.addons.addToBooking, {
                tenantId,
                bookingId: "bk-test",
                addonId,
                quantity: 1,
            });

            await expect(
                t.mutation(api.domain.addons.remove, { id: addonId })
            ).rejects.toThrow("active booking associations");
        });
    });

    // =========================================================================
    // ADD TO RESOURCE / REMOVE FROM RESOURCE
    // =========================================================================

    describe("addToResource", () => {
        it("links addon to resource", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            const { id: addonId } = await createTestAddon(t, tenantId, {
                name: "Stage Lights",
                slug: "stage-lights",
            });

            const result = await t.mutation(api.domain.addons.addToResource, {
                tenantId,
                resourceId: resource.id,
                addonId,
            });

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
        });

        it("rejects duplicate resource-addon association", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            const { id: addonId } = await createTestAddon(t, tenantId, {
                name: "Microphone",
                slug: "microphone-dup",
            });

            await t.mutation(api.domain.addons.addToResource, {
                tenantId,
                resourceId: resource.id,
                addonId,
            });

            await expect(
                t.mutation(api.domain.addons.addToResource, {
                    tenantId,
                    resourceId: resource.id,
                    addonId,
                })
            ).rejects.toThrow("already associated");
        });
    });

    describe("removeFromResource", () => {
        it("unlinks addon from resource", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            const { id: addonId } = await createTestAddon(t, tenantId, {
                name: "Whiteboard",
                slug: "whiteboard-rm",
            });

            await t.mutation(api.domain.addons.addToResource, {
                tenantId,
                resourceId: resource.id,
                addonId,
            });

            const result = await t.mutation(api.domain.addons.removeFromResource, {
                resourceId: resource.id,
                addonId,
            });

            expect(result.success).toBe(true);
        });

        it("throws when addon is not associated with resource", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            const { id: addonId } = await createTestAddon(t, tenantId, {
                name: "Unlinked",
                slug: "unlinked-addon",
            });

            await expect(
                t.mutation(api.domain.addons.removeFromResource, {
                    resourceId: resource.id,
                    addonId,
                })
            ).rejects.toThrow("not associated");
        });
    });

    // =========================================================================
    // LIST FOR RESOURCE
    // =========================================================================

    describe("listForResource", () => {
        it("lists addons for a resource", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            const { id: addonId } = await createTestAddon(t, tenantId, {
                name: "PA System",
                slug: "pa-system",
                price: 800,
            });

            await t.mutation(api.domain.addons.addToResource, {
                tenantId,
                resourceId: resource.id,
                addonId,
            });

            const result = await t.query(api.domain.addons.listForResource, {
                resourceId: resource.id,
            });

            expect(result.length).toBe(1);
            expect(result[0].addon).toBeDefined();
            expect(result[0].addon.name).toBe("PA System");
            expect(result[0].effectivePrice).toBe(800);
        });

        it("returns empty array when no addons linked", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            const result = await t.query(api.domain.addons.listForResource, {
                resourceId: resource.id,
            });

            expect(result).toEqual([]);
        });
    });

    // =========================================================================
    // BOOKING-ADDON OPERATIONS
    // =========================================================================

    describe("listForBooking", () => {
        it("lists addons for a booking", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id: addonId } = await createTestAddon(t, tenantId, {
                name: "Projector",
                slug: "projector-bk",
            });

            await t.mutation(api.domain.addons.addToBooking, {
                tenantId,
                bookingId: "bk-list-test",
                addonId,
                quantity: 2,
            });

            const result = await t.query(api.domain.addons.listForBooking, {
                bookingId: "bk-list-test",
            });

            expect(result.length).toBe(1);
            expect(result[0].quantity).toBe(2);
            expect(result[0].addon).toBeDefined();
            expect(result[0].addon.name).toBe("Projector");
        });

        it("returns empty array when no addons for booking", async () => {
            const t = setup();
            await seedTestTenant(t);

            const result = await t.query(api.domain.addons.listForBooking, {
                bookingId: "bk-no-addons",
            });

            expect(result).toEqual([]);
        });
    });

    describe("addToBooking", () => {
        it("adds addon to a booking", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id: addonId } = await createTestAddon(t, tenantId, {
                name: "Sound System",
                slug: "sound-add",
                price: 1000,
            });

            const result = await t.mutation(api.domain.addons.addToBooking, {
                tenantId,
                bookingId: "bk-add-test",
                addonId,
                quantity: 3,
            });

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();

            // Verify totalPrice is calculated
            const list = await t.query(api.domain.addons.listForBooking, {
                bookingId: "bk-add-test",
            });
            expect(list[0].totalPrice).toBe(3000); // 1000 * 3
        });
    });

    describe("updateBookingAddon", () => {
        it("updates booking addon quantity", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id: addonId } = await createTestAddon(t, tenantId, {
                name: "Chairs",
                slug: "chairs-update",
                price: 50,
            });

            const { id } = await t.mutation(api.domain.addons.addToBooking, {
                tenantId,
                bookingId: "bk-update-test",
                addonId,
                quantity: 10,
            });

            await t.mutation(api.domain.addons.updateBookingAddon, {
                id,
                quantity: 20,
            });

            const list = await t.query(api.domain.addons.listForBooking, {
                bookingId: "bk-update-test",
            });
            expect(list[0].quantity).toBe(20);
            expect(list[0].totalPrice).toBe(1000); // 50 * 20
        });
    });

    describe("removeFromBooking", () => {
        it("removes addon from a booking", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id: addonId } = await createTestAddon(t, tenantId, {
                name: "Tables",
                slug: "tables-rm",
            });

            const { id } = await t.mutation(api.domain.addons.addToBooking, {
                tenantId,
                bookingId: "bk-remove-test",
                addonId,
                quantity: 5,
            });

            const result = await t.mutation(api.domain.addons.removeFromBooking, {
                id,
            });

            expect(result.success).toBe(true);

            const list = await t.query(api.domain.addons.listForBooking, {
                bookingId: "bk-remove-test",
            });
            expect(list.length).toBe(0);
        });
    });

    describe("approveBookingAddon", () => {
        it("approves a pending booking addon", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id: addonId } = await createTestAddon(t, tenantId, {
                name: "Catering",
                slug: "catering-approve",
                requiresApproval: true,
            });

            const { id } = await t.mutation(api.domain.addons.addToBooking, {
                tenantId,
                bookingId: "bk-approve-test",
                addonId,
                quantity: 1,
            });

            // Verify it starts as pending
            const beforeList = await t.query(api.domain.addons.listForBooking, {
                bookingId: "bk-approve-test",
            });
            expect(beforeList[0].status).toBe("pending");

            const result = await t.mutation(
                api.domain.addons.approveBookingAddon,
                { id }
            );

            expect(result.success).toBe(true);

            const afterList = await t.query(api.domain.addons.listForBooking, {
                bookingId: "bk-approve-test",
            });
            expect(afterList[0].status).toBe("approved");
        });
    });

    describe("rejectBookingAddon", () => {
        it("rejects a pending booking addon with reason", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id: addonId } = await createTestAddon(t, tenantId, {
                name: "Stage Setup",
                slug: "stage-reject",
                requiresApproval: true,
            });

            const { id } = await t.mutation(api.domain.addons.addToBooking, {
                tenantId,
                bookingId: "bk-reject-test",
                addonId,
                quantity: 1,
            });

            const result = await t.mutation(
                api.domain.addons.rejectBookingAddon,
                {
                    id,
                    reason: "Not available on requested date",
                }
            );

            expect(result.success).toBe(true);

            const afterList = await t.query(api.domain.addons.listForBooking, {
                bookingId: "bk-reject-test",
            });
            expect(afterList[0].status).toBe("rejected");
        });
    });
});
