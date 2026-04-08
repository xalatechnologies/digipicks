/**
 * Billing Component Contract
 */

import { v } from "convex/values";
import { defineContract } from "../../lib/componentContract";

export const CONTRACT = defineContract({
    name: "billing",
    version: "1.0.0",
    category: "domain",
    description: "Payments and invoices with lifecycle management",

    queries: {
        getSummary: {
            args: {
                userId: v.string(),
                period: v.optional(v.string()),
                limit: v.optional(v.number()),
            },
            returns: v.any(),
        },
        listInvoices: {
            args: {
                userId: v.string(),
                status: v.optional(v.string()),
                limit: v.optional(v.number()),
            },
            returns: v.array(v.any()),
        },
        getInvoice: {
            args: { id: v.string() },
            returns: v.any(),
        },
        getPayment: {
            args: { id: v.string() },
            returns: v.any(),
        },
        listPayments: {
            args: {
                tenantId: v.string(),
                status: v.optional(v.string()),
                limit: v.optional(v.number()),
            },
            returns: v.array(v.any()),
        },
        pendingCount: {
            args: {
                userId: v.string(),
                limit: v.optional(v.number()),
            },
            returns: v.object({ count: v.number() }),
        },
        listUserInvoices: {
            args: {
                userId: v.string(),
                status: v.optional(v.string()),
                limit: v.optional(v.number()),
                cursor: v.optional(v.string()),
            },
            returns: v.any(),
        },
        listOrgInvoices: {
            args: {
                organizationId: v.string(),
                status: v.optional(v.string()),
                limit: v.optional(v.number()),
                cursor: v.optional(v.string()),
            },
            returns: v.any(),
        },
        getOrgBillingSummary: {
            args: {
                organizationId: v.string(),
                period: v.optional(v.string()),
            },
            returns: v.any(),
        },
        getInvoiceDownloadUrl: {
            args: { id: v.string() },
            returns: v.any(),
        },
        listInvoiceBases: {
            args: {
                tenantId: v.string(),
                status: v.optional(v.string()),
                limit: v.optional(v.number()),
            },
            returns: v.array(v.any()),
        },
        getInvoiceBasis: {
            args: { id: v.string() },
            returns: v.any(),
        },
        listCreditNotes: {
            args: {
                tenantId: v.string(),
                status: v.optional(v.string()),
                limit: v.optional(v.number()),
            },
            returns: v.array(v.any()),
        },
        getCreditNote: {
            args: { id: v.string() },
            returns: v.any(),
        },
    },

    mutations: {
        createPayment: {
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
        },
        updatePaymentStatus: {
            args: {
                id: v.string(),
                status: v.string(),
                externalId: v.optional(v.string()),
                capturedAmount: v.optional(v.number()),
                refundedAmount: v.optional(v.number()),
            },
            returns: v.object({ success: v.boolean() }),
        },
        createInvoice: {
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
        },
        updateInvoiceStatus: {
            args: {
                id: v.string(),
                status: v.string(),
                paidDate: v.optional(v.number()),
                paymentId: v.optional(v.string()),
                paymentMethod: v.optional(v.string()),
            },
            returns: v.object({ success: v.boolean() }),
        },
        sendInvoice: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        markInvoicePaid: {
            args: {
                id: v.string(),
                paymentId: v.optional(v.string()),
                paymentMethod: v.optional(v.string()),
            },
            returns: v.object({ success: v.boolean() }),
        },
        creditInvoice: {
            args: {
                id: v.string(),
                reason: v.optional(v.string()),
            },
            returns: v.object({ success: v.boolean() }),
        },
        storeInvoicePdf: {
            args: {
                id: v.string(),
                storageId: v.string(),
            },
            returns: v.object({ success: v.boolean() }),
        },
        createInvoiceBasis: {
            args: {
                tenantId: v.string(),
                customerId: v.string(),
                lineItems: v.array(v.any()),
                dueDate: v.number(),
                notes: v.optional(v.string()),
                metadata: v.optional(v.any()),
                createdBy: v.optional(v.string()),
            },
            returns: v.object({ id: v.string() }),
        },
        updateInvoiceBasis: {
            args: {
                id: v.string(),
                lineItems: v.optional(v.array(v.any())),
                dueDate: v.optional(v.number()),
                notes: v.optional(v.string()),
                metadata: v.optional(v.any()),
            },
            returns: v.object({ success: v.boolean() }),
        },
        approveInvoiceBasis: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        finalizeInvoiceBasis: {
            args: {
                id: v.string(),
                sendToCustomer: v.optional(v.boolean()),
            },
            returns: v.object({ success: v.boolean(), salesDocumentId: v.string() }),
        },
        deleteInvoiceBasis: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        createCreditNote: {
            args: {
                tenantId: v.string(),
                salesDocumentId: v.string(),
                reason: v.string(),
                lineItems: v.optional(v.array(v.any())),
                fullCredit: v.optional(v.boolean()),
                createdBy: v.optional(v.string()),
            },
            returns: v.object({ id: v.string(), creditNoteNumber: v.string() }),
        },
        approveCreditNote: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        processCreditNote: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
    },

    emits: [
        "billing.payment.created",
        "billing.payment.completed",
        "billing.payment.failed",
        "billing.invoice.created",
        "billing.invoice.sent",
        "billing.invoice.paid",
        "billing.invoice.credited",
        "billing.invoice-basis.created",
        "billing.invoice-basis.approved",
        "billing.invoice-basis.finalized",
        "billing.credit-note.created",
        "billing.credit-note.processed",
    ],

    subscribes: [
        "bookings.booking.approved",
        "bookings.booking.cancelled",
    ],

    dependencies: {
        core: ["tenants", "users"],
        components: ["bookings"],
    },
});
