/**
 * Billing Facade
 *
 * Thin facade that delegates to the billing component.
 * Preserves api.domain.billing.* for SDK compatibility.
 * Handles:
 *   - ID type conversion (typed Id<"users"> / Id<"invoices"> -> string for component)
 *   - Storage URL resolution for invoice PDFs (ctx.storage)
 *   - Audit logging via audit component
 */

import { mutation, query } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";
import { withAudit } from "../lib/auditHelpers";
import { rateLimit, rateLimitKeys } from "../lib/rateLimits";
import { emitEvent } from "../lib/eventBus";

// =============================================================================
// QUERY FACADES
// =============================================================================

/**
 * Get billing summary for a user.
 * NOTE: SDK passes userId, not tenantId.
 */
export const getSummary = query({
    args: {
        userId: v.id("users"),
        period: v.optional(v.string()),
    },
    handler: async (ctx, { userId, period }) => {
        return ctx.runQuery(components.billing.queries.getSummary, {
            userId: userId as string,
            period,
        });
    },
});

/**
 * List invoices/payments for a user.
 */
export const listInvoices = query({
    args: {
        userId: v.id("users"),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { userId, status, limit }) => {
        return ctx.runQuery(components.billing.queries.listInvoices, {
            userId: userId as string,
            status,
            limit,
        });
    },
});

/**
 * Get pending payments count for a user.
 */
export const pendingCount = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, { userId }) => {
        return ctx.runQuery(components.billing.queries.pendingCount, {
            userId: userId as string,
        });
    },
});

/**
 * List invoices for an organization.
 */
export const listOrgInvoices = query({
    args: {
        organizationId: v.id("organizations"),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { organizationId, status, limit }) => {
        return ctx.runQuery(components.billing.queries.listOrgInvoices, {
            organizationId: organizationId as string,
            status,
            limit,
        });
    },
});

/**
 * Get a single invoice by ID.
 */
export const getInvoice = query({
    args: {
        id: v.string(),
    },
    handler: async (ctx, { id }) => {
        return ctx.runQuery(components.billing.queries.getInvoice, {
            id,
        });
    },
});

/**
 * Get billing summary for an organization.
 */
export const getOrgBillingSummary = query({
    args: {
        organizationId: v.id("organizations"),
        period: v.optional(v.string()),
    },
    handler: async (ctx, { organizationId, period }) => {
        return ctx.runQuery(components.billing.queries.getOrgBillingSummary, {
            organizationId: organizationId as string,
            period,
        });
    },
});

/**
 * Get invoice download URL.
 * Delegates to the component to check for pdfStorageId,
 * then resolves the storage URL via ctx.storage.
 */
export const getInvoiceDownloadUrl = query({
    args: {
        id: v.string(),
    },
    handler: async (ctx, { id }) => {
        const result = await ctx.runQuery(
            components.billing.queries.getInvoiceDownloadUrl,
            { id }
        );

        if (!result) return null;

        // If the component returned a storage URL directly, pass it through.
        // Otherwise, resolve from app-level storage if pdfStorageId is available.
        return result;
    },
});

/**
 * Get a single payment by ID.
 */
export const getPayment = query({
    args: {
        id: v.string(),
    },
    handler: async (ctx, { id }) => {
        return ctx.runQuery(components.billing.queries.getPayment, {
            id,
        });
    },
});

/**
 * List invoices for a specific user within a tenant.
 */
export const listUserInvoices = query({
    args: {
        tenantId: v.id("tenants"),
        userId: v.id("users"),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId: _tenantId, userId, status, limit }) => {
        return ctx.runQuery(components.billing.queries.listUserInvoices, {
            userId: userId as string,
            status,
            limit,
        });
    },
});

/**
 * List all invoices for a tenant (admin view).
 */
export const listTenantInvoices = query({
    args: {
        tenantId: v.id("tenants"),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, status, limit }) => {
        return ctx.runQuery(components.billing.queries.listTenantInvoices, {
            tenantId: tenantId as string,
            status,
            limit,
        });
    },
});

