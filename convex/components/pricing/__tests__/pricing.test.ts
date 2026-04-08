import { convexTest } from "convex-test";
import { expect, describe, it } from "vitest";
import schema from "../schema";
import { modules } from "../testSetup.test-util";
import { api } from "../_generated/api";

const TENANT = "tenant-pricing-1";
const TENANT_B = "tenant-pricing-2";
const RESOURCE = "resource-1";

// =============================================================================
// PRICING GROUPS
// =============================================================================

describe("pricing/mutations — createGroup", () => {
    it("creates a pricing group with defaults", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.mutations.createGroup, {
            tenantId: TENANT,
            name: "Standard",
        });
        expect(result.id).toBeDefined();

        const group = await t.query(api.queries.getGroup, { id: result.id as any });
        expect(group.tenantId).toBe(TENANT);
        expect(group.name).toBe("Standard");
        expect(group.isDefault).toBe(false);
        expect(group.priority).toBe(0);
        expect(group.isActive).toBe(true);
    });

    it("creates with all optional fields", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.mutations.createGroup, {
            tenantId: TENANT,
            name: "Medlem",
            description: "Membership discount",
            groupType: "membership",
            discountPercent: 20,
            discountAmount: 100,
            applicableBookingModes: ["SLOTS", "ALL_DAY"],
            validFrom: 1000000,
            validUntil: 9000000,
            isDefault: true,
            priority: 1,
            metadata: { tier: "gold" },
        });
        expect(result.id).toBeDefined();

        const group = await t.query(api.queries.getGroup, { id: result.id as any });
        expect(group.discountPercent).toBe(20);
        expect(group.groupType).toBe("membership");
        expect(group.isDefault).toBe(true);
        expect(group.priority).toBe(1);
    });
});

describe("pricing/mutations — updateGroup", () => {
    it("updates pricing group fields", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createGroup, {
            tenantId: TENANT,
            name: "Standard",
        });

        await t.mutation(api.mutations.updateGroup, {
            id: id as any,
            name: "Premium",
            discountPercent: 15,
            isActive: false,
        });

        const group = await t.query(api.queries.getGroup, { id: id as any });
        expect(group.name).toBe("Premium");
        expect(group.discountPercent).toBe(15);
        expect(group.isActive).toBe(false);
    });

    it("throws if group not found", async () => {
        const t = convexTest(schema, modules);
        // Create then delete to get a valid-format but nonexistent ID
        const { id } = await t.mutation(api.mutations.createGroup, {
            tenantId: TENANT,
            name: "Temp",
        });
        await t.mutation(api.mutations.removeGroup, { id: id as any });

        await expect(
            t.mutation(api.mutations.updateGroup, { id: id as any, name: "X" })
        ).rejects.toThrow("Pricing group not found");
    });
});

describe("pricing/mutations — removeGroup", () => {
    it("deletes unused group", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createGroup, {
            tenantId: TENANT,
            name: "ToDelete",
        });
        const result = await t.mutation(api.mutations.removeGroup, { id: id as any });
        expect(result.success).toBe(true);
    });

    it("blocks deletion if used by resource pricing", async () => {
        const t = convexTest(schema, modules);
        const { id: groupId } = await t.mutation(api.mutations.createGroup, {
            tenantId: TENANT,
            name: "InUse",
        });

        // Create resource pricing referencing this group
        await t.mutation(api.mutations.create, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            pricingGroupId: groupId,
            priceType: "hourly",
            basePrice: 500,
            currency: "NOK",
        });

        await expect(
            t.mutation(api.mutations.removeGroup, { id: groupId as any })
        ).rejects.toThrow("in use");
    });

    it("blocks deletion if assigned to org", async () => {
        const t = convexTest(schema, modules);
        const { id: groupId } = await t.mutation(api.mutations.createGroup, {
            tenantId: TENANT,
            name: "OrgGroup",
        });

        await t.mutation(api.mutations.assignOrgPricingGroup, {
            tenantId: TENANT,
            organizationId: "org-1",
            pricingGroupId: groupId as any,
        });

        await expect(
            t.mutation(api.mutations.removeGroup, { id: groupId as any })
        ).rejects.toThrow("assigned to organizations");
    });

    it("blocks deletion if assigned to user", async () => {
        const t = convexTest(schema, modules);
        const { id: groupId } = await t.mutation(api.mutations.createGroup, {
            tenantId: TENANT,
            name: "UserGroup",
        });

        await t.mutation(api.mutations.assignUserPricingGroup, {
            tenantId: TENANT,
            userId: "user-1",
            pricingGroupId: groupId as any,
        });

        await expect(
            t.mutation(api.mutations.removeGroup, { id: groupId as any })
        ).rejects.toThrow("assigned to users");
    });
});

describe("pricing/queries — listGroups", () => {
    it("lists groups by tenant", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createGroup, { tenantId: TENANT, name: "A", priority: 2 });
        await t.mutation(api.mutations.createGroup, { tenantId: TENANT, name: "B", priority: 1 });
        await t.mutation(api.mutations.createGroup, { tenantId: TENANT_B, name: "C" });

        const groups = await t.query(api.queries.listGroups, { tenantId: TENANT });
        expect(groups).toHaveLength(2);
        // Sorted by priority
        expect(groups[0].name).toBe("B");
        expect(groups[1].name).toBe("A");
    });

    it("filters by isActive", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createGroup, { tenantId: TENANT, name: "Active" });
        const { id: id2 } = await t.mutation(api.mutations.createGroup, { tenantId: TENANT, name: "Inactive" });
        await t.mutation(api.mutations.updateGroup, { id: id2 as any, isActive: false });

        const active = await t.query(api.queries.listGroups, { tenantId: TENANT, isActive: true });
        expect(active).toHaveLength(1);
        expect(active[0].name).toBe("Active");
    });
});

// =============================================================================
// RESOURCE PRICING
// =============================================================================

describe("pricing/mutations — create (resource pricing)", () => {
    it("creates hourly resource pricing", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.mutations.create, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            priceType: "hourly",
            basePrice: 500,
            currency: "NOK",
            pricePerHour: 500,
        });
        expect(result.id).toBeDefined();

        const pricing = await t.query(api.queries.get, { id: result.id as any });
        expect(pricing.priceType).toBe("hourly");
        expect(pricing.pricePerHour).toBe(500);
        expect(pricing.isActive).toBe(true);
    });

    it("creates with fees and constraints", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.mutations.create, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            priceType: "per_day",
            basePrice: 3000,
            currency: "NOK",
            pricePerDay: 3000,
            cleaningFee: 500,
            depositAmount: 2000,
            serviceFee: 100,
            minDuration: 60,
            maxDuration: 480,
            minPeople: 5,
            maxPeople: 100,
            taxRate: 0.25,
        });

        const pricing = await t.query(api.queries.get, { id: result.id as any });
        expect(pricing.cleaningFee).toBe(500);
        expect(pricing.depositAmount).toBe(2000);
        expect(pricing.minDuration).toBe(60);
        expect(pricing.maxPeople).toBe(100);
    });
});

