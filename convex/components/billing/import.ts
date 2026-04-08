/**
 * Billing Component — Import Functions
 *
 * Data migration helpers for payments and invoices.
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Import a payment record from the legacy table.
 * Used during data migration.
 */
export const importPayment = mutation({
    args: {
        tenantId: v.string(),
        bookingId: v.optional(v.string()),
        userId: v.optional(v.string()),
        provider: v.string(),
        reference: v.string(),
        externalId: v.optional(v.string()),
        amount: v.number(),
        currency: v.string(),
        description: v.optional(v.string()),
        status: v.string(),
        redirectUrl: v.optional(v.string()),
        capturedAmount: v.optional(v.number()),
        refundedAmount: v.optional(v.number()),
        metadata: v.optional(v.any()),
        createdAt: v.number(),
        updatedAt: v.number(),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("payments", { ...args } as any);
        return { id: id as string };
    },
});

/**
 * Import an invoice record from the legacy table.
 * Used during data migration.
 */
export const importInvoice = mutation({
    args: {
        tenantId: v.string(),
        userId: v.optional(v.string()),
        organizationId: v.optional(v.string()),
        invoiceNumber: v.string(),
        reference: v.optional(v.string()),
        status: v.string(),
        issueDate: v.number(),
        dueDate: v.number(),
        paidDate: v.optional(v.number()),
        subtotal: v.number(),
        taxAmount: v.number(),
        totalAmount: v.number(),
        currency: v.string(),
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
        bookingIds: v.optional(v.array(v.string())),
        paymentId: v.optional(v.string()),
        paymentMethod: v.optional(v.string()),
        customerName: v.string(),
        customerEmail: v.optional(v.string()),
        customerAddress: v.optional(v.string()),
        customerOrgNumber: v.optional(v.string()),
        billingAddress: v.optional(v.object({
            street: v.optional(v.string()),
            postalCode: v.optional(v.string()),
            city: v.optional(v.string()),
            country: v.optional(v.string()),
        })),
        notes: v.optional(v.string()),
        internalNotes: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
        createdBy: v.optional(v.string()),
        pdfStorageId: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("invoices", { ...args });
        return { id: id as string };
    },
});
