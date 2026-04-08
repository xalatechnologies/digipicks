/**
 * Billing Component — Query Functions
 *
 * Read-only operations for payments, invoices, and billing summaries.
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// PAYMENT QUERIES
// =============================================================================

/**
 * Get billing summary for a user.
 * Aggregates from invoices table (primary) + payments table (fallback).
 */
export const getSummary = query({
    args: {
        userId: v.string(),
        period: v.optional(v.string()), // "month", "quarter", "year", "all"
        limit: v.optional(v.number()),
    },
    returns: v.any(),
    handler: async (ctx, { userId, period = "month", limit = 1000 }) => {
        // Compute date range based on period
        const now = Date.now();
        let startTime = 0;
        if (period === "month") {
            startTime = now - 30 * 24 * 60 * 60 * 1000;
        } else if (period === "quarter") {
            startTime = now - 90 * 24 * 60 * 60 * 1000;
        } else if (period === "year") {
            startTime = now - 365 * 24 * 60 * 60 * 1000;
        }

        // Get invoices for this user
        const invoices = await ctx.db
            .query("invoices")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .take(limit);

        const filteredInvoices = invoices.filter((inv) => inv.createdAt >= startTime);

        // Calculate totals from invoices
        const totalSpent = filteredInvoices
            .filter((inv) => inv.status === "paid")
            .reduce((sum, inv) => sum + inv.totalAmount, 0);

        const pendingAmount = filteredInvoices
            .filter((inv) => inv.status === "sent" || inv.status === "draft")
            .reduce((sum, inv) => sum + inv.totalAmount, 0);

        // Count unique bookings across invoices
        const bookingIdSet = new Set<string>();
        for (const inv of filteredInvoices) {
            if (inv.bookingIds) {
                for (const bid of inv.bookingIds) bookingIdSet.add(bid);
            }
        }

        return {
            totalSpent,
            pendingAmount,
            currency: "NOK",
            bookingCount: bookingIdSet.size,
            period,
        };
    },
});

/**
 * List invoices for a user.
 * Returns Invoice[] shape expected by the SDK (id, reference, amount, etc.)
 */
export const listInvoices = query({
    args: {
        userId: v.string(),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { userId, status, limit = 50 }) => {
        let invoices = await ctx.db
            .query("invoices")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .order("desc")
            .take(limit);

        if (status) {
            invoices = invoices.filter((inv) => inv.status === status);
        }

        // Map to SDK Invoice shape
        return invoices.map((inv) => ({
            id: inv._id,
            reference: inv.invoiceNumber,
            amount: inv.totalAmount,
            currency: inv.currency,
            status: inv.status,
            description: inv.lineItems?.[0]?.description ?? inv.customerName,
            createdAt: new Date(inv.createdAt).toISOString(),
            bookingId: inv.bookingIds?.[0],
            resourceName: inv.lineItems?.[0]?.description,
        }));
    },
});

/**
 * Get a single payment/invoice
 */
export const getPayment = query({
    args: {
        id: v.id("payments"),
    },
    returns: v.any(),
    handler: async (ctx, { id }) => {
        const payment = await ctx.db.get(id);
        if (!payment) {
            throw new Error("Payment not found");
        }

        // Return raw payment — enrichment with booking/resource happens in facade
        return payment;
    },
});

/**
 * Get a payment by its reference, scoped to a tenant.
 */
export const getByReference = query({
    args: {
        tenantId: v.string(),
        reference: v.string(),
    },
    returns: v.any(),
    handler: async (ctx, { tenantId, reference }) => {
        const payment = await ctx.db
            .query("payments")
            .withIndex("by_reference", (q) => q.eq("reference", reference))
            .filter((q) => q.eq(q.field("tenantId"), tenantId))
            .first();

        return payment;
    },
});

/**
 * Get a payment by its reference without tenant scoping.
 * Used for Vipps webhook callbacks where the tenantId is embedded in the
 * reference string but not passed separately. References are globally unique
 * (they include a timestamp), so this is safe.
 */
export const getByReferenceGlobal = query({
    args: {
        reference: v.string(),
    },
    returns: v.any(),
    handler: async (ctx, { reference }) => {
        return ctx.db
            .query("payments")
            .withIndex("by_reference", (q) => q.eq("reference", reference))
            .first();
    },
});



/**
 * List payments for a tenant, optionally filtered by status.
 */
export const listPayments = query({
    args: {
        tenantId: v.string(),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, status, limit = 50 }) => {
        if (status) {
            return await ctx.db
                .query("payments")
                .withIndex("by_status", (q) =>
                    q.eq("tenantId", tenantId).eq("status", status as any)
                )
                .order("desc")
                .take(limit);
        }

        return await ctx.db
            .query("payments")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .order("desc")
            .take(limit);
    },
});

/**
 * Get pending payments count for a user.
 * Counts invoices with status "sent" or "overdue" (unpaid).
 */
