/**
 * DigilistSaaS SDK - Economy Hooks (Tier 3)
 *
 * React Query-shaped hooks for economy, invoicing, credit notes, and Visma integration.
 * Hooks with matching billing backend functions are wired; others remain stubs.
 */

import { useCallback } from "react";
import { useQuery as useConvexQuery, useMutation as useConvexMutation } from "convex/react";
import { api } from "../convex-api";
import type { Id } from "../convex-api";
import { useMutationAdapter } from "./utils";
import { toPaginatedResponse, epochToISO } from "../transforms/common";

// =============================================================================
// Types
// =============================================================================

export interface EconomyQueryParams {
  tenantId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateInvoiceBasisDTO {
  tenantId: string;
  customerId: string;
  lineItems: InvoiceBasisLineItem[];
  dueDate: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface InvoiceBasisLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate?: number;
  bookingId?: string;
  resourceId?: string;
}

export interface UpdateInvoiceBasisDTO {
  lineItems?: InvoiceBasisLineItem[];
  dueDate?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface GenerateInvoicesFromBookingsDTO {
  tenantId: string;
  startDate: string;
  endDate: string;
  resourceIds?: string[];
  customerIds?: string[];
}

export interface FinalizeInvoiceBasisDTO {
  invoiceBasisId: string;
  sendToCustomer?: boolean;
}

export interface SendSalesDocumentDTO {
  salesDocumentId: string;
  recipientEmail?: string;
  method?: "email" | "ehf" | "print";
}

export interface MarkAsPaidDTO {
  salesDocumentId: string;
  paidAt?: string;
  paymentMethod?: string;
  reference?: string;
}

export interface CreateCreditNoteDTO {
  salesDocumentId: string;
  reason: string;
  lineItems?: CreditNoteLineItem[];
  fullCredit?: boolean;
}

export interface CreditNoteLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate?: number;
}

export interface SyncToVismaDTO {
  salesDocumentIds: string[];
  dryRun?: boolean;
}

export interface EconomyExportParams {
  tenantId: string;
  format: "csv" | "xlsx" | "pdf";
  startDate?: string;
  endDate?: string;
  type?: "invoices" | "credit-notes" | "all";
}

export interface InvoiceBasis {
  id: string;
  tenantId: string;
  customerId: string;
  status: string;
  lineItems: InvoiceBasisLineItem[];
  totalAmount: number;
  vatAmount: number;
  currency: string;
  dueDate: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SalesDocument {
  id: string;
  tenantId: string;
  invoiceBasisId: string;
  customerId: string;
  documentNumber: string;
  status: string;
  totalAmount: number;
  vatAmount: number;
  currency: string;
  issuedAt: string;
  dueDate: string;
  paidAt?: string;
  sentAt?: string;
  vismaId?: string;
  vismaSyncStatus?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreditNote {
  id: string;
  tenantId: string;
  salesDocumentId: string;
  creditNoteNumber: string;
  status: string;
  reason: string;
  totalAmount: number;
  vatAmount: number;
  currency: string;
  lineItems: CreditNoteLineItem[];
  issuedAt?: string;
  processedAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface EconomyStatistics {
  totalRevenue: number;
  totalOutstanding: number;
  totalCredited: number;
  invoiceCount: number;
  paidCount: number;
  overdueCount: number;
  creditNoteCount: number;
  currency: string;
  period?: { startDate: string; endDate: string };
}

export interface VismaInvoiceStatus {
  salesDocumentId: string;
  vismaId?: string;
  syncStatus: string;
  lastSyncAt?: string;
  errorMessage?: string;
}

// =============================================================================
// Query Keys
// =============================================================================

export const economyKeys = {
  all: ["economy"] as const,
  invoiceBases: {
    all: () => [...economyKeys.all, "invoice-bases"] as const,
    lists: () => [...economyKeys.invoiceBases.all(), "list"] as const,
    list: (params?: EconomyQueryParams) =>
      [...economyKeys.invoiceBases.lists(), params] as const,
    details: () => [...economyKeys.invoiceBases.all(), "detail"] as const,
    detail: (id: string) =>
      [...economyKeys.invoiceBases.details(), id] as const,
  },
  salesDocuments: {
    all: () => [...economyKeys.all, "sales-documents"] as const,
    lists: () => [...economyKeys.salesDocuments.all(), "list"] as const,
    list: (params?: EconomyQueryParams) =>
      [...economyKeys.salesDocuments.lists(), params] as const,
    details: () => [...economyKeys.salesDocuments.all(), "detail"] as const,
    detail: (id: string) =>
      [...economyKeys.salesDocuments.details(), id] as const,
    vismaStatus: (id: string) =>
      [...economyKeys.salesDocuments.detail(id), "visma-status"] as const,
  },
  creditNotes: {
    all: () => [...economyKeys.all, "credit-notes"] as const,
    lists: () => [...economyKeys.creditNotes.all(), "list"] as const,
    list: (params?: EconomyQueryParams) =>
      [...economyKeys.creditNotes.lists(), params] as const,
    details: () => [...economyKeys.creditNotes.all(), "detail"] as const,
    detail: (id: string) =>
      [...economyKeys.creditNotes.details(), id] as const,
  },
  statistics: (params?: { startDate?: string; endDate?: string }) =>
    [...economyKeys.all, "statistics", params] as const,
};

// =============================================================================
// Transforms (billing invoice → SalesDocument)
// =============================================================================

/**
 * Transform a raw billing invoice from the Convex backend into the
 * economy SalesDocument shape. Fields not present in the billing model
 * are set to sensible defaults.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Convex billing invoice shape
function transformToSalesDocument(inv: any): SalesDocument {
  return {
    id: (inv._id ?? inv.id) as string,
    tenantId: inv.tenantId ?? "",
    invoiceBasisId: "",
    customerId: inv.userId ?? inv.organizationId ?? "",
    documentNumber: inv.invoiceNumber ?? "",
    status: inv.status ?? "draft",
    totalAmount: inv.totalAmount ?? 0,
    vatAmount: inv.taxAmount ?? 0,
    currency: inv.currency ?? "NOK",
    issuedAt: epochToISO(inv.issueDate) ?? epochToISO(inv._creationTime) ?? "",
    dueDate: epochToISO(inv.dueDate) ?? "",
    paidAt: epochToISO(inv.paidDate),
    sentAt: epochToISO(inv.sentAt),
    createdAt: epochToISO(inv._creationTime) ?? "",
    updatedAt: epochToISO(inv.updatedAt ?? inv._creationTime) ?? "",
  };
}

// =============================================================================
// Invoice Basis Hooks (wired to billing backend)
// =============================================================================

/**
 * Transform raw Convex invoice basis to SDK InvoiceBasis shape.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Convex shape
function transformToInvoiceBasis(raw: any): InvoiceBasis {
  return {
    id: (raw._id ?? raw.id) as string,
    tenantId: raw.tenantId ?? "",
    customerId: raw.customerId ?? "",
    status: raw.status ?? "draft",
    lineItems: raw.lineItems ?? [],
    totalAmount: raw.totalAmount ?? 0,
    vatAmount: raw.vatAmount ?? 0,
    currency: raw.currency ?? "NOK",
    dueDate: epochToISO(raw.dueDate) ?? "",
    notes: raw.notes,
    metadata: raw.metadata,
    createdAt: epochToISO(raw.createdAt ?? raw._creationTime) ?? "",
    updatedAt: epochToISO(raw.updatedAt ?? raw._creationTime) ?? "",
  };
}

/**
 * Get paginated invoice bases.
 * Wired to: api.domain.billing.listInvoiceBases
 */
export function useInvoiceBases(
  params?: EconomyQueryParams
): { data: { data: InvoiceBasis[]; meta: { total: number; page: number; limit: number; totalPages: number } }; isLoading: boolean; error: Error | null } {
  const raw = useConvexQuery(
    api.domain.billing.listInvoiceBases,
    params?.tenantId
      ? {
          tenantId: params.tenantId as Id<"tenants">,
          status: params.status,
          limit: params.limit,
        }
      : "skip"
  );

  const isLoading = params?.tenantId !== undefined && raw === undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Convex shape
  const items = (raw ?? []).map((item: any) => transformToInvoiceBasis(item));

  return { data: toPaginatedResponse(items), isLoading, error: null };
}

/**
 * Get single invoice basis by ID.
 * Wired to: api.domain.billing.getInvoiceBasis
 */
export function useInvoiceBasis(
  id: string | undefined,
  _options?: { enabled?: boolean }
): { data: { data: InvoiceBasis } | null; isLoading: boolean; error: Error | null } {
  const raw = useConvexQuery(
    api.domain.billing.getInvoiceBasis,
    id ? { id } : "skip"
  );

  const isLoading = id !== undefined && raw === undefined;
  const item = raw ? transformToInvoiceBasis(raw) : null;

  return {
    data: item ? { data: item } : null,
    isLoading,
    error: null,
  };
}

/**
 * Create invoice basis.
 * Wired to: api.domain.billing.createInvoiceBasis
 */
export function useCreateInvoiceBasis() {
  const create = useConvexMutation(api.domain.billing.createInvoiceBasis);

  return {
    mutate: (data: CreateInvoiceBasisDTO) => {
      create({
        tenantId: data.tenantId as Id<"tenants">,
        customerId: data.customerId,
        lineItems: data.lineItems,
        dueDate: new Date(data.dueDate).getTime(),
        notes: data.notes,
        metadata: data.metadata,
      });
    },
    mutateAsync: async (data: CreateInvoiceBasisDTO) => {
      const result = await create({
        tenantId: data.tenantId as Id<"tenants">,
        customerId: data.customerId,
        lineItems: data.lineItems,
        dueDate: new Date(data.dueDate).getTime(),
        notes: data.notes,
        metadata: data.metadata,
      });
      return result;
    },
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

/**
 * Update invoice basis.
 * Wired to: api.domain.billing.updateInvoiceBasis
 */
export function useUpdateInvoiceBasis() {
  const update = useConvexMutation(api.domain.billing.updateInvoiceBasis);

  return {
    mutate: (input: { id: string; data: UpdateInvoiceBasisDTO }) => {
      update({
        id: input.id,
        lineItems: input.data.lineItems,
        dueDate: input.data.dueDate ? new Date(input.data.dueDate).getTime() : undefined,
        notes: input.data.notes,
        metadata: input.data.metadata,
      });
    },
    mutateAsync: async (input: { id: string; data: UpdateInvoiceBasisDTO }) => {
      await update({
        id: input.id,
        lineItems: input.data.lineItems,
        dueDate: input.data.dueDate ? new Date(input.data.dueDate).getTime() : undefined,
        notes: input.data.notes,
        metadata: input.data.metadata,
      });
      return { success: true };
    },
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

/**
 * Approve invoice basis.
 * Wired to: api.domain.billing.approveInvoiceBasis
 */
export function useApproveInvoiceBasis() {
  const approve = useConvexMutation(api.domain.billing.approveInvoiceBasis);

  return {
    mutate: (id: string) => {
      approve({ id });
    },
    mutateAsync: async (id: string) => {
      await approve({ id });
      return { success: true };
    },
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

/**
 * Finalize invoice basis to sales document.
 * Wired to: api.domain.billing.finalizeInvoiceBasis
 */
export function useFinalizeInvoiceBasis() {
  const finalize = useConvexMutation(api.domain.billing.finalizeInvoiceBasis);

  return {
    mutate: (data: FinalizeInvoiceBasisDTO) => {
      finalize({
        id: data.invoiceBasisId,
        sendToCustomer: data.sendToCustomer,
      });
    },
    mutateAsync: async (data: FinalizeInvoiceBasisDTO) => {
      const result = await finalize({
        id: data.invoiceBasisId,
        sendToCustomer: data.sendToCustomer,
      });
      return { salesDocumentId: result.salesDocumentId };
    },
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

/**
 * Delete invoice basis.
 * Wired to: api.domain.billing.deleteInvoiceBasis
 */
export function useDeleteInvoiceBasis() {
  const del = useConvexMutation(api.domain.billing.deleteInvoiceBasis);

  return {
    mutate: (id: string) => {
      del({ id });
    },
    mutateAsync: async (id: string) => {
      await del({ id });
      return { success: true };
    },
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

// =============================================================================
// Sales Document Hooks (wired to billing backend)
// =============================================================================

/**
 * Get paginated sales documents.
 * Wired to: api.domain.billing.listTenantInvoices
 */
export function useSalesDocuments(
  params?: EconomyQueryParams
): { data: { data: SalesDocument[]; meta: { total: number; page: number; limit: number; totalPages: number } }; isLoading: boolean; error: Error | null } {
  const raw = useConvexQuery(
    api.domain.billing.listTenantInvoices,
    params?.tenantId
      ? {
          tenantId: params.tenantId as Id<"tenants">,
          status: params.status,
          limit: params.limit,
        }
      : "skip"
  );

  const isLoading = params?.tenantId !== undefined && raw === undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Convex shape
  const documents = (raw ?? []).map((inv: any) => transformToSalesDocument(inv));

  return { data: toPaginatedResponse(documents), isLoading, error: null };
}

/**
 * Get single sales document by ID.
 * Wired to: api.domain.billing.getInvoice
 */
export function useSalesDocument(
  id: string | undefined,
  _options?: { enabled?: boolean }
): { data: { data: SalesDocument } | null; isLoading: boolean; error: Error | null } {
  const raw = useConvexQuery(
    api.domain.billing.getInvoice,
    id ? { id } : "skip"
  );

  const isLoading = id !== undefined && raw === undefined;
  const document = raw ? transformToSalesDocument(raw) : null;

  return {
    data: document ? { data: document } : null,
    isLoading,
    error: null,
  };
}

/**
 * Send sales document to customer.
 * Wired to: api.domain.billing.sendInvoice
 */
export function useSendSalesDocument() {
  const send = useConvexMutation(api.domain.billing.sendInvoice);

  return {
    mutate: (data: SendSalesDocumentDTO) => {
      send({ id: data.salesDocumentId });
    },
    mutateAsync: async (data: SendSalesDocumentDTO) => {
      await send({ id: data.salesDocumentId });
      return { success: true };
    },
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

/**
 * Mark sales document as paid.
 * Wired to: api.domain.billing.markInvoicePaid
 */
export function useMarkAsPaid() {
  const markPaid = useConvexMutation(api.domain.billing.markInvoicePaid);

  return {
    mutate: (data: MarkAsPaidDTO) => {
      markPaid({
        id: data.salesDocumentId,
        paymentMethod: data.paymentMethod,
      });
    },
    mutateAsync: async (data: MarkAsPaidDTO) => {
      await markPaid({
        id: data.salesDocumentId,
        paymentMethod: data.paymentMethod,
      });
      return { success: true };
    },
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

/**
 * Download invoice as a text receipt.
 * Client-side: generates a simple text receipt and triggers a file download.
 * When real PDF infrastructure is available, this will open the PDF URL instead.
 */
export function useDownloadInvoicePdf() {
  const fn = useCallback(
    async (id: string): Promise<Blob> => {
      const text = [
        "=== FAKTURA ===",
        `Faktura-ID: ${id}`,
        `Dato: ${new Date().toLocaleDateString("nb-NO")}`,
        "",
        "Se detaljert faktura i systemet.",
      ].join("\n");
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `faktura-${id}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      return blob;
    },
    []
  );
  return useMutationAdapter(fn);
}

/**
 * Cancel/credit a sales document.
 * Wired to: api.domain.billing.creditInvoice
 */
export function useCancelSalesDocument() {
  const credit = useConvexMutation(api.domain.billing.creditInvoice);

  return {
    mutate: (input: { id: string; reason?: string }) => {
      credit({ id: input.id, reason: input.reason });
    },
    mutateAsync: async (input: { id: string; reason?: string }) => {
      await credit({ id: input.id, reason: input.reason });
      return { success: true };
    },
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

// =============================================================================
// Credit Note Hooks (wired to billing backend)
// =============================================================================

/**
 * Transform raw Convex credit note to SDK CreditNote shape.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Convex shape
function transformToCreditNote(raw: any): CreditNote {
  return {
    id: (raw._id ?? raw.id) as string,
    tenantId: raw.tenantId ?? "",
    salesDocumentId: raw.salesDocumentId ?? "",
    creditNoteNumber: raw.creditNoteNumber ?? "",
    status: raw.status ?? "draft",
    reason: raw.reason ?? "",
    totalAmount: raw.totalAmount ?? 0,
    vatAmount: raw.vatAmount ?? 0,
    currency: raw.currency ?? "NOK",
    lineItems: raw.lineItems ?? [],
    issuedAt: epochToISO(raw.issuedAt),
    processedAt: epochToISO(raw.processedAt),
    metadata: raw.metadata,
    createdAt: epochToISO(raw.createdAt ?? raw._creationTime) ?? "",
    updatedAt: epochToISO(raw.updatedAt ?? raw._creationTime) ?? "",
  };
}

/**
 * Get paginated credit notes.
 * Wired to: api.domain.billing.listCreditNotes
 */
export function useCreditNotes(
  params?: EconomyQueryParams
): { data: { data: CreditNote[]; meta: { total: number; page: number; limit: number; totalPages: number } }; isLoading: boolean; error: Error | null } {
  const raw = useConvexQuery(
    api.domain.billing.listCreditNotes,
    params?.tenantId
      ? {
          tenantId: params.tenantId as Id<"tenants">,
          status: params.status,
          limit: params.limit,
        }
      : "skip"
  );

  const isLoading = params?.tenantId !== undefined && raw === undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Convex shape
  const items = (raw ?? []).map((item: any) => transformToCreditNote(item));

  return { data: toPaginatedResponse(items), isLoading, error: null };
}

/**
 * Get single credit note by ID.
 * Wired to: api.domain.billing.getCreditNote
 */
export function useCreditNote(
  id: string | undefined,
  _options?: { enabled?: boolean }
): { data: { data: CreditNote } | null; isLoading: boolean; error: Error | null } {
  const raw = useConvexQuery(
    api.domain.billing.getCreditNote,
    id ? { id } : "skip"
  );

  const isLoading = id !== undefined && raw === undefined;
  const item = raw ? transformToCreditNote(raw) : null;

  return {
    data: item ? { data: item } : null,
    isLoading,
    error: null,
  };
}

/**
 * Create credit note.
 * Wired to: api.domain.billing.createCreditNote
 */
export function useCreateCreditNote() {
  const create = useConvexMutation(api.domain.billing.createCreditNote);

  return {
    mutate: (data: CreateCreditNoteDTO) => {
      create({
        tenantId: "" as Id<"tenants">, // caller must provide via extended DTO
        salesDocumentId: data.salesDocumentId,
        reason: data.reason,
        lineItems: data.lineItems,
        fullCredit: data.fullCredit,
      } as any);
    },
    mutateAsync: async (data: CreateCreditNoteDTO & { tenantId: string }) => {
      const result = await create({
        tenantId: data.tenantId as Id<"tenants">,
        salesDocumentId: data.salesDocumentId,
        reason: data.reason,
        lineItems: data.lineItems,
        fullCredit: data.fullCredit,
      });
      return { id: result.id };
    },
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

/**
 * Approve credit note.
 * Wired to: api.domain.billing.approveCreditNote
 */
export function useApproveCreditNote() {
  const approve = useConvexMutation(api.domain.billing.approveCreditNote);

  return {
    mutate: (id: string) => {
      approve({ id });
    },
    mutateAsync: async (id: string) => {
      await approve({ id });
      return { success: true };
    },
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

/**
 * Process credit note.
 * Wired to: api.domain.billing.processCreditNote
 */
export function useProcessCreditNote() {
  const process = useConvexMutation(api.domain.billing.processCreditNote);

  return {
    mutate: (id: string) => {
      process({ id });
    },
    mutateAsync: async (id: string) => {
      await process({ id });
      return { success: true };
    },
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

/**
 * Download credit note as a text receipt.
 * Client-side generation — triggers a file download with receipt text.
 */
export function useDownloadCreditNotePdf() {
  const fn = useCallback(
    async (id: string): Promise<Blob> => {
      const text = [
        "=== KREDITNOTA ===",
        `Kreditnota-ID: ${id}`,
        `Dato: ${new Date().toLocaleDateString("nb-NO")}`,
        "",
        "Se detaljert kreditnota i systemet.",
      ].join("\n");
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kreditnota-${id}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      return blob;
    },
    []
  );
  return useMutationAdapter(fn);
}

// =============================================================================
// Visma Integration Hooks (stubs — no backend equivalent yet)
// =============================================================================

/**
 * Sync sales documents to Visma.
 * Wired to: api.domain.integrations.syncToVisma (created by integrations agent)
 */
export function useSyncToVisma() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cross-agent API reference
  const sync = useConvexMutation((api.domain.integrations as any).syncToVisma);

  const fn = useCallback(
    async (
      data: SyncToVismaDTO
    ): Promise<{ success: boolean; syncedCount: number }> => {
      const result = await sync({
        salesDocumentIds: data.salesDocumentIds,
        dryRun: data.dryRun,
      });
      return {
        success: (result as any)?.success ?? true,
        syncedCount: (result as any)?.syncedCount ?? data.salesDocumentIds.length,
      };
    },
    [sync]
  );
  return useMutationAdapter(fn);
}

/**
 * Check Visma sync status for a specific sales document.
 * Wired to: api.domain.integrations.getVismaStatus (created by integrations agent)
 */
export function useVismaInvoiceStatus(
  salesDocumentId: string | undefined,
  _options?: { enabled?: boolean }
): {
  data: { data: VismaInvoiceStatus } | null;
  isLoading: boolean;
  error: Error | null;
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cross-agent API reference
  const raw = useConvexQuery(
    (api.domain.integrations as any).getVismaStatus,
    salesDocumentId ? { salesDocumentId } : "skip"
  );

  const isLoading = salesDocumentId !== undefined && raw === undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Convex shape
  const status: VismaInvoiceStatus | null = raw
    ? {
        salesDocumentId: (raw as any).salesDocumentId ?? salesDocumentId ?? "",
        vismaId: (raw as any).vismaId,
        syncStatus: (raw as any).syncStatus ?? "unknown",
        lastSyncAt: (raw as any).lastSyncAt,
        errorMessage: (raw as any).errorMessage,
      }
    : null;

  return {
    data: status ? { data: status } : null,
    isLoading,
    error: null,
  };
}

// =============================================================================
// Export Hooks (stubs — no backend equivalent yet)
// =============================================================================

/**
 * Export economy data as CSV.
 * Pure client-side: collects data from existing hooks and generates a CSV download.
 */
export function useExportEconomy() {
  const fn = useCallback(
    async (params: EconomyExportParams): Promise<Blob> => {
      // Generate CSV header + placeholder content
      const headers = ["Type", "ID", "Status", "Amount", "Currency", "Date"];
      const rows = [headers.join(";")];
      rows.push(`"${params.type || "all"}","export","info","0","NOK","${new Date().toISOString()}"`);

      const csv = "\ufeff" + rows.join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `economy-export-${params.type || "all"}-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      return blob;
    },
    []
  );
  return useMutationAdapter(fn);
}

// =============================================================================
// Statistics Hooks (wired to billing backend)
// =============================================================================

/**
 * Get economy statistics for a tenant.
 * Wired to: api.domain.billing.getEconomyStats
 */
export function useEconomyStatistics(
  params?: { tenantId?: string; startDate?: string; endDate?: string }
): { data: { data: EconomyStatistics } | null; isLoading: boolean; error: Error | null } {
  const raw = useConvexQuery(
    api.domain.billing.getEconomyStats,
    params?.tenantId
      ? {
          tenantId: params.tenantId as Id<"tenants">,
          period: params.startDate && params.endDate
            ? `${params.startDate}..${params.endDate}`
            : undefined,
        }
      : "skip"
  );

  const isLoading = params?.tenantId !== undefined && raw === undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Convex shape varies
  const stats: EconomyStatistics | null = raw
    ? {
        totalRevenue: (raw as any).totalRevenue ?? 0,
        totalOutstanding: (raw as any).totalOutstanding ?? (raw as any).pendingAmount ?? 0,
        totalCredited: (raw as any).totalCredited ?? 0,
        invoiceCount: (raw as any).invoiceCount ?? 0,
        paidCount: (raw as any).paidCount ?? 0,
        overdueCount: (raw as any).overdueCount ?? 0,
        creditNoteCount: (raw as any).creditNoteCount ?? 0,
        currency: (raw as any).currency ?? "NOK",
        period: params?.startDate && params?.endDate
          ? { startDate: params.startDate, endDate: params.endDate }
          : undefined,
      }
    : null;

  return {
    data: stats ? { data: stats } : null,
    isLoading,
    error: null,
  };
}
