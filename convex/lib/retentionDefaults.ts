/**
 * Retention Policy — Default Configuration & Merge Logic
 *
 * Pure utility module: no Convex imports, no side effects.
 * Used by the retention cron job to determine cleanup thresholds per tenant.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface RetentionConfig {
    /** Days to keep soft-deleted records before hard purge */
    softDeletedDays: number;
    /** Days to keep archived records */
    archivedDays: number;
    /** Days to keep audit log entries */
    auditLogDays: number;
    /** Days to keep read notifications */
    notificationDays: number;
    /** Days to keep resolved/archived messaging conversations */
    messagingDays: number;
    /** Whether retention cleanup is enabled for this tenant */
    enabled: boolean;
}

// =============================================================================
// DEFAULTS
// =============================================================================

export const DEFAULT_RETENTION: RetentionConfig = {
    softDeletedDays: 90,
    archivedDays: 365,
    auditLogDays: 730,
    notificationDays: 90,
    messagingDays: 365,
    enabled: true,
};

// =============================================================================
// MERGE
// =============================================================================

/**
 * Merge tenant-specific retention settings with defaults.
 * Invalid values (non-positive numbers, wrong types) fall back to the default.
 */
export function mergeRetentionConfig(tenantRetention: unknown): RetentionConfig {
    if (!tenantRetention || typeof tenantRetention !== "object") {
        return { ...DEFAULT_RETENTION };
    }

    const overrides = tenantRetention as Record<string, unknown>;

    function validDays(key: keyof RetentionConfig, defaultVal: number): number {
        const val = overrides[key];
        if (typeof val === "number" && val > 0 && Number.isFinite(val)) {
            return val;
        }
        return defaultVal;
    }

    return {
        softDeletedDays: validDays("softDeletedDays", DEFAULT_RETENTION.softDeletedDays),
        archivedDays: validDays("archivedDays", DEFAULT_RETENTION.archivedDays),
        auditLogDays: validDays("auditLogDays", DEFAULT_RETENTION.auditLogDays),
        notificationDays: validDays("notificationDays", DEFAULT_RETENTION.notificationDays),
        messagingDays: validDays("messagingDays", DEFAULT_RETENTION.messagingDays),
        enabled: typeof overrides.enabled === "boolean" ? overrides.enabled : DEFAULT_RETENTION.enabled,
    };
}

// =============================================================================
// HELPERS
// =============================================================================

/** Convert days to milliseconds. */
export function daysToMs(days: number): number {
    return days * 24 * 60 * 60 * 1000;
}

/** Returns true if `timestampMs` is older than `thresholdMs` relative to `nowMs`. */
export function isOlderThan(timestampMs: number, thresholdMs: number, nowMs: number = Date.now()): boolean {
    return (nowMs - timestampMs) > thresholdMs;
}