export const pendingCount = query({
    args: {
        userId: v.string(),
        limit: v.optional(v.number()),
    },
    returns: v.object({ count: v.number() }),
    handler: async (ctx, { userId, limit = 1000 }) => {
        const invoices = await ctx.db
            .query("invoices")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .take(limit);

        const pendingInvoices = invoices.filter(
            (inv) => inv.status === "sent" || inv.status === "overdue"
        );

        return { count: pendingInvoices.length };
    },
});

// =============================================================================
// INVOICE QUERIES
// =============================================================================

/**
 * List invoices for a user
 */
export const listUserInvoices = query({
    args: {
        userId: v.string(),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
        cursor: v.optional(v.string()),
    },
    returns: v.any(),
    handler: async (ctx, { userId, status, limit = 50 }) => {
        let invoices = await ctx.db
            .query("invoices")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .order("desc")
            .take(limit);

        if (status) {
            invoices = invoices.filter((inv) => inv.status === status);
        }

        return {
            data: invoices,
            meta: {
                total: invoices.length,
                limit,
                hasMore: invoices.length === limit,
            },
        };
    },
});

/**
 * List invoices for an organization
 */
export const listOrgInvoices = query({
    args: {
        organizationId: v.string(),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
        cursor: v.optional(v.string()),
    },
    returns: v.any(),
    handler: async (ctx, { organizationId, status, limit = 50 }) => {
        let invoices = await ctx.db
            .query("invoices")
            .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
            .order("desc")
            .take(limit);

        if (status) {
            invoices = invoices.filter((inv) => inv.status === status);
        }

        return {
            data: invoices,
            meta: {
                total: invoices.length,
                limit,
                hasMore: invoices.length === limit,
            },
        };
    },
});

/**
 * Get a single invoice by ID
 */
export const getInvoice = query({
    args: {
        id: v.id("invoices"),
    },
    returns: v.any(),
    handler: async (ctx, { id }) => {
        const invoice = await ctx.db.get(id);
        if (!invoice) {
            throw new Error("Invoice not found");
        }

        // Return raw invoice — enrichment with user/org happens in facade
        return invoice;
    },
});

// =============================================================================
// BILLING SUMMARIES
// =============================================================================

/**
 * Get billing summary for an organization
 */
export const getOrgBillingSummary = query({
    args: {
        organizationId: v.string(),
        period: v.optional(v.string()),
    },
    returns: v.any(),
    handler: async (ctx, { organizationId, period = "month" }) => {
        const invoices = await ctx.db
            .query("invoices")
            .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
            .take(1000);

        const now = Date.now();
        let startTime = 0;
        if (period === "month") {
            startTime = now - 30 * 24 * 60 * 60 * 1000;
        } else if (period === "quarter") {
            startTime = now - 90 * 24 * 60 * 60 * 1000;
        } else if (period === "year") {
            startTime = now - 365 * 24 * 60 * 60 * 1000;
        }

        const filteredInvoices = invoices.filter((inv) => inv.createdAt >= startTime);

        const totalBilled = filteredInvoices
            .filter((inv) => inv.status === "paid" || inv.status === "sent")
            .reduce((sum, inv) => sum + inv.totalAmount, 0);

        const pendingAmount = filteredInvoices
            .filter((inv) => inv.status === "sent")
            .reduce((sum, inv) => sum + inv.totalAmount, 0);

        const overdueAmount = filteredInvoices
            .filter((inv) => inv.status === "overdue" || (inv.status === "sent" && inv.dueDate < now))
            .reduce((sum, inv) => sum + inv.totalAmount, 0);

        const paidAmount = filteredInvoices
            .filter((inv) => inv.status === "paid")
            .reduce((sum, inv) => sum + inv.totalAmount, 0);

        return {
            totalBilled,
            pendingAmount,
            overdueAmount,
            paidAmount,
            invoiceCount: filteredInvoices.length,
            currency: "NOK",
            period,
        };
    },
});

/**
 * List all invoices for a tenant (admin view)
 */
