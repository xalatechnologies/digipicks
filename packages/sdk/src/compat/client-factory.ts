/**
 * Compatibility shim for @digilist/client-sdk client-factory.
 * Convex uses a provider model, so most of these are no-ops.
 *
 * auditService is wired to Convex via the singleton client.
 * organizationService remains a stub — pending org management functions.
 */

import { getConvexClient } from '../convex-provider';
import { api } from '../convex-api';

export interface ApiClientConfig {
  baseUrl?: string;
  tenantId?: string;
  token?: string;
}

// ---------------------------------------------------------------------------
// Audit service — wired to Convex via domain/audit:logClientEvent
// ---------------------------------------------------------------------------

/**
 * Imperative audit service. Calls Convex mutation when the provider is mounted,
 * silently no-ops before that (e.g. during SSR or early error boundaries).
 */
export const auditService = {
  log: async (event: string, data?: Record<string, unknown>) => {
    const client = getConvexClient();
    if (!client) return;
    try {
      await client.mutation(api.domain.audit.logClientEvent, {
        action: event,
        entityType: data?.resource as string | undefined,
        entityId: data?.resourceId as string | undefined,
        userId: data?.userId as string | undefined,
        metadata: data,
      });
    } catch { /* silent — audit must not break the app */ }
  },
  track: async (event: string, data?: Record<string, unknown>) => {
    const client = getConvexClient();
    if (!client) return;
    try {
      await client.mutation(api.domain.audit.logClientEvent, {
        action: event,
        metadata: data,
      });
    } catch { /* silent */ }
  },
  create: async (event: string, data?: Record<string, unknown>) => {
    const client = getConvexClient();
    if (!client) return;
    try {
      await client.mutation(api.domain.audit.logClientEvent, {
        action: event,
        entityType: data?.resource as string | undefined,
        entityId: data?.resourceId as string | undefined,
        userId: data?.userId as string | undefined,
        severity: data?.severity as string | undefined,
        metadata: data,
      });
    } catch { /* silent */ }
  },
  logError: async (event: string, category?: string, error?: unknown, data?: Record<string, unknown>) => {
    const client = getConvexClient();
    if (!client) return;
    try {
      await client.mutation(api.domain.audit.logClientEvent, {
        action: event,
        entityType: category ?? 'error',
        entityId: 'client',
        severity: 'error',
        metadata: {
          ...data,
          errorMessage: error instanceof Error ? error.message : String(error ?? ''),
          errorStack: error instanceof Error ? error.stack : undefined,
        },
      });
    } catch { /* silent */ }
  },
  logWarning: async (event: string, category?: string, data?: Record<string, unknown>) => {
    const client = getConvexClient();
    if (!client) return;
    try {
      await client.mutation(api.domain.audit.logClientEvent, {
        action: event,
        entityType: category ?? 'warning',
        entityId: 'client',
        severity: 'warning',
        metadata: data,
      });
    } catch { /* silent */ }
  },
};

// ---------------------------------------------------------------------------
// Organization service — stub (pending Convex org management functions)
// ---------------------------------------------------------------------------

export const organizationService = {
  addMember: async (_orgId: string, _data: { userId: string; role: string }) => {
    console.warn('[organizationService.addMember] stub — wire to Convex mutation');
  },
  removeMember: async (_orgId: string, _memberId: string) => {
    console.warn('[organizationService.removeMember] stub — wire to Convex mutation');
  },
  updateMember: async (_orgId: string, _memberId: string, _data: { role: string }) => {
    console.warn('[organizationService.updateMember] stub — wire to Convex mutation');
  },
};