describe("pricing/mutations — update (resource pricing)", () => {
    it("updates price fields", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.create, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            priceType: "hourly",
            basePrice: 500,
            currency: "NOK",
        });

        await t.mutation(api.mutations.update, { id: id as any, basePrice: 750, pricePerHour: 750 });

        const pricing = await t.query(api.queries.get, { id: id as any });
        expect(pricing.basePrice).toBe(750);
        expect(pricing.pricePerHour).toBe(750);
    });

    it("throws if pricing not found", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.create, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            priceType: "hourly",
            basePrice: 500,
            currency: "NOK",
        });
        await t.mutation(api.mutations.remove, { id: id as any });

        await expect(
            t.mutation(api.mutations.update, { id: id as any, basePrice: 999 })
        ).rejects.toThrow("Pricing not found");
    });
});

describe("pricing/mutations — remove (resource pricing)", () => {
    it("deletes resource pricing", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.create, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            priceType: "hourly",
            basePrice: 500,
            currency: "NOK",
        });

        const result = await t.mutation(api.mutations.remove, { id: id as any });
        expect(result.success).toBe(true);

        await expect(
            t.query(api.queries.get, { id: id as any })
        ).rejects.toThrow();
    });
});

describe("pricing/queries — listForResource", () => {
    it("lists pricing for a resource with group enrichment", async () => {
        const t = convexTest(schema, modules);
        const { id: groupId } = await t.mutation(api.mutations.createGroup, {
            tenantId: TENANT,
            name: "Standard",
        });

        await t.mutation(api.mutations.create, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            pricingGroupId: groupId,
            priceType: "hourly",
            basePrice: 500,
            currency: "NOK",
        });

        const pricing = await t.query(api.queries.listForResource, { resourceId: RESOURCE });
        expect(pricing).toHaveLength(1);
        expect(pricing[0].pricingGroup).not.toBeNull();
        expect(pricing[0].pricingGroup.name).toBe("Standard");
    });

    it("returns empty for nonexistent resource", async () => {
        const t = convexTest(schema, modules);
        const pricing = await t.query(api.queries.listForResource, { resourceId: "nonexistent" });
        expect(pricing).toHaveLength(0);
    });
});

describe("pricing/queries — listByTenant", () => {
    it("lists all resource pricing for tenant", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.create, {
            tenantId: TENANT,
            resourceId: "r1",
            priceType: "hourly",
            basePrice: 500,
            currency: "NOK",
        });
        await t.mutation(api.mutations.create, {
            tenantId: TENANT,
            resourceId: "r2",
            priceType: "per_day",
            basePrice: 3000,
            currency: "NOK",
        });
        await t.mutation(api.mutations.create, {
            tenantId: TENANT_B,
            resourceId: "r3",
            priceType: "hourly",
            basePrice: 400,
            currency: "NOK",
        });

        const entries = await t.query(api.queries.listByTenant, { tenantId: TENANT });
        expect(entries).toHaveLength(2);
    });
});

// =============================================================================
// ORG PRICING GROUPS
// =============================================================================

describe("pricing/mutations — assignOrgPricingGroup", () => {
    it("assigns org to pricing group", async () => {
        const t = convexTest(schema, modules);
        const { id: groupId } = await t.mutation(api.mutations.createGroup, {
            tenantId: TENANT,
            name: "Corporate",
            discountPercent: 10,
        });

        const result = await t.mutation(api.mutations.assignOrgPricingGroup, {
            tenantId: TENANT,
            organizationId: "org-1",
            pricingGroupId: groupId as any,
            discountPercent: 15,
        });
        expect(result.id).toBeDefined();
    });

    it("prevents duplicate assignment", async () => {
        const t = convexTest(schema, modules);
        const { id: groupId } = await t.mutation(api.mutations.createGroup, {
            tenantId: TENANT,
            name: "Corporate",
        });

        await t.mutation(api.mutations.assignOrgPricingGroup, {
            tenantId: TENANT,
            organizationId: "org-1",
            pricingGroupId: groupId as any,
        });

        await expect(
            t.mutation(api.mutations.assignOrgPricingGroup, {
                tenantId: TENANT,
                organizationId: "org-1",
                pricingGroupId: groupId as any,
            })
        ).rejects.toThrow("already assigned");
    });

    it("throws if pricing group not found", async () => {
        const t = convexTest(schema, modules);
        const { id: groupId } = await t.mutation(api.mutations.createGroup, {
            tenantId: TENANT,
            name: "Temp",
        });
        await t.mutation(api.mutations.removeGroup, { id: groupId as any });

        await expect(
            t.mutation(api.mutations.assignOrgPricingGroup, {
                tenantId: TENANT,
                organizationId: "org-1",
                pricingGroupId: groupId as any,
            })
        ).rejects.toThrow("Pricing group not found");
    });
});

describe("pricing/mutations — removeOrgPricingGroup", () => {
    it("removes org assignment", async () => {
        const t = convexTest(schema, modules);
        const { id: groupId } = await t.mutation(api.mutations.createGroup, {
            tenantId: TENANT,
            name: "Corp",
        });
        const { id } = await t.mutation(api.mutations.assignOrgPricingGroup, {
            tenantId: TENANT,
            organizationId: "org-1",
            pricingGroupId: groupId as any,
        });

        const result = await t.mutation(api.mutations.removeOrgPricingGroup, { id: id as any });
        expect(result.success).toBe(true);
    });
});

