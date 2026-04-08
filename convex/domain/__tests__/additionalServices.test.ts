import { describe, it, expect } from "vitest";
import { api } from "../../_generated/api";
import { createDomainTest, seedTestTenant } from "./testHelper.test-util";

describe("domain/additionalServices", () => {
    function setup() {
        return createDomainTest(["pricing", "resources"]);
    }

    describe("create", () => {
        it("creates an additional service", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const result = await t.mutation(
                api.domain.additionalServices.create,
                {
                    tenantId,
                    resourceId: "res-001",
                    name: "Projector Rental",
                    price: 500,
                    description: "HD projector for presentations",
                }
            );

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
        });

        it("stores optional fields", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const result = await t.mutation(
                api.domain.additionalServices.create,
                {
                    tenantId,
                    resourceId: "res-002",
                    name: "Cleaning Fee",
                    price: 200,
                    currency: "NOK",
                    isRequired: true,
                    displayOrder: 1,
                }
            );

            expect(result.id).toBeDefined();
        });
    });

    describe("listByTenant", () => {
        it("lists all services for a tenant", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            await t.mutation(api.domain.additionalServices.create, {
                tenantId,
                resourceId: "res-001",
                name: "Service A",
                price: 100,
            });
            await t.mutation(api.domain.additionalServices.create, {
                tenantId,
                resourceId: "res-001",
                name: "Service B",
                price: 200,
            });

            const list = await t.query(
                api.domain.additionalServices.listByTenant,
                { tenantId }
            );
            expect(list.length).toBe(2);
        });
    });

    describe("listByResource", () => {
        it("lists services for a specific resource", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            await t.mutation(api.domain.additionalServices.create, {
                tenantId,
                resourceId: "res-target",
                name: "Target Service",
                price: 300,
            });
            await t.mutation(api.domain.additionalServices.create, {
                tenantId,
                resourceId: "res-other",
                name: "Other Service",
                price: 150,
            });

            const list = await t.query(
                api.domain.additionalServices.listByResource,
                { resourceId: "res-target" }
            );
            expect(list.length).toBe(1);
            expect(list[0].name).toBe("Target Service");
        });

        it("sorts by displayOrder", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            await t.mutation(api.domain.additionalServices.create, {
                tenantId,
                resourceId: "res-sort",
                name: "Second",
                price: 200,
                displayOrder: 2,
            });
            await t.mutation(api.domain.additionalServices.create, {
                tenantId,
                resourceId: "res-sort",
                name: "First",
                price: 100,
                displayOrder: 1,
            });

            const list = await t.query(
                api.domain.additionalServices.listByResource,
                { resourceId: "res-sort" }
            );
            expect(list[0].name).toBe("First");
            expect(list[1].name).toBe("Second");
        });
    });

    describe("update", () => {
        it("updates service fields", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await t.mutation(
                api.domain.additionalServices.create,
                {
                    tenantId,
                    resourceId: "res-001",
                    name: "Old Name",
                    price: 100,
                }
            );

            await t.mutation(api.domain.additionalServices.update, {
                serviceId: id,
                name: "New Name",
                price: 250,
            });

            const list = await t.query(
                api.domain.additionalServices.listByResource,
                { resourceId: "res-001" }
            );
            const updated = list.find((s: any) => s._id === id);
            expect(updated.name).toBe("New Name");
            expect(updated.price).toBe(250);
        });
    });

    describe("get", () => {
        it("throws an error (not yet supported)", async () => {
            const t = setup();
            await seedTestTenant(t);

            await expect(
                t.query(api.domain.additionalServices.get, {
                    serviceId: "svc-123",
                })
            ).rejects.toThrow(
                "Use listByResource or listByTenant to find additional services"
            );
        });
    });

    describe("remove", () => {
        it("removes a service", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await t.mutation(
                api.domain.additionalServices.create,
                {
                    tenantId,
                    resourceId: "res-001",
                    name: "To Remove",
                    price: 100,
                }
            );

            await t.mutation(api.domain.additionalServices.remove, {
                serviceId: id,
            });

            const list = await t.query(
                api.domain.additionalServices.listByResource,
                { resourceId: "res-001" }
            );
            const found = list.find((s: any) => s._id === id && s.isActive !== false);
            expect(found).toBeUndefined();
        });
    });
});
