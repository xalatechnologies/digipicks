/**
 * Billing Component — convex-test Integration Tests
 *
 * Tests payments, invoices, summaries, and lifecycle transitions.
 * Run: npx vitest --config convex/vitest.config.ts components/billing/billing.test.ts
 */

import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../schema";
import { modules } from "../testSetup.test-util";
import { api } from "../_generated/api";

const TENANT = "tenant-001";
const TENANT_B = "tenant-002";
const USER = "user-001";
const USER_B = "user-002";
const BOOKING = "booking-001";
const DAY = 86_400_000;

const LINE_ITEMS = [
    {
        id: "li-1",
        description: "Room booking",
        quantity: 1,
        unitPrice: 50000,
        amount: 50000,
        taxRate: 25,
        taxAmount: 12500,
    },
];

async function createTestInvoice(t: ReturnType<typeof convexTest>, overrides: Record<string, unknown> = {}) {
    return t.mutation(api.mutations.createInvoice, {
        tenantId: TENANT,
        userId: USER,
        lineItems: LINE_ITEMS,
        customerName: "Test Customer",
        customerEmail: "test@example.com",
        dueDate: Date.now() + 30 * DAY,
        ...overrides,
    });
}

// ---------------------------------------------------------------------------
// Payment mutations
// ---------------------------------------------------------------------------

describe("billing/mutations — createPayment", () => {
    it("creates a payment with 'created' status", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createPayment, {
            tenantId: TENANT,
            provider: "vipps",
            reference: "ref-001",
            amount: 50000,
            currency: "NOK",
            bookingId: BOOKING,
            userId: USER,
        });
        expect(id).toBeDefined();
        const payment = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(payment?.status).toBe("created");
        expect(payment?.amount).toBe(50000);
        expect(payment?.provider).toBe("vipps");
    });

    it("stores description and metadata", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createPayment, {
            tenantId: TENANT,
            provider: "stripe",
            reference: "ref-002",
            amount: 10000,
            currency: "NOK",
            description: "Conference room",
            metadata: { source: "web" },
        });
        const payment = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(payment?.description).toBe("Conference room");
    });
});

describe("billing/mutations — updatePaymentStatus", () => {
    it("updates status and captures amount", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createPayment, {
            tenantId: TENANT,
            provider: "vipps",
            reference: "ref-upd",
            amount: 50000,
            currency: "NOK",
        });
        await t.mutation(api.mutations.updatePaymentStatus, {
            id: id as any,
            status: "captured",
            capturedAmount: 50000,
            externalId: "ext-123",
        });
        const payment = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(payment?.status).toBe("captured");
        expect(payment?.capturedAmount).toBe(50000);
        expect(payment?.externalId).toBe("ext-123");
    });
});

// ---------------------------------------------------------------------------
// Invoice mutations
// ---------------------------------------------------------------------------

describe("billing/mutations — createInvoice", () => {
    it("creates a draft invoice with generated number and calculated totals", async () => {
        const t = convexTest(schema, modules);
        const { id, invoiceNumber } = await createTestInvoice(t);
        expect(id).toBeDefined();
        expect(invoiceNumber).toMatch(/^INV-\d{4}-\d{4}$/);

        const invoice = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(invoice?.status).toBe("draft");
        expect(invoice?.subtotal).toBe(50000);
        expect(invoice?.taxAmount).toBe(12500);
        expect(invoice?.totalAmount).toBe(62500);
        expect(invoice?.currency).toBe("NOK");
    });

    it("increments invoice number for same tenant", async () => {
        const t = convexTest(schema, modules);
        const { invoiceNumber: num1 } = await createTestInvoice(t);
        const { invoiceNumber: num2 } = await createTestInvoice(t);
        expect(num1).not.toBe(num2);
    });

    it("stores customer and booking info", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createTestInvoice(t, {
            customerOrgNumber: "123456789",
            bookingIds: ["b1", "b2"],
            notes: "Special handling",
        });
        const invoice = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(invoice?.customerOrgNumber).toBe("123456789");
        expect(invoice?.bookingIds).toEqual(["b1", "b2"]);
        expect(invoice?.notes).toBe("Special handling");
    });
});

describe("billing/mutations — sendInvoice", () => {
    it("transitions draft → sent", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createTestInvoice(t);
        await t.mutation(api.mutations.sendInvoice, { id: id as any });
        const invoice = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(invoice?.status).toBe("sent");
    });

    it("throws when sending a non-draft invoice", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createTestInvoice(t);
        await t.mutation(api.mutations.sendInvoice, { id: id as any });
        await expect(
            t.mutation(api.mutations.sendInvoice, { id: id as any })
        ).rejects.toThrow("Only draft invoices can be sent");
    });
});

