/**
 * DigilistSaaS SDK - Billing Hooks (Tier 2)
 *
 * React hooks for billing, invoices, and payments.
 * Connected to Convex billing functions.
 *
 * Queries:  { data, isLoading, error }
 * Mutations: { mutate, mutateAsync, isLoading, error, isSuccess }
 */

import { useQuery as useConvexQuery, useMutation as useConvexMutation } from "convex/react";
import { api } from "../convex-api";
import type { Id } from "../convex-api";
import { transformInvoice, transformOrgInvoice, type ConvexInvoice, type ConvexOrgInvoice } from "../transforms/billing";

// =============================================================================
// Query Key Factory
// =============================================================================

export const billingKeys = {
  all: ["billing"] as const,
  summary: (params?: Record<string, unknown>) => [...billingKeys.all, "summary", params] as const,
  invoices: (params?: Record<string, unknown>) => [...billingKeys.all, "invoices", params] as const,
  invoice: (id: string) => [...billingKeys.all, "invoice", id] as const,
  pending: () => [...billingKeys.all, "pending"] as const,
};

// =============================================================================
// Types
// =============================================================================

export interface BillingSummary {
  totalSpent: number;
  pendingAmount: number;
  currency: string;
  bookingCount: number;
  period: string;
}

export interface Invoice {
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

export interface OrgInvoice {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  customerName: string;
  lineItems: InvoiceLineItem[];
}

export interface OrgBillingSummary {
  totalBilled: number;
  pendingAmount: number;
  overdueAmount: number;
  paidAmount: number;
  invoiceCount: number;
  currency: string;
  period: string;
}

// =============================================================================
// Billing Query Hooks (Wired to Convex)
// =============================================================================

/**
 * Get billing summary for a user.
 * Connected to Convex: api.domain.billing.getSummary
 */
export function useBillingSummary(
  userId: Id<"users"> | undefined,
  params?: { period?: string }
): { data: { data: BillingSummary } | null; isLoading: boolean; error: Error | null } {
  const data = useConvexQuery(
    api.domain.billing.getSummary,
    userId ? { userId, period: params?.period } : "skip"
  );

  const isLoading = userId !== undefined && data === undefined;

  return {
    data: data ? { data } : null,
    isLoading,
    error: null,
  };
}

/**
 * Get invoices/payments for a user.
 * Connected to Convex: api.domain.billing.listInvoices
 */
export function useInvoices(
  userId: Id<"users"> | undefined,
  params?: { status?: string; limit?: number }
): { data: { data: Invoice[] }; invoices: Invoice[]; isLoading: boolean; error: Error | null } {
  const data = useConvexQuery(
    api.domain.billing.listInvoices,
    userId ? { userId, status: params?.status, limit: params?.limit } : "skip"
  );

  const isLoading = userId !== undefined && data === undefined;

  const invoices: Invoice[] = (data ?? []).map((i) => transformInvoice(i as unknown as ConvexInvoice));

  return {
    data: { data: invoices },
    invoices,
    isLoading,
    error: null,
  };
}

/**
 * Get pending payment count for a user.
 * Connected to Convex: api.domain.billing.pendingCount
 */
export function usePendingPaymentsCount(userId: Id<"users"> | undefined) {
  const data = useConvexQuery(
    api.domain.billing.pendingCount,
    userId ? { userId } : "skip"
  );

  const isLoading = userId !== undefined && data === undefined;

  return {
    data: { data: data ?? { count: 0 } },
    isLoading,
    error: null,
  };
}

/**
 * List invoices for an organization.
 * Connected to Convex: api.domain.billing.listOrgInvoices
 */
export function useOrgInvoices(
  orgId: Id<"organizations"> | undefined,
  params?: { status?: string; limit?: number }
): { data: { data: OrgInvoice[]; meta: { total: number; limit: number; hasMore: boolean } }; isLoading: boolean; error: Error | null } {
  const data = useConvexQuery(
    api.domain.billing.listOrgInvoices,
    orgId ? { organizationId: orgId, status: params?.status, limit: params?.limit } : "skip"
  );

  const isLoading = orgId !== undefined && data === undefined;

  const invoices: OrgInvoice[] = (data?.data ?? []).map((inv: any) => transformOrgInvoice(inv));

  return {
    data: { data: invoices, meta: data?.meta ?? { total: 0, limit: 50, hasMore: false } },
    isLoading,
    error: null,
  };
}

/**
 * List all invoices for a tenant (admin view).
 * Connected to Convex: api.domain.billing.listTenantInvoices
 */
export function useTenantInvoices(
  tenantId: string | undefined,
  params?: { status?: string; limit?: number }
) {
  const data = useConvexQuery(
    api.domain.billing.listTenantInvoices,
    tenantId ? { tenantId: tenantId as Id<"tenants">, status: params?.status, limit: params?.limit } : "skip"
  );

  const isLoading = tenantId !== undefined && data === undefined;

  return {
    data: data ?? [],
    invoices: data ?? [],
    isLoading,
    error: null,
  };
}

/**
 * Get economy statistics for a tenant (admin view).
 * Connected to Convex: api.domain.billing.getEconomyStats
 */
export function useEconomyStats(
  tenantId: string | undefined,
  params?: { period?: string }
) {
  const data = useConvexQuery(
    api.domain.billing.getEconomyStats,
    tenantId ? { tenantId: tenantId as Id<"tenants">, period: params?.period } : "skip"
  );

  const isLoading = tenantId !== undefined && data === undefined;

  return {
    data,
    stats: data ?? null,
    isLoading,
    error: null,
  };
}

// =============================================================================
// Billing Mutation Hooks
// =============================================================================

/**
 * Create a payment record.
 * Connected to Convex: api.domain.billing.createPayment
 */
export function useCreatePayment() {
  const mutation = useConvexMutation(api.domain.billing.createPayment);

  return {
    mutate: (args: {
      tenantId: Id<"tenants">;
      bookingId?: Id<"bookings">;
      userId?: Id<"users">;
      provider: string;
      reference: string;
      amount: number;
      currency: string;
      description?: string;
    }) => {
      mutation(args);
    },
    mutateAsync: async (args: {
      tenantId: Id<"tenants">;
      bookingId?: Id<"bookings">;
      userId?: Id<"users">;
      provider: string;
      reference: string;
      amount: number;
      currency: string;
      description?: string;
    }) => {
      const result = await mutation(args);
      return result;
    },
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

/**
 * Update payment status.
 * Connected to Convex: api.domain.billing.updatePaymentStatus
 */
export function useUpdatePaymentStatus() {
  const mutation = useConvexMutation(api.domain.billing.updatePaymentStatus);

  return {
    mutate: (args: {
      id: Id<"payments">;
      status: string;
      externalId?: string;
      capturedAmount?: number;
      refundedAmount?: number;
    }) => {
      mutation(args);
    },
    mutateAsync: async (args: {
      id: Id<"payments">;
      status: string;
      externalId?: string;
      capturedAmount?: number;
      refundedAmount?: number;
    }) => {
      await mutation(args);
      return { success: true };
    },
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

// =============================================================================
// Single Invoice Hooks (Wired to Convex)
// =============================================================================

/**
 * Get a single invoice by ID.
 * Connected to Convex: api.domain.billing.getInvoice
 */
export function useInvoice(invoiceId: Id<"invoices"> | undefined) {
  const data = useConvexQuery(
    api.domain.billing.getInvoice,
    invoiceId ? { id: invoiceId } : "skip"
  );

  const isLoading = invoiceId !== undefined && data === undefined;

  const invoice: OrgInvoice | null = data
    ? transformOrgInvoice(data as unknown as ConvexOrgInvoice)
    : null;

  return {
    data: { data: invoice },
    invoice,
    isLoading,
    error: null,
  };
}

/**
 * Get a single organization invoice by ID.
 * Connected to Convex: api.domain.billing.getInvoice
 */
export function useOrgInvoice(invoiceId: Id<"invoices"> | undefined) {
  return useInvoice(invoiceId);
}

/**
 * Get organization billing summary.
 * Connected to Convex: api.domain.billing.getOrgBillingSummary
 */
export function useOrgBillingSummary(
  orgId: Id<"organizations"> | undefined,
  params?: { period?: string }
) {
  const data = useConvexQuery(
    api.domain.billing.getOrgBillingSummary,
    orgId ? { organizationId: orgId, period: params?.period } : "skip"
  );

  const isLoading = orgId !== undefined && data === undefined;

  const summary: OrgBillingSummary | null = data
    ? {
        totalBilled: data.totalBilled,
        pendingAmount: data.pendingAmount,
        overdueAmount: data.overdueAmount,
        paidAmount: data.paidAmount,
        invoiceCount: data.invoiceCount,
        currency: data.currency,
        period: data.period,
      }
    : null;

  return {
    data: { data: summary },
    summary,
    isLoading,
    error: null,
  };
}

// =============================================================================
// Invoice Download Hooks (Wired to Convex)
// =============================================================================

/**
 * Get invoice download URL.
 * Connected to Convex: api.domain.billing.getInvoiceDownloadUrl
 */
export function useInvoiceDownloadUrl(invoiceId: Id<"invoices"> | undefined) {
  const data = useConvexQuery(
    api.domain.billing.getInvoiceDownloadUrl,
    invoiceId ? { id: invoiceId } : "skip"
  );

  const isLoading = invoiceId !== undefined && data === undefined;

  return {
    data: { data: data ?? null },
    url: data?.url ?? null,
    invoiceNumber: data?.invoiceNumber ?? null,
    isLoading,
    error: null,
  };
}

/**
 * Download an invoice as PDF.
 * Opens the invoice PDF URL in a new tab.
 */
export function useDownloadInvoice() {
  return {
    mutate: (url: string) => {
      if (url) {
        window.open(url, "_blank");
      }
    },
    mutateAsync: async (url: string) => {
      if (url) {
        window.open(url, "_blank");
      }
      return { success: !!url };
    },
    isLoading: false,
    error: null,
  };
}

/**
 * Download an organization invoice as PDF.
 */
export function useDownloadOrgInvoice() {
  return useDownloadInvoice();
}

// =============================================================================
// Invoice Mutation Hooks (Wired to Convex)
// =============================================================================

/**
 * Create a new invoice.
 * Connected to Convex: api.domain.billing.createInvoice
 */
export function useCreateInvoice() {
  const mutation = useConvexMutation(api.domain.billing.createInvoice);

  return {
    mutate: (args: {
      tenantId: Id<"tenants">;
      userId?: Id<"users">;
      organizationId?: Id<"organizations">;
      lineItems: InvoiceLineItem[];
      customerName: string;
      customerEmail?: string;
      customerAddress?: string;
      customerOrgNumber?: string;
      dueDate: number;
      notes?: string;
      bookingIds?: Id<"bookings">[];
      createdBy?: Id<"users">;
    }) => {
      mutation(args as any);
    },
    mutateAsync: async (args: {
      tenantId: Id<"tenants">;
      userId?: Id<"users">;
      organizationId?: Id<"organizations">;
      lineItems: InvoiceLineItem[];
      customerName: string;
      customerEmail?: string;
      customerAddress?: string;
      customerOrgNumber?: string;
      dueDate: number;
      notes?: string;
      bookingIds?: Id<"bookings">[];
      createdBy?: Id<"users">;
    }) => {
      const result = await mutation(args as any);
      return result;
    },
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

/**
 * Update invoice status.
 * Connected to Convex: api.domain.billing.updateInvoiceStatus
 */
export function useUpdateInvoiceStatus() {
  const mutation = useConvexMutation(api.domain.billing.updateInvoiceStatus);

  return {
    mutate: (args: {
      id: Id<"invoices">;
      status: string;
      paidDate?: number;
      paymentId?: Id<"payments">;
      paymentMethod?: string;
    }) => {
      mutation(args);
    },
    mutateAsync: async (args: {
      id: Id<"invoices">;
      status: string;
      paidDate?: number;
      paymentId?: Id<"payments">;
      paymentMethod?: string;
    }) => {
      await mutation(args);
      return { success: true };
    },
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

/**
 * Send an invoice (change status from draft to sent).
 * Connected to Convex: api.domain.billing.sendInvoice
 */
export function useSendInvoice() {
  const mutation = useConvexMutation(api.domain.billing.sendInvoice);

  return {
    mutate: (args: { id: Id<"invoices"> }) => {
      mutation(args);
    },
    mutateAsync: async (args: { id: Id<"invoices"> }) => {
      await mutation(args);
      return { success: true };
    },
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

/**
 * Mark invoice as paid.
 * Connected to Convex: api.domain.billing.markInvoicePaid
 */
export function useMarkInvoicePaid() {
  const mutation = useConvexMutation(api.domain.billing.markInvoicePaid);

  return {
    mutate: (args: {
      id: Id<"invoices">;
      paymentId?: Id<"payments">;
      paymentMethod?: string;
    }) => {
      mutation(args);
    },
    mutateAsync: async (args: {
      id: Id<"invoices">;
      paymentId?: Id<"payments">;
      paymentMethod?: string;
    }) => {
      await mutation(args);
      return { success: true };
    },
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

/**
 * Credit/cancel an invoice.
 * Connected to Convex: api.domain.billing.creditInvoice
 */
export function useCreditInvoice() {
  const mutation = useConvexMutation(api.domain.billing.creditInvoice);

  return {
    mutate: (args: { id: Id<"invoices">; reason?: string }) => {
      mutation(args);
    },
    mutateAsync: async (args: { id: Id<"invoices">; reason?: string }) => {
      await mutation(args);
      return { success: true };
    },
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

// =============================================================================
// Types for backwards compatibility
// =============================================================================

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate?: number;
  taxAmount?: number;
}

export interface InvoiceQueryParams {
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  cursor?: string;
}