/**
 * Get economy statistics for a tenant (admin view).
 */
export const getEconomyStats = query({
    args: {
        tenantId: v.id("tenants"),
        period: v.optional(v.string()),
    },
    handler: async (ctx, { tenantId, period }) => {
        return ctx.runQuery(components.billing.queries.getEconomyStats, {
            tenantId: tenantId as string,
            period,
        });
    },
});

// =============================================================================
// MUTATION FACADES
// =============================================================================

/**
 * Create a payment record.
 */
export const createPayment = mutation({
    args: {
        tenantId: v.id("tenants"),
        bookingId: v.optional(v.string()),
        userId: v.optional(v.id("users")),
        provider: v.string(),
        reference: v.string(),
        amount: v.number(),
        currency: v.string(),
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await rateLimit(ctx, { name: "mutateBilling", key: rateLimitKeys.tenant(args.tenantId as string), throws: true });
        const result = await ctx.runMutation(
            components.billing.mutations.createPayment,
            {
                tenantId: args.tenantId as string,
                bookingId: args.bookingId,
                userId: args.userId as string | undefined,
                provider: args.provider,
                reference: args.reference,
                amount: args.amount,
                currency: args.currency,
                description: args.description,
            }
        );

        // Audit
        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: (args.userId as string) ?? undefined,
            entityType: "payment",
            entityId: result.id,
            action: "created",
            newState: {
                amount: args.amount,
                currency: args.currency,
                provider: args.provider,
            },
            sourceComponent: "billing",
        });

        // Event bus
        await emitEvent(ctx, "billing.payment.received", args.tenantId as string, "billing", {
            paymentId: result.id, amount: args.amount, currency: args.currency, provider: args.provider,
        });

        return result;
    },
});

/**
 * Update payment status.
 */
export const updatePaymentStatus = mutation({
    args: {
        id: v.string(),
        status: v.string(),
        externalId: v.optional(v.string()),
        capturedAmount: v.optional(v.number()),
        refundedAmount: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const payment = await ctx.runQuery(components.billing.queries.getPayment, { id: args.id });
        if (payment) {
            await rateLimit(ctx, { name: "mutateBilling", key: rateLimitKeys.tenant((payment as any).tenantId), throws: true });
        }

        const result = await ctx.runMutation(
            components.billing.mutations.updatePaymentStatus,
            {
                id: args.id,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Facade→Component boundary: status string validated by caller
                status: args.status as any,
                externalId: args.externalId,
                capturedAmount: args.capturedAmount,
                refundedAmount: args.refundedAmount,
            }
        );

        // Audit
        await withAudit(ctx, {
            tenantId: (payment as any)?.tenantId ?? "",
            entityType: "payment",
            entityId: args.id as string,
            action: "status_updated",
            sourceComponent: "billing",
            newState: { status: args.status },
        });

        return result;
    },
});

/**
 * Create a new invoice.
 */
