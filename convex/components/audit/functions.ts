/**
 * Audit Component Functions
 *
 * General-purpose audit logging for all entities.
 * Uses the component's own _generated/server (isolated from app tables).
 * All IDs are strings (not typed v.id() references).
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create an audit log entry.
 * Called by facade functions after primary operations.
 */
export const create = mutation({
    args: {
        tenantId: v.string(),
        userId: v.optional(v.string()),
        userEmail: v.optional(v.string()),
        userName: v.optional(v.string()),
        entityType: v.string(),
        entityId: v.string(),
        action: v.string(),
        previousState: v.optional(v.any()),
        newState: v.optional(v.any()),
        changedFields: v.optional(v.array(v.string())),
        details: v.optional(v.any()),
        reason: v.optional(v.string()),
        sourceComponent: v.optional(v.string()),
        ipAddress: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("auditLog", {
            tenantId: args.tenantId,
            userId: args.userId,
            userEmail: args.userEmail,
            userName: args.userName,
            entityType: args.entityType,
            entityId: args.entityId,
            action: args.action,
            previousState: args.previousState,
            newState: args.newState,
            changedFields: args.changedFields,
            details: args.details,
            reason: args.reason,
            sourceComponent: args.sourceComponent,
            ipAddress: args.ipAddress,
            timestamp: Date.now(),
            metadata: args.metadata,
        });

        return { id: id as string };
    },
});

// =============================================================================
// QUERIES
// =============================================================================

/**
 * List audit entries for a tenant, optionally filtered by entity type.
 */
export const listForTenant = query({
    args: {
        tenantId: v.string(),
        entityType: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, entityType, limit = 50 }) => {
        let entries;

        if (entityType) {
            entries = await ctx.db
                .query("auditLog")
                .withIndex("by_tenant_entity", (q) =>
                    q.eq("tenantId", tenantId).eq("entityType", entityType)
                )
                .order("desc")
                .take(limit);
        } else {
            entries = await ctx.db
                .query("auditLog")
                .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
                .order("desc")
                .take(limit);
        }

        return entries;
    },
});

/**
 * List audit entries for a tenant with cursor-based pagination.
 * Returns a page of entries plus a cursor for fetching the next page.
 */
export const listForTenantPaginated = query({
    args: {
        tenantId: v.string(),
        entityType: v.optional(v.string()),
        pageSize: v.optional(v.number()),
        cursor: v.optional(v.string()),
    },
    returns: v.object({
        entries: v.array(v.any()),
        cursor: v.union(v.string(), v.null()),
        hasMore: v.boolean(),
    }),
    handler: async (ctx, { tenantId, entityType, pageSize = 25, cursor }) => {
        const fetchLimit = pageSize + 1;

        let baseQuery;
        if (entityType) {
            baseQuery = ctx.db
                .query("auditLog")
                .withIndex("by_tenant_entity", (idx) =>
                    idx.eq("tenantId", tenantId).eq("entityType", entityType)
                )
                .order("desc");
        } else {
            baseQuery = ctx.db
                .query("auditLog")
                .withIndex("by_tenant", (idx) => idx.eq("tenantId", tenantId))
                .order("desc");
        }

        // Fetch a window of entries
        let entries = await baseQuery.take(cursor ? fetchLimit + 500 : fetchLimit);

        // If cursor provided, skip entries until we pass the cursor ID
        if (cursor) {
            const cursorIndex = entries.findIndex((e) => (e._id as string) === cursor);
            if (cursorIndex >= 0) {
                entries = entries.slice(cursorIndex + 1, cursorIndex + 1 + fetchLimit);
            } else {
                entries = entries.slice(0, fetchLimit);
            }
        }

        const hasMore = entries.length > pageSize;
        const page = hasMore ? entries.slice(0, pageSize) : entries;
        const nextCursor = hasMore && page.length > 0 ? (page[page.length - 1]!._id as string) : null;

        return {
            entries: page,
            cursor: nextCursor,
            hasMore,
        };
    },
});

/**
 * List audit entries for a specific entity.
 */
export const listByEntity = query({
    args: {
        entityType: v.string(),
        entityId: v.string(),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { entityType, entityId, limit = 50 }) => {
        const entries = await ctx.db
            .query("auditLog")
            .withIndex("by_entity", (q) =>
                q.eq("entityType", entityType).eq("entityId", entityId)
            )
            .order("desc")
            .take(limit);

        return entries;
    },
});

