import { mutation, query } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";

/**
 * Audit Facade
 * Delegates to components.audit.functions.*.
 * Preserves api.domain.audit.* paths for SDK hooks.
 *
 * CIRCULAR DEPENDENCY NOTE: This facade does NOT import from lib/auditHelpers.ts.
 * auditHelpers.ts imports from this module's component (components.audit.functions.create),
 * and all other domain facades import auditHelpers. If audit.ts imported auditHelpers,
 * it would create a circular dependency chain. Audit events from this facade are
 * written directly via ctx.runMutation(components.audit.functions.create, ...).
 */

// List audit entries for a booking (by entity)
export const listForBooking = query({
    args: {
        bookingId: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { bookingId, limit }) => {
        const entries = await ctx.runQuery(components.audit.functions.listByEntity, {
            entityType: "booking",
            entityId: bookingId as string,
            limit,
        });

        // Enrich with user details from core table
        const withUsers = await Promise.all(
            entries.map(async (e: any) => {
                const user = e.userId
                    ? await ctx.db
                        .query("users")
                        .filter((q) => q.eq(q.field("_id"), e.userId as any))
                        .first()
                        .catch(() => null)
                    : null;

                return {
                    ...e,
                    user: user
                        ? { id: user._id, name: user.name, email: user.email }
                        : null,
                };
            })
        );

        return withUsers;
    },
});

// List audit entries by action type
export const listByAction = query({
    args: {
        tenantId: v.id("tenants"),
        action: v.string(),
        startDate: v.optional(v.number()),
        endDate: v.optional(v.number()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, action, limit }) => {
        return ctx.runQuery(components.audit.functions.listByAction, {
            tenantId: tenantId as string,
            action,
            limit,
        });
    },
});

// Get audit entry by ID
export const get = query({
    args: {
        id: v.string(),
    },
    handler: async (ctx, { id }) => {
        const entry = await ctx.runQuery(components.audit.functions.get, {
            id: id as any,
        });

        // Enrich with user details
        const user = entry.userId
            ? await ctx.db
                .query("users")
                .filter((q) => q.eq(q.field("_id"), entry.userId as any))
                .first()
                .catch(() => null)
            : null;

        return {
            ...entry,
            user: user
                ? { id: user._id, name: user.name, email: user.email }
                : null,
        };
    },
});

// Create audit entry
export const create = mutation({
    args: {
        tenantId: v.id("tenants"),
        bookingId: v.optional(v.string()),
        userId: v.optional(v.id("users")),
        action: v.string(),
        previousState: v.optional(v.any()),
        newState: v.optional(v.any()),
        reason: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        return ctx.runMutation(components.audit.functions.create, {
            tenantId: args.tenantId as string,
            userId: args.userId ? (args.userId as string) : undefined,
            entityType: "booking",
            entityId: args.bookingId ? (args.bookingId as string) : "unknown",
            action: args.action,
            previousState: args.previousState,
            newState: args.newState,
            reason: args.reason,
            metadata: args.metadata,
        });
    },
});

/**
 * Log a client-side event (errors, listing views, shares, etc.).
 * Accepts plain strings — no typed IDs required.
 * Used by the SDK auditService (imperative, outside React hooks).
 */
export const logClientEvent = mutation({
    args: {
        tenantId: v.optional(v.string()),
        userId: v.optional(v.string()),
        action: v.string(),
        entityType: v.optional(v.string()),
        entityId: v.optional(v.string()),
        severity: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        return ctx.runMutation(components.audit.functions.create, {
            tenantId: args.tenantId ?? "client",
            userId: args.userId,
            entityType: args.entityType ?? "app",
            entityId: args.entityId ?? "client",
            action: args.action,
            sourceComponent: "client",
            metadata: {
                ...((args.metadata as Record<string, unknown>) ?? {}),
                severity: args.severity ?? "info",
            },
        });
    },
});

// Get audit summary for a tenant
export const getSummary = query({
    args: {
        tenantId: v.id("tenants"),
        startDate: v.number(),
        endDate: v.number(),
    },
    handler: async (ctx, { tenantId, startDate, endDate }) => {
        return ctx.runQuery(components.audit.functions.getSummary, {
            tenantId: tenantId as string,
            periodStart: startDate,
            periodEnd: endDate,
        });
    },
});

// List audit entries for a tenant (enriched with user names)
export const listForTenant = query({
    args: {
        tenantId: v.id("tenants"),
        entityType: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, entityType, limit }) => {
        const entries = await ctx.runQuery(
            components.audit.functions.listForTenant,
            {
                tenantId: tenantId as string,
                entityType,
                limit,
            }
        );

        // Enrich with user details from core table
        const withUsers = await Promise.all(
            entries.map(async (e: any) => {
                const user = e.userId
                    ? await ctx.db
                        .query("users")
                        .filter((q) => q.eq(q.field("_id"), e.userId as any))
                        .first()
                        .catch(() => null)
                    : null;

                return {
                    ...e,
                    user: user
                        ? { id: user._id, name: user.name, email: user.email }
                        : null,
                };
            })
        );

        return withUsers;
    },
});

// List audit entries for a tenant with cursor-based pagination
export const listForTenantPaginated = query({
    args: {
        tenantId: v.id("tenants"),
        entityType: v.optional(v.string()),
        pageSize: v.optional(v.number()),
        cursor: v.optional(v.string()),
    },
    handler: async (ctx, { tenantId, entityType, pageSize, cursor }) => {
        const result = await ctx.runQuery(
            components.audit.functions.listForTenantPaginated,
            {
                tenantId: tenantId as string,
                entityType,
                pageSize,
                cursor,
            }
        );

        // Enrich entries with user details
        const withUsers = await Promise.all(
            (result as any).entries.map(async (e: any) => {
                const user = e.userId
                    ? await ctx.db
                        .query("users")
                        .filter((q) => q.eq(q.field("_id"), e.userId as any))
                        .first()
                        .catch(() => null)
                    : null;

                return {
                    ...e,
                    user: user
                        ? { id: user._id, name: user.name, email: user.email }
                        : null,
                };
            })
        );

        return {
            entries: withUsers,
            cursor: (result as any).cursor,
            hasMore: (result as any).hasMore,
        };
    },
});

// List audit entries by entity
export const listByEntity = query({
    args: {
        entityType: v.string(),
        entityId: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { entityType, entityId, limit }) => {
        return ctx.runQuery(components.audit.functions.listByEntity, {
            entityType,
            entityId,
            limit,
        });
    },
});

// List audit entries by user
export const listByUser = query({
    args: {
        userId: v.id("users"),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { userId, limit }) => {
        return ctx.runQuery(components.audit.functions.listByUser, {
            userId: userId as string,
            limit,
        });
    },
});