export const listTenantInvoices = query({
    args: {
        tenantId: v.string(),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    returns: v.any(),
    handler: async (ctx, { tenantId, status, limit = 100 }) => {
        if (status) {
            return await ctx.db
                .query("invoices")
                .withIndex("by_status", (q) =>
                    q.eq("tenantId", tenantId).eq("status", status)
                )
                .order("desc")
                .take(limit);
        }

        return await ctx.db
            .query("invoices")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .order("desc")
            .take(limit);
    },
});

/**
 * Get economy statistics for a tenant (admin view)
 * Aggregates invoice/payment data for dashboard KPIs
 */
export const getEconomyStats = query({
    args: {
        tenantId: v.string(),
        period: v.optional(v.string()),
    },
    returns: v.any(),
    handler: async (ctx, { tenantId, period = "month" }) => {
        const now = Date.now();
        let startTime = 0;
        if (period === "month") {
            startTime = now - 30 * 24 * 60 * 60 * 1000;
        } else if (period === "quarter") {
            startTime = now - 90 * 24 * 60 * 60 * 1000;
        } else if (period === "year") {
            startTime = now - 365 * 24 * 60 * 60 * 1000;
        }

        // Get all invoices for this tenant
        const allInvoices = await ctx.db
            .query("invoices")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .collect();

        const periodInvoices = allInvoices.filter((inv) => inv.createdAt >= startTime);

        // Get all payments for this tenant
        const allPayments = await ctx.db
            .query("payments")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .collect();

        const periodPayments = allPayments.filter((p) => p.createdAt >= startTime);

        // Invoice stats
        const totalRevenue = periodInvoices
            .filter((inv) => inv.status === "paid")
            .reduce((sum, inv) => sum + inv.totalAmount, 0);

        const pendingAmount = periodInvoices
            .filter((inv) => inv.status === "sent" || inv.status === "draft")
            .reduce((sum, inv) => sum + inv.totalAmount, 0);

        const overdueAmount = periodInvoices
            .filter((inv) => inv.status === "overdue" || (inv.status === "sent" && inv.dueDate < now))
            .reduce((sum, inv) => sum + inv.totalAmount, 0);

        const creditedAmount = periodInvoices
            .filter((inv) => inv.status === "credited")
            .reduce((sum, inv) => sum + inv.totalAmount, 0);

        const totalTax = periodInvoices
            .filter((inv) => inv.status === "paid")
            .reduce((sum, inv) => sum + inv.taxAmount, 0);

        // Payment stats
        const completedPayments = periodPayments
            .filter((p) => p.status === "captured")
            .reduce((sum, p) => sum + p.amount, 0);

        // Status breakdown
        const invoicesByStatus = {
            draft: periodInvoices.filter((inv) => inv.status === "draft").length,
            sent: periodInvoices.filter((inv) => inv.status === "sent").length,
            paid: periodInvoices.filter((inv) => inv.status === "paid").length,
            overdue: periodInvoices.filter((inv) => inv.status === "overdue" || (inv.status === "sent" && inv.dueDate < now)).length,
            credited: periodInvoices.filter((inv) => inv.status === "credited").length,
        };

        return {
            totalRevenue,
            pendingAmount,
            overdueAmount,
            creditedAmount,
            totalTax,
            completedPayments,
            totalInvoices: periodInvoices.length,
            allTimeInvoices: allInvoices.length,
            invoicesByStatus,
            currency: "NOK",
            period,
        };
    },
});

/**
 * Get invoice download URL (for PDF)
 */
export const getInvoiceDownloadUrl = query({
    args: {
        id: v.id("invoices"),
    },
    returns: v.any(),
    handler: async (ctx, { id }) => {
        const invoice = await ctx.db.get(id);
        if (!invoice) {
            throw new Error("Invoice not found");
        }

        if (!invoice.pdfStorageId) {
            return { url: null, invoiceNumber: invoice.invoiceNumber };
        }

        const url = await ctx.storage.getUrl(invoice.pdfStorageId);
        return { url, invoiceNumber: invoice.invoiceNumber };
    },
});

// =============================================================================
// INVOICE BASIS QUERIES
// =============================================================================

/**
 * List invoice bases for a tenant, optionally filtered by status.
 */
export const listInvoiceBases = query({
    args: {
        tenantId: v.string(),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, status, limit = 50 }) => {
        if (status) {
            return await ctx.db
                .query("invoiceBases")
                .withIndex("by_status", (q) =>
                    q.eq("tenantId", tenantId).eq("status", status)
                )
                .order("desc")
                .take(limit);
        }

        return await ctx.db
            .query("invoiceBases")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .order("desc")
            .take(limit);
    },
});

/**
 * Get a single invoice basis by ID.
 */
export const getInvoiceBasis = query({
    args: {
        id: v.id("invoiceBases"),
    },
    returns: v.any(),
    handler: async (ctx, { id }) => {
        const basis = await ctx.db.get(id);
        if (!basis) {
            throw new Error("Invoice basis not found");
        }
        return basis;
    },
});

// =============================================================================
// CREDIT NOTE QUERIES
// =============================================================================

/**
 * List credit notes for a tenant, optionally filtered by status.
 */
export const listCreditNotes = query({
    args: {
        tenantId: v.string(),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, status, limit = 50 }) => {
        if (status) {
            return await ctx.db
                .query("creditNotes")
                .withIndex("by_status", (q) =>
                    q.eq("tenantId", tenantId).eq("status", status)
                )
                .order("desc")
                .take(limit);
        }

        return await ctx.db
            .query("creditNotes")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .order("desc")
            .take(limit);
    },
});

/**
 * Get a single credit note by ID.
 */
export const getCreditNote = query({
    args: {
        id: v.id("creditNotes"),
    },
    returns: v.any(),
    handler: async (ctx, { id }) => {
        const note = await ctx.db.get(id);
        if (!note) {
            throw new Error("Credit note not found");
        }
        return note;
    },
});
