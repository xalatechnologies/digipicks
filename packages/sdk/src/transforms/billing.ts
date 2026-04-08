/**
 * DigilistSaaS SDK - Billing Transforms
 *
 * Maps between the Convex billing shapes and the SDK shapes.
 */

import type { Invoice, OrgInvoice, InvoiceLineItem } from '../hooks/use-billing';

/** Raw Convex invoice document shape (user-level). */
export interface ConvexInvoice {
    id: string;
    reference: string;
    amount: number;
    currency: string;
    status: string;
    description: string;
    createdAt: string;
    bookingId?: string;
    resourceName?: string;
}

/** Raw Convex org invoice document shape. */
export interface ConvexOrgInvoice {
    _id: string;
    invoiceNumber: string;
    status: string;
    issueDate: number;
    dueDate: number;
    paidDate?: number;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    currency: string;
    customerName: string;
    lineItems: InvoiceLineItem[];
}

/**
 * Transform a raw Convex invoice into the SDK `Invoice` shape.
 */
export function transformInvoice(i: ConvexInvoice): Invoice {
    return {
        id: i.id as string,
        reference: i.reference,
        amount: i.amount,
        currency: i.currency,
        status: i.status,
        description: i.description,
        createdAt: i.createdAt,
        bookingId: i.bookingId as string | undefined,
        resourceName: i.resourceName,
    };
}

/**
 * Transform a raw Convex org invoice into the SDK `OrgInvoice` shape.
 *
 * Epoch timestamps -> ISO strings.
 */
export function transformOrgInvoice(inv: ConvexOrgInvoice): OrgInvoice {
    return {
        id: inv._id as string,
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
        issueDate: new Date(inv.issueDate).toISOString(),
        dueDate: new Date(inv.dueDate).toISOString(),
        paidDate: inv.paidDate ? new Date(inv.paidDate).toISOString() : undefined,
        subtotal: inv.subtotal,
        taxAmount: inv.taxAmount,
        totalAmount: inv.totalAmount,
        currency: inv.currency,
        customerName: inv.customerName,
        lineItems: inv.lineItems,
    };
}
