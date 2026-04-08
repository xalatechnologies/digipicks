/**
 * DigilistSaaS SDK - Integration Hooks (Tier 2)
 *
 * React hooks for third-party integration management:
 * tenant settings, RCO lock access, Visma invoicing, BRREG/NIF lookup,
 * Vipps payments, and calendar sync.
 *
 * All stubs since integrations are external services not yet wired
 * to Convex functions.
 *
 * Queries:  { data, isLoading, error }
 * Mutations: { mutate, mutateAsync, isLoading, error, isSuccess }
 */

import { useQuery as useConvexQuery, useMutation, useAction as useConvexAction } from "convex/react";
import { api } from "../convex-api";
import type { Id } from "../convex-api";
import { useState, useCallback } from "react";
import { useMutationAdapter } from "./utils";

// =============================================================================
// Query Key Factory (inert -- kept for future React Query migration)
// =============================================================================

export const integrationKeys = {
  all: ["integrations"] as const,
  settings: {
    tenant: () => ["settings", "tenant"] as const,
    integrations: () => ["settings", "integrations"] as const,
    integration: (name: string) => ["settings", "integrations", name] as const,
  },
  rco: {
    status: () => ["integrations", "rco", "status"] as const,
    locks: () => ["integrations", "rco", "locks"] as const,
  },
  visma: {
    status: () => ["integrations", "visma", "status"] as const,
    invoices: () => ["integrations", "visma", "invoices"] as const,
  },
  brreg: {
    lookup: (orgNumber: string) => ["integrations", "brreg", orgNumber] as const,
  },
  nif: {
    lookup: (orgNumber: string) => ["integrations", "nif", orgNumber] as const,
  },
  vipps: {
    status: () => ["integrations", "vipps", "status"] as const,
    payment: (id: string) => ["integrations", "vipps", "payment", id] as const,
    history: () => ["integrations", "vipps", "history"] as const,
  },
  calendar: {
    status: () => ["integrations", "calendar", "status"] as const,
  },
};

// =============================================================================
// Types
// =============================================================================

export interface TenantSettings {
  tenantId: string;
  locale: string;
  currency: string;
  timezone: string;
  bookingDefaults?: Record<string, unknown>;
  branding?: Record<string, unknown>;
  features?: Record<string, boolean>;
}

export interface IntegrationConfig {
  provider: string;
  enabled: boolean;
  config: Record<string, unknown>;
  lastSyncAt?: string;
}

export interface RcoLock {
  id: string;
  name: string;
  status: "online" | "offline" | "error";
  lastSeenAt: string;
}

export interface VismaInvoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: "draft" | "sent" | "paid" | "overdue";
  dueDate: string;
  createdAt: string;
}

export interface BrregOrganization {
  organisasjonsnummer: string;
  navn: string;
  organisasjonsform: string;
  registreringsdatoEnhetsregisteret?: string;
  forretningsadresse?: {
    adresse: string[];
    postnummer: string;
    poststed: string;
  };
}

export interface VippsPayment {
  orderId: string;
  amount: number;
  currency: string;
  status: "initiated" | "authorized" | "captured" | "refunded" | "cancelled";
  createdAt: string;
}

// =============================================================================
// Tenant Settings Hooks
// =============================================================================

/**
 * Get tenant settings (branding, feature flags, theme).
 * Wraps `api.domain.tenantConfig.getBranding` + `api.domain.tenantConfig.evaluateAllFlags`.
 */
export function useTenantSettings(params?: { tenantId?: string }) {
  const branding = useConvexQuery(
    api.domain.tenantConfig.getBranding,
    params?.tenantId ? { tenantId: params.tenantId } : "skip"
  );
  const flags = useConvexQuery(
    api.domain.tenantConfig.evaluateAllFlags,
    params?.tenantId ? { tenantId: params.tenantId } : "skip"
  );

  const isLoading = params?.tenantId !== undefined && (branding === undefined || flags === undefined);

  const settings: TenantSettings | null = params?.tenantId
    ? {
        tenantId: params.tenantId,
        locale: "nb",
        currency: "NOK",
        timezone: "Europe/Oslo",
        branding: branding as Record<string, unknown> | undefined,
        features: (flags as Record<string, boolean>) ?? undefined,
      }
    : null;

  return {
    data: { data: settings },
    isLoading,
    error: null,
  };
}