describe("pricing/queries — listOrgPricingGroups", () => {
    it("lists org pricing groups by tenant", async () => {
        const t = convexTest(schema, modules);
        const { id: groupId } = await t.mutation(api.mutations.createGroup, {
            tenantId: TENANT,
            name: "Corp",
        });
        await t.mutation(api.mutations.assignOrgPricingGroup, {
            tenantId: TENANT,
            organizationId: "org-1",
            pricingGroupId: groupId as any,
        });
        await t.mutation(api.mutations.assignOrgPricingGroup, {
            tenantId: TENANT,
            organizationId: "org-2",
            pricingGroupId: groupId as any,
        });

        const entries = await t.query(api.queries.listOrgPricingGroups, { tenantId: TENANT });
        expect(entries).toHaveLength(2);
    });

    it("filters by organizationId", async () => {
        const t = convexTest(schema, modules);
        const { id: groupId } = await t.mutation(api.mutations.createGroup, {
            tenantId: TENANT,
            name: "Corp",
        });
        await t.mutation(api.mutations.assignOrgPricingGroup, {
            tenantId: TENANT,
            organizationId: "org-1",
            pricingGroupId: groupId as any,
        });

        const entries = await t.query(api.queries.listOrgPricingGroups, {
            tenantId: TENANT,
            organizationId: "org-1",
        });
        expect(entries).toHaveLength(1);

        const empty = await t.query(api.queries.listOrgPricingGroups, {
            tenantId: TENANT,
            organizationId: "org-999",
        });
        expect(empty).toHaveLength(0);
    });
});

// =============================================================================
// USER PRICING GROUPS
// =============================================================================

describe("pricing/mutations — assignUserPricingGroup", () => {
    it("assigns user to pricing group", async () => {
        const t = convexTest(schema, modules);
        const { id: groupId } = await t.mutation(api.mutations.createGroup, {
            tenantId: TENANT,
            name: "Medlem",
            discountPercent: 20,
        });

        const result = await t.mutation(api.mutations.assignUserPricingGroup, {
            tenantId: TENANT,
            userId: "user-1",
            pricingGroupId: groupId as any,
        });
        expect(result.id).toBeDefined();
    });

    it("prevents duplicate assignment", async () => {
        const t = convexTest(schema, modules);
        const { id: groupId } = await t.mutation(api.mutations.createGroup, {
            tenantId: TENANT,
            name: "Medlem",
        });

        await t.mutation(api.mutations.assignUserPricingGroup, {
            tenantId: TENANT,
            userId: "user-1",
            pricingGroupId: groupId as any,
        });

        await expect(
            t.mutation(api.mutations.assignUserPricingGroup, {
                tenantId: TENANT,
                userId: "user-1",
                pricingGroupId: groupId as any,
            })
        ).rejects.toThrow("already assigned");
    });
});

describe("pricing/mutations — removeUserPricingGroup", () => {
    it("removes user assignment", async () => {
        const t = convexTest(schema, modules);
        const { id: groupId } = await t.mutation(api.mutations.createGroup, {
            tenantId: TENANT,
            name: "Medlem",
        });
        const { id } = await t.mutation(api.mutations.assignUserPricingGroup, {
            tenantId: TENANT,
            userId: "user-1",
            pricingGroupId: groupId as any,
        });

        const result = await t.mutation(api.mutations.removeUserPricingGroup, { id: id as any });
        expect(result.success).toBe(true);
    });
});

describe("pricing/queries — listUserPricingGroups", () => {
    it("lists user pricing groups by tenant", async () => {
        const t = convexTest(schema, modules);
        const { id: groupId } = await t.mutation(api.mutations.createGroup, {
            tenantId: TENANT,
            name: "Medlem",
        });
        await t.mutation(api.mutations.assignUserPricingGroup, {
            tenantId: TENANT,
            userId: "user-1",
            pricingGroupId: groupId as any,
        });

        const entries = await t.query(api.queries.listUserPricingGroups, { tenantId: TENANT });
        expect(entries).toHaveLength(1);
    });

    it("filters by userId", async () => {
        const t = convexTest(schema, modules);
        const { id: groupId } = await t.mutation(api.mutations.createGroup, {
            tenantId: TENANT,
            name: "Medlem",
        });
        await t.mutation(api.mutations.assignUserPricingGroup, {
            tenantId: TENANT,
            userId: "user-1",
            pricingGroupId: groupId as any,
        });

        const entries = await t.query(api.queries.listUserPricingGroups, {
            tenantId: TENANT,
            userId: "user-1",
        });
        expect(entries).toHaveLength(1);

        const empty = await t.query(api.queries.listUserPricingGroups, {
            tenantId: TENANT,
            userId: "user-999",
        });
        expect(empty).toHaveLength(0);
    });
});

// =============================================================================
// ADDITIONAL SERVICES
// =============================================================================

describe("pricing/mutations — createAdditionalService", () => {
    it("creates an additional service", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.mutations.createAdditionalService, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            name: "Lydanlegg",
            price: 1500,
            currency: "NOK",
        });
        expect(result.id).toBeDefined();

        const service = await t.query(api.queries.getAdditionalService, { id: result.id as any });
        expect(service!.name).toBe("Lydanlegg");
        expect(service!.price).toBe(1500);
        expect(service!.isActive).toBe(true);
    });
});

describe("pricing/mutations — updateAdditionalService", () => {
    it("updates service fields", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createAdditionalService, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            name: "Lydanlegg",
            price: 1500,
        });

        await t.mutation(api.mutations.updateAdditionalService, {
            id: id as any,
            price: 2000,
            isActive: false,
        });

        const service = await t.query(api.queries.getAdditionalService, { id: id as any });
        expect(service!.price).toBe(2000);
        expect(service!.isActive).toBe(false);
    });
});

describe("pricing/mutations — removeAdditionalService", () => {
    it("deletes additional service", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createAdditionalService, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            name: "Lydanlegg",
            price: 1500,
        });

        const result = await t.mutation(api.mutations.removeAdditionalService, { id: id as any });
        expect(result.success).toBe(true);
    });
});

describe("pricing/queries — listAdditionalServices", () => {
    it("lists services for a resource sorted by displayOrder", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createAdditionalService, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            name: "Projektor",
            price: 800,
            displayOrder: 2,
        });
        await t.mutation(api.mutations.createAdditionalService, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            name: "Lydanlegg",
            price: 1500,
            displayOrder: 1,
        });

        const services = await t.query(api.queries.listAdditionalServices, { resourceId: RESOURCE });
        expect(services).toHaveLength(2);
        expect(services[0].name).toBe("Lydanlegg");
        expect(services[1].name).toBe("Projektor");
    });
});

describe("pricing/queries — getAdditionalServicesByIds", () => {
    it("batch-fetches services by IDs", async () => {
        const t = convexTest(schema, modules);
        const { id: id1 } = await t.mutation(api.mutations.createAdditionalService, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            name: "Lydanlegg",
            price: 1500,
        });
        const { id: id2 } = await t.mutation(api.mutations.createAdditionalService, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            name: "Projektor",
            price: 800,
        });

        const services = await t.query(api.queries.getAdditionalServicesByIds, {
            ids: [id1, id2],
        });
        expect(services).toHaveLength(2);
    });
});

// =============================================================================
// TICKET TEMPLATES
// =============================================================================

