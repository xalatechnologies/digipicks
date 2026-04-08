import { describe, it, expect } from "vitest";
import { api, components } from "../../_generated/api";
import { createDomainTest, seedTestTenant } from "./testHelper.test-util";

describe("domain/billing — integration", () => {
    function setup() {
        return createDomainTest(["billing", "audit", "notifications"]);
    }

    /**
     * Seed an invoice via the billing component import function.
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
            bookingIds: string[];
        }> = {}
    ) {
        const now = Date.now();
        return t.mutation(components.billing.import.importInvoice, {
            tenantId,
            userId,
            invoiceNumber:
                overrides.invoiceNumber ??
                `INV-TEST-${Math.random().toString(36).slice(2, 8)}`,
            status: overrides.status ?? "sent",
            issueDate: now,
            dueDate: overrides.dueDate ?? now + 30 * 24 * 60 * 60 * 1000,
            subtotal: (overrides.totalAmount ?? 1000) * 0.8,
            taxAmount: (overrides.totalAmount ?? 1000) * 0.2,
            totalAmount: overrides.totalAmount ?? 1000,
            currency: "NOK",
            lineItems: [
                {
                    id: "li-1",
                    description: "Test booking",
                    quantity: 1,
                    unitPrice: overrides.totalAmount ?? 1000,
                    amount: overrides.totalAmount ?? 1000,
                },
            ],
            customerName: "Test Customer",
            createdAt: now,
            updatedAt: now,
            organizationId: overrides.organizationId,
            bookingIds: overrides.bookingIds,
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
            bookingId: string;
        }> = {}
    ) {
        const now = Date.now();
        return t.mutation(components.billing.import.importPayment, {
            tenantId,
            userId,
            provider: "vipps",
            reference:
                overrides.reference ??
                `PAY-${Math.random().toString(36).slice(2, 8)}`,
            amount: overrides.amount ?? 500,
            currency: "NOK",
            status: overrides.status ?? "created",
            createdAt: now,
            updatedAt: now,
            bookingId: overrides.bookingId,
        });
    }

    // =========================================================================
    // PAYMENT QUERIES
    // =========================================================================

    describe("Payment Queries", () => {
        it("getSummary returns billing summary for a user with no data", async () => {
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

        it("listInvoices returns invoices for a user", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            await seedInvoice(t, tenantId as string, userId as string);
            await seedInvoice(t, tenantId as string, userId as string);
            await seedInvoice(t, tenantId as string, userId as string);

            const invoices = await t.query(api.domain.billing.listInvoices, {
                userId,
            });

            expect(invoices.length).toBe(3);
            expect(invoices[0].currency).toBe("NOK");
        });

        it("pendingCount returns count of pending payments", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            await seedInvoice(t, tenantId as string, userId as string, {
                status: "sent",
            });
            await seedInvoice(t, tenantId as string, userId as string, {
                status: "overdue",
            });
            await seedInvoice(t, tenantId as string, userId as string, {
                status: "paid",
            });
            await seedInvoice(t, tenantId as string, userId as string, {
                status: "sent",
            });

            const result = await t.query(api.domain.billing.pendingCount, {
                userId,
            });

            expect(result.count).toBe(3); // 2 sent + 1 overdue
        });

        it("listOrgInvoices returns invoices for an organization", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            // Create an organization in core tables
            const orgId = await t.run(async (ctx) => {
                return ctx.db.insert("organizations", {
                    tenantId,
                    name: "Test Org",
                    slug: "test-org",
                    type: "business",
                    settings: {},
                    metadata: {},
                    status: "active",
                });
            });

            await seedInvoice(t, tenantId as string, userId as string, {
                organizationId: orgId as string,
                totalAmount: 5000,
            });
            await seedInvoice(t, tenantId as string, userId as string, {
                organizationId: orgId as string,
                totalAmount: 3000,
            });

            const result = await t.query(api.domain.billing.listOrgInvoices, {
                organizationId: orgId,
            });

            expect(result.data.length).toBe(2);
        });

        it("getSummary reflects correct totals across statuses", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            await seedInvoice(t, tenantId as string, userId as string, {
                status: "paid",
                totalAmount: 4000,
            });
            await seedInvoice(t, tenantId as string, userId as string, {
                status: "paid",
                totalAmount: 6000,
            });
            await seedInvoice(t, tenantId as string, userId as string, {
                status: "sent",
                totalAmount: 2000,
            });
            await seedInvoice(t, tenantId as string, userId as string, {
                status: "draft",
                totalAmount: 1000,
            });

            const summary = await t.query(api.domain.billing.getSummary, {
                userId,
                period: "all",
            });

            expect(summary.totalSpent).toBe(10000); // 4000 + 6000 paid
            expect(summary.pendingAmount).toBe(3000); // 2000 sent + 1000 draft
        });
    });

    // =========================================================================
    // PAYMENT CREATION & STATUS
    // =========================================================================

    describe("Payment Creation & Status", () => {
        it("creates a payment via facade with audit trail", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const { id: paymentId } = await t.mutation(
                api.domain.billing.createPayment,
                {
                    tenantId,
                    userId,
                    provider: "vipps",
                    reference: "PAY-INT-001",
                    amount: 2500,
                    currency: "NOK",
                    description: "Booking for Festsalen",
                }
            );

            expect(paymentId).toBeDefined();

            // Verify audit entry was created
            const entries = await t.query(
                components.audit.functions.listForTenant,
                { tenantId: tenantId as string }
            );
            const paymentAudit = entries.find(
                (e: any) =>
                    e.entityType === "payment" && e.entityId === paymentId
            );
            expect(paymentAudit).toBeDefined();
            expect(paymentAudit.action).toBe("created");
        });

        it("payment status transitions: created -> authorized -> captured", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            // Create payment
            const { id: paymentId } = await t.mutation(
                api.domain.billing.createPayment,
                {
                    tenantId,
                    userId,
                    provider: "vipps",
                    reference: "PAY-TRANSITION",
                    amount: 1500,
                    currency: "NOK",
                }
            );

            // Authorize
            const authResult = await t.mutation(
                api.domain.billing.updatePaymentStatus,
                {
                    id: paymentId,
                    status: "authorized",
                    externalId: "vipps-ext-123",
                }
            );
            expect(authResult.success).toBe(true);

            // Capture (pass externalId through to preserve it)
            const captureResult = await t.mutation(
                api.domain.billing.updatePaymentStatus,
                {
                    id: paymentId,
                    status: "captured",
                    capturedAmount: 1500,
                    externalId: "vipps-ext-123",
                }
            );
            expect(captureResult.success).toBe(true);

            // Verify final state
            const payment = await t.query(api.domain.billing.getPayment, {
                id: paymentId,
            });
            expect(payment.status).toBe("captured");
            expect(payment.capturedAmount).toBe(1500);
            expect(payment.externalId).toBe("vipps-ext-123");
        });

        it("refund processing updates refundedAmount", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const { id: paymentId } = await t.mutation(
                api.domain.billing.createPayment,
                {
                    tenantId,
                    userId,
                    provider: "vipps",
                    reference: "PAY-REFUND",
                    amount: 2000,
                    currency: "NOK",
                }
            );

            // Capture first
            await t.mutation(api.domain.billing.updatePaymentStatus, {
                id: paymentId,
                status: "captured",
                capturedAmount: 2000,
            });

            // Process full refund
            await t.mutation(api.domain.billing.updatePaymentStatus, {
                id: paymentId,
                status: "refunded",
                refundedAmount: 2000,
            });

            const payment = await t.query(api.domain.billing.getPayment, {
                id: paymentId,
            });
            expect(payment.status).toBe("refunded");
            expect(payment.refundedAmount).toBe(2000);
        });

        it("partial refund accumulates refundedAmount", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const { id: paymentId } = await t.mutation(
                api.domain.billing.createPayment,
                {
                    tenantId,
                    userId,
                    provider: "vipps",
                    reference: "PAY-PARTIAL-REFUND",
                    amount: 3000,
                    currency: "NOK",
                }
            );

            // Capture
            await t.mutation(api.domain.billing.updatePaymentStatus, {
                id: paymentId,
                status: "captured",
                capturedAmount: 3000,
            });

            // Partial refund (1000 of 3000)
            await t.mutation(api.domain.billing.updatePaymentStatus, {
                id: paymentId,
                status: "partially_refunded",
                refundedAmount: 1000,
            });

            let payment = await t.query(api.domain.billing.getPayment, {
                id: paymentId,
            });
            expect(payment.status).toBe("partially_refunded");
            expect(payment.refundedAmount).toBe(1000);

            // Second partial refund (additional 500)
            await t.mutation(api.domain.billing.updatePaymentStatus, {
                id: paymentId,
                status: "partially_refunded",
                refundedAmount: 1500,
            });

            payment = await t.query(api.domain.billing.getPayment, {
                id: paymentId,
            });
            expect(payment.refundedAmount).toBe(1500);
        });

        it("payment can be linked to a booking via bookingId", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);
            const fakeBookingId = "booking-abc-123";

            const { id: paymentId } = await t.mutation(
                api.domain.billing.createPayment,
                {
                    tenantId,
                    userId,
                    provider: "vipps",
                    reference: "PAY-BOOKING-LINK",
                    amount: 750,
                    currency: "NOK",
                    bookingId: fakeBookingId,
                }
            );

            const payment = await t.query(api.domain.billing.getPayment, {
                id: paymentId,
            });
            expect(payment.bookingId).toBe(fakeBookingId);
        });
    });

    // =========================================================================
    // WEBHOOK-STYLE UPDATES
    // =========================================================================

    describe("Webhook-Style Updates", () => {
        it("update payment status to authorized", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const { id: paymentId } = await t.mutation(
                api.domain.billing.createPayment,
                {
                    tenantId,
                    userId,
                    provider: "vipps",
                    reference: "PAY-WEBHOOK-AUTH",
                    amount: 1000,
                    currency: "NOK",
                }
            );

            const result = await t.mutation(
                api.domain.billing.updatePaymentStatus,
                {
                    id: paymentId,
                    status: "authorized",
                    externalId: "vipps-auth-ext-456",
                }
            );

            expect(result.success).toBe(true);

            // Verify audit entry for status update
            const entries = await t.query(
                components.audit.functions.listForTenant,
                { tenantId: tenantId as string }
            );
            const statusAudit = entries.find(
                (e: any) =>
                    e.entityType === "payment" &&
                    e.entityId === paymentId &&
                    e.action === "status_updated"
            );
            expect(statusAudit).toBeDefined();
        });

        it("update payment status to captured", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const { id: paymentId } = await t.mutation(
                api.domain.billing.createPayment,
                {
                    tenantId,
                    userId,
                    provider: "stripe",
                    reference: "PAY-WEBHOOK-CAP",
                    amount: 2000,
                    currency: "NOK",
                }
            );

            await t.mutation(api.domain.billing.updatePaymentStatus, {
                id: paymentId,
                status: "authorized",
            });

            const result = await t.mutation(
                api.domain.billing.updatePaymentStatus,
                {
                    id: paymentId,
                    status: "captured",
                    capturedAmount: 2000,
                }
            );

            expect(result.success).toBe(true);

            const payment = await t.query(api.domain.billing.getPayment, {
                id: paymentId,
            });
            expect(payment.status).toBe("captured");
            expect(payment.capturedAmount).toBe(2000);
        });

        it("handle payment cancellation", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const { id: paymentId } = await t.mutation(
                api.domain.billing.createPayment,
                {
                    tenantId,
                    userId,
                    provider: "vipps",
                    reference: "PAY-WEBHOOK-CANCEL",
                    amount: 1500,
                    currency: "NOK",
                }
            );

            const result = await t.mutation(
                api.domain.billing.updatePaymentStatus,
                {
                    id: paymentId,
                    status: "cancelled",
                }
            );

            expect(result.success).toBe(true);

            const payment = await t.query(api.domain.billing.getPayment, {
                id: paymentId,
            });
            expect(payment.status).toBe("cancelled");
        });
    });

    // =========================================================================
    // INVOICE LIFECYCLE INTEGRATION
    // =========================================================================

    describe("Invoice Lifecycle Integration", () => {
        it("full invoice lifecycle: create -> send -> mark paid", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            // Create invoice
            const { id: invoiceId, invoiceNumber } = await t.mutation(
                api.domain.billing.createInvoice,
                {
                    tenantId,
                    userId,
                    lineItems: [
                        {
                            id: "li-lifecycle",
                            description: "Booking for Hovedscenen",
                            quantity: 1,
                            unitPrice: 5000,
                            amount: 5000,
                            taxRate: 25,
                            taxAmount: 1250,
                        },
                    ],
                    customerName: "Ola Nordmann",
                    customerEmail: "ola@kommune.no",
                    dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
                }
            );

            expect(invoiceNumber).toMatch(/^INV-\d{4}-\d{4}$/);

            // Send invoice
            const sendResult = await t.mutation(
                api.domain.billing.sendInvoice,
                { id: invoiceId }
            );
            expect(sendResult.success).toBe(true);

            // Mark as paid
            const paidResult = await t.mutation(
                api.domain.billing.markInvoicePaid,
                {
                    id: invoiceId,
                    paymentMethod: "vipps",
                    paymentId: "pay-linked-123",
                }
            );
            expect(paidResult.success).toBe(true);

            // Verify via getInvoice
            const invoice = await t.query(api.domain.billing.getInvoice, {
                id: invoiceId,
            });
            expect(invoice.status).toBe("paid");
            expect(invoice.paymentMethod).toBe("vipps");
            expect(invoice.paymentId).toBe("pay-linked-123");
        });

        it("credit/cancel an invoice with reason", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const { id: invoiceId } = await t.mutation(
                api.domain.billing.createInvoice,
                {
                    tenantId,
                    userId,
                    lineItems: [
                        {
                            id: "li-credit",
                            description: "Booking cancelled",
                            quantity: 1,
                            unitPrice: 2000,
                            amount: 2000,
                        },
                    ],
                    customerName: "Kari Nordmann",
                    dueDate: Date.now() + 14 * 24 * 60 * 60 * 1000,
                }
            );

            // Send first
            await t.mutation(api.domain.billing.sendInvoice, {
                id: invoiceId,
            });

            // Credit it
            const result = await t.mutation(api.domain.billing.creditInvoice, {
                id: invoiceId,
                reason: "Customer cancelled booking",
            });
            expect(result.success).toBe(true);

            const invoice = await t.query(api.domain.billing.getInvoice, {
                id: invoiceId,
            });
            expect(invoice.status).toBe("credited");
        });
    });
});