export const createInvoice = mutation({
    args: {
        tenantId: v.id("tenants"),
        userId: v.optional(v.id("users")),
        organizationId: v.optional(v.id("organizations")),
        lineItems: v.array(
            v.object({
                id: v.string(),
                description: v.string(),
                quantity: v.number(),
                unitPrice: v.number(),
                amount: v.number(),
                taxRate: v.optional(v.number()),
                taxAmount: v.optional(v.number()),
                bookingId: v.optional(v.string()),
                resourceId: v.optional(v.string()),
            })
        ),
        customerName: v.string(),
        customerEmail: v.optional(v.string()),
        customerAddress: v.optional(v.string()),
        customerOrgNumber: v.optional(v.string()),
        dueDate: v.number(),
        notes: v.optional(v.string()),
        bookingIds: v.optional(v.array(v.string())),
        createdBy: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await rateLimit(ctx, { name: "mutateBilling", key: rateLimitKeys.tenant(args.tenantId as string), throws: true });
        const result = await ctx.runMutation(
            components.billing.mutations.createInvoice,
            {
                tenantId: args.tenantId as string,
                userId: args.userId as string | undefined,
                organizationId: args.organizationId as string | undefined,
                lineItems: args.lineItems,
                customerName: args.customerName,
                customerEmail: args.customerEmail,
                customerAddress: args.customerAddress,
                customerOrgNumber: args.customerOrgNumber,
                dueDate: args.dueDate,
                notes: args.notes,
                bookingIds: args.bookingIds,
                createdBy: args.createdBy,
            }
        );

        // Audit
        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: args.createdBy ?? undefined,
            entityType: "invoice",
            entityId: result.id,
            action: "created",
            newState: {
                customerName: args.customerName,
                lineItemCount: args.lineItems.length,
            },
            sourceComponent: "billing",
        });

        // Event bus
        await emitEvent(ctx, "billing.invoice.created", args.tenantId as string, "billing", {
            invoiceId: result.id, customerName: args.customerName, lineItemCount: args.lineItems.length,
        });

        return result;
    },
});

/**
 * Update invoice status.
 */
export const updateInvoiceStatus = mutation({
    args: {
        id: v.string(),
        status: v.string(),
        paidDate: v.optional(v.number()),
        paymentId: v.optional(v.string()),
        paymentMethod: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const invoice = await ctx.runQuery(components.billing.queries.getInvoice, { id: args.id });
        if (invoice) {
            await rateLimit(ctx, { name: "mutateBilling", key: rateLimitKeys.tenant((invoice as any).tenantId), throws: true });
        }

        const result = await ctx.runMutation(
            components.billing.mutations.updateInvoiceStatus,
            {
                id: args.id,
                status: args.status,
                paidDate: args.paidDate,
                paymentId: args.paymentId,
                paymentMethod: args.paymentMethod,
            }
        );

        // Audit
        await withAudit(ctx, {
            tenantId: (invoice as any)?.tenantId ?? "",
            entityType: "invoice",
            entityId: args.id as string,
            action: "status_updated",
            sourceComponent: "billing",
            newState: { status: args.status },
        });

        return result;
    },
});

/**
 * Send an invoice (transition from draft to sent).
 */
