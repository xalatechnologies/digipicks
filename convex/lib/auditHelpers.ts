/**
 * Audit Helpers
 *
 * Centralised helpers for writing audit log entries from domain mutations.
 * Wraps `components.audit.functions.create` with:
 *   - Automatic `changedFields` diff calculation
 *   - User identity resolution (name/email from userId)
 *   - Consistent timestamp injection
 *
 * Usage in a domain mutation:
 *   import { withAudit } from "../lib/auditHelpers";
 *
 *   await withAudit(ctx, {
 *     tenantId,
 *     userId: updatedBy as string,
 *     entityType: "booking",
 *     entityId: id,
 *     action: "updated",
 *     previousState: { status: "pending" },
 *     newState: { status: "confirmed" },
 *     sourceComponent: "bookings",
 *   });
 */

import type { MutationCtx } from "../_generated/server";
import { components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

// =============================================================================
// Types
// =============================================================================

export interface AuditEntry {
    /** Tenant scope (required) */
    tenantId: string;
    /** Who performed the action */
    userId?: string;
    userName?: string;
    userEmail?: string;
    /** What was affected */
    entityType: string;
    entityId: string;
    /** What happened */
    action: string;
    /** State change tracking (optional) */
    previousState?: Record<string, unknown>;
    newState?: Record<string, unknown>;
    changedFields?: string[];
    /** Context */
    details?: Record<string, unknown>;
    reason?: string;
    sourceComponent?: string;
    ipAddress?: string;
    metadata?: Record<string, unknown>;
}

// =============================================================================
// Core Helper
// =============================================================================

/**
 * Write an audit log entry, automatically computing `changedFields` from
 * the diff between `previousState` and `newState` when both are provided.
 *
 * If `userId` is set but `userName`/`userEmail` are missing, they are
 * resolved from the `users` table automatically.
 */
export async function withAudit(
    ctx: MutationCtx,
    entry: AuditEntry,
): Promise<{ id: string }> {
    // Auto-compute changed fields when both states are provided
    const changedFields =
        entry.changedFields ??
        (entry.previousState && entry.newState
            ? computeChangedFields(entry.previousState, entry.newState)
            : undefined);

    // Auto-resolve user identity if userId is present but name/email are missing
    let { userName, userEmail } = entry;
    if (entry.userId && !userName && !userEmail) {
        const user = await ctx.db
            .get(entry.userId as Id<"users">)
            .catch(() => null);
        if (user) {
            userName = user.name ?? undefined;
            userEmail = user.email ?? undefined;
        }
    }

    // Guard: skip audit logging if the audit component is not available.
    // In test environments (convex-test), component function references are
    // not wired, so calling them triggers "Write outside of transaction" errors
    // that leak as unhandled rejections. We detect this by checking whether the
    // component reference exists and is properly initialized.
    if (
        !components?.audit?.functions?.create ||
        typeof ctx.runMutation !== "function"
    ) {
        return { id: "" };
    }

    try {
        return await ctx.runMutation(components.audit.functions.create, {
            tenantId: entry.tenantId,
            userId: entry.userId,
            userName,
            userEmail,
            entityType: entry.entityType,
            entityId: entry.entityId,
            action: entry.action,
            previousState: entry.previousState,
            newState: entry.newState,
            changedFields,
            details: entry.details,
            reason: entry.reason,
            sourceComponent: entry.sourceComponent,
            ipAddress: entry.ipAddress,
            metadata: entry.metadata,
        });
    } catch {
        // Best-effort: never break the primary mutation
        return { id: "" };
    }
}

// =============================================================================
// Diff Utility
// =============================================================================

/**
 * Compute which top-level fields changed between two state objects.
 * Uses shallow JSON comparison for nested values.
 *
 * @example
 *   computeChangedFields(
 *     { status: "pending", name: "A" },
 *     { status: "confirmed", name: "A" }
 *   )
 *   // => ["status"]
 */
export function computeChangedFields(
    prev: Record<string, unknown>,
    next: Record<string, unknown>,
): string[] {
    const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);
    const changed: string[] = [];

    for (const key of allKeys) {
        const prevVal = prev[key];
        const nextVal = next[key];

        // Both undefined → not changed
        if (prevVal === undefined && nextVal === undefined) continue;

        // One undefined, other not → field added or removed
        if (prevVal === undefined || nextVal === undefined) {
            changed.push(key);
            continue;
        }

        // Shallow comparison for primitives, JSON serialization for objects/arrays
        if (typeof prevVal !== typeof nextVal) {
            changed.push(key);
        } else if (typeof prevVal === "object") {
            if (JSON.stringify(prevVal) !== JSON.stringify(nextVal)) {
                changed.push(key);
            }
        } else if (prevVal !== nextVal) {
            changed.push(key);
        }
    }

    return changed;
}

// =============================================================================
// Convenience: Build State Diff from Updates
// =============================================================================

/**
 * Build `previousState` and `newState` objects by comparing an existing entity
 * against a set of incoming updates. Only includes fields that actually changed.
 *
 * @example
 *   const existing = { name: "A", status: "active", price: 100 };
 *   const updates = { name: "B", price: 100 }; // price unchanged
 *   buildStateDiff(existing, updates);
 *   // => { previousState: { name: "A" }, newState: { name: "B" }, changedFields: ["name"] }
 */
export function buildStateDiff(
    existing: Record<string, unknown>,
    updates: Record<string, unknown>,
): {
    previousState: Record<string, unknown>;
    newState: Record<string, unknown>;
    changedFields: string[];
} {
    const previousState: Record<string, unknown> = {};
    const newState: Record<string, unknown> = {};
    const changedFields: string[] = [];

    for (const key of Object.keys(updates)) {
        if (updates[key] === undefined) continue;

        const oldVal = existing[key];
        const newVal = updates[key];

        const isChanged =
            typeof oldVal !== typeof newVal ||
            (typeof oldVal === "object"
                ? JSON.stringify(oldVal) !== JSON.stringify(newVal)
                : oldVal !== newVal);

        if (isChanged) {
            previousState[key] = oldVal;
            newState[key] = newVal;
            changedFields.push(key);
        }
    }

    return { previousState, newState, changedFields };
}
