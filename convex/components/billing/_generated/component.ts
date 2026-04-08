/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    import: {
      importInvoice: FunctionReference<
        "mutation",
        "internal",
        {
          billingAddress?: {
            city?: string;
            country?: string;
            postalCode?: string;
            street?: string;
          };
          bookingIds?: Array<string>;
          createdAt: number;
          createdBy?: string;
          currency: string;
          customerAddress?: string;
          customerEmail?: string;
          customerName: string;
          customerOrgNumber?: string;
          dueDate: number;
          internalNotes?: string;
          invoiceNumber: string;
          issueDate: number;
          lineItems: Array<{
            amount: number;
            bookingId?: string;
            description: string;
            id: string;
            quantity: number;
            resourceId?: string;
            taxAmount?: number;
            taxRate?: number;
            unitPrice: number;
          }>;
          metadata?: any;
          notes?: string;
          organizationId?: string;
          paidDate?: number;
          paymentId?: string;
          paymentMethod?: string;
          pdfStorageId?: string;
          reference?: string;
          status: string;
          subtotal: number;
          taxAmount: number;
          tenantId: string;
          totalAmount: number;
          updatedAt: number;
          userId?: string;
        },
        { id: string },
        Name
      >;
      importPayment: FunctionReference<
        "mutation",
        "internal",
        {
          amount: number;
          bookingId?: string;
          capturedAmount?: number;
          createdAt: number;
          currency: string;
          description?: string;
          externalId?: string;
          metadata?: any;
          provider: string;
          redirectUrl?: string;
          reference: string;
          refundedAmount?: number;
          status: string;
          tenantId: string;
          updatedAt: number;
          userId?: string;
        },
        { id: string },
        Name
      >;
    };
    mutations: {
      approveCreditNote: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      approveInvoiceBasis: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      createCreditNote: FunctionReference<
        "mutation",
        "internal",
        {
          createdBy?: string;
          fullCredit?: boolean;
          lineItems?: Array<{
            description: string;
            quantity: number;
            unitPrice: number;
            vatRate?: number;
          }>;
          reason: string;
          salesDocumentId: string;
          tenantId: string;
        },
        { creditNoteNumber: string; id: string },
        Name
      >;
      createInvoice: FunctionReference<
        "mutation",
        "internal",
        {
          bookingIds?: Array<string>;
          createdBy?: string;
          customerAddress?: string;
          customerEmail?: string;
          customerName: string;
          customerOrgNumber?: string;
          dueDate: number;
          lineItems: Array<{
            amount: number;
            bookingId?: string;
            description: string;
            id: string;
            quantity: number;
            resourceId?: string;
            taxAmount?: number;
            taxRate?: number;
            unitPrice: number;
          }>;
          notes?: string;
          organizationId?: string;
          tenantId: string;
          userId?: string;
        },
        { id: string; invoiceNumber: string },
        Name
      >;
      createInvoiceBasis: FunctionReference<
        "mutation",
        "internal",
        {
          createdBy?: string;
          customerId: string;
          dueDate: number;
          lineItems: Array<{
            bookingId?: string;
            description: string;
            quantity: number;
            resourceId?: string;
            unitPrice: number;
            vatRate?: number;
          }>;
          metadata?: any;
          notes?: string;
          tenantId: string;
        },
        { id: string },
        Name
      >;
      createPayment: FunctionReference<
        "mutation",
        "internal",
        {
          amount: number;
          bookingId?: string;
          currency: string;
          description?: string;
          metadata?: any;
          provider: string;
          reference: string;
          tenantId: string;
          userId?: string;
        },
        { id: string },
        Name
      >;
      creditInvoice: FunctionReference<
        "mutation",
        "internal",
        { id: string; reason?: string },
        { success: boolean },
        Name
      >;
      deleteInvoiceBasis: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      finalizeInvoiceBasis: FunctionReference<
        "mutation",
        "internal",
        { id: string; sendToCustomer?: boolean },
        { salesDocumentId: string; success: boolean },
        Name
      >;
      markInvoicePaid: FunctionReference<
        "mutation",
        "internal",
        { id: string; paymentId?: string; paymentMethod?: string },
        { success: boolean },
        Name
      >;
      patchInvoiceUserId: FunctionReference<
        "mutation",
        "internal",
        { tenantId: string; userId: string },
        { patched: number },
        Name
      >;
      processCreditNote: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      sendInvoice: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      storeInvoicePdf: FunctionReference<
        "mutation",
        "internal",
        { id: string; storageId: string },
        { success: boolean },
        Name
      >;
      updateInvoiceBasis: FunctionReference<
        "mutation",
        "internal",
        {
          dueDate?: number;
          id: string;
          lineItems?: Array<{
            bookingId?: string;
            description: string;
            quantity: number;
            resourceId?: string;
            unitPrice: number;
            vatRate?: number;
          }>;
          metadata?: any;
          notes?: string;
        },
        { success: boolean },
        Name
      >;
      updateInvoiceStatus: FunctionReference<
        "mutation",
        "internal",
        {
          id: string;
          paidDate?: number;
          paymentId?: string;
          paymentMethod?: string;
          status: string;
        },
        { success: boolean },
        Name
      >;
      updatePaymentStatus: FunctionReference<
        "mutation",
        "internal",
        {
          capturedAmount?: number;
          externalId?: string;
          id: string;
          refundedAmount?: number;
          status:
            | "created"
            | "authorized"
            | "captured"
            | "failed"
            | "refunded"
            | "partially_refunded"
            | "cancelled";
        },
        { success: boolean },
        Name
      >;
    };
    queries: {
      getByReference: FunctionReference<
        "query",
        "internal",
        { reference: string; tenantId: string },
        any,
        Name
      >;
      getByReferenceGlobal: FunctionReference<
        "query",
        "internal",
        { reference: string },
        any,
        Name
      >;
      getCreditNote: FunctionReference<
        "query",
        "internal",
        { id: string },
        any,
        Name
      >;
      getEconomyStats: FunctionReference<
        "query",
        "internal",
        { period?: string; tenantId: string },
        any,
        Name
      >;
      getInvoice: FunctionReference<
        "query",
        "internal",
        { id: string },
        any,
        Name
      >;
      getInvoiceBasis: FunctionReference<
        "query",
        "internal",
        { id: string },
        any,
        Name
      >;
      getInvoiceDownloadUrl: FunctionReference<
        "query",
        "internal",
        { id: string },
        any,
        Name
      >;
      getOrgBillingSummary: FunctionReference<
        "query",
        "internal",
        { organizationId: string; period?: string },
        any,
        Name
      >;
      getPayment: FunctionReference<
        "query",
        "internal",
        { id: string },
        any,
        Name
      >;
      getSummary: FunctionReference<
        "query",
        "internal",
        { limit?: number; period?: string; userId: string },
        any,
        Name
      >;
      listCreditNotes: FunctionReference<
        "query",
        "internal",
        { limit?: number; status?: string; tenantId: string },
        Array<any>,
        Name
      >;
      listInvoiceBases: FunctionReference<
        "query",
        "internal",
        { limit?: number; status?: string; tenantId: string },
        Array<any>,
        Name
      >;
      listInvoices: FunctionReference<
        "query",
        "internal",
        { limit?: number; status?: string; userId: string },
        Array<any>,
        Name
      >;
      listOrgInvoices: FunctionReference<
        "query",
        "internal",
        {
          cursor?: string;
          limit?: number;
          organizationId: string;
          status?: string;
        },
        any,
        Name
      >;
      listPayments: FunctionReference<
        "query",
        "internal",
        { limit?: number; status?: string; tenantId: string },
        Array<any>,
        Name
      >;
      listTenantInvoices: FunctionReference<
        "query",
        "internal",
        { limit?: number; status?: string; tenantId: string },
        any,
        Name
      >;
      listUserInvoices: FunctionReference<
        "query",
        "internal",
        { cursor?: string; limit?: number; status?: string; userId: string },
        any,
        Name
      >;
      pendingCount: FunctionReference<
        "query",
        "internal",
        { limit?: number; userId: string },
        { count: number },
        Name
      >;
    };
  };
