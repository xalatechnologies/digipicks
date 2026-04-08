/**
 * DigilistSaaS SDK - Audit Hooks
 *
 * Fetch and query audit log entries using Convex backend.
 * Uses proper Convex React hooks for real-time updates.
 *
 * Convex backend exposes:
 *   api.domain.audit.listForBooking  — audit trail per booking
 *   api.domain.audit.listByAction    — filter by action type
 *   api.domain.audit.get             — single entry
 *   api.domain.audit.getSummary      — aggregate stats for a period
 */

import { useQuery as useConvexQuery } from "convex/react";
import { api, type TenantId } from "../convex-api";
import type { Id } from "../convex-api";
import { toPaginatedResponse, toSingleResponse } from "../transforms/common";
import {
    transformAuditEntry,
    transformEntityAuditEntry,
    transformAuditStats,
    transformTenantActivity,
    transformTenantActivityStats,
    type ConvexAuditEntry,
    type ConvexEntityAuditEntry,
} from "../transforms/audit";

// ============================================================================
// Types
// ============================================================================

export interface AuditLogEntry {
    id: string;
    tenantId: string;
    bookingId: string;
    userId?: string;
    action: string;
    previousState?: unknown;
    newState?: unknown;
    reason?: string;
    metadata?: Record<string, unknown>;
    timestamp: number;
    user?: { id: string; name?: string; email?: string } | null;
    booking?: unknown;
    createdAt: string;
}

export interface AuditQueryParams {
    tenantId?: TenantId;
    action?: string;
    startDate?: number;
    endDate?: number;
    limit?: number;
}

export interface AuditStats {
    total: number;
    byAction: Record<string, number>;
    byUser: Record<string, number>;
    period: { startDate: number; endDate: number };
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch audit log entries filtered by action type.
 *
 * Wraps `api.domain.audit.listByAction`. Requires a `tenantId` and `action`
 * to be present in params; otherwise the query is skipped.
 */
export function useAuditLog(params: AuditQueryParams = {}): {
    data: { data: AuditLogEntry[]; meta: { total: number; page: number; limit: number; totalPages: number } };
    isLoading: boolean;
    error: Error | null;
} {
    const { tenantId, action, startDate, endDate, limit } = params;

    const canQuery = !!tenantId && !!action;

    const raw = useConvexQuery(
        api.domain.audit.listByAction,
        canQuery
            ? { tenantId: tenantId!, action: action!, startDate, endDate, limit }
            : "skip"
    );

    const isLoading = canQuery && raw === undefined;

    const items: AuditLogEntry[] = (raw ?? []).map((e: any) => transformAuditEntry(e));

    return { data: toPaginatedResponse(items), isLoading, error: null };
}

/**
 * Fetch a single audit event by ID.
 *
 * Wraps `api.domain.audit.get`.
 */
export function useAuditEvent(id: Id<"bookingAudit"> | undefined): {
    data: { data: AuditLogEntry } | null;
    isLoading: boolean;
    error: Error | null;
} {
    const raw = useConvexQuery(
        api.domain.audit.get,
        id ? { id } : "skip"
    );

    const isLoading = id !== undefined && raw === undefined;

    const item: AuditLogEntry | null = raw
        ? transformAuditEntry(raw as unknown as ConvexAuditEntry)
        : null;

    const data = item ? toSingleResponse(item) : null;

    return { data, isLoading, error: null };
}

/**
 * Fetch audit statistics / summary for a tenant over a time period.
 *
 * Wraps `api.domain.audit.getSummary`. Returns aggregated counts by
 * action and by user.
 */
export function useAuditStats(
    params: { tenantId?: TenantId; startDate?: number; endDate?: number } = {}
): {
    data: { data: AuditStats } | null;
    isLoading: boolean;
    error: Error | null;
} {
    const { tenantId, startDate, endDate } = params;

    const canQuery = !!tenantId && startDate !== undefined && endDate !== undefined;

    const raw = useConvexQuery(
        api.domain.audit.getSummary,
        canQuery
            ? { tenantId: tenantId!, startDate: startDate!, endDate: endDate! }
            : "skip"
    );

    const isLoading = canQuery && raw === undefined;

    const item: AuditStats | null = raw
        ? transformAuditStats(raw as unknown as Record<string, unknown>)
        : null;

    const data = item ? toSingleResponse(item) : null;

    return { data, isLoading, error: null };
}

/**
 * Fetch audit log entries for a specific booking (resource-level audit).
 *
 * Wraps `api.domain.audit.listForBooking`.
 */
export function useResourceAudit(
    resourceId: Id<"bookings"> | undefined,
    params: { limit?: number } = {}
): {
    data: { data: AuditLogEntry[]; meta: { total: number; page: number; limit: number; totalPages: number } };
    isLoading: boolean;
    error: Error | null;
} {
    const raw = useConvexQuery(
        api.domain.audit.listForBooking,
        resourceId ? { bookingId: resourceId, limit: params.limit } : "skip"
    );

    const isLoading = resourceId !== undefined && raw === undefined;

    const items: AuditLogEntry[] = (raw ?? []).map((e: any) => transformAuditEntry(e));

    return { data: toPaginatedResponse(items), isLoading, error: null };
}

/**
 * Fetch audit log entries for a specific entity (e.g. listing/resource).
 *
 * Wraps `api.domain.audit.listByEntity`.
 */
export interface AuditLogEntryForEntity {
    id: string;
    tenantId: string;
    resourceId: string;
    userId?: string;
    action: string;
    severity: string;
    timestamp: number;
    metadata?: {
        before?: unknown;
        after?: unknown;
        [key: string]: unknown;
    };
    ipAddress?: string;
    userAgent?: string;
}

export function useListByEntity(
    entityType: string,
    entityId: string | undefined,
    params: { limit?: number; page?: number } = {}
): {
    data: { data: AuditLogEntryForEntity[]; meta: { total: number; page: number; limit: number; totalPages: number } };
    isLoading: boolean;
    error: Error | null;
} {
    const { limit = 25 } = params;

    const raw = useConvexQuery(
        api.domain.audit.listByEntity,
        entityType && entityId ? { entityType, entityId, limit } : "skip"
    );

    const isLoading = !!entityId && raw === undefined;

    const items: AuditLogEntryForEntity[] = (raw ?? []).map((e: Record<string, unknown>) => transformEntityAuditEntry(e as unknown as ConvexEntityAuditEntry));

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
        data: {
            data: items,
            meta: { total, page: 1, limit, totalPages },
        },
        isLoading,
        error: null,
    };
}

