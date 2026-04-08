/**
 * Billing Component — Mutation Functions
 *
 * Write operations for payments and invoices.
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// PAYMENT MUTATIONS
// =============================================================================

/**
 * Create a payment record
 */
export const createPayment = mutation({
    args: {
        tenantId: v.string(),
        bookingId: v.optional(v.string()),
        userId: v.optional(v.string()),
        provider: v.string(),
        reference: v.string(),
        amount: v.number(),
        currency: v.string(),
        description: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const now = Date.now();

        const paymentId = await ctx.db.insert("payments", {
            tenantId: args.tenantId,
            bookingId: args.bookingId,
            userId: args.userId,
            provider: args.provider,
            reference: args.reference,
            amount: args.amount,
            currency: args.currency,
            description: args.description,
            status: "created" as const,
            metadata: args.metadata ?? {},
            createdAt: now,
            updatedAt: now,
        });

        return { id: paymentId as string };
    },
});

/**
 * Update payment status
 */
export const updatePaymentStatus = mutation({
    args: {
        id: v.id("payments"),
        status: v.union(
            v.literal("created"),
            v.literal("authorized"),
            v.literal("captured"),
            v.literal("failed"),
            v.literal("refunded"),
            v.literal("partially_refunded"),
            v.literal("cancelled"),
        ),
        externalId: v.optional(v.string()),
        capturedAmount: v.optional(v.number()),
        refundedAmount: v.optional(v.number()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, status, externalId, capturedAmount, refundedAmount }) => {
        await ctx.db.patch(id, {
            status,
            externalId,
            capturedAmount,
            refundedAmount,
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});

// =============================================================================
// INVOICE MUTATIONS
// =============================================================================

/**
 * Create a new invoice
 */
export const createInvoice = mutation({
    args: {
        tenantId: v.string(),
        userId: v.optional(v.string()),
        organizationId: v.optional(v.string()),
        lineItems: v.array(v.object({
            id: v.string(),
            description: v.string(),
            quantity: v.number(),
            unitPrice: v.number(),
            amount: v.number(),
            taxRate: v.optional(v.number()),
            taxAmount: v.optional(v.number()),
            bookingId: v.optional(v.string()),
            resourceId: v.optional(v.string()),
        })),
        customerName: v.string(),
        customerEmail: v.optional(v.string()),
        customerAddress: v.optional(v.string()),
        customerOrgNumber: v.optional(v.string()),
        dueDate: v.number(),
        notes: v.optional(v.string()),
        bookingIds: v.optional(v.array(v.string())),
        createdBy: v.optional(v.string()),
    },
    returns: v.object({ id: v.string(), invoiceNumber: v.string() }),
    handler: async (ctx, args) => {
        const now = Date.now();

        // Generate invoice number
        const year = new Date().getFullYear();
        const existingInvoices = await ctx.db
            .query("invoices")
            .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
            .collect();
        const invoiceCount = existingInvoices.length + 1;
        const invoiceNumber = `INV-${year}-${String(invoiceCount).padStart(4, "0")}`;

        // Calculate totals
        const subtotal = args.lineItems.reduce((sum, item) => sum + item.amount, 0);
        const taxAmount = args.lineItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
        const totalAmount = subtotal + taxAmount;

        const invoiceId = await ctx.db.insert("invoices", {
            tenantId: args.tenantId,
            userId: args.userId,
            organizationId: args.organizationId,
            invoiceNumber,
            status: "draft",
            issueDate: now,
            dueDate: args.dueDate,
            subtotal,
            taxAmount,
            totalAmount,
            currency: "NOK",
            lineItems: args.lineItems,
            bookingIds: args.bookingIds,
            customerName: args.customerName,
            customerEmail: args.customerEmail,
            customerAddress: args.customerAddress,
            customerOrgNumber: args.customerOrgNumber,
            notes: args.notes,
            createdAt: now,
            updatedAt: now,
            createdBy: args.createdBy,
        });

        return { id: invoiceId as string, invoiceNumber };
    },
});

/**
 * Update invoice status
 */
export const updateInvoiceStatus = mutation({
    args: {
        id: v.id("invoices"),
        status: v.string(),
        paidDate: v.optional(v.number()),
        paymentId: v.optional(v.string()),
        paymentMethod: v.optional(v.string()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, status, paidDate, paymentId, paymentMethod }) => {
        const updates: Record<string, unknown> = {
            status,
            updatedAt: Date.now(),
        };

        if (paidDate) updates.paidDate = paidDate;
        if (paymentId) updates.paymentId = paymentId;
        if (paymentMethod) updates.paymentMethod = paymentMethod;

        await ctx.db.patch(id, updates);
        return { success: true };
    },
});

/**
 * Send an invoice (change status from draft to sent)
 */
export const sendInvoice = mutation({
    args: {
        id: v.id("invoices"),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        const invoice = await ctx.db.get(id);
        if (!invoice) throw new Error("Invoice not found");
        if (invoice.status !== "draft") throw new Error("Only draft invoices can be sent");

        await ctx.db.patch(id, {
            status: "sent",
            issueDate: Date.now(),
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});

/**
 * Mark invoice as paid
 */
export const markInvoicePaid = mutation({
    args: {
        id: v.id("invoices"),
        paymentId: v.optional(v.string()),
        paymentMethod: v.optional(v.string()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, paymentId, paymentMethod }) => {
        const invoice = await ctx.db.get(id);
        if (!invoice) throw new Error("Invoice not found");

        await ctx.db.patch(id, {
            status: "paid",
            paidDate: Date.now(),
            paymentId,
            paymentMethod,
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});

/**
 * Credit/cancel an invoice
 */
export const creditInvoice = mutation({
    args: {
        id: v.id("invoices"),
        reason: v.optional(v.string()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, reason }) => {
        const invoice = await ctx.db.get(id);
        if (!invoice) throw new Error("Invoice not found");

        await ctx.db.patch(id, {
            status: "credited",
            internalNotes: reason
                ? `${invoice.internalNotes || ""}\nCredited: ${reason}`.trim()
                : invoice.internalNotes,
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});

/**
 * Store invoice PDF
 */
export const storeInvoicePdf = mutation({
    args: {
        id: v.id("invoices"),
        storageId: v.string(),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, storageId }) => {
        await ctx.db.patch(id, {
            pdfStorageId: storageId,
            updatedAt: Date.now(),
        });
        return { success: true };
    },
});

/**
 * Patch userId on invoices that are missing it.
 * Maintenance utility for fixing orphaned invoices.
 */
export const patchInvoiceUserId = mutation({
    args: {
        tenantId: v.string(),
        userId: v.string(),
    },
    returns: v.object({ patched: v.number() }),
    handler: async (ctx, { tenantId, userId }) => {
        const invoices = await ctx.db
            .query("invoices")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .collect();

        let patched = 0;
        for (const inv of invoices) {
            if (!inv.userId) {
                await ctx.db.patch(inv._id, { userId, updatedAt: Date.now() });
                patched++;
            }
        }
        return { patched };
    },
});

// =============================================================================
// INVOICE BASIS MUTATIONS
// =============================================================================

const invoiceBasisLineItemValidator = v.object({
    description: v.string(),
    quantity: v.number(),
    unitPrice: v.number(),
    vatRate: v.optional(v.number()),
    bookingId: v.optional(v.string()),
    resourceId: v.optional(v.string()),
});

/**
 * Create a new invoice basis (draft).
 */
export const createInvoiceBasis = mutation({
    args: {
        tenantId: v.string(),
        customerId: v.string(),
        lineItems: v.array(invoiceBasisLineItemValidator),
        dueDate: v.number(),
        notes: v.optional(v.string()),
        metadata: v.optional(v.any()),
        createdBy: v.optional(v.string()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const now = Date.now();

        // Calculate totals
        let totalAmount = 0;
        let vatAmount = 0;
        for (const item of args.lineItems) {
            const lineTotal = item.quantity * item.unitPrice;
            totalAmount += lineTotal;
            if (item.vatRate) {
                vatAmount += lineTotal * (item.vatRate / 100);
            }
        }

        const id = await ctx.db.insert("invoiceBases", {
            tenantId: args.tenantId,
            customerId: args.customerId,
            status: "draft",
            lineItems: args.lineItems,
            totalAmount,
            vatAmount,
            currency: "NOK",
            dueDate: args.dueDate,
            notes: args.notes,
            metadata: args.metadata ?? {},
            createdAt: now,
            updatedAt: now,
            createdBy: args.createdBy,
        });

        return { id: id as string };
    },
});

/**
 * Update an existing invoice basis (draft only).
 */
export const updateInvoiceBasis = mutation({
    args: {
        id: v.id("invoiceBases"),
        lineItems: v.optional(v.array(invoiceBasisLineItemValidator)),
        dueDate: v.optional(v.number()),
        notes: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, lineItems, dueDate, notes, metadata }) => {
        const basis = await ctx.db.get(id);
        if (!basis) throw new Error("Invoice basis not found");
        if (basis.status !== "draft") throw new Error("Only draft invoice bases can be updated");

        const updates: Record<string, unknown> = { updatedAt: Date.now() };

        if (lineItems !== undefined) {
            let totalAmount = 0;
            let vatAmount = 0;
            for (const item of lineItems) {
                const lineTotal = item.quantity * item.unitPrice;
                totalAmount += lineTotal;
                if (item.vatRate) {
                    vatAmount += lineTotal * (item.vatRate / 100);
                }
            }
            updates.lineItems = lineItems;
            updates.totalAmount = totalAmount;
            updates.vatAmount = vatAmount;
        }
        if (dueDate !== undefined) updates.dueDate = dueDate;
        if (notes !== undefined) updates.notes = notes;
        if (metadata !== undefined) updates.metadata = metadata;

        await ctx.db.patch(id, updates);
        return { success: true };
    },
});

/**
 * Approve an invoice basis (draft -> approved).
 */
export const approveInvoiceBasis = mutation({
    args: {
        id: v.id("invoiceBases"),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        const basis = await ctx.db.get(id);
        if (!basis) throw new Error("Invoice basis not found");
        if (basis.status !== "draft") throw new Error("Only draft invoice bases can be approved");

        await ctx.db.patch(id, {
            status: "approved",
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});

/**
 * Finalize an invoice basis (approved -> finalized).
 * Creates a corresponding invoice (sales document) from the basis.
 */
export const finalizeInvoiceBasis = mutation({
    args: {
        id: v.id("invoiceBases"),
        sendToCustomer: v.optional(v.boolean()),
    },
    returns: v.object({ success: v.boolean(), salesDocumentId: v.string() }),
    handler: async (ctx, { id, sendToCustomer }) => {
        const basis = await ctx.db.get(id);
        if (!basis) throw new Error("Invoice basis not found");
        if (basis.status !== "approved") throw new Error("Only approved invoice bases can be finalized");

        const now = Date.now();

        // Generate invoice number
        const year = new Date().getFullYear();
        const existingInvoices = await ctx.db
            .query("invoices")
            .withIndex("by_tenant", (q) => q.eq("tenantId", basis.tenantId))
            .collect();
        const invoiceCount = existingInvoices.length + 1;
        const invoiceNumber = `INV-${year}-${String(invoiceCount).padStart(4, "0")}`;

        // Create invoice from basis
        const invoiceId = await ctx.db.insert("invoices", {
            tenantId: basis.tenantId,
            userId: basis.customerId,
            invoiceNumber,
            status: sendToCustomer ? "sent" : "draft",
            issueDate: now,
            dueDate: basis.dueDate,
            subtotal: basis.totalAmount,
            taxAmount: basis.vatAmount,
            totalAmount: basis.totalAmount + basis.vatAmount,
            currency: basis.currency,
            lineItems: basis.lineItems.map((item, idx) => ({
                id: `li-${idx + 1}`,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                amount: item.quantity * item.unitPrice,
                taxRate: item.vatRate,
                taxAmount: item.vatRate
                    ? item.quantity * item.unitPrice * (item.vatRate / 100)
                    : undefined,
                bookingId: item.bookingId,
                resourceId: item.resourceId,
            })),
            customerName: basis.customerId,
            notes: basis.notes,
            createdAt: now,
            updatedAt: now,
            createdBy: basis.createdBy,
        });

        // Mark basis as finalized
        await ctx.db.patch(id, {
            status: "finalized",
            salesDocumentId: invoiceId as string,
            updatedAt: now,
        });

        return { success: true, salesDocumentId: invoiceId as string };
    },
});

/**
 * Soft-delete an invoice basis (draft only).
 */
export const deleteInvoiceBasis = mutation({
    args: {
        id: v.id("invoiceBases"),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        const basis = await ctx.db.get(id);
        if (!basis) throw new Error("Invoice basis not found");
        if (basis.status !== "draft") throw new Error("Only draft invoice bases can be deleted");

        await ctx.db.patch(id, {
            status: "deleted",
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});

// =============================================================================
// CREDIT NOTE MUTATIONS
// =============================================================================

const creditNoteLineItemValidator = v.object({
    description: v.string(),
    quantity: v.number(),
    unitPrice: v.number(),
    vatRate: v.optional(v.number()),
});

/**
 * Create a new credit note for a sales document (invoice).
 */
export const createCreditNote = mutation({
    args: {
        tenantId: v.string(),
        salesDocumentId: v.string(),
        reason: v.string(),
        lineItems: v.optional(v.array(creditNoteLineItemValidator)),
        fullCredit: v.optional(v.boolean()),
        createdBy: v.optional(v.string()),
    },
    returns: v.object({ id: v.string(), creditNoteNumber: v.string() }),
    handler: async (ctx, args) => {
        const now = Date.now();

        // If fullCredit, copy line items from the invoice
        let lineItems = args.lineItems ?? [];
        let totalAmount = 0;
        let vatAmount = 0;

        if (args.fullCredit) {
            const invoice = await ctx.db.get(args.salesDocumentId as any);
            if (invoice) {
                lineItems = (invoice as any).lineItems?.map((item: any) => ({
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    vatRate: item.taxRate,
                })) ?? [];
                totalAmount = (invoice as any).totalAmount ?? 0;
                vatAmount = (invoice as any).taxAmount ?? 0;
            }
        }

        if (!args.fullCredit) {
            // Calculate totals from line items
            for (const item of lineItems) {
                const lineTotal = item.quantity * item.unitPrice;
                totalAmount += lineTotal;
                if (item.vatRate) {
                    vatAmount += lineTotal * (item.vatRate / 100);
                }
            }
            totalAmount += vatAmount;
        }

        // Generate credit note number
        const existingNotes = await ctx.db
            .query("creditNotes")
            .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
            .collect();
        const year = new Date().getFullYear();
        const noteCount = existingNotes.length + 1;
        const creditNoteNumber = `CN-${year}-${String(noteCount).padStart(4, "0")}`;

        const id = await ctx.db.insert("creditNotes", {
            tenantId: args.tenantId,
            salesDocumentId: args.salesDocumentId,
            creditNoteNumber,
            status: "draft",
            reason: args.reason,
            totalAmount,
            vatAmount,
            currency: "NOK",
            lineItems,
            createdAt: now,
            updatedAt: now,
            createdBy: args.createdBy,
        });

        return { id: id as string, creditNoteNumber };
    },
});

/**
 * Approve a credit note (draft -> approved).
 */
export const approveCreditNote = mutation({
    args: {
        id: v.id("creditNotes"),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        const note = await ctx.db.get(id);
        if (!note) throw new Error("Credit note not found");
        if (note.status !== "draft") throw new Error("Only draft credit notes can be approved");

        await ctx.db.patch(id, {
            status: "approved",
            issuedAt: Date.now(),
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});

/**
 * Process a credit note (approved -> processed).
 */
export const processCreditNote = mutation({
    args: {
        id: v.id("creditNotes"),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        const note = await ctx.db.get(id);
        if (!note) throw new Error("Credit note not found");
        if (note.status !== "approved") throw new Error("Only approved credit notes can be processed");

        await ctx.db.patch(id, {
            status: "processed",
            processedAt: Date.now(),
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});