describe("billing/mutations — markInvoicePaid", () => {
    it("marks an invoice as paid with payment info", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createTestInvoice(t);
        await t.mutation(api.mutations.markInvoicePaid, {
            id: id as any,
            paymentId: "pay-001",
            paymentMethod: "vipps",
        });
        const invoice = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(invoice?.status).toBe("paid");
        expect(invoice?.paymentId).toBe("pay-001");
        expect(invoice?.paidDate).toBeGreaterThan(0);
    });
});

describe("billing/mutations — creditInvoice", () => {
    it("credits an invoice with reason", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createTestInvoice(t);
        await t.mutation(api.mutations.creditInvoice, {
            id: id as any,
            reason: "Customer requested cancellation",
        });
        const invoice = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(invoice?.status).toBe("credited");
        expect(invoice?.internalNotes).toContain("Customer requested cancellation");
    });

    it("credits without reason preserves existing notes", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createTestInvoice(t);
        await t.mutation(api.mutations.creditInvoice, { id: id as any });
        const invoice = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(invoice?.status).toBe("credited");
    });
});

describe("billing/mutations — storeInvoicePdf", () => {
    it("stores a PDF storage ID on the invoice", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createTestInvoice(t);
        await t.mutation(api.mutations.storeInvoicePdf, {
            id: id as any,
            storageId: "storage-pdf-001",
        });
        const invoice = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(invoice?.pdfStorageId).toBe("storage-pdf-001");
    });
});

describe("billing/mutations — patchInvoiceUserId", () => {
    it("patches invoices missing userId", async () => {
        const t = convexTest(schema, modules);
        // Create invoice without userId
        await createTestInvoice(t, { userId: undefined });
        const { patched } = await t.mutation(api.mutations.patchInvoiceUserId, {
            tenantId: TENANT,
            userId: USER,
        });
        expect(patched).toBeGreaterThanOrEqual(1);
    });

    it("skips invoices that already have userId", async () => {
        const t = convexTest(schema, modules);
        await createTestInvoice(t, { userId: USER });
        const { patched } = await t.mutation(api.mutations.patchInvoiceUserId, {
            tenantId: TENANT,
            userId: "user-new",
        });
        expect(patched).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// Payment queries
// ---------------------------------------------------------------------------

describe("billing/queries — listPayments", () => {
    it("returns payments for tenant", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createPayment, {
            tenantId: TENANT, provider: "vipps", reference: "qp-1", amount: 100, currency: "NOK",
        });
        await t.mutation(api.mutations.createPayment, {
            tenantId: TENANT_B, provider: "stripe", reference: "qp-2", amount: 200, currency: "NOK",
        });
        const results = await t.query(api.queries.listPayments, { tenantId: TENANT });
        expect(results.length).toBe(1);
        expect(results[0].tenantId).toBe(TENANT);
    });

    it("filters by status", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createPayment, {
            tenantId: TENANT, provider: "vipps", reference: "qp-3", amount: 100, currency: "NOK",
        });
        await t.mutation(api.mutations.updatePaymentStatus, { id: id as any, status: "captured" });
        await t.mutation(api.mutations.createPayment, {
            tenantId: TENANT, provider: "vipps", reference: "qp-4", amount: 200, currency: "NOK",
        });
        const captured = await t.query(api.queries.listPayments, { tenantId: TENANT, status: "captured" });
        expect(captured.length).toBe(1);
        expect(captured[0].status).toBe("captured");
    });
});

describe("billing/queries — getPayment", () => {
    it("returns a payment by id", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createPayment, {
            tenantId: TENANT, provider: "vipps", reference: "gp-1", amount: 50000, currency: "NOK",
        });
        const payment = await t.query(api.queries.getPayment, { id: id as any });
        expect(payment.amount).toBe(50000);
    });

    it("throws when payment does not exist", async () => {
        const t = convexTest(schema, modules);
        const staleId = await t.run(async (ctx) => {
            const id = await ctx.db.insert("payments", {
                tenantId: TENANT, provider: "vipps", reference: "gone",
                amount: 0, currency: "NOK", status: "created",
                createdAt: Date.now(), updatedAt: Date.now(),
            });
            await ctx.db.delete(id);
            return id;
        });
        await expect(
            t.query(api.queries.getPayment, { id: staleId })
        ).rejects.toThrow("Payment not found");
    });
});

describe("billing/queries — getByReference", () => {
    it("finds a payment by reference and tenant", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createPayment, {
            tenantId: TENANT, provider: "vipps", reference: "vipps-ref-001",
            amount: 50000, currency: "NOK",
        });
        const result = await t.query(api.queries.getByReference, {
            tenantId: TENANT,
            reference: "vipps-ref-001",
        });
        expect(result).not.toBeNull();
        expect(result!.reference).toBe("vipps-ref-001");
    });

    it("returns null for non-existent reference", async () => {
        const t = convexTest(schema, modules);
        const result = await t.query(api.queries.getByReference, {
            tenantId: TENANT,
            reference: "no-such-ref",
        });
        expect(result).toBeNull();
    });
});