describe("pricing/mutations — createTicketTemplate", () => {
    it("creates a ticket template", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.mutations.createTicketTemplate, {
            tenantId: TENANT,
            name: "Voksen",
            price: 350,
        });
        expect(result.id).toBeDefined();

        const tpl = await t.query(api.queries.getTicketTemplate, { id: result.id as any });
        expect(tpl.name).toBe("Voksen");
        expect(tpl.price).toBe(350);
        expect(tpl.isActive).toBe(true);
    });
});

describe("pricing/mutations — updateTicketTemplate", () => {
    it("updates ticket template", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createTicketTemplate, {
            tenantId: TENANT,
            name: "Voksen",
            price: 350,
        });

        await t.mutation(api.mutations.updateTicketTemplate, {
            id: id as any,
            price: 400,
            maxPerPurchase: 10,
        });

        const tpl = await t.query(api.queries.getTicketTemplate, { id: id as any });
        expect(tpl.price).toBe(400);
        expect(tpl.maxPerPurchase).toBe(10);
    });
});

describe("pricing/mutations — removeTicketTemplate", () => {
    it("deletes ticket template", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createTicketTemplate, {
            tenantId: TENANT,
            name: "Voksen",
            price: 350,
        });

        const result = await t.mutation(api.mutations.removeTicketTemplate, { id: id as any });
        expect(result.success).toBe(true);

        await expect(
            t.query(api.queries.getTicketTemplate, { id: id as any })
        ).rejects.toThrow("Ticket template not found");
    });
});

describe("pricing/queries — listTicketTemplates", () => {
    it("lists templates by tenant", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createTicketTemplate, {
            tenantId: TENANT,
            name: "Voksen",
            price: 350,
            displayOrder: 1,
        });
        await t.mutation(api.mutations.createTicketTemplate, {
            tenantId: TENANT,
            name: "Barn",
            price: 150,
            displayOrder: 2,
        });
        await t.mutation(api.mutations.createTicketTemplate, {
            tenantId: TENANT_B,
            name: "Other",
            price: 200,
        });

        const templates = await t.query(api.queries.listTicketTemplates, { tenantId: TENANT });
        expect(templates).toHaveLength(2);
        expect(templates[0].name).toBe("Voksen");
    });
});

// =============================================================================
// DISCOUNT CODES
// =============================================================================

describe("pricing/discounts — createDiscountCode", () => {
    it("creates a percent discount code", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.discounts.createDiscountCode, {
            tenantId: TENANT,
            code: "velkomst10",
            name: "Velkommen 10%",
            discountType: "percent",
            discountValue: 10,
        });
        expect(result.id).toBeDefined();

        // Code should be uppercased
        const codes = await t.query(api.discounts.listDiscountCodes, { tenantId: TENANT });
        expect(codes).toHaveLength(1);
        expect(codes[0].code).toBe("VELKOMST10");
        expect(codes[0].currentUses).toBe(0);
        expect(codes[0].isActive).toBe(true);
    });

    it("creates a fixed discount code", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.discounts.createDiscountCode, {
            tenantId: TENANT,
            code: "FLAT200",
            name: "200kr avslag",
            discountType: "fixed",
            discountValue: 200,
            maxUsesTotal: 100,
            maxUsesPerUser: 1,
        });
        expect(result.id).toBeDefined();
    });

    it("prevents duplicate code per tenant", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.discounts.createDiscountCode, {
            tenantId: TENANT,
            code: "DUP",
            name: "First",
            discountType: "percent",
            discountValue: 5,
        });

        await expect(
            t.mutation(api.discounts.createDiscountCode, {
                tenantId: TENANT,
                code: "dup", // lowercase should still conflict
                name: "Second",
                discountType: "percent",
                discountValue: 10,
            })
        ).rejects.toThrow("already exists");
    });
});

describe("pricing/discounts — updateDiscountCode", () => {
    it("updates discount code fields", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.discounts.createDiscountCode, {
            tenantId: TENANT,
            code: "TEST",
            name: "Test",
            discountType: "percent",
            discountValue: 10,
        });

        await t.mutation(api.discounts.updateDiscountCode, {
            id: id as any,
            discountValue: 20,
            isActive: false,
        });

        const codes = await t.query(api.discounts.listDiscountCodes, { tenantId: TENANT });
        expect(codes[0].discountValue).toBe(20);
        expect(codes[0].isActive).toBe(false);
    });
});

describe("pricing/discounts — deleteDiscountCode", () => {
    it("deletes unused discount code", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.discounts.createDiscountCode, {
            tenantId: TENANT,
            code: "TODEL",
            name: "ToDelete",
            discountType: "fixed",
            discountValue: 50,
        });

        const result = await t.mutation(api.discounts.deleteDiscountCode, { id: id as any });
        expect(result.success).toBe(true);
    });

    it("blocks deletion of used discount code", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.discounts.createDiscountCode, {
            tenantId: TENANT,
            code: "USED",
            name: "Used",
            discountType: "percent",
            discountValue: 10,
        });

        // Record usage
        await t.mutation(api.discounts.applyDiscountCode, {
            tenantId: TENANT,
            discountCodeId: id as any,
            userId: "user-1",
            discountAmount: 100,
        });

        await expect(
            t.mutation(api.discounts.deleteDiscountCode, { id: id as any })
        ).rejects.toThrow("has been used");
    });
});