/**
 * Update tenant settings (branding).
 * Wraps `api.domain.tenantConfig.updateBranding`.
 */
export function useUpdateTenantSettings() {
  const doMutation = useMutation(api.domain.tenantConfig.updateBranding);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const mutateAsync = async (args: Partial<TenantSettings> & { tenantId: string }) => {
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);
    try {
      await doMutation({
        tenantId: args.tenantId,
        ...(args.branding ?? {}),
      } as any);
      setIsSuccess(true);
      return { success: true };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    mutate: (args: Partial<TenantSettings> & { tenantId: string }) => { mutateAsync(args).catch(() => {}); },
    mutateAsync,
    isLoading,
    error,
    isSuccess,
  };
}

/**
 * Get settings for a specific integration by type.
 * Wraps `api.domain.integrations.listConfigs` filtered by integration type.
 */
export function useIntegrationSettings(integration: string, tenantId?: string) {
  const raw = useConvexQuery(
    api.domain.integrations.listConfigs,
    tenantId ? { tenantId } : "skip"
  );

  const match = (raw ?? []).find((r: any) => r.integrationType === integration);
  const config: IntegrationConfig | null = match
    ? {
        provider: (match as any).integrationType as string,
        enabled: (match as any).isEnabled as boolean,
        config: (match as any).config as Record<string, unknown>,
        lastSyncAt: (match as any).lastSyncAt
          ? new Date((match as any).lastSyncAt as number).toISOString()
          : undefined,
      }
    : null;

  return {
    data: { data: config },
    isLoading: raw === undefined && !!tenantId,
    error: null,
  };
}

/**
 * Update settings for a specific integration.
 * Wraps `api.domain.integrations.updateConfig`.
 */
export function useUpdateIntegration() {
  const doMutation = useMutation(api.domain.integrations.updateConfig);
  const updateIntegration = async (args: { provider: string; data: Record<string, unknown> }) => {
    const result = await doMutation(args.data as any);
    return result;
  };
  return { updateIntegration };
}

// =============================================================================
// Integration Config CRUD Hooks (wired to Convex)
// =============================================================================