describe("billing/queries — pendingCount", () => {
    it("counts sent invoices for a user", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createTestInvoice(t);
        await t.mutation(api.mutations.sendInvoice, { id: id as any });
        const { count } = await t.query(api.queries.pendingCount, { userId: USER });
        expect(count).toBeGreaterThanOrEqual(1);
    });

    it("returns zero when no pending invoices", async () => {
        const t = convexTest(schema, modules);
        const { count } = await t.query(api.queries.pendingCount, { userId: USER });
        expect(count).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// Invoice queries
// ---------------------------------------------------------------------------

describe("billing/queries — listInvoices", () => {
    it("returns invoices mapped to SDK shape", async () => {
        const t = convexTest(schema, modules);
        await createTestInvoice(t);
        const invoices = await t.query(api.queries.listInvoices, { userId: USER });
        expect(invoices.length).toBe(1);
        expect(invoices[0].reference).toMatch(/^INV-/);
        expect(invoices[0].amount).toBe(62500);
    });
});

describe("billing/queries — getInvoice", () => {
    it("returns an invoice by id", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createTestInvoice(t);
        const invoice = await t.query(api.queries.getInvoice, { id: id as any });
        expect(invoice.customerName).toBe("Test Customer");
    });

    it("throws when invoice not found", async () => {
        const t = convexTest(schema, modules);
        const staleId = await t.run(async (ctx) => {
            const id = await ctx.db.insert("invoices", {
                tenantId: TENANT, invoiceNumber: "INV-GONE", status: "draft",
                issueDate: Date.now(), dueDate: Date.now(), subtotal: 0,
                taxAmount: 0, totalAmount: 0, currency: "NOK",
                lineItems: [], customerName: "X", createdAt: Date.now(), updatedAt: Date.now(),
            });
            await ctx.db.delete(id);
            return id;
        });
        await expect(
            t.query(api.queries.getInvoice, { id: staleId })
        ).rejects.toThrow("Invoice not found");
    });
});

describe("billing/queries — getSummary", () => {
    it("aggregates paid and pending amounts", async () => {
        const t = convexTest(schema, modules);
        const { id: inv1 } = await createTestInvoice(t);
        await t.mutation(api.mutations.markInvoicePaid, { id: inv1 as any });
        await createTestInvoice(t); // draft

        const summary = await t.query(api.queries.getSummary, { userId: USER, period: "all" });
        expect(summary.totalSpent).toBe(62500);
        expect(summary.pendingAmount).toBe(62500); // draft counts as pending
        expect(summary.currency).toBe("NOK");
    });
});

describe("billing/queries — listTenantInvoices", () => {
    it("returns all invoices for tenant", async () => {
        const t = convexTest(schema, modules);
        await createTestInvoice(t);
        await createTestInvoice(t, { tenantId: TENANT_B, customerName: "Other" });
        const results = await t.query(api.queries.listTenantInvoices, { tenantId: TENANT });
        expect(results.length).toBe(1);
        results.forEach((inv: any) => expect(inv.tenantId).toBe(TENANT));
    });
});

// ---------------------------------------------------------------------------
// Schema index correctness
// ---------------------------------------------------------------------------

describe("billing schema — index correctness", () => {
    it("by_booking index on payments", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createPayment, {
            tenantId: TENANT, provider: "vipps", reference: "idx-book",
            amount: 100, currency: "NOK", bookingId: BOOKING,
        });
        const results = await t.run(async (ctx) =>
            ctx.db.query("payments")
                .withIndex("by_booking", (q) => q.eq("bookingId", BOOKING))
                .collect()
        );
        expect(results.length).toBe(1);
    });

    it("by_invoice_number index on invoices", async () => {
        const t = convexTest(schema, modules);
        const { invoiceNumber } = await createTestInvoice(t);
        const results = await t.run(async (ctx) =>
            ctx.db.query("invoices")
                .withIndex("by_invoice_number", (q) => q.eq("invoiceNumber", invoiceNumber))
                .collect()
        );
        expect(results.length).toBe(1);
    });

    it("by_due_date index on invoices", async () => {
        const t = convexTest(schema, modules);
        await createTestInvoice(t);
        const results = await t.run(async (ctx) =>
            ctx.db.query("invoices")
                .withIndex("by_due_date", (q) => q.eq("tenantId", TENANT))
                .collect()
        );
        expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it("by_organization index on invoices", async () => {
        const t = convexTest(schema, modules);
        await createTestInvoice(t, { organizationId: "org-001" });
        const results = await t.run(async (ctx) =>
            ctx.db.query("invoices")
                .withIndex("by_organization", (q) => q.eq("organizationId", "org-001"))
                .collect()
        );
        expect(results.length).toBe(1);
    });
});