describe("pricing/discounts — validateDiscountCode", () => {
    it("validates active code", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.discounts.createDiscountCode, {
            tenantId: TENANT,
            code: "VALID",
            name: "Valid",
            discountType: "percent",
            discountValue: 10,
        });

        const result = await t.query(api.discounts.validateDiscountCode, {
            tenantId: TENANT,
            code: "valid", // lowercase should work
        });
        expect(result.valid).toBe(true);
        expect(result.code!.discountType).toBe("percent");
        expect(result.code!.discountValue).toBe(10);
    });

    it("rejects nonexistent code", async () => {
        const t = convexTest(schema, modules);
        const result = await t.query(api.discounts.validateDiscountCode, {
            tenantId: TENANT,
            code: "NOPE",
        });
        expect(result.valid).toBe(false);
        expect(result.code).toBeNull();
    });

    it("rejects inactive code", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.discounts.createDiscountCode, {
            tenantId: TENANT,
            code: "INACTIVE",
            name: "Inactive",
            discountType: "percent",
            discountValue: 10,
        });
        await t.mutation(api.discounts.updateDiscountCode, { id: id as any, isActive: false });

        const result = await t.query(api.discounts.validateDiscountCode, {
            tenantId: TENANT,
            code: "INACTIVE",
        });
        expect(result.valid).toBe(false);
    });

    it("rejects exhausted code", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.discounts.createDiscountCode, {
            tenantId: TENANT,
            code: "LIMITED",
            name: "Limited",
            discountType: "percent",
            discountValue: 10,
            maxUsesTotal: 1,
        });

        // Use it once
        await t.mutation(api.discounts.applyDiscountCode, {
            tenantId: TENANT,
            discountCodeId: id as any,
            userId: "user-1",
            discountAmount: 100,
        });

        const result = await t.query(api.discounts.validateDiscountCode, {
            tenantId: TENANT,
            code: "LIMITED",
        });
        expect(result.valid).toBe(false);
    });

    it("rejects code restricted to other resource", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.discounts.createDiscountCode, {
            tenantId: TENANT,
            code: "SPECIFIC",
            name: "Specific",
            discountType: "percent",
            discountValue: 10,
            appliesToResources: ["resource-A"],
        });

        const result = await t.query(api.discounts.validateDiscountCode, {
            tenantId: TENANT,
            code: "SPECIFIC",
            resourceId: "resource-B",
        });
        expect(result.valid).toBe(false);
    });

    it("rejects for non-first-time booker when firstTimeBookersOnly", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.discounts.createDiscountCode, {
            tenantId: TENANT,
            code: "FIRSTONLY",
            name: "First Time",
            discountType: "percent",
            discountValue: 25,
            firstTimeBookersOnly: true,
        });

        const result = await t.query(api.discounts.validateDiscountCode, {
            tenantId: TENANT,
            code: "FIRSTONLY",
            isFirstTimeBooker: false,
        });
        expect(result.valid).toBe(false);
    });
});

describe("pricing/discounts — applyDiscountCode", () => {
    it("records usage and increments counter", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.discounts.createDiscountCode, {
            tenantId: TENANT,
            code: "APPLY",
            name: "Apply",
            discountType: "fixed",
            discountValue: 100,
        });

        const result = await t.mutation(api.discounts.applyDiscountCode, {
            tenantId: TENANT,
            discountCodeId: id as any,
            userId: "user-1",
            bookingId: "booking-1",
            discountAmount: 100,
        });
        expect(result.success).toBe(true);
        expect(result.id).toBeDefined();

        // Check counter incremented
        const codes = await t.query(api.discounts.listDiscountCodes, { tenantId: TENANT });
        expect(codes[0].currentUses).toBe(1);
    });
});

describe("pricing/discounts — listDiscountCodes", () => {
    it("filters by isActive", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.discounts.createDiscountCode, {
            tenantId: TENANT,
            code: "A",
            name: "A",
            discountType: "percent",
            discountValue: 10,
        });
        const { id } = await t.mutation(api.discounts.createDiscountCode, {
            tenantId: TENANT,
            code: "B",
            name: "B",
            discountType: "percent",
            discountValue: 10,
        });
        await t.mutation(api.discounts.updateDiscountCode, { id: id as any, isActive: false });

        const active = await t.query(api.discounts.listDiscountCodes, {
            tenantId: TENANT,
            isActive: true,
        });
        expect(active).toHaveLength(1);
        expect(active[0].code).toBe("A");
    });
});

// =============================================================================
// HOLIDAYS
// =============================================================================

describe("pricing/holidays — createHoliday", () => {
    it("creates a holiday surcharge", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.holidays.createHoliday, {
            tenantId: TENANT,
            name: "Julaften",
            date: "12-24",
            isRecurring: true,
            surchargeType: "percent",
            surchargeValue: 50,
        });
        expect(result.id).toBeDefined();

        const holidays = await t.query(api.holidays.listHolidays, { tenantId: TENANT });
        expect(holidays).toHaveLength(1);
        expect(holidays[0].name).toBe("Julaften");
        expect(holidays[0].isRecurring).toBe(true);
        expect(holidays[0].isActive).toBe(true);
    });

    it("creates non-recurring holiday", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.holidays.createHoliday, {
            tenantId: TENANT,
            name: "Spesiell dag",
            date: "2026-05-17",
            isRecurring: false,
            surchargeType: "fixed",
            surchargeValue: 500,
            appliesToResources: ["res-1"],
        });
        expect(result.id).toBeDefined();
    });
});

describe("pricing/holidays — updateHoliday", () => {
    it("updates holiday fields", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.holidays.createHoliday, {
            tenantId: TENANT,
            name: "Test",
            date: "01-01",
            isRecurring: true,
            surchargeType: "percent",
            surchargeValue: 25,
        });

        await t.mutation(api.holidays.updateHoliday, {
            id: id as any,
            surchargeValue: 50,
            isActive: false,
        });

        const holidays = await t.query(api.holidays.listHolidays, { tenantId: TENANT });
        expect(holidays[0].surchargeValue).toBe(50);
        expect(holidays[0].isActive).toBe(false);
    });
});

describe("pricing/holidays — deleteHoliday", () => {
    it("deletes a holiday", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.holidays.createHoliday, {
            tenantId: TENANT,
            name: "Test",
            date: "01-01",
            isRecurring: true,
            surchargeType: "percent",
            surchargeValue: 25,
        });

        const result = await t.mutation(api.holidays.deleteHoliday, { id: id as any });
        expect(result.success).toBe(true);

        const holidays = await t.query(api.holidays.listHolidays, { tenantId: TENANT });
        expect(holidays).toHaveLength(0);
    });
});

describe("pricing/holidays — listHolidays", () => {
    it("filters by isActive", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.holidays.createHoliday, {
            tenantId: TENANT,
            name: "Active",
            date: "12-24",
            isRecurring: true,
            surchargeType: "percent",
            surchargeValue: 50,
        });
        const { id } = await t.mutation(api.holidays.createHoliday, {
            tenantId: TENANT,
            name: "Inactive",
            date: "12-25",
            isRecurring: true,
            surchargeType: "percent",
            surchargeValue: 25,
        });
        await t.mutation(api.holidays.updateHoliday, { id: id as any, isActive: false });

        const active = await t.query(api.holidays.listHolidays, {
            tenantId: TENANT,
            isActive: true,
        });
        expect(active).toHaveLength(1);
        expect(active[0].name).toBe("Active");
    });

    it("tenant isolation", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.holidays.createHoliday, {
            tenantId: TENANT,
            name: "T1",
            date: "12-24",
            isRecurring: true,
            surchargeType: "percent",
            surchargeValue: 50,
        });
        await t.mutation(api.holidays.createHoliday, {
            tenantId: TENANT_B,
            name: "T2",
            date: "12-25",
            isRecurring: true,
            surchargeType: "fixed",
            surchargeValue: 200,
        });

        const t1 = await t.query(api.holidays.listHolidays, { tenantId: TENANT });
        expect(t1).toHaveLength(1);
        expect(t1[0].name).toBe("T1");
    });
});