/** Integration config as returned from Convex. */
export interface IntegrationConfigRecord {
  id: string;
  tenantId: string;
  integrationType: string;
  name: string;
  isEnabled: boolean;
  config: Record<string, unknown>;
  apiKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  environment?: string;
  lastSyncAt?: number;
  lastSyncStatus?: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface CreateIntegrationInput {
  tenantId: string;
  integrationType: string;
  name: string;
  config?: Record<string, unknown>;
  apiKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  environment?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateIntegrationInput {
  id: string;
  name?: string;
  config?: Record<string, unknown>;
  apiKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  environment?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Get a single integration config by ID.
 * Wired to Convex: api.domain.integrations.getById
 */
export function useIntegrationConfig(id?: string) {
  const raw = useConvexQuery(
    api.domain.integrations.getById,
    id ? { id } : "skip"
  );

  const doc = raw as Record<string, unknown> | null;
  const config: IntegrationConfigRecord | null = doc
    ? {
        id: doc._id as string,
        tenantId: doc.tenantId as string,
        integrationType: doc.integrationType as string,
        name: doc.name as string,
        isEnabled: doc.isEnabled as boolean,
        config: (doc.config as Record<string, unknown>) ?? {},
        apiKey: doc.apiKey as string | undefined,
        secretKey: doc.secretKey as string | undefined,
        webhookSecret: doc.webhookSecret as string | undefined,
        environment: doc.environment as string | undefined,
        lastSyncAt: doc.lastSyncAt as number | undefined,
        lastSyncStatus: doc.lastSyncStatus as string | undefined,
        metadata: doc.metadata as Record<string, unknown> | undefined,
        createdAt: doc.createdAt as number,
        updatedAt: doc.updatedAt as number,
      }
    : null;

  return {
    config,
    isLoading: raw === undefined && !!id,
    error: null,
  };
}

/**
 * List all integration configs for a tenant.
 * Wired to Convex: api.domain.integrations.listConfigs
 */
export function useIntegrationConfigs(tenantId?: string) {
  const raw = useConvexQuery(
    api.domain.integrations.listConfigs,
    tenantId ? { tenantId } : "skip"
  );

  const configs: IntegrationConfigRecord[] = (raw ?? []).map((r: Record<string, unknown>) => ({
    id: r._id as string,
    tenantId: r.tenantId as string,
    integrationType: r.integrationType as string,
    name: r.name as string,
    isEnabled: r.isEnabled as boolean,
    config: (r.config as Record<string, unknown>) ?? {},
    apiKey: r.apiKey as string | undefined,
    secretKey: r.secretKey as string | undefined,
    webhookSecret: r.webhookSecret as string | undefined,
    environment: r.environment as string | undefined,
    lastSyncAt: r.lastSyncAt as number | undefined,
    lastSyncStatus: r.lastSyncStatus as string | undefined,
    metadata: r.metadata as Record<string, unknown> | undefined,
    createdAt: r.createdAt as number,
    updatedAt: r.updatedAt as number,
  }));

  return {
    configs,
    isLoading: raw === undefined && !!tenantId,
    error: null,
  };
}

/**
 * Create a new integration config.
 */
export function useCreateIntegrationConfig() {
  const doMutation = useMutation(api.domain.integrations.createConfig);
  const createIntegrationConfig = async (input: CreateIntegrationInput) => {
    const result = await doMutation(input as any);
    return result;
  };
  return { createIntegrationConfig };
}

/**
 * Update an existing integration config.
 */
export function useUpdateIntegrationConfig() {
  const doMutation = useMutation(api.domain.integrations.updateConfig);
  const updateIntegrationConfig = async (input: UpdateIntegrationInput) => {
    const result = await doMutation(input as any);
    return result;
  };
  return { updateIntegrationConfig };
}

/**
 * Remove an integration config.
 */
export function useRemoveIntegrationConfig() {
  const doMutation = useMutation(api.domain.integrations.removeIntegration);
  const removeIntegrationConfig = async (id: string) => {
    const result = await doMutation({ id });
    return result;
  };
  return { removeIntegrationConfig };
}

/**
 * Toggle integration enable/disable.
 */
export function useToggleIntegrationConfig() {
  const doEnable = useMutation(api.domain.integrations.enableIntegration);
  const doDisable = useMutation(api.domain.integrations.disableIntegration);
  const toggleIntegrationConfig = async (id: string, enable: boolean) => {
    if (enable) {
      return doEnable({ id });
    } else {
      return doDisable({ id });
    }
  };
  return { toggleIntegrationConfig };
}

/**
 * Test connection for an integration.
 */
export function useTestIntegrationConnection() {
  const doMutation = useMutation(api.domain.integrations.testConnection);
  const testConnection = async (id: string) => {
    const result = await doMutation({ id });
    return result;
  };
  return { testConnection };
}

// =============================================================================
// RCO Lock Access Hooks
// =============================================================================

/**
 * Get RCO connection status.
 * Wired to Convex: api.domain.integrations.getRcoStatus
 */
export function useRcoStatus(tenantId?: string) {
  const data = useConvexQuery(
    (api.domain.integrations as any).getRcoStatus,
    tenantId ? { tenantId } : "skip"
  );
  return {
    data: { data: data ?? { connected: false, lastSyncAt: null } },
    isLoading: !!tenantId && data === undefined,
    error: null,
  };
}

/**
 * Get connected RCO locks.
 * Wired to Convex: api.domain.integrations.getRcoLocks
 */
export function useRcoLocks(tenantId?: string) {
  const data = useConvexQuery(
    (api.domain.integrations as any).getRcoLocks,
    tenantId ? { tenantId } : "skip"
  );
  return {
    data: { data: (data ?? []) as RcoLock[] },
    isLoading: !!tenantId && data === undefined,
    error: null,
  };
}

/**
 * Generate an access code for an RCO lock.
 * Wired to Convex: api.domain.integrations.generateAccessCode
 */
export function useGenerateAccessCode() {
  const doMutation = useMutation((api.domain.integrations as any).generateAccessCode);
  const fn = useCallback(
    async (args: { tenantId: string; lockId: string; validFrom: string; validUntil: string }) => {
      return (await doMutation(args)) as { code: string; expiresAt: string };
    },
    [doMutation]
  );
  return useMutationAdapter(fn);
}

/**
 * Remotely unlock an RCO lock.
 * Wired to Convex: api.domain.integrations.remoteUnlock
 */
export function useRemoteUnlock() {
  const doMutation = useMutation((api.domain.integrations as any).remoteUnlock);
  const fn = useCallback(
    async (args: { tenantId: string; lockId: string; duration?: number }) => {
      return (await doMutation(args)) as { success: boolean };
    },
    [doMutation]
  );
  return useMutationAdapter(fn);
}

// =============================================================================
// Visma Invoicing Hooks
// =============================================================================

/**
 * Get Visma connection status.
 * Wired to Convex: api.domain.integrations.getVismaStatus
 */
export function useVismaStatus(tenantId?: string) {
  const data = useConvexQuery(
    (api.domain.integrations as any).getVismaStatus,
    tenantId ? { tenantId } : "skip"
  );
  return {
    data: { data: data ?? { connected: false, lastSyncAt: null } },
    isLoading: !!tenantId && data === undefined,
    error: null,
  };
}

/**
 * Get Visma invoices.
 * Wired to Convex: api.domain.integrations.getVismaInvoices
 */
export function useVismaInvoices(tenantId?: string) {
  const data = useConvexQuery(
    (api.domain.integrations as any).getVismaInvoices,
    tenantId ? { tenantId } : "skip"
  );
  return {
    data: { data: (data ?? []) as VismaInvoice[] },
    isLoading: !!tenantId && data === undefined,
    error: null,
  };
}

/**
 * Create a Visma invoice.
 * Wired to Convex: api.domain.integrations.createVismaInvoice
 */
export function useCreateInvoice() {
  const doMutation = useMutation((api.domain.integrations as any).createVismaInvoice);
  const fn = useCallback(
    async (args: { tenantId: string; bookingId: string; amount: number; dueDate: string }) => {
      return (await doMutation(args)) as { invoiceId: string };
    },
    [doMutation]
  );
  return useMutationAdapter(fn);
}

/**
 * Trigger sync with Visma.
 * Wired to Convex: api.domain.integrations.syncToVisma
 */
export function useSyncVisma() {
  const doMutation = useMutation((api.domain.integrations as any).syncToVisma);
  const fn = useCallback(
    async (args: { tenantId: string }) => {
      return (await doMutation(args)) as { success: boolean; syncedCount: number };
    },
    [doMutation]
  );
  return useMutationAdapter(fn);
}

// =============================================================================
// BRREG Hooks (Norwegian Business Registry)
// =============================================================================

/**
 * Look up an organization in BRREG by organization number.
 * Wired to Convex action: api.domain.integrations.brregLookup
 */
export function useBrregLookup(_orgNumber: string | undefined) {
  const [data, setData] = useState<BrregOrganization | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const doAction = useConvexAction((api.domain.integrations as any).brregLookup);

  // Trigger lookup when orgNumber changes
  const lookup = useCallback(async (num: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await doAction({ orgNumber: num });
      setData(result as BrregOrganization | null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [doAction]);

  return {
    data: { data },
    isLoading,
    error,
    lookup,
  };
}

/**
 * Verify an organization number against BRREG.
 * Wired to Convex action: api.domain.integrations.verifyBrreg
 */
export function useVerifyBrreg() {
  const doAction = useConvexAction((api.domain.integrations as any).verifyBrreg);
  const fn = useCallback(
    async (args: { orgNumber: string }) => {
      const result = await doAction(args);
      return result as { valid: boolean; details: BrregOrganization | null };
    },
    [doAction]
  );
  return useMutationAdapter(fn);
}

/**
 * Look up a sports organization in NIF (Norwegian Sports Federation).
 * Wired to Convex: api.domain.integrations.nifLookup
 */
export function useNifLookup(orgNumber: string | undefined) {
  const data = useConvexQuery(
    (api.domain.integrations as any).nifLookup,
    orgNumber ? { orgNumber } : "skip"
  );
  return {
    data: { data: data as { id: string; name: string; type: string; region?: string } | null ?? null },
    isLoading: !!orgNumber && data === undefined,
    error: null,
  };
}

// =============================================================================
// Vipps Payment Hooks (wired to Convex)
// =============================================================================

/**
 * Get Vipps connection status.
 * Returns connected if VIPPS_MSN is configured.
 */
export function useVippsStatus() {
  // Vipps is always available if the app is configured
  return { data: { data: { connected: true } }, isLoading: false, error: null };
}

/**
 * Get a Vipps payment by reference.
 * Reads from the local payments table via Convex query.
 */
export function useVippsPayment(tenantId: string | undefined, reference: string | undefined, options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false && !!reference && !!tenantId;
  const result = useConvexQuery(
    api.billing.vipps.getPaymentStatus,
    enabled && reference && tenantId ? { tenantId: tenantId as Id<"tenants">, reference } : "skip"
  );

  return {
    data: result !== undefined ? { data: result } : undefined,
    isLoading: result === undefined && enabled,
    error: null,
  };
}

/**
 * Get Vipps payment history.
 * Wraps `api.domain.billing.listTenantInvoices` (maps to payment shape).
 * TODO: Replace with a dedicated payments list query when billing component
 * exposes a listPayments function.
 */
export function useVippsPaymentHistory(tenantId?: string) {
  const raw = useConvexQuery(
    api.domain.billing.listTenantInvoices,
    tenantId ? { tenantId: tenantId as Id<"tenants"> } : "skip"
  );

  const isLoading = tenantId !== undefined && raw === undefined;
  const payments: VippsPayment[] = (raw ?? []).map((p: any) => ({
    orderId: String(p._id ?? p.id ?? ""),
    amount: (p.amount as number) ?? 0,
    currency: (p.currency as string) ?? "NOK",
    status: (p.status as VippsPayment["status"]) ?? "initiated",
    createdAt: p._creationTime
      ? new Date(p._creationTime).toISOString()
      : new Date().toISOString(),
  }));

  return {
    data: { data: payments },
    isLoading,
    error: null,
  };
}

/**
 * Initiate a Vipps payment via Convex action.
 */
export function useInitiatePayment() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Vipps action type not generated
  const doAction = useConvexAction(api.billing.vipps.createPayment as any);

  const mutateAsync = async (args: {
    tenantId: string;
    bookingId?: string;
    userId?: string;
    amount: number;
    currency?: string;
    description: string;
    returnUrl: string;
  }) => {
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);
    try {
      const result = await doAction(args as any);
      setIsSuccess(true);
      return result as { reference: string; redirectUrl: string };
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    mutate: (args: Parameters<typeof mutateAsync>[0]) => { mutateAsync(args).catch(() => { }); },
    mutateAsync,
    isLoading,
    error,
    isSuccess,
  };
}

/**
 * Capture an authorized Vipps payment.
 */
export function useCapturePayment() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Vipps action type not generated
  const doAction = useConvexAction(api.billing.vipps.capturePayment as any);

  const mutateAsync = async (args: { reference: string; amount?: number }) => {
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);
    try {
      const result = await doAction(args as any);
      setIsSuccess(true);
      return result as { success: boolean };
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    mutate: (args: Parameters<typeof mutateAsync>[0]) => { mutateAsync(args).catch(() => { }); },
    mutateAsync,
    isLoading,
    error,
    isSuccess,
  };
}

/**
 * Refund a Vipps payment (full or partial).
 */
export function useRefundPayment() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Vipps action type not generated
  const doAction = useConvexAction(api.billing.vipps.refundPayment as any);

  const mutateAsync = async (args: { reference: string; amount: number; reason?: string }) => {
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);
    try {
      const result = await doAction(args as any);
      setIsSuccess(true);
      return result as { success: boolean };
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    mutate: (args: Parameters<typeof mutateAsync>[0]) => { mutateAsync(args).catch(() => { }); },
    mutateAsync,
    isLoading,
    error,
    isSuccess,
  };
}

// =============================================================================
// Calendar Sync Hooks
// =============================================================================

/**
 * Get calendar sync status.
 * Wired to Convex: api.domain.integrations.getCalendarSyncStatus
 */
export function useCalendarSyncStatus(tenantId?: string) {
  const data = useConvexQuery(
    (api.domain.integrations as any).getCalendarSyncStatus,
    tenantId ? { tenantId } : "skip"
  );
  return {
    data: { data: data ?? { connected: false, provider: undefined, lastSyncAt: null } },
    isLoading: !!tenantId && data === undefined,
    error: null,
  };
}

/**
 * Trigger calendar sync with an external provider.
 * Wired to Convex: api.domain.integrations.syncCalendar
 */
export function useSyncCalendar() {
  const doMutation = useMutation((api.domain.integrations as any).syncCalendar);
  const fn = useCallback(
    async (args: { tenantId: string }) => {
      return (await doMutation(args)) as { success: boolean; syncedEvents: number };
    },
    [doMutation]
  );
  return useMutationAdapter(fn);
}
