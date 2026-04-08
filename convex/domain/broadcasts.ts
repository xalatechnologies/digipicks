/**
 * Broadcasts Facade
 *
 * Thin facade that delegates to the broadcasts component.
 * Preserves the API path (api.domain.broadcasts.*) for SDK compatibility.
 * Handles:
 *   - ID type conversion (typed Id<"tenants"> -> string for component)
 *   - Data enrichment (join user data from core tables)
 *   - Subscription resolution (find all active subscribers for fan-out)
 *   - Notification fan-out (create in-app notifications for each subscriber)
 *   - Rate limiting (max N broadcasts per day per creator)
 *   - Audit logging via audit component
 *   - Event bus emission
 */

import { mutation, query } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { requireActiveUser } from "../lib/auth";
import { rateLimit, rateLimitKeys } from "../lib/rateLimits";
import { withAudit } from "../lib/auditHelpers";
import { emitEvent } from "../lib/eventBus";

// =============================================================================
// QUERY FACADES
// =============================================================================

/**
 * List broadcasts sent by a creator.
 * Enriches with creator user data.
 */
export const listByCreator = query({
    args: {
        tenantId: v.id("tenants"),
        creatorId: v.string(),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, creatorId, status, limit }) => {
        const broadcasts = await ctx.runQuery(
            components.broadcasts.functions.listByCreator,
            { tenantId: tenantId as string, creatorId, status, limit },
        );

        // Enrich with creator data
        const user = await ctx.db.get(creatorId as Id<"users">).catch(() => null);
        const creator = user
            ? { id: user._id, name: user.name, displayName: user.displayName }
            : null;

        return (broadcasts as any[]).map((b: any) => ({ ...b, creator }));
    },
});

/**
 * Get a single broadcast by ID.
 * Enriches with creator data.
 */
export const get = query({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        const broadcast = await ctx.runQuery(
            components.broadcasts.functions.get,
            { id },
        );

        const user = (broadcast as any).creatorId
            ? await ctx.db.get((broadcast as any).creatorId as Id<"users">).catch(() => null)
            : null;

        return {
            ...broadcast,
            creator: user
                ? { id: user._id, name: user.name, displayName: user.displayName }
                : null,
        };
    },
});

/**
 * List broadcasts received by a subscriber (inbox).
 * Enriches each broadcast with creator data.
 */
export const listForSubscriber = query({
    args: {
        tenantId: v.id("tenants"),
        userId: v.string(),
        unreadOnly: v.optional(v.boolean()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, userId, unreadOnly, limit }) => {
        const broadcasts = await ctx.runQuery(
            components.broadcasts.functions.listForSubscriber,
            { tenantId: tenantId as string, userId, unreadOnly, limit },
        );

        // Batch fetch creator users
        const creatorIds = [...new Set((broadcasts as any[]).map((b: any) => b.creatorId).filter(Boolean))];
        const users = await Promise.all(
            creatorIds.map((id: string) => ctx.db.get(id as Id<"users">).catch(() => null)),
        );
        const userMap = new Map(users.filter(Boolean).map((u: any) => [u!._id, u]));

        return (broadcasts as any[]).map((b: any) => {
            const user = b.creatorId ? userMap.get(b.creatorId) : null;
            return {
                ...b,
                creator: user
                    ? { id: user._id, name: user.name, displayName: user.displayName }
                    : null,
            };
        });
    },
});

/**
 * Count unread broadcasts for a subscriber.
 */
export const unreadCount = query({
    args: {
        tenantId: v.id("tenants"),
        userId: v.string(),
    },
    handler: async (ctx, { tenantId, userId }) => {
        return ctx.runQuery(
            components.broadcasts.functions.unreadCount,
            { tenantId: tenantId as string, userId },
        );
    },
});

// =============================================================================
// MUTATION FACADES
// =============================================================================

/**
 * Send a broadcast to all active subscribers.
 * Resolves active subscribers via the subscriptions component,
 * creates the broadcast with fan-out receipts, and fires
 * in-app notifications for each subscriber.
 */
export const send = mutation({
    args: {
        tenantId: v.id("tenants"),
        creatorId: v.id("users"),
        title: v.string(),
        body: v.string(),
        messageType: v.string(),
        pickId: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        await requireActiveUser(ctx, args.creatorId);

        await rateLimit(ctx, {
            name: "sendBroadcast",
            key: rateLimitKeys.user(args.creatorId as string),
            throws: true,
        });

        // Resolve active subscribers for this creator
        const memberships = await ctx.runQuery(
            components.subscriptions.functions.listCreatorSubscribers,
            { creatorId: args.creatorId as string, status: "active" },
        );
        const recipientIds = (memberships as any[]).map((m: any) => m.userId as string);

        // Send the broadcast (creates record + fan-out receipts)
        const result = await ctx.runMutation(
            components.broadcasts.functions.send,
            {
                tenantId: args.tenantId as string,
                creatorId: args.creatorId as string,
                title: args.title,
                body: args.body,
                messageType: args.messageType,
                recipientIds,
                pickId: args.pickId,
                metadata: args.metadata,
            },
        );

        // Fan-out in-app notifications for each subscriber
        const creator = await ctx.db.get(args.creatorId);
        const creatorName = creator?.displayName ?? creator?.name ?? "Creator";

        for (const userId of recipientIds) {
            await ctx.runMutation(
                components.notifications.functions.create,
                {
                    tenantId: args.tenantId as string,
                    userId,
                    type: `broadcast.${args.messageType}`,
                    title: `${creatorName}: ${args.title}`,
                    body: args.body.length > 200
                        ? args.body.slice(0, 197) + "..."
                        : args.body,
                    link: `/broadcasts/${result.id}`,
                },
            );
        }

        // Audit
        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: args.creatorId as string,
            entityType: "broadcast",
            entityId: result.id,
            action: "sent",
            newState: {
                title: args.title,
                messageType: args.messageType,
                recipientCount: result.recipientCount,
            },
            sourceComponent: "broadcasts",
        });

        // Event bus
        await emitEvent(ctx, "broadcasts.broadcast.sent", args.tenantId as string, "broadcasts", {
            broadcastId: result.id,
            creatorId: args.creatorId as string,
            messageType: args.messageType,
            recipientCount: result.recipientCount,
        });

        return result;
    },
});

/**
 * Mark a broadcast as read by a subscriber.
 */
export const markAsRead = mutation({
    args: {
        userId: v.id("users"),
        broadcastId: v.string(),
    },
    handler: async (ctx, { userId, broadcastId }) => {
        return ctx.runMutation(
            components.broadcasts.functions.markAsRead,
            { userId: userId as string, broadcastId },
        );
    },
});

/**
 * Remove a broadcast (creator only).
 */
export const remove = mutation({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        const broadcast = await ctx.runQuery(
            components.broadcasts.functions.get,
            { id },
        );

        const result = await ctx.runMutation(
            components.broadcasts.functions.remove,
            { id },
        );

        await withAudit(ctx, {
            tenantId: (broadcast as any)?.tenantId ?? "",
            entityType: "broadcast",
            entityId: id,
            action: "removed",
            previousState: { title: (broadcast as any)?.title },
            sourceComponent: "broadcasts",
        });

        return result;
    },
});
