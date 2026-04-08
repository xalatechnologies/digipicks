import { describe, it, expect } from "vitest";
import { api, components } from "../../_generated/api";
import { createDomainTest, seedTestTenant } from "./testHelper.test-util";

describe("domain/billing", () => {
    function setup() {
        return createDomainTest(["billing", "audit"]);
    }

    /**
     * Seed an invoice via the billing component import function.
     * Returns the invoice id.
     */
    async function seedInvoice(
        t: ReturnType<typeof setup>,
        tenantId: string,
        userId: string,
        overrides: Partial<{
            status: string;
            totalAmount: number;
            invoiceNumber: string;
            organizationId: string;
            dueDate: number;
        }> = {}
    ) {
        const now = Date.now();
        return t.mutation(components.billing.import.importInvoice, {
            tenantId,
            userId,
            invoiceNumber: overrides.invoiceNumber ?? `INV-TEST-${Math.random().toString(36).slice(2, 8)}`,
            status: overrides.status ?? "sent",
            issueDate: now,
            dueDate: overrides.dueDate ?? now + 30 * 24 * 60 * 60 * 1000,
            subtotal: (overrides.totalAmount ?? 1000) * 0.8,
            taxAmount: (overrides.totalAmount ?? 1000) * 0.2,
            totalAmount: overrides.totalAmount ?? 1000,
            currency: "NOK",
            lineItems: [{
                id: "li-1",
                description: "Test booking",
                quantity: 1,
                unitPrice: overrides.totalAmount ?? 1000,
                amount: overrides.totalAmount ?? 1000,
            }],
            customerName: "Test Customer",
            createdAt: now,
            updatedAt: now,
            organizationId: overrides.organizationId,
        });
    }

    /**
     * Seed a payment via the billing component import function.
     */
    async function seedPayment(
        t: ReturnType<typeof setup>,
        tenantId: string,
        userId: string,
        overrides: Partial<{
            status: string;
            amount: number;
            reference: string;
        }> = {}
    ) {
        const now = Date.now();
        return t.mutation(components.billing.import.importPayment, {
            tenantId,
            userId,
            provider: "vipps",
            reference: overrides.reference ?? `PAY-${Math.random().toString(36).slice(2, 8)}`,
            amount: overrides.amount ?? 500,
            currency: "NOK",
            status: overrides.status ?? "created",
            createdAt: now,
            updatedAt: now,
        });
    }

    // =========================================================================
    // QUERY FACADES
    // =========================================================================

    describe("getSummary", () => {
        it("returns billing summary for a user with no invoices", async () => {
            const t = setup();
            const { userId } = await seedTestTenant(t);

            const summary = await t.query(api.domain.billing.getSummary, {
                userId,
            });

            expect(summary).toBeDefined();
            expect(summary.totalSpent).toBe(0);
            expect(summary.pendingAmount).toBe(0);
            expect(summary.currency).toBe("NOK");
        });

        it("calculates totalSpent from paid invoices", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            await seedInvoice(t, tenantId as string, userId as string, {
                status: "paid",
                totalAmount: 2000,
            });
            await seedInvoice(t, tenantId as string, userId as string, {
                status: "paid",
                totalAmount: 3000,
            });
            await seedInvoice(t, tenantId as string, userId as string, {
                status: "sent",
                totalAmount: 1500,
            });

            const summary = await t.query(api.domain.billing.getSummary, {
                userId,
                period: "all",
            });

            expect(summary.totalSpent).toBe(5000);
            expect(summary.pendingAmount).toBe(1500);
        });
    });

    describe("listInvoices", () => {
        it("returns invoices for a user", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            await seedInvoice(t, tenantId as string, userId as string);
            await seedInvoice(t, tenantId as string, userId as string);

            const invoices = await t.query(api.domain.billing.listInvoices, {
                userId,
            });

            expect(invoices.length).toBe(2);
            expect(invoices[0].currency).toBe("NOK");
        });

        it("filters invoices by status", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            await seedInvoice(t, tenantId as string, userId as string, { status: "paid" });
            await seedInvoice(t, tenantId as string, userId as string, { status: "sent" });
            await seedInvoice(t, tenantId as string, userId as string, { status: "sent" });

            const sentInvoices = await t.query(api.domain.billing.listInvoices, {
                userId,
                status: "sent",
            });

            expect(sentInvoices.length).toBe(2);
        });
    });

    describe("pendingCount", () => {
        it("counts pending (sent/overdue) invoices", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            await seedInvoice(t, tenantId as string, userId as string, { status: "sent" });
            await seedInvoice(t, tenantId as string, userId as string, { status: "overdue" });
            await seedInvoice(t, tenantId as string, userId as string, { status: "paid" });

            const result = await t.query(api.domain.billing.pendingCount, {
                userId,
            });

            expect(result.count).toBe(2);
        });

        it("returns zero when no pending invoices", async () => {
            const t = setup();
            const { userId } = await seedTestTenant(t);

            const result = await t.query(api.domain.billing.pendingCount, {
                userId,
            });

            expect(result.count).toBe(0);
        });
    });

    describe("getEconomyStats", () => {
        it("returns economy statistics for a tenant", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            await seedInvoice(t, tenantId as string, userId as string, {
                status: "paid",
                totalAmount: 5000,
            });

            const stats = await t.query(api.domain.billing.getEconomyStats, {
                tenantId,
                period: "all",
            });

            expect(stats).toBeDefined();
            expect(stats.totalRevenue).toBe(5000);
            expect(stats.currency).toBe("NOK");
            expect(stats.invoicesByStatus).toBeDefined();
            expect(stats.invoicesByStatus.paid).toBe(1);
        });
    });

    // =========================================================================
    // MUTATION FACADES
    // =========================================================================

    describe("createPayment", () => {
        it("creates a payment record", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const result = await t.mutation(api.domain.billing.createPayment, {
                tenantId,
                userId,
                provider: "vipps",
                reference: "PAY-001",
                amount: 1500,
                currency: "NOK",
                description: "Booking payment",
            });

            expect(result.id).toBeDefined();
        });

        it("creates an audit entry on payment creation", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const { id: paymentId } = await t.mutation(api.domain.billing.createPayment, {
                tenantId,
                userId,
                provider: "stripe",
                reference: "PAY-AUDIT",
                amount: 2000,
                currency: "NOK",
            });

            const entries = await t.query(components.audit.functions.listForTenant, {
                tenantId: tenantId as string,
            });

            const paymentEntry = entries.find(
                (e: any) => e.entityType === "payment" && e.entityId === paymentId
            );
            expect(paymentEntry).toBeDefined();
            expect(paymentEntry.action).toBe("created");
        });
    });

    describe("createInvoice", () => {
        it("creates an invoice with line items", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const result = await t.mutation(api.domain.billing.createInvoice, {
                tenantId,
                userId,
                lineItems: [
                    {
                        id: "li-1",
                        description: "Room booking",
                        quantity: 2,
                        unitPrice: 750,
                        amount: 1500,
                        taxRate: 25,
                        taxAmount: 375,
                    },
                ],
                customerName: "Ola Nordmann",
                customerEmail: "ola@test.no",
                dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
            });

            expect(result.id).toBeDefined();
            expect(result.invoiceNumber).toMatch(/^INV-\d{4}-\d{4}$/);
        });
    });

    describe("updatePaymentStatus", () => {
        it("updates payment status to captured", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const { id: paymentId } = await t.mutation(api.domain.billing.createPayment, {
                tenantId,
                userId,
                provider: "vipps",
                reference: "PAY-UPD",
                amount: 1000,
                currency: "NOK",
            });

            const result = await t.mutation(api.domain.billing.updatePaymentStatus, {
                id: paymentId,
                status: "captured",
                capturedAmount: 1000,
            });

            expect(result.success).toBe(true);
        });
    });

    describe("sendInvoice", () => {
        it("transitions a draft invoice to sent", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const { id: invoiceId } = await t.mutation(api.domain.billing.createInvoice, {
                tenantId,
                userId,
                lineItems: [
                    {
                        id: "li-1",
                        description: "Room booking",
                        quantity: 1,
                        unitPrice: 500,
                        amount: 500,
                    },
                ],
                customerName: "Kari Nordmann",
                dueDate: Date.now() + 14 * 24 * 60 * 60 * 1000,
            });

            const result = await t.mutation(api.domain.billing.sendInvoice, {
                id: invoiceId,
            });

            expect(result.success).toBe(true);
        });
    });

    describe("markInvoicePaid", () => {
        it("marks an invoice as paid", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            // Create and send the invoice first
            const { id: invoiceId } = await t.mutation(api.domain.billing.createInvoice, {
                tenantId,
                userId,
                lineItems: [
                    {
                        id: "li-1",
                        description: "Booking",
                        quantity: 1,
                        unitPrice: 1000,
                        amount: 1000,
                    },
                ],
                customerName: "Per Nordmann",
                dueDate: Date.now() + 14 * 24 * 60 * 60 * 1000,
            });

            await t.mutation(api.domain.billing.sendInvoice, { id: invoiceId });

            const result = await t.mutation(api.domain.billing.markInvoicePaid, {
                id: invoiceId,
                paymentMethod: "vipps",
            });

            expect(result.success).toBe(true);
        });
    });
});