// =============================================================================
// WEEKDAY PRICING / SURCHARGES
// =============================================================================

describe("pricing/surcharges — createWeekdayPricing", () => {
    it("creates a weekday surcharge", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.surcharges.createWeekdayPricing, {
            tenantId: TENANT,
            dayOfWeek: 6, // Saturday
            surchargeType: "percent",
            surchargeValue: 25,
            label: "Helgetillegg",
        });
        expect(result.id).toBeDefined();

        const rules = await t.query(api.surcharges.listWeekdayPricing, { tenantId: TENANT });
        expect(rules).toHaveLength(1);
        expect(rules[0].dayOfWeek).toBe(6);
        expect(rules[0].label).toBe("Helgetillegg");
    });

    it("creates time-based peak pricing", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.surcharges.createWeekdayPricing, {
            tenantId: TENANT,
            dayOfWeek: 1, // Monday
            surchargeType: "fixed",
            surchargeValue: 200,
            startTime: "17:00",
            endTime: "21:00",
            label: "Kveldstillegg",
        });
        expect(result.id).toBeDefined();
    });

    it("rejects invalid dayOfWeek", async () => {
        const t = convexTest(schema, modules);
        await expect(
            t.mutation(api.surcharges.createWeekdayPricing, {
                tenantId: TENANT,
                dayOfWeek: 7,
                surchargeType: "percent",
                surchargeValue: 10,
            })
        ).rejects.toThrow("dayOfWeek must be between 0");
    });
});

describe("pricing/surcharges — updateWeekdayPricing", () => {
    it("updates surcharge fields", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.surcharges.createWeekdayPricing, {
            tenantId: TENANT,
            dayOfWeek: 0,
            surchargeType: "percent",
            surchargeValue: 50,
        });

        await t.mutation(api.surcharges.updateWeekdayPricing, {
            id: id as any,
            surchargeValue: 75,
            isActive: false,
        });

        // List all including inactive
        const rules = await t.query(api.surcharges.listWeekdayPricing, {
            tenantId: TENANT,
            isActive: false,
        });
        expect(rules).toHaveLength(1);
        expect(rules[0].surchargeValue).toBe(75);
    });

    it("rejects invalid dayOfWeek on update", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.surcharges.createWeekdayPricing, {
            tenantId: TENANT,
            dayOfWeek: 0,
            surchargeType: "percent",
            surchargeValue: 50,
        });

        await expect(
            t.mutation(api.surcharges.updateWeekdayPricing, { id: id as any, dayOfWeek: -1 })
        ).rejects.toThrow("dayOfWeek must be between 0");
    });
});

describe("pricing/surcharges — deleteWeekdayPricing", () => {
    it("deletes weekday pricing rule", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.surcharges.createWeekdayPricing, {
            tenantId: TENANT,
            dayOfWeek: 6,
            surchargeType: "percent",
            surchargeValue: 25,
        });

        const result = await t.mutation(api.surcharges.deleteWeekdayPricing, { id: id as any });
        expect(result.success).toBe(true);
    });
});

describe("pricing/surcharges — listWeekdayPricing", () => {
    it("filters by dayOfWeek", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.surcharges.createWeekdayPricing, {
            tenantId: TENANT,
            dayOfWeek: 6,
            surchargeType: "percent",
            surchargeValue: 25,
        });
        await t.mutation(api.surcharges.createWeekdayPricing, {
            tenantId: TENANT,
            dayOfWeek: 0,
            surchargeType: "percent",
            surchargeValue: 50,
        });

        const saturday = await t.query(api.surcharges.listWeekdayPricing, {
            tenantId: TENANT,
            dayOfWeek: 6,
        });
        expect(saturday).toHaveLength(1);
        expect(saturday[0].surchargeValue).toBe(25);
    });

    it("filters by resourceId", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.surcharges.createWeekdayPricing, {
            tenantId: TENANT,
            dayOfWeek: 6,
            surchargeType: "percent",
            surchargeValue: 25,
        });
        await t.mutation(api.surcharges.createWeekdayPricing, {
            tenantId: TENANT,
            resourceId: "res-specific",
            dayOfWeek: 6,
            surchargeType: "fixed",
            surchargeValue: 200,
        });

        // Should return global rule + specific rule for res-specific
        const rules = await t.query(api.surcharges.listWeekdayPricing, {
            tenantId: TENANT,
            resourceId: "res-specific",
        });
        expect(rules).toHaveLength(2);
    });
});

// =============================================================================
// CALCULATIONS
// =============================================================================

describe("pricing/calculations — calculatePrice", () => {
    it("calculates hourly price", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.create, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            priceType: "hourly",
            basePrice: 500,
            currency: "NOK",
            pricePerHour: 500,
        });

        const now = Date.now();
        const result = await t.query(api.calculations.calculatePrice, {
            resourceId: RESOURCE,
            startTime: now,
            endTime: now + 2 * 60 * 60 * 1000, // 2 hours
        });

        expect(result.total).toBe(1000); // 2 hours × 500
        expect(result.currency).toBe("NOK");
        expect(result.durationHours).toBe(2);
    });

    it("applies org discount", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.create, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            priceType: "hourly",
            basePrice: 1000,
            currency: "NOK",
            pricePerHour: 1000,
        });

        // Create org pricing group with discount
        const { id: groupId } = await t.mutation(api.mutations.createGroup, {
            tenantId: TENANT,
            name: "Corp",
            discountPercent: 10,
        });
        await t.mutation(api.mutations.assignOrgPricingGroup, {
            tenantId: TENANT,
            organizationId: "org-1",
            pricingGroupId: groupId as any,
            discountPercent: 10,
        });

        const now = Date.now();
        const result = await t.query(api.calculations.calculatePrice, {
            resourceId: RESOURCE,
            startTime: now,
            endTime: now + 1 * 60 * 60 * 1000,
            organizationId: "org-1",
        });

        expect(result.breakdown.discountPercent).toBe(10);
        expect(result.breakdown.discountAmount).toBe(100); // 10% of 1000
        expect(result.total).toBe(900);
    });

    it("throws if no pricing configured", async () => {
        const t = convexTest(schema, modules);
        const now = Date.now();
        await expect(
            t.query(api.calculations.calculatePrice, {
                resourceId: "nonexistent",
                startTime: now,
                endTime: now + 3600000,
            })
        ).rejects.toThrow("No pricing configured");
    });
});