/**
 * List audit entries by a specific user.
 */
export const listByUser = query({
    args: {
        userId: v.string(),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { userId, limit = 50 }) => {
        const entries = await ctx.db
            .query("auditLog")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .order("desc")
            .take(limit);

        return entries;
    },
});

/**
 * List audit entries by action type within a tenant.
 */
export const listByAction = query({
    args: {
        tenantId: v.string(),
        action: v.string(),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, action, limit = 50 }) => {
        const entries = await ctx.db
            .query("auditLog")
            .withIndex("by_action", (q) => q.eq("action", action))
            .order("desc")
            .take(limit);

        // Filter by tenant in memory (action index doesn't include tenantId)
        return entries.filter((e) => e.tenantId === tenantId);
    },
});

/**
 * Get a single audit entry by ID.
 */
export const get = query({
    args: {
        id: v.id("auditLog"),
    },
    returns: v.any(),
    handler: async (ctx, { id }) => {
        const entry = await ctx.db.get(id);
        if (!entry) {
            throw new Error("Audit entry not found");
        }
        return entry;
    },
});

/**
 * Get audit summary statistics for a tenant.
 */
export const getSummary = query({
    args: {
        tenantId: v.string(),
        periodStart: v.optional(v.number()),
        periodEnd: v.optional(v.number()),
    },
    returns: v.any(),
    handler: async (ctx, { tenantId, periodStart, periodEnd }) => {
        let entries = await ctx.db
            .query("auditLog")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .collect();

        // Filter by time period if specified
        if (periodStart) {
            entries = entries.filter((e) => e.timestamp >= periodStart);
        }
        if (periodEnd) {
            entries = entries.filter((e) => e.timestamp <= periodEnd);
        }

        // Aggregate by action
        const byAction: Record<string, number> = {};
        for (const entry of entries) {
            byAction[entry.action] = (byAction[entry.action] || 0) + 1;
        }

        // Aggregate by entity type
        const byEntityType: Record<string, number> = {};
        for (const entry of entries) {
            byEntityType[entry.entityType] = (byEntityType[entry.entityType] || 0) + 1;
        }

        // Aggregate by user
        const byUser: Record<string, number> = {};
        for (const entry of entries) {
            if (entry.userId) {
                byUser[entry.userId] = (byUser[entry.userId] || 0) + 1;
            }
        }

        return {
            total: entries.length,
            byAction,
            byEntityType,
            byUser,
            periodStart: periodStart ?? entries[entries.length - 1]?.timestamp,
            periodEnd: periodEnd ?? entries[0]?.timestamp,
        };
    },
});

/**
 * Import a record from the legacy bookingAudit table.
 * Used during data migration (Phase 1b).
 */
export const importRecord = mutation({
    args: {
        tenantId: v.string(),
        userId: v.optional(v.string()),
        entityType: v.string(),
        entityId: v.string(),
        action: v.string(),
        previousState: v.optional(v.any()),
        newState: v.optional(v.any()),
        reason: v.optional(v.string()),
        sourceComponent: v.optional(v.string()),
        timestamp: v.number(),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("auditLog", {
            tenantId: args.tenantId,
            userId: args.userId,
            entityType: args.entityType,
            entityId: args.entityId,
            action: args.action,
            previousState: args.previousState,
            newState: args.newState,
            reason: args.reason,
            sourceComponent: args.sourceComponent ?? "bookings",
            timestamp: args.timestamp,
            metadata: args.metadata,
        });

        return { id: id as string };
    },
});

// =============================================================================
// RETENTION CLEANUP
// =============================================================================

/**
 * Delete audit log entries older than the given threshold for a tenant.
 * Called by the retention cron job (convex/domain/retention.ts).
 */
export const cleanupOld = mutation({
    args: {
        tenantId: v.string(),
        olderThanMs: v.number(),
    },
    returns: v.object({ purged: v.number() }),
    handler: async (ctx, { tenantId, olderThanMs }) => {
        const cutoff = Date.now() - olderThanMs;
        const old = await ctx.db
            .query("auditLog")
            .withIndex("by_timestamp", (q) =>
                q.eq("tenantId", tenantId).lt("timestamp", cutoff)
            )
            .collect();

        for (const entry of old) {
            await ctx.db.delete(entry._id);
        }

        return { purged: old.length };
    },
});
