import { describe, it, expect } from "vitest";
import { api, components } from "../../_generated/api";
import { createDomainTest, seedTestTenant, seedResource } from "./testHelper.test-util";

describe("domain/pricing", () => {
    function setup() {
        return createDomainTest(["pricing", "resources", "audit"]);
    }

    // =========================================================================
    // PRICING GROUPS
    // =========================================================================

    describe("createGroup", () => {
        it("creates a pricing group with required fields", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const result = await t.mutation(api.domain.pricing.createGroup, {
                tenantId,
                name: "Standard",
            });

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
        });

        it("creates a pricing group with optional fields", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const result = await t.mutation(api.domain.pricing.createGroup, {
                tenantId,
                name: "Medlem",
                description: "Medlemspris for faste leietakere",
                groupType: "member",
                discountPercent: 20,
                isDefault: false,
                priority: 1,
            });

            expect(result.id).toBeDefined();
        });

        it("creates audit entry when group is created", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const result = await t.mutation(api.domain.pricing.createGroup, {
                tenantId,
                name: "VIP",
            });

            const auditEntries = await t.query(
                components.audit.functions.listForTenant,
                { tenantId: tenantId as string }
            );
            const groupAudit = auditEntries.find(
                (e: any) => e.entityType === "pricingGroup" && e.entityId === result.id
            );
            expect(groupAudit).toBeDefined();
            expect(groupAudit.action).toBe("created");
        });
    });

    describe("listGroups", () => {
        it("lists groups for a tenant", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            await t.mutation(api.domain.pricing.createGroup, {
                tenantId,
                name: "Standard",
            });
            await t.mutation(api.domain.pricing.createGroup, {
                tenantId,
                name: "Medlem",
            });

            const groups = await t.query(api.domain.pricing.listGroups, {
                tenantId,
            });

            expect(groups.length).toBe(2);
        });
    });

    describe("getGroup", () => {
        it("gets a group by ID", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await t.mutation(api.domain.pricing.createGroup, {
                tenantId,
                name: "Standard",
                description: "Default pricing group",
            });

            const group = await t.query(api.domain.pricing.getGroup, { id });

            expect(group.name).toBe("Standard");
            expect(group.description).toBe("Default pricing group");
            expect(group.isActive).toBe(true);
        });
    });

    describe("updateGroup", () => {
        it("updates group fields", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await t.mutation(api.domain.pricing.createGroup, {
                tenantId,
                name: "Old Name",
            });

            await t.mutation(api.domain.pricing.updateGroup, {
                id,
                name: "New Name",
                discountPercent: 15,
            });

            const updated = await t.query(api.domain.pricing.getGroup, { id });
            expect(updated.name).toBe("New Name");
            expect(updated.discountPercent).toBe(15);
        });
    });

    describe("removeGroup", () => {
        it("removes a group not in use", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await t.mutation(api.domain.pricing.createGroup, {
                tenantId,
                name: "To Remove",
            });

            const result = await t.mutation(api.domain.pricing.removeGroup, { id });
            expect(result.success).toBe(true);

            const groups = await t.query(api.domain.pricing.listGroups, {
                tenantId,
            });
            expect(groups.length).toBe(0);
        });
    });

    // =========================================================================
    // RESOURCE PRICING
    // =========================================================================

    describe("create (resource pricing)", () => {
        it("creates resource pricing with required fields", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            const result = await t.mutation(api.domain.pricing.create, {
                tenantId,
                resourceId: resource.id,
                priceType: "per_hour",
                basePrice: 1500,
                currency: "NOK",
                pricePerHour: 1500,
            });

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
        });

        it("creates audit entry for resource pricing", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            const result = await t.mutation(api.domain.pricing.create, {
                tenantId,
                resourceId: resource.id,
                priceType: "per_hour",
                basePrice: 1500,
                currency: "NOK",
            });

            const auditEntries = await t.query(
                components.audit.functions.listForTenant,
                { tenantId: tenantId as string }
            );
            const pricingAudit = auditEntries.find(
                (e: any) => e.entityType === "resourcePricing" && e.entityId === result.id
            );
            expect(pricingAudit).toBeDefined();
            expect(pricingAudit.action).toBe("created");
        });
    });

    describe("listForResource", () => {
        it("lists pricing rules for a resource", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            await t.mutation(api.domain.pricing.create, {
                tenantId,
                resourceId: resource.id,
                priceType: "per_hour",
                basePrice: 1500,
                currency: "NOK",
            });

            const pricing = await t.query(api.domain.pricing.listForResource, {
                resourceId: resource.id,
            });

            expect(pricing.length).toBe(1);
            expect(pricing[0].basePrice).toBe(1500);
        });
    });

    describe("listByTenant", () => {
        it("lists all pricing for a tenant with resource names", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const res1 = await seedResource(t, tenantId as string, {
                name: "Venue A",
                slug: "venue-a",
            });
            const res2 = await seedResource(t, tenantId as string, {
                name: "Venue B",
                slug: "venue-b",
            });

            await t.mutation(api.domain.pricing.create, {
                tenantId,
                resourceId: res1.id,
                priceType: "per_hour",
                basePrice: 1000,
                currency: "NOK",
            });
            await t.mutation(api.domain.pricing.create, {
                tenantId,
                resourceId: res2.id,
                priceType: "per_day",
                basePrice: 5000,
                currency: "NOK",
            });

            const pricing = await t.query(api.domain.pricing.listByTenant, {
                tenantId,
            });

            expect(pricing.length).toBe(2);
            // Facade enriches with resource name
            const names = pricing.map((p: any) => p.resourceName);
            expect(names).toContain("Venue A");
            expect(names).toContain("Venue B");
        });
    });

    describe("get (resource pricing)", () => {
        it("gets pricing by ID", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            const { id } = await t.mutation(api.domain.pricing.create, {
                tenantId,
                resourceId: resource.id,
                priceType: "per_hour",
                basePrice: 2000,
                currency: "NOK",
                pricePerHour: 2000,
            });

            const entry = await t.query(api.domain.pricing.get, { id });

            expect(entry.basePrice).toBe(2000);
            expect(entry.priceType).toBe("per_hour");
            expect(entry.currency).toBe("NOK");
        });
    });

    describe("update (resource pricing)", () => {
        it("updates pricing fields", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            const { id } = await t.mutation(api.domain.pricing.create, {
                tenantId,
                resourceId: resource.id,
                priceType: "per_hour",
                basePrice: 1000,
                currency: "NOK",
            });

            await t.mutation(api.domain.pricing.update, {
                id,
                basePrice: 1800,
                pricePerHour: 1800,
            });

            const updated = await t.query(api.domain.pricing.get, { id });
            expect(updated.basePrice).toBe(1800);
            expect(updated.pricePerHour).toBe(1800);
        });
    });

    describe("remove (resource pricing)", () => {
        it("removes a pricing rule", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            const { id } = await t.mutation(api.domain.pricing.create, {
                tenantId,
                resourceId: resource.id,
                priceType: "per_hour",
                basePrice: 1000,
                currency: "NOK",
            });

            const result = await t.mutation(api.domain.pricing.remove, { id });
            expect(result.success).toBe(true);

            // Verify by listing (deleted entries should not appear)
            const pricing = await t.query(api.domain.pricing.listForResource, {
                resourceId: resource.id,
            });
            expect(pricing.length).toBe(0);
        });
    });

    // =========================================================================
    // HOLIDAYS
    // =========================================================================

    describe("createHoliday", () => {
        it("creates a holiday entry", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const result = await t.mutation(api.domain.pricing.createHoliday, {
                tenantId,
                name: "Julaften",
                date: "12-24",
                isRecurring: true,
                surchargeType: "percent",
                surchargeValue: 50,
            });

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
        });
    });

    describe("listHolidays", () => {
        it("lists holidays for a tenant", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            await t.mutation(api.domain.pricing.createHoliday, {
                tenantId,
                name: "Julaften",
                date: "12-24",
                isRecurring: true,
                surchargeType: "percent",
                surchargeValue: 50,
            });
            await t.mutation(api.domain.pricing.createHoliday, {
                tenantId,
                name: "17. mai",
                date: "05-17",
                isRecurring: true,
                surchargeType: "fixed",
                surchargeValue: 500,
            });

            const holidays = await t.query(api.domain.pricing.listHolidays, {
                tenantId,
            });

            expect(holidays.length).toBe(2);
        });
    });

    describe("updateHoliday", () => {
        it("updates holiday fields", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await t.mutation(api.domain.pricing.createHoliday, {
                tenantId,
                name: "Julaften",
                date: "12-24",
                isRecurring: true,
                surchargeType: "percent",
                surchargeValue: 50,
            });

            await t.mutation(api.domain.pricing.updateHoliday, {
                id,
                surchargeValue: 75,
                name: "Julaften (oppdatert)",
            });

            const holidays = await t.query(api.domain.pricing.listHolidays, {
                tenantId,
            });
            const updated = holidays.find((h: any) => h._id === id);
            expect(updated.name).toBe("Julaften (oppdatert)");
            expect(updated.surchargeValue).toBe(75);
        });
    });

    describe("deleteHoliday", () => {
        it("deletes a holiday", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await t.mutation(api.domain.pricing.createHoliday, {
                tenantId,
                name: "Julaften",
                date: "12-24",
                isRecurring: true,
                surchargeType: "percent",
                surchargeValue: 50,
            });

            const result = await t.mutation(api.domain.pricing.deleteHoliday, { id });
            expect(result.success).toBe(true);

            const holidays = await t.query(api.domain.pricing.listHolidays, {
                tenantId,
            });
            expect(holidays.length).toBe(0);
        });
    });

    // =========================================================================
    // WEEKDAY PRICING
    // =========================================================================

    describe("createWeekdayPricing", () => {
        it("creates weekday surcharge", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const result = await t.mutation(
                api.domain.pricing.createWeekdayPricing,
                {
                    tenantId,
                    dayOfWeek: 6, // Saturday
                    surchargeType: "percent",
                    surchargeValue: 25,
                    label: "Helgetillegg",
                }
            );

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
        });
    });

    describe("listWeekdayPricing", () => {
        it("lists weekday pricing for tenant", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            await t.mutation(api.domain.pricing.createWeekdayPricing, {
                tenantId,
                dayOfWeek: 6, // Saturday
                surchargeType: "percent",
                surchargeValue: 25,
            });
            await t.mutation(api.domain.pricing.createWeekdayPricing, {
                tenantId,
                dayOfWeek: 0, // Sunday
                surchargeType: "percent",
                surchargeValue: 30,
            });

            const rules = await t.query(api.domain.pricing.listWeekdayPricing, {
                tenantId,
            });

            expect(rules.length).toBe(2);
        });
    });

    describe("updateWeekdayPricing", () => {
        it("updates weekday pricing", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await t.mutation(
                api.domain.pricing.createWeekdayPricing,
                {
                    tenantId,
                    dayOfWeek: 6,
                    surchargeType: "percent",
                    surchargeValue: 25,
                }
            );

            await t.mutation(api.domain.pricing.updateWeekdayPricing, {
                id,
                surchargeValue: 40,
                label: "Oppdatert helgetillegg",
            });

            const rules = await t.query(api.domain.pricing.listWeekdayPricing, {
                tenantId,
            });
            const updated = rules.find((r: any) => r._id === id);
            expect(updated.surchargeValue).toBe(40);
            expect(updated.label).toBe("Oppdatert helgetillegg");
        });
    });

    describe("deleteWeekdayPricing", () => {
        it("deletes weekday pricing", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await t.mutation(
                api.domain.pricing.createWeekdayPricing,
                {
                    tenantId,
                    dayOfWeek: 6,
                    surchargeType: "percent",
                    surchargeValue: 25,
                }
            );

            const result = await t.mutation(
                api.domain.pricing.deleteWeekdayPricing,
                { id }
            );
            expect(result.success).toBe(true);

            const rules = await t.query(api.domain.pricing.listWeekdayPricing, {
                tenantId,
            });
            expect(rules.length).toBe(0);
        });
    });

    // =========================================================================
    // DISCOUNT CODES
    // =========================================================================

    describe("createDiscountCode", () => {
        it("creates a discount code", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const result = await t.mutation(
                api.domain.pricing.createDiscountCode,
                {
                    tenantId,
                    code: "VELKOMST10",
                    name: "Velkomsttilbud",
                    discountType: "percent",
                    discountValue: 10,
                }
            );

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
        });
    });

    describe("listDiscountCodes", () => {
        it("lists codes for tenant", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            await t.mutation(api.domain.pricing.createDiscountCode, {
                tenantId,
                code: "VELKOMST10",
                name: "Velkomsttilbud",
                discountType: "percent",
                discountValue: 10,
            });
            await t.mutation(api.domain.pricing.createDiscountCode, {
                tenantId,
                code: "SOMMER2025",
                name: "Sommertilbud",
                discountType: "fixed",
                discountValue: 500,
            });

            const codes = await t.query(api.domain.pricing.listDiscountCodes, {
                tenantId,
            });

            expect(codes.length).toBe(2);
        });
    });

    describe("validateDiscountCode", () => {
        it("validates a valid code", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            await t.mutation(api.domain.pricing.createDiscountCode, {
                tenantId,
                code: "VELKOMST10",
                name: "Velkomsttilbud",
                discountType: "percent",
                discountValue: 10,
            });

            const result = await t.query(
                api.domain.pricing.validateDiscountCode,
                {
                    tenantId,
                    code: "VELKOMST10",
                }
            );

            expect(result.valid).toBe(true);
            expect(result.code).toBeDefined();
            expect(result.code.discountType).toBe("percent");
            expect(result.code.discountValue).toBe(10);
        });

        it("rejects an expired code", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            // Create a code that expired in the past
            const pastTimestamp = Date.now() - 86400000; // 1 day ago
            await t.mutation(api.domain.pricing.createDiscountCode, {
                tenantId,
                code: "EXPIRED",
                name: "Utlopt tilbud",
                discountType: "percent",
                discountValue: 20,
                validUntil: pastTimestamp,
            });

            const result = await t.query(
                api.domain.pricing.validateDiscountCode,
                {
                    tenantId,
                    code: "EXPIRED",
                }
            );

            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
        });

        it("rejects an invalid code", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const result = await t.query(
                api.domain.pricing.validateDiscountCode,
                {
                    tenantId,
                    code: "NONEXISTENT",
                }
            );

            expect(result.valid).toBe(false);
        });
    });

    describe("updateDiscountCode", () => {
        it("updates a code", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await t.mutation(
                api.domain.pricing.createDiscountCode,
                {
                    tenantId,
                    code: "VELKOMST10",
                    name: "Velkomsttilbud",
                    discountType: "percent",
                    discountValue: 10,
                }
            );

            await t.mutation(api.domain.pricing.updateDiscountCode, {
                id,
                name: "Oppdatert tilbud",
                discountValue: 15,
            });

            const codes = await t.query(api.domain.pricing.listDiscountCodes, {
                tenantId,
            });
            const updated = codes.find((c: any) => c._id === id);
            expect(updated.name).toBe("Oppdatert tilbud");
            expect(updated.discountValue).toBe(15);
        });
    });

    describe("deleteDiscountCode", () => {
        it("deletes a code with no usage", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await t.mutation(
                api.domain.pricing.createDiscountCode,
                {
                    tenantId,
                    code: "TODELETE",
                    name: "Slett meg",
                    discountType: "percent",
                    discountValue: 5,
                }
            );

            const result = await t.mutation(
                api.domain.pricing.deleteDiscountCode,
                { id }
            );
            expect(result.success).toBe(true);

            const codes = await t.query(api.domain.pricing.listDiscountCodes, {
                tenantId,
            });
            expect(codes.length).toBe(0);
        });
    });

    // =========================================================================
    // ADDITIONAL SERVICES
    // =========================================================================

    describe("createAdditionalService", () => {
        it("creates a service", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            const result = await t.mutation(
                api.domain.pricing.createAdditionalService,
                {
                    tenantId,
                    resourceId: resource.id,
                    name: "Projektor",
                    price: 500,
                }
            );

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
        });
    });

    describe("listAdditionalServices", () => {
        it("lists services for a resource", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            await t.mutation(api.domain.pricing.createAdditionalService, {
                tenantId,
                resourceId: resource.id,
                name: "Projektor",
                price: 500,
            });
            await t.mutation(api.domain.pricing.createAdditionalService, {
                tenantId,
                resourceId: resource.id,
                name: "Lydutstyr",
                price: 800,
            });

            const services = await t.query(
                api.domain.pricing.listAdditionalServices,
                {
                    resourceId: resource.id,
                }
            );

            expect(services.length).toBe(2);
        });
    });

    describe("updateAdditionalService", () => {
        it("updates service fields", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            const { id } = await t.mutation(
                api.domain.pricing.createAdditionalService,
                {
                    tenantId,
                    resourceId: resource.id,
                    name: "Projektor",
                    price: 500,
                }
            );

            await t.mutation(api.domain.pricing.updateAdditionalService, {
                id,
                name: "HD Projektor",
                price: 750,
            });

            const services = await t.query(
                api.domain.pricing.listAdditionalServices,
                {
                    resourceId: resource.id,
                }
            );
            const updated = services.find((s: any) => s._id === id);
            expect(updated.name).toBe("HD Projektor");
            expect(updated.price).toBe(750);
        });
    });

    describe("removeAdditionalService", () => {
        it("removes a service", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            const { id } = await t.mutation(
                api.domain.pricing.createAdditionalService,
                {
                    tenantId,
                    resourceId: resource.id,
                    name: "To Remove",
                    price: 100,
                }
            );

            const result = await t.mutation(
                api.domain.pricing.removeAdditionalService,
                { id }
            );
            expect(result.success).toBe(true);

            const services = await t.query(
                api.domain.pricing.listAdditionalServices,
                {
                    resourceId: resource.id,
                }
            );
            expect(services.length).toBe(0);
        });
    });

    // =========================================================================
    // TICKET TEMPLATES
    // =========================================================================

    describe("createTicketTemplate", () => {
        it("creates a template", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const result = await t.mutation(
                api.domain.pricing.createTicketTemplate,
                {
                    tenantId,
                    name: "Ordinaer billett",
                    price: 350,
                }
            );

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
        });

        it("creates audit entry for ticket template", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const result = await t.mutation(
                api.domain.pricing.createTicketTemplate,
                {
                    tenantId,
                    name: "VIP billett",
                    price: 750,
                }
            );

            const auditEntries = await t.query(
                components.audit.functions.listForTenant,
                { tenantId: tenantId as string }
            );
            const templateAudit = auditEntries.find(
                (e: any) => e.entityType === "ticketTemplate" && e.entityId === result.id
            );
            expect(templateAudit).toBeDefined();
            expect(templateAudit.action).toBe("created");
        });
    });

    describe("listTicketTemplates", () => {
        it("lists templates for tenant", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            await t.mutation(api.domain.pricing.createTicketTemplate, {
                tenantId,
                name: "Ordinaer",
                price: 350,
            });
            await t.mutation(api.domain.pricing.createTicketTemplate, {
                tenantId,
                name: "Honnoer",
                price: 200,
            });

            const templates = await t.query(
                api.domain.pricing.listTicketTemplates,
                { tenantId }
            );

            expect(templates.length).toBe(2);
        });
    });

    describe("removeTicketTemplate", () => {
        it("removes a template", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await t.mutation(
                api.domain.pricing.createTicketTemplate,
                {
                    tenantId,
                    name: "To Remove",
                    price: 100,
                }
            );

            const result = await t.mutation(
                api.domain.pricing.removeTicketTemplate,
                { id }
            );
            expect(result.success).toBe(true);

            const templates = await t.query(
                api.domain.pricing.listTicketTemplates,
                { tenantId }
            );
            expect(templates.length).toBe(0);
        });
    });

    // =========================================================================
    // PRICE CALCULATION
    // =========================================================================

    describe("calculatePrice", () => {
        it("calculates price for a resource with hourly pricing", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            // Seed resource pricing
            await t.mutation(api.domain.pricing.create, {
                tenantId,
                resourceId: resource.id,
                priceType: "hourly",
                basePrice: 1500,
                currency: "NOK",
                pricePerHour: 1500,
            });

            const now = Date.now();
            const twoHoursLater = now + 2 * 60 * 60 * 1000;

            const result = await t.query(api.domain.pricing.calculatePrice, {
                resourceId: resource.id,
                startTime: now,
                endTime: twoHoursLater,
            });

            expect(result).toBeDefined();
            expect(result.total).toBeGreaterThan(0);
            expect(result.currency).toBe("NOK");
            expect(result.breakdown).toBeDefined();
            expect(result.breakdown.basePrice).toBe(3000); // 2 hours * 1500
        });

        it("throws when no pricing configured for resource", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            // Create a resource but do NOT seed pricing for it
            const resource = await seedResource(t, tenantId as string, {
                name: "No Pricing Venue",
                slug: "no-pricing",
            });

            await expect(
                t.query(api.domain.pricing.calculatePrice, {
                    resourceId: resource.id,
                    startTime: Date.now(),
                    endTime: Date.now() + 3600000,
                })
            ).rejects.toThrow("No pricing configured for resource");
        });
    });

    describe("getResourcePricingConfig", () => {
        it("returns pricing config for resource", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            await t.mutation(api.domain.pricing.create, {
                tenantId,
                resourceId: resource.id,
                priceType: "per_hour",
                basePrice: 1500,
                currency: "NOK",
                pricePerHour: 1500,
                cleaningFee: 200,
            });

            const config = await t.query(
                api.domain.pricing.getResourcePricingConfig,
                {
                    resourceId: resource.id,
                }
            );

            expect(config).toBeDefined();
            expect(config.priceType).toBe("per_hour");
            expect(config.basePrice).toBe(1500);
            expect(config.displayInfo).toBeDefined();
            expect(config.displayInfo.hasCleaningFee).toBe(true);
        });

        it("returns null when no pricing configured", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            const config = await t.query(
                api.domain.pricing.getResourcePricingConfig,
                {
                    resourceId: resource.id,
                }
            );

            expect(config).toBeNull();
        });
    });

    describe("getResourcePriceGroups", () => {
        it("returns price groups for resource via component table", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            // Create a pricing group
            const group = await t.mutation(api.domain.pricing.createGroup, {
                tenantId,
                name: "Standard",
                isDefault: true,
                priority: 0,
            });

            // Create resource pricing linked to that group
            await t.mutation(api.domain.pricing.create, {
                tenantId,
                resourceId: resource.id,
                pricingGroupId: group.id,
                priceType: "per_hour",
                basePrice: 1500,
                currency: "NOK",
                pricePerHour: 1500,
            });

            const groups = await t.query(
                api.domain.pricing.getResourcePriceGroups,
                {
                    resourceId: resource.id,
                }
            );

            expect(groups.length).toBe(1);
            expect(groups[0].name).toBe("Standard");
            expect(groups[0].basePrice).toBe(1500);
        });

        it("returns empty array when resource has no pricing groups", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            // Create a resource with no pricing group associations
            const resource = await seedResource(t, tenantId as string, {
                name: "No Groups Venue",
                slug: "no-groups",
            });

            const groups = await t.query(
                api.domain.pricing.getResourcePriceGroups,
                {
                    resourceId: resource.id,
                }
            );

            expect(groups).toEqual([]);
        });
    });

    // =========================================================================
    // ORG/USER PRICING GROUP ASSIGNMENTS
    // =========================================================================

    describe("assignOrgPricingGroup / removeOrgPricingGroup", () => {
        it("assigns and removes org pricing group", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            // Create an organization
            const orgId = await t.run(async (ctx) => {
                return ctx.db.insert("organizations", {
                    name: "Test Org",
                    slug: "test-org",
                    type: "company",
                    tenantId,
                    status: "active",
                    settings: {},
                    metadata: {},
                });
            });

            // Create a pricing group
            const group = await t.mutation(api.domain.pricing.createGroup, {
                tenantId,
                name: "Organisasjon",
                discountPercent: 15,
            });

            // Assign
            const assignment = await t.mutation(
                api.domain.pricing.assignOrgPricingGroup,
                {
                    tenantId,
                    organizationId: orgId,
                    pricingGroupId: group.id,
                    discountPercent: 15,
                }
            );
            expect(assignment.id).toBeDefined();

            // Verify listing
            const orgGroups = await t.query(
                api.domain.pricing.listOrgPricingGroups,
                {
                    tenantId,
                    organizationId: orgId,
                }
            );
            expect(orgGroups.length).toBe(1);

            // Remove
            const removeResult = await t.mutation(
                api.domain.pricing.removeOrgPricingGroup,
                { id: assignment.id }
            );
            expect(removeResult.success).toBe(true);

            // Verify removed
            const afterRemove = await t.query(
                api.domain.pricing.listOrgPricingGroups,
                {
                    tenantId,
                    organizationId: orgId,
                }
            );
            expect(afterRemove.length).toBe(0);
        });
    });

    describe("assignUserPricingGroup / removeUserPricingGroup", () => {
        it("assigns and removes user pricing group", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            // Create a pricing group
            const group = await t.mutation(api.domain.pricing.createGroup, {
                tenantId,
                name: "Medlemspris",
                discountPercent: 10,
            });

            // Assign
            const assignment = await t.mutation(
                api.domain.pricing.assignUserPricingGroup,
                {
                    tenantId,
                    userId,
                    pricingGroupId: group.id,
                }
            );
            expect(assignment.id).toBeDefined();

            // Verify listing
            const userGroups = await t.query(
                api.domain.pricing.listUserPricingGroups,
                {
                    tenantId,
                    userId,
                }
            );
            expect(userGroups.length).toBe(1);

            // Remove
            const removeResult = await t.mutation(
                api.domain.pricing.removeUserPricingGroup,
                { id: assignment.id }
            );
            expect(removeResult.success).toBe(true);

            // Verify removed
            const afterRemove = await t.query(
                api.domain.pricing.listUserPricingGroups,
                {
                    tenantId,
                    userId,
                }
            );
            expect(afterRemove.length).toBe(0);
        });
    });
});
