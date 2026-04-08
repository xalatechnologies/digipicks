/**
 * DigilistSaaS SDK - Audit Transforms
 *
 * Maps between the Convex audit shapes and the SDK audit shapes.
 */

import type {
    AuditLogEntry,
    AuditLogEntryForEntity,
    AuditStats,
    TenantActivityEntry,
} from '../hooks/use-audit';

/** Raw Convex audit log entry shape. */
export interface ConvexAuditEntry {
    _id: string;
    _creationTime: number;
    tenantId: string;
    bookingId?: string;
    entityId?: string;
    userId?: string;
    action: string;
    previousState?: unknown;
    newState?: unknown;
    reason?: string;
    metadata?: Record<string, unknown>;
    timestamp: number;
    user?: { id: string; name?: string; email?: string } | null;
    booking?: unknown;
}

/** Raw Convex entity audit entry shape. */
export interface ConvexEntityAuditEntry {
    _id?: string;
    id?: string;
    _creationTime?: number;
    tenantId: string;
    entityId?: string;
    resourceId?: string;
    userId?: string;
    action?: string;
    severity?: string;
    timestamp?: number;
    previousState?: unknown;
    newState?: unknown;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
}

/** Raw Convex tenant activity entry shape. */
export interface ConvexTenantActivityEntry {
    _id: string;
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
}

/**
 * Transform a raw Convex audit entry into the SDK `AuditLogEntry` shape.
 */
export function transformAuditEntry(e: ConvexAuditEntry): AuditLogEntry {
    return {
        id: e._id as string,
        tenantId: e.tenantId as string,
        bookingId: (e.bookingId ?? e.entityId) as string,
        userId: e.userId as string | undefined,
        action: e.action,
        previousState: e.previousState,
        newState: e.newState,
        reason: e.reason,
        metadata: e.metadata,
        timestamp: e.timestamp,
        user: e.user ?? null,
        booking: e.booking ?? null,
        createdAt: new Date(e.timestamp ?? e._creationTime).toISOString(),
    };
}

/**
 * Transform a raw Convex entity audit entry into the SDK `AuditLogEntryForEntity` shape.
 */
export function transformEntityAuditEntry(e: ConvexEntityAuditEntry): AuditLogEntryForEntity {
    return {
        id: (e._id ?? e.id) as string,
        tenantId: e.tenantId as string,
        resourceId: (e.entityId ?? e.resourceId) as string,
        userId: e.userId as string | undefined,
        action: (e.action ?? "unknown") as string,
        severity: (e.severity ?? "info") as string,
        timestamp: (e.timestamp ?? 0) as number,
        metadata: {
            before: e.previousState,
            after: e.newState,
            ...(e.metadata as Record<string, unknown>),
        },
        ipAddress: e.ipAddress as string | undefined,
        userAgent: e.userAgent as string | undefined,
    };
}

/**
 * Transform a raw Convex audit summary into the SDK `AuditStats` shape.
 */
export function transformAuditStats(raw: Record<string, unknown>): AuditStats {
    return {
        total: raw.total as number,
        byAction: raw.byAction as Record<string, number>,
        byUser: raw.byUser as Record<string, number>,
        period: raw.period as { startDate: number; endDate: number },
    };
}

/**
 * Transform a raw Convex tenant activity entry into the SDK `TenantActivityEntry` shape.
 */
export function transformTenantActivity(e: ConvexTenantActivityEntry): TenantActivityEntry {
    return {
        id: e._id as string,
        tenantId: e.tenantId as string,
        entityType: e.entityType as string,
        entityId: e.entityId as string,
        action: e.action as string,
        userId: e.userId as string | undefined,
        userName: e.userName ?? e.user?.name,
        userEmail: e.userEmail ?? e.user?.email,
        timestamp: e.timestamp as number,
        metadata: e.metadata,
        user: e.user ?? null,
    };
}

/**
 * Transform a raw Convex tenant activity stats object.
 */
export function transformTenantActivityStats(raw: Record<string, unknown>): {
    total: number;
    byAction: Record<string, number>;
    byEntityType: Record<string, number>;
    byUser: Record<string, number>;
} {
    return {
        total: raw.total as number,
        byAction: (raw.byAction ?? {}) as Record<string, number>,
        byEntityType: (raw.byEntityType ?? {}) as Record<string, number>,
        byUser: (raw.byUser ?? {}) as Record<string, number>,
    };
}
