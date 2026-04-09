/**
 * useAuditLog Hook
 *
 * Fetch audit log entries from the Convex audit component.
 * Wraps api.domain.audit.listForTenant with a stable interface.
 */

import { useQuery } from 'convex/react';
import { api, type Id } from '@digipicks/sdk';
import { useMemo } from 'react';

/** Shape returned by api.domain.audit.listForTenant (enriched row). */
interface RawAuditListRow {
  _id: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  timestamp?: number;
  metadata?: Record<string, unknown>;
}

interface AuditLogEntry {
  _id: string;
  id: string;
  action: string;
  entityType: string;
  resource_type: string;
  entityId: string;
  resource_id: string | null;
  userId: string;
  timestamp: number;
  created_at: string;
  metadata?: Record<string, unknown>;
}

interface UseAuditLogResult {
  entries: AuditLogEntry[];
  data: AuditLogEntry[];
  loading: boolean;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Fetch the latest audit log entries for a given tenant.
 *
 * The tenantId must be provided by the consumer (e.g. from auth context).
 */
export function useAuditLog(tenantId?: string, limit: number = 50): UseAuditLogResult {
  const tenants = useQuery(
    api.domain.audit.listForTenant,
    tenantId ? { tenantId: tenantId as Id<'tenants'>, limit } : 'skip',
  );

  const isLoading = tenants === undefined;

  const entries: AuditLogEntry[] = useMemo(() => {
    if (!tenants || !Array.isArray(tenants)) return [];
    return (tenants as RawAuditListRow[]).map((e) => ({
      _id: e._id as string,
      id: e._id as string,
      action: e.action ?? '',
      entityType: e.entityType ?? '',
      resource_type: e.entityType ?? '',
      entityId: e.entityId ?? '',
      resource_id: e.entityId ?? null,
      userId: e.userId ?? '',
      timestamp: e.timestamp ?? 0,
      created_at: e.timestamp ? new Date(e.timestamp).toISOString() : '',
      metadata: e.metadata,
    }));
  }, [tenants]);

  return {
    entries,
    data: entries,
    loading: isLoading,
    isLoading,
    error: null,
    refetch: async () => {},
  };
}