/**
 * Fetch audit log entries for a specific user.
 *
 * Wraps `api.domain.audit.listByUser`.
 */
export function useUserAudit(
    userId: Id<"users"> | string | undefined,
    params: AuditQueryParams = {}
): {
    data: { data: AuditLogEntry[]; meta: { total: number; page: number; limit: number; totalPages: number } };
    isLoading: boolean;
    error: Error | null;
} {
    const raw = useConvexQuery(
        api.domain.audit.listByUser,
        userId ? { userId: userId as Id<"users">, limit: params.limit } : "skip"
    );

    const isLoading = !!userId && raw === undefined;

    const items: AuditLogEntry[] = (raw ?? []).map((e: any) => transformAuditEntry(e));

    return { data: toPaginatedResponse(items), isLoading, error: null };
}

// ============================================================================
// Tenant Activity Hook (for org activity page)
// ============================================================================

export interface TenantActivityEntry {
    id: string;
    tenantId: string;
    entityType: string;
    entityId: string;
    action: string;
    userId?: string;
    userName?: string;
    userEmail?: string;
    timestamp: number;
    metadata?: Record<string, unknown>;
    user?: { id: string; name?: string; email?: string } | null;
    resource?: string;
    resourceId?: string;
    ipAddress?: string;
    severity?: string;
    userAgent?: string;
}

/**
 * Fetch recent activity for a tenant (all entity types).
 *
 * Wraps `api.domain.audit.listForTenant` with user enrichment.
 * Used by the org activity page to show a feed of recent events.
 */