export const sendInvoice = mutation({
    args: {
        id: v.string(),
    },
    handler: async (ctx, { id }) => {
        const invoice = await ctx.runQuery(components.billing.queries.getInvoice, { id });
        if (invoice) {
            await rateLimit(ctx, { name: "mutateBilling", key: rateLimitKeys.tenant((invoice as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.billing.mutations.sendInvoice, {
            id,
        });
        await withAudit(ctx, {
            tenantId: (invoice as any)?.tenantId ?? "",
            entityType: "invoice",
            entityId: id,
            action: "sent",
            sourceComponent: "billing",
        });
        return result;
    },
});

/**
 * Mark an invoice as paid.
 */
export const markInvoicePaid = mutation({
    args: {
        id: v.string(),
        paymentId: v.optional(v.string()),
        paymentMethod: v.optional(v.string()),
    },
    handler: async (ctx, { id, paymentId, paymentMethod }) => {
        const invoice = await ctx.runQuery(components.billing.queries.getInvoice, { id });
        if (invoice) {
            await rateLimit(ctx, { name: "mutateBilling", key: rateLimitKeys.tenant((invoice as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.billing.mutations.markInvoicePaid, {
            id,
            paymentId,
            paymentMethod,
        });
        await withAudit(ctx, {
            tenantId: (invoice as any)?.tenantId ?? "",
            entityType: "invoice",
            entityId: id,
            action: "marked_paid",
            sourceComponent: "billing",
            newState: { paymentMethod },
        });
        return result;
    },
});

/**
 * Get invoice PDF URL (placeholder — real PDF generation is infrastructure).
 */
export const getInvoicePdfUrl = query({
    args: {
        invoiceId: v.string(),
    },
    handler: async (ctx, { invoiceId }) => {
        // Delegate to existing download URL query if invoice has a stored PDF
        const result = await ctx.runQuery(
            components.billing.queries.getInvoiceDownloadUrl,
            { id: invoiceId as any }
        );
        return result ?? null;
    },
});

/**
 * Get credit note PDF URL (placeholder — real PDF generation is infrastructure).
 */
export const getCreditNotePdfUrl = query({
    args: {
        creditNoteId: v.string(),
    },
    handler: async (_ctx, { creditNoteId: _creditNoteId }) => {
        // No PDF storage for credit notes yet
        return null;
    },
});

/**
 * Credit/cancel an invoice.
 */
export const creditInvoice = mutation({
    args: {
        id: v.string(),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, { id, reason }) => {
        const invoice = await ctx.runQuery(components.billing.queries.getInvoice, { id });
        if (invoice) {
            await rateLimit(ctx, { name: "mutateBilling", key: rateLimitKeys.tenant((invoice as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.billing.mutations.creditInvoice, {
            id,
            reason,
        });
        await withAudit(ctx, {
            tenantId: (invoice as any)?.tenantId ?? "",
            entityType: "invoice",
            entityId: id,
            action: "credited",
            sourceComponent: "billing",
            newState: { reason },
        });
        return result;
    },
});

/**
 * Store an invoice PDF reference.
 */
export const storeInvoicePdf = mutation({
    args: {
        invoiceId: v.string(),
        storageId: v.string(),
    },
    handler: async (ctx, { invoiceId, storageId }) => {
        const existing = await ctx.runQuery(components.billing.queries.getInvoice, { id: invoiceId });
        if (existing) {
            await rateLimit(ctx, { name: "mutateBilling", key: rateLimitKeys.tenant((existing as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.billing.mutations.storeInvoicePdf, {
            id: invoiceId,
            storageId,
        });
        await withAudit(ctx, {
            tenantId: (existing as any)?.tenantId ?? "",
            entityType: "invoice",
            entityId: invoiceId,
            action: "pdf_stored",
            sourceComponent: "billing",
        });
        return result;
    },
});

// =============================================================================
// INVOICE BASIS QUERY FACADES
// =============================================================================

/**
 * List invoice bases for a tenant.
 */
export const listInvoiceBases = query({
    args: {
        tenantId: v.id("tenants"),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, status, limit }) => {
        return ctx.runQuery(components.billing.queries.listInvoiceBases, {
            tenantId: tenantId as string,
            status,
            limit,
        });
    },
});

/**
 * Get a single invoice basis by ID.
 */
export const getInvoiceBasis = query({
    args: {
        id: v.string(),
    },
    handler: async (ctx, { id }) => {
        return ctx.runQuery(components.billing.queries.getInvoiceBasis, {
            id,
        });
    },
});

// =============================================================================
// INVOICE BASIS MUTATION FACADES
// =============================================================================

/**
 * Create a new invoice basis.
 */
export const createInvoiceBasis = mutation({
    args: {
        tenantId: v.id("tenants"),
        customerId: v.string(),
        lineItems: v.array(v.object({
            description: v.string(),
            quantity: v.number(),
            unitPrice: v.number(),
            vatRate: v.optional(v.number()),
            bookingId: v.optional(v.string()),
            resourceId: v.optional(v.string()),
        })),
        dueDate: v.number(),
        notes: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        await rateLimit(ctx, { name: "mutateBilling", key: rateLimitKeys.tenant(args.tenantId as string), throws: true });
        const result = await ctx.runMutation(
            components.billing.mutations.createInvoiceBasis,
            {
                tenantId: args.tenantId as string,
                customerId: args.customerId,
                lineItems: args.lineItems,
                dueDate: args.dueDate,
                notes: args.notes,
                metadata: args.metadata,
            }
        );

        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            entityType: "invoiceBasis",
            entityId: result.id,
            action: "created",
            newState: { customerId: args.customerId, lineItemCount: args.lineItems.length },
            sourceComponent: "billing",
        });

        await emitEvent(ctx, "billing.invoiceBasis.created", args.tenantId as string, "billing", {
            invoiceBasisId: result.id, customerId: args.customerId,
        });

        return result;
    },
});

/**
 * Update an invoice basis (draft only).
 */
export const updateInvoiceBasis = mutation({
    args: {
        id: v.string(),
        lineItems: v.optional(v.array(v.object({
            description: v.string(),
            quantity: v.number(),
            unitPrice: v.number(),
            vatRate: v.optional(v.number()),
            bookingId: v.optional(v.string()),
            resourceId: v.optional(v.string()),
        }))),
        dueDate: v.optional(v.number()),
        notes: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const basis = await ctx.runQuery(components.billing.queries.getInvoiceBasis, { id: args.id });
        if (basis) {
            await rateLimit(ctx, { name: "mutateBilling", key: rateLimitKeys.tenant((basis as any).tenantId), throws: true });
        }

        const result = await ctx.runMutation(
            components.billing.mutations.updateInvoiceBasis,
            {
                id: args.id,
                lineItems: args.lineItems,
                dueDate: args.dueDate,
                notes: args.notes,
                metadata: args.metadata,
            }
        );

        await withAudit(ctx, {
            tenantId: (basis as any)?.tenantId ?? "",
            entityType: "invoiceBasis",
            entityId: args.id,
            action: "updated",
            sourceComponent: "billing",
        });

        return result;
    },
});

/**
 * Approve an invoice basis.
 */
export const approveInvoiceBasis = mutation({
    args: {
        id: v.string(),
    },
    handler: async (ctx, { id }) => {
        const basis = await ctx.runQuery(components.billing.queries.getInvoiceBasis, { id });
        if (basis) {
            await rateLimit(ctx, { name: "mutateBilling", key: rateLimitKeys.tenant((basis as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.billing.mutations.approveInvoiceBasis, { id });

        await withAudit(ctx, {
            tenantId: (basis as any)?.tenantId ?? "",
            entityType: "invoiceBasis",
            entityId: id,
            action: "approved",
            sourceComponent: "billing",
        });

        await emitEvent(ctx, "billing.invoiceBasis.approved", (basis as any)?.tenantId ?? "", "billing", {
            invoiceBasisId: id,
        });

        return result;
    },
});

/**
 * Finalize an invoice basis to create a sales document.
 */
export const finalizeInvoiceBasis = mutation({
    args: {
        id: v.string(),
        sendToCustomer: v.optional(v.boolean()),
    },
    handler: async (ctx, { id, sendToCustomer }) => {
        const basis = await ctx.runQuery(components.billing.queries.getInvoiceBasis, { id });
        if (basis) {
            await rateLimit(ctx, { name: "mutateBilling", key: rateLimitKeys.tenant((basis as any).tenantId), throws: true });
        }

        const result = await ctx.runMutation(
            components.billing.mutations.finalizeInvoiceBasis,
            { id, sendToCustomer }
        );

        await withAudit(ctx, {
            tenantId: (basis as any)?.tenantId ?? "",
            entityType: "invoiceBasis",
            entityId: id,
            action: "finalized",
            newState: { salesDocumentId: result.salesDocumentId },
            sourceComponent: "billing",
        });

        await emitEvent(ctx, "billing.invoiceBasis.finalized", (basis as any)?.tenantId ?? "", "billing", {
            invoiceBasisId: id, salesDocumentId: result.salesDocumentId,
        });

        return result;
    },
});

/**
 * Delete an invoice basis (draft only).
 */
export const deleteInvoiceBasis = mutation({
    args: {
        id: v.string(),
    },
    handler: async (ctx, { id }) => {
        const basis = await ctx.runQuery(components.billing.queries.getInvoiceBasis, { id });
        if (basis) {
            await rateLimit(ctx, { name: "mutateBilling", key: rateLimitKeys.tenant((basis as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.billing.mutations.deleteInvoiceBasis, { id });

        await withAudit(ctx, {
            tenantId: (basis as any)?.tenantId ?? "",
            entityType: "invoiceBasis",
            entityId: id,
            action: "deleted",
            sourceComponent: "billing",
        });

        return result;
    },
});

// =============================================================================
// CREDIT NOTE QUERY FACADES
// =============================================================================

/**
 * List credit notes for a tenant.
 */
export const listCreditNotes = query({
    args: {
        tenantId: v.id("tenants"),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, status, limit }) => {
        return ctx.runQuery(components.billing.queries.listCreditNotes, {
            tenantId: tenantId as string,
            status,
            limit,
        });
    },
});

/**
 * Get a single credit note by ID.
 */
export const getCreditNote = query({
    args: {
        id: v.string(),
    },
    handler: async (ctx, { id }) => {
        return ctx.runQuery(components.billing.queries.getCreditNote, {
            id,
        });
    },
});

// =============================================================================
// CREDIT NOTE MUTATION FACADES
// =============================================================================

/**
 * Create a credit note for a sales document.
 */
export const createCreditNote = mutation({
    args: {
        tenantId: v.id("tenants"),
        salesDocumentId: v.string(),
        reason: v.string(),
        lineItems: v.optional(v.array(v.object({
            description: v.string(),
            quantity: v.number(),
            unitPrice: v.number(),
            vatRate: v.optional(v.number()),
        }))),
        fullCredit: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        await rateLimit(ctx, { name: "mutateBilling", key: rateLimitKeys.tenant(args.tenantId as string), throws: true });

        const result = await ctx.runMutation(
            components.billing.mutations.createCreditNote,
            {
                tenantId: args.tenantId as string,
                salesDocumentId: args.salesDocumentId,
                reason: args.reason,
                lineItems: args.lineItems,
                fullCredit: args.fullCredit,
            }
        );

        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            entityType: "creditNote",
            entityId: result.id,
            action: "created",
            newState: { salesDocumentId: args.salesDocumentId, reason: args.reason },
            sourceComponent: "billing",
        });

        await emitEvent(ctx, "billing.creditNote.created", args.tenantId as string, "billing", {
            creditNoteId: result.id, salesDocumentId: args.salesDocumentId,
        });

        return result;
    },
});

/**
 * Approve a credit note.
 */
export const approveCreditNote = mutation({
    args: {
        id: v.string(),
    },
    handler: async (ctx, { id }) => {
        const note = await ctx.runQuery(components.billing.queries.getCreditNote, { id });
        if (note) {
            await rateLimit(ctx, { name: "mutateBilling", key: rateLimitKeys.tenant((note as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.billing.mutations.approveCreditNote, { id });

        await withAudit(ctx, {
            tenantId: (note as any)?.tenantId ?? "",
            entityType: "creditNote",
            entityId: id,
            action: "approved",
            sourceComponent: "billing",
        });

        return result;
    },
});

/**
 * Process a credit note.
 */
export const processCreditNote = mutation({
    args: {
        id: v.string(),
    },
    handler: async (ctx, { id }) => {
        const note = await ctx.runQuery(components.billing.queries.getCreditNote, { id });
        if (note) {
            await rateLimit(ctx, { name: "mutateBilling", key: rateLimitKeys.tenant((note as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.billing.mutations.processCreditNote, { id });

        await withAudit(ctx, {
            tenantId: (note as any)?.tenantId ?? "",
            entityType: "creditNote",
            entityId: id,
            action: "processed",
            sourceComponent: "billing",
        });

        await emitEvent(ctx, "billing.creditNote.processed", (note as any)?.tenantId ?? "", "billing", {
            creditNoteId: id,
        });

        return result;
    },
});