describe("pricing/calculations — calculatePriceWithBreakdown", () => {
    it("calculates per_hour with full breakdown", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.create, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            priceType: "per_hour",
            basePrice: 500,
            currency: "NOK",
            pricePerHour: 500,
            taxRate: 0.25,
        });

        const result = await t.query(api.calculations.calculatePriceWithBreakdown, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            bookingMode: "DURATION",
            durationMinutes: 120,
            attendees: 1,
        });

        expect(result.items).toHaveLength(1);
        expect(result.items[0].type).toBe("duration");
        expect(result.subtotal).toBe(1000); // 2h × 500
        expect(result.taxRate).toBe(0.25);
        expect(result.taxAmount).toBe(250);
        expect(result.total).toBe(1250);
        expect(result.currency).toBe("NOK");
    });

    it("returns fallback when no pricing exists", async () => {
        const t = convexTest(schema, modules);
        const result = await t.query(api.calculations.calculatePriceWithBreakdown, {
            tenantId: TENANT,
            resourceId: "nonexistent",
            bookingMode: "DURATION",
            durationMinutes: 60,
            attendees: 1,
        });

        expect(result.total).toBe(0);
        expect(result.validation.valid).toBe(false);
    });

    it("applies holiday surcharge", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.create, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            priceType: "per_hour",
            basePrice: 1000,
            currency: "NOK",
            pricePerHour: 1000,
            taxRate: 0,
        });

        // Create recurring holiday for Dec 24
        await t.mutation(api.holidays.createHoliday, {
            tenantId: TENANT,
            name: "Julaften",
            date: "12-24",
            isRecurring: true,
            surchargeType: "percent",
            surchargeValue: 50,
        });

        // Book on Dec 24, 2026
        const dec24 = new Date(2026, 11, 24, 10, 0).getTime();
        const result = await t.query(api.calculations.calculatePriceWithBreakdown, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            bookingMode: "DURATION",
            durationMinutes: 60,
            attendees: 1,
            bookingDate: dec24,
        });

        expect(result.surcharges.length).toBeGreaterThanOrEqual(1);
        expect(result.surcharges[0].label).toBe("Julaften");
        expect(result.surchargeTotal).toBe(500); // 50% of 1000
    });

    it("applies discount code", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.create, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            priceType: "per_hour",
            basePrice: 1000,
            currency: "NOK",
            pricePerHour: 1000,
            taxRate: 0,
        });

        await t.mutation(api.discounts.createDiscountCode, {
            tenantId: TENANT,
            code: "SAVE20",
            name: "Save 20%",
            discountType: "percent",
            discountValue: 20,
        });

        const result = await t.query(api.calculations.calculatePriceWithBreakdown, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            bookingMode: "DURATION",
            durationMinutes: 60,
            attendees: 1,
            discountCode: "SAVE20",
        });

        expect(result.discounts).toHaveLength(1);
        expect(result.totalDiscountAmount).toBe(200); // 20% of 1000
        expect(result.discountCodeApplied).not.toBeNull();
        expect(result.discountCodeApplied!.code).toBe("SAVE20");
    });

    it("validates duration constraints", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.create, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            priceType: "per_hour",
            basePrice: 500,
            currency: "NOK",
            pricePerHour: 500,
            minDuration: 120,
            maxDuration: 480,
        });

        const result = await t.query(api.calculations.calculatePriceWithBreakdown, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            bookingMode: "DURATION",
            durationMinutes: 30, // Below minimum
            attendees: 1,
        });

        expect(result.validation.valid).toBe(false);
        expect(result.validation.errors.length).toBeGreaterThan(0);
    });

    it("handles TICKETS mode", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.create, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            priceType: "per_person",
            basePrice: 350,
            currency: "NOK",
            pricePerPerson: 350,
            taxRate: 0,
        });

        const result = await t.query(api.calculations.calculatePriceWithBreakdown, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            bookingMode: "TICKETS",
            durationMinutes: 120,
            attendees: 1,
            tickets: 5,
        });

        expect(result.items).toHaveLength(1);
        expect(result.items[0].type).toBe("ticket");
        expect(result.items[0].quantity).toBe(5);
        expect(result.subtotal).toBe(1750); // 5 × 350
    });

    it("adds cleaning fee and service fee", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.create, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            priceType: "per_booking",
            basePrice: 2000,
            currency: "NOK",
            cleaningFee: 500,
            serviceFee: 100,
            taxRate: 0,
        });

        const result = await t.query(api.calculations.calculatePriceWithBreakdown, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            bookingMode: "ALL_DAY",
            durationMinutes: 480,
            attendees: 10,
        });

        const feeItems = result.items.filter((i: any) => i.type === "fee");
        expect(feeItems).toHaveLength(2);
        expect(result.subtotal).toBe(2600); // 2000 + 500 + 100
    });
});

// =============================================================================
// SURCHARGES QUERY — getApplicableSurcharges
// =============================================================================

describe("pricing/surcharges — getApplicableSurcharges", () => {
    it("returns holiday surcharge", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.holidays.createHoliday, {
            tenantId: TENANT,
            name: "17. mai",
            date: "05-17",
            isRecurring: true,
            surchargeType: "multiplier",
            surchargeValue: 1.5,
        });

        const may17 = new Date(2026, 4, 17, 10, 0).getTime();
        const surcharges = await t.query(api.surcharges.getApplicableSurcharges, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            bookingDate: may17,
        });

        expect(surcharges).toHaveLength(1);
        expect(surcharges[0].type).toBe("holiday");
        expect(surcharges[0].label).toBe("17. mai");
    });

    it("returns weekday surcharge", async () => {
        const t = convexTest(schema, modules);
        // Create Saturday surcharge
        await t.mutation(api.surcharges.createWeekdayPricing, {
            tenantId: TENANT,
            dayOfWeek: 6, // Saturday
            surchargeType: "percent",
            surchargeValue: 25,
            label: "Lørdagstillegg",
        });

        // Find next Saturday
        const now = new Date();
        const daysUntilSat = (6 - now.getDay() + 7) % 7 || 7;
        const nextSat = new Date(now);
        nextSat.setDate(now.getDate() + daysUntilSat);
        nextSat.setHours(10, 0, 0, 0);

        const surcharges = await t.query(api.surcharges.getApplicableSurcharges, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            bookingDate: nextSat.getTime(),
        });

        expect(surcharges.length).toBeGreaterThanOrEqual(1);
        const weekdaySurcharge = surcharges.find((s: any) => s.type === "weekday");
        expect(weekdaySurcharge).toBeDefined();
        expect(weekdaySurcharge!.label).toBe("Lørdagstillegg");
    });
});