export function useTenantActivity(
    tenantId: TenantId | undefined,
    params: { entityType?: string; limit?: number } = {}
): {
    activities: TenantActivityEntry[];
    isLoading: boolean;
    error: Error | null;
} {
    const raw = useConvexQuery(
        api.domain.audit.listForTenant,
        tenantId ? { tenantId, entityType: params.entityType, limit: params.limit ?? 50 } : "skip"
    );

    const isLoading = !!tenantId && raw === undefined;

    const activities: TenantActivityEntry[] = (raw ?? []).map((e: any) => transformTenantActivity(e));

    return { activities, isLoading, error: null };
}

/**
 * Fetch audit summary stats for a tenant over a time period.
 *
 * Wraps `api.domain.audit.getSummary`. Used for stat cards on the activity page.
 */
export function useTenantActivityStats(
    tenantId: TenantId | undefined,
    params: { startDate: number; endDate: number }
): {
    stats: { total: number; byAction: Record<string, number>; byEntityType: Record<string, number>; byUser: Record<string, number> } | null;
    isLoading: boolean;
    error: Error | null;
} {
    const raw = useConvexQuery(
        api.domain.audit.getSummary,
        tenantId ? { tenantId, startDate: params.startDate, endDate: params.endDate } : "skip"
    );

    const isLoading = !!tenantId && raw === undefined;

    const stats = raw ? transformTenantActivityStats(raw as unknown as Record<string, unknown>) : null;

    return { stats, isLoading, error: null };
}

/**
 * Export audit entries as CSV or JSON.
 *
 * Returns a download trigger function. Uses `useTenantActivity`
 * data as the source — call `triggerDownload(format)` to start the download.
 */
export function useAuditExport(
    tenantId: TenantId | undefined,
    params: { entityType?: string; limit?: number } = {}
): {
    triggerDownload: (format: 'csv' | 'json') => void;
    isReady: boolean;
} {
    const { activities, isLoading } = useTenantActivity(tenantId, params);

    const triggerDownload = (format: 'csv' | 'json') => {
        if (!activities.length) return;

        let content: string;
        let mimeType: string;
        let filename: string;

        if (format === 'csv') {
            const headers = ['id', 'timestamp', 'entityType', 'entityId', 'action', 'userName', 'userEmail'];
            const rows = activities.map(a => [
                a.id,
                new Date(a.timestamp).toISOString(),
                a.entityType,
                a.entityId,
                a.action,
                a.userName ?? '',
                a.userEmail ?? '',
            ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
            content = [headers.join(','), ...rows].join('\n');
            mimeType = 'text/csv;charset=utf-8;';
            filename = `audit-export-${new Date().toISOString().slice(0, 10)}.csv`;
        } else {
            content = JSON.stringify(activities, null, 2);
            mimeType = 'application/json';
            filename = `audit-export-${new Date().toISOString().slice(0, 10)}.json`;
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    };

    return {
        triggerDownload,
        isReady: !isLoading && activities.length > 0,
    };
}

/**
 * Fetch revision history for a specific entity.
 *
 * Returns all audit entries for a given entityType+entityId,
 * ordered newest-first. Each entry contains `previousState`,
 * `newState`, `changedFields`, and user details.
 */
export function useEntityRevisionHistory(
    entityType: string | undefined,
    entityId: string | undefined,
    params: { limit?: number } = {}
): {
    revisions: Array<{
        id: string;
        action: string;
        timestamp: number;
        userId?: string;
        userName?: string;
        userEmail?: string;
        previousState?: unknown;
        newState?: unknown;
        changedFields?: string[];
        reason?: string;
    }>;
    isLoading: boolean;
    error: Error | null;
} {
    const canQuery = !!entityType && !!entityId;

    const raw = useConvexQuery(
        api.domain.audit.listByEntity,
        canQuery
            ? { entityType: entityType!, entityId: entityId!, limit: params.limit ?? 50 }
            : "skip"
    );

    const isLoading = canQuery && raw === undefined;

    const revisions = (raw ?? []).map((e: any) => ({
        id: e._id as string,
        action: e.action as string,
        timestamp: e.timestamp as number,
        userId: e.userId as string | undefined,
        userName: e.userName as string | undefined,
        userEmail: e.userEmail as string | undefined,
        previousState: e.previousState as unknown,
        newState: e.newState as unknown,
        changedFields: e.changedFields as string[] | undefined,
        reason: e.reason as string | undefined,
    }));

    return { revisions, isLoading, error: null };
}