// =============================================================================
// PRICING CONFIG DISPLAY QUERIES
// =============================================================================

describe("pricing/queries — getResourcePricingConfig", () => {
    it("returns full config with display info", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.create, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            priceType: "hourly",
            basePrice: 500,
            currency: "NOK",
            pricePerHour: 500,
            cleaningFee: 300,
            depositAmount: 2000,
            minDuration: 60,
            maxPeople: 50,
        });

        const config = await t.query(api.queries.getResourcePricingConfig, {
            resourceId: RESOURCE,
        });

        expect(config).not.toBeNull();
        expect(config!.displayInfo.priceType).toBe("hourly");
        expect(config!.displayInfo.hasCleaningFee).toBe(true);
        expect(config!.displayInfo.hasDeposit).toBe(true);
        expect(config!.constraints.minDurationMinutes).toBe(60);
        expect(config!.constraints.maxPeople).toBe(50);
    });

    it("returns null for nonexistent resource", async () => {
        const t = convexTest(schema, modules);
        const config = await t.query(api.queries.getResourcePricingConfig, {
            resourceId: "nonexistent",
        });
        expect(config).toBeNull();
    });
});

describe("pricing/queries — getResourcePriceGroups", () => {
    it("returns applicable pricing groups for resource", async () => {
        const t = convexTest(schema, modules);
        const { id: groupId } = await t.mutation(api.mutations.createGroup, {
            tenantId: TENANT,
            name: "Standard",
            priority: 1,
        });
        const { id: groupId2 } = await t.mutation(api.mutations.createGroup, {
            tenantId: TENANT,
            name: "Medlem",
            discountPercent: 20,
            priority: 2,
        });

        // Create pricing entries referencing the groups
        await t.mutation(api.mutations.create, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            pricingGroupId: groupId,
            priceType: "hourly",
            basePrice: 500,
            currency: "NOK",
        });
        await t.mutation(api.mutations.create, {
            tenantId: TENANT,
            resourceId: RESOURCE,
            pricingGroupId: groupId2,
            priceType: "hourly",
            basePrice: 400,
            currency: "NOK",
        });

        const groups = await t.query(api.queries.getResourcePriceGroups, {
            tenantId: TENANT,
            resourceId: RESOURCE,
        });

        expect(groups).toHaveLength(2);
        // Sorted by priority
        expect(groups[0].name).toBe("Standard");
        expect(groups[1].name).toBe("Medlem");
    });
});

// =============================================================================
// SCHEMA INDEXES
// =============================================================================

describe("pricing/schema — indexes", () => {
    it("pricingGroups.by_tenant index works", async () => {
        const t = convexTest(schema, modules);
        await t.run(async (ctx) => {
            await ctx.db.insert("pricingGroups", {
                tenantId: TENANT,
                name: "Test",
                isDefault: false,
                priority: 0,
                isActive: true,
                metadata: {},
            });
            const results = await ctx.db
                .query("pricingGroups")
                .withIndex("by_tenant", (q) => q.eq("tenantId", TENANT))
                .collect();
            expect(results).toHaveLength(1);
        });
    });

    it("resourcePricing.by_resource index works", async () => {
        const t = convexTest(schema, modules);
        await t.run(async (ctx) => {
            await ctx.db.insert("resourcePricing", {
                tenantId: TENANT,
                resourceId: RESOURCE,
                priceType: "hourly",
                basePrice: 500,
                currency: "NOK",
                rules: {},
                isActive: true,
                metadata: {},
            });
            const results = await ctx.db
                .query("resourcePricing")
                .withIndex("by_resource", (q) => q.eq("resourceId", RESOURCE))
                .collect();
            expect(results).toHaveLength(1);
        });
    });

    it("discountCodes.by_code index works", async () => {
        const t = convexTest(schema, modules);
        await t.run(async (ctx) => {
            await ctx.db.insert("discountCodes", {
                tenantId: TENANT,
                code: "TEST",
                name: "Test",
                discountType: "percent",
                discountValue: 10,
                currentUses: 0,
                isActive: true,
                metadata: {},
            });
            const results = await ctx.db
                .query("discountCodes")
                .withIndex("by_code", (q) => q.eq("tenantId", TENANT).eq("code", "TEST"))
                .collect();
            expect(results).toHaveLength(1);
        });
    });

    it("holidays.by_tenant index works", async () => {
        const t = convexTest(schema, modules);
        await t.run(async (ctx) => {
            await ctx.db.insert("holidays", {
                tenantId: TENANT,
                name: "Test",
                date: "12-24",
                isRecurring: true,
                surchargeType: "percent",
                surchargeValue: 50,
                isActive: true,
                metadata: {},
            });
            const results = await ctx.db
                .query("holidays")
                .withIndex("by_tenant", (q) => q.eq("tenantId", TENANT))
                .collect();
            expect(results).toHaveLength(1);
        });
    });

    it("weekdayPricing.by_tenant_day index works", async () => {
        const t = convexTest(schema, modules);
        await t.run(async (ctx) => {
            await ctx.db.insert("weekdayPricing", {
                tenantId: TENANT,
                dayOfWeek: 6,
                surchargeType: "percent",
                surchargeValue: 25,
                isActive: true,
                metadata: {},
            });
            const results = await ctx.db
                .query("weekdayPricing")
                .withIndex("by_tenant_day", (q) => q.eq("tenantId", TENANT).eq("dayOfWeek", 6))
                .collect();
            expect(results).toHaveLength(1);
        });
    });

    it("additionalServices.by_resource index works", async () => {
        const t = convexTest(schema, modules);
        await t.run(async (ctx) => {
            await ctx.db.insert("additionalServices", {
                tenantId: TENANT,
                resourceId: RESOURCE,
                name: "Test",
                price: 100,
                isActive: true,
                metadata: {},
            });
            const results = await ctx.db
                .query("additionalServices")
                .withIndex("by_resource", (q) => q.eq("resourceId", RESOURCE))
                .collect();
            expect(results).toHaveLength(1);
        });
    });

    it("ticketTemplates.by_tenant index works", async () => {
        const t = convexTest(schema, modules);
        await t.run(async (ctx) => {
            await ctx.db.insert("ticketTemplates", {
                tenantId: TENANT,
                name: "Voksen",
                price: 350,
                isActive: true,
                metadata: {},
            });
            const results = await ctx.db
                .query("ticketTemplates")
                .withIndex("by_tenant", (q) => q.eq("tenantId", TENANT))
                .collect();
            expect(results).toHaveLength(1);
        });
    });
});
