/**
 * Messaging Facade
 *
 * Delegates to the messaging component.
 * Enriches results with user data from core tables (names, avatars).
 * Preserves api.domain.messaging.* for SDK compatibility.
 */

import { mutation, query } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { requireActiveUser, requireTenantMember } from "../lib/auth";
import { requireModuleEnabled } from "../lib/featureFlags";
import { requirePermission } from "../lib/permissions";
import { rateLimit, rateLimitKeys } from "../lib/rateLimits";
import { withAudit } from "../lib/auditHelpers";
import { emitEvent } from "../lib/eventBus";
// =============================================================================
// QUERY FACADES
// =============================================================================

export const listConversations = query({
    args: {
        userId: v.id("users"),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { userId, status, limit }) => {
        return ctx.runQuery(components.messaging.queries.listConversations, {
            userId: userId as string,
            status,
            limit,
        });
    },
});

export const getConversation = query({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        const conversation = await ctx.runQuery(
            components.messaging.queries.getConversation,
            { id }
        );
        if (!conversation) return null;

        // Enrich participants with user data from core tables
        const participantDetails = await Promise.all(
            (conversation.participants as string[]).map(async (pid) => {
                const user = await ctx.db.get(pid as Id<"users">);
                return user ? { id: user._id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } : null;
            })
        );

        return {
            ...conversation,
            participantDetails: participantDetails.filter(Boolean),
        };
    },
});

export const listMessages = query({
    args: {
        conversationId: v.string(),
        limit: v.optional(v.number()),
        /** "public" = requester view (exclude internal notes); "all" = admin view */
        visibilityFilter: v.optional(v.union(v.literal("all"), v.literal("public"))),
    },
    handler: async (ctx, { conversationId, limit, visibilityFilter }) => {
        const messages = await ctx.runQuery(
            (components.messaging.queries as any).listMessages,
            { conversationId, limit, visibilityFilter: visibilityFilter ?? "all" }
        );

        // Batch pre-fetch all unique senders to avoid N+1 queries
        const senderIds = [...new Set((messages as any[]).map((m: any) => m.senderId).filter(Boolean))];
        const senderResults = await Promise.all(
            senderIds.map((sid) => ctx.db.get(sid as Id<"users">).catch(() => null))
        );
        const senderMap = new Map(senderResults.filter(Boolean).map((u: any) => [u._id, u]));

        return Promise.all(
            messages.map(async (m: any) => {
                const sender = m.senderId ? senderMap.get(m.senderId) : null;

                // Enrich attachments with download URLs (storageId → url)
                const attachments = Array.isArray(m.attachments)
                    ? await Promise.all(
                        m.attachments.map(async (a: any) => {
                            const storageId = a?.storageId;
                            if (storageId && ctx.storage) {
                                try {
                                    const url = await ctx.storage.getUrl(storageId);
                                    return { ...a, url };
                                } catch {
                                    return a;
                                }
                            }
                            return a;
                        })
                    )
                    : [];

                return {
                    ...m,
                    senderName: (sender as any)?.name || (m.senderType === "system" ? "System" : "Unknown"),
                    senderAvatar: (sender as any)?.avatarUrl,
                    attachments,
                };
            })
        );
    },
});

export const unreadMessageCount = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        return ctx.runQuery(components.messaging.queries.unreadMessageCount, {
            userId: userId as string,
        });
    },
});

export const listConversationsByAssignee = query({
    args: {
        assigneeId: v.id("users"),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { assigneeId, status, limit }) => {
        return ctx.runQuery(
            components.messaging.queries.listConversationsByAssignee,
            { assigneeId: assigneeId as string, status, limit }
        );
    },
});

/**
 * List all conversations for a tenant (backoffice inbox).
 * Enriches with user data from core tables.
 */
export const listConversationsByTenant = query({
    args: {
        tenantId: v.id("tenants"),
        userId: v.id("users"),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, userId, status, limit }) => {
        await requireModuleEnabled(ctx, tenantId as string, "messaging");
        await requireTenantMember(ctx, userId, tenantId);

        const raw = await ctx.runQuery(
            (components.messaging.queries as any).listConversationsByTenant,
            { tenantId: tenantId as string, status, limit }
        );

        const conversations = raw ?? [];

        // Batch pre-fetch users to avoid N+1 queries
        const userIds = [...new Set(conversations.map((c: any) => c.userId).filter(Boolean))];
        const userResults = await Promise.all(
            userIds.map((uid) => ctx.db.get(uid as Id<"users">).catch(() => null))
        );
        const userMap = new Map(userResults.filter(Boolean).map((u: any) => [u._id, u]));

        const enriched = conversations.map((c: any) => {
            const user = c.userId ? userMap.get(c.userId) : null;

            return {
                ...c,
                userName: (user as any)?.name,
                userEmail: (user as any)?.email,
                userPhone: (user as any)?.phoneNumber,
                displaySubject: c.subject,
            };
        });
        return enriched;
    },
});

/**
 * List message templates for admin quick-replies.
 * Admin only: booking:approve.
 */
export const listMessageTemplates = query({
    args: {
        tenantId: v.id("tenants"),
        userId: v.id("users"),
        activeOnly: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        await requireModuleEnabled(ctx, args.tenantId as string, "messaging");
        // Gracefully return empty for users without admin permission
        try {
            await requirePermission(ctx, args.userId, args.tenantId as string, "messaging:admin");
        } catch {
            return [];
        }

        return ctx.runQuery((components.messaging.queries as any).listMessageTemplates, {
            tenantId: args.tenantId as string,
            activeOnly: args.activeOnly ?? true,
        });
    },
});

// =============================================================================
// MUTATION FACADES
// =============================================================================

export const createConversation = mutation({
    args: {
        tenantId: v.id("tenants"),
        userId: v.id("users"),
        participants: v.array(v.id("users")),
        subject: v.optional(v.string()),
        bookingId: v.optional(v.string()),
        resourceId: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        await requireModuleEnabled(ctx, args.tenantId as string, "messaging");
        await requireActiveUser(ctx, args.userId);

        const result = await ctx.runMutation(components.messaging.mutations.createConversation, {
            tenantId: args.tenantId as string,
            userId: args.userId as string,
            participants: args.participants.map((p) => p as string),
            subject: args.subject,
            bookingId: args.bookingId as string | undefined,
            resourceId: args.resourceId as string | undefined,
            metadata: args.metadata,
        });

        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: args.userId as string,
            entityType: "conversation",
            entityId: (result as any).id ?? (result as any)._id ?? "unknown",
            action: "created",
            sourceComponent: "messaging",
            newState: { subject: args.subject, bookingId: args.bookingId },
        });

        // Event bus
        await emitEvent(ctx, "messaging.conversation.created", args.tenantId as string, "messaging", {
            conversationId: (result as any).id ?? (result as any)._id ?? "unknown",
            userId: args.userId as string,
            bookingId: args.bookingId,
        });

        return result;
    },
});

export const sendMessage = mutation({
    args: {
        tenantId: v.id("tenants"),
        conversationId: v.string(),
        senderId: v.id("users"),
        senderType: v.optional(v.string()),
        visibility: v.optional(v.union(v.literal("public"), v.literal("internal"))),
        content: v.string(),
        messageType: v.optional(v.string()),
        attachments: v.optional(v.array(v.any())),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        await requireModuleEnabled(ctx, args.tenantId as string, "messaging");
        await requireActiveUser(ctx, args.senderId);

        const visibility = args.visibility ?? "public";
        if (visibility === "internal") {
            await requirePermission(ctx, args.senderId, args.tenantId as string, "messaging:admin");
        }

        await rateLimit(ctx, {
            name: "sendMessage",
            key: rateLimitKeys.user(args.senderId as string),
            throws: true,
        });

        // 1. Insert message
        const result = await ctx.runMutation((components.messaging.mutations as any).sendMessage, {
            tenantId: args.tenantId as string,
            conversationId: args.conversationId,
            senderId: args.senderId as string,
            senderType: args.senderType ?? (visibility === "internal" ? "admin" : "user"),
            visibility,
            content: args.content,
            messageType: args.messageType,
            attachments: args.attachments,
            metadata: args.metadata,
        });

        // 2. Add sender as participant if not already (ensures bidirectional visibility)
        try {
            await ctx.runMutation(
                (components.messaging.mutations as any).addParticipant,
                { id: args.conversationId, userId: args.senderId as string }
            );
        } catch { /* non-critical */ }

        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: args.senderId as string,
            entityType: "message",
            entityId: (result as any).id ?? "",
            action: "message_sent",
            sourceComponent: "messaging",
            newState: { conversationId: args.conversationId, visibility },
        });

        // Event bus
        await emitEvent(ctx, "messaging.message.sent", args.tenantId as string, "messaging", {
            messageId: (result as any).id ?? "",
            conversationId: args.conversationId,
            senderId: args.senderId as string,
        });

        return result;
    },
});

/**
 * Add internal note (admin-only, not visible to requester).
 */
export const addInternalNote = mutation({
    args: {
        tenantId: v.id("tenants"),
        conversationId: v.string(),
        senderId: v.id("users"),
        content: v.string(),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        await requireModuleEnabled(ctx, args.tenantId as string, "messaging");
        await requireActiveUser(ctx, args.senderId);
        await requirePermission(ctx, args.senderId, args.tenantId as string, "messaging:admin");

        await rateLimit(ctx, {
            name: "sendMessage",
            key: rateLimitKeys.user(args.senderId as string),
            throws: true,
        });

        const result = await ctx.runMutation((components.messaging.mutations as any).addInternalNote, {
            tenantId: args.tenantId as string,
            conversationId: args.conversationId,
            senderId: args.senderId as string,
            content: args.content,
            metadata: args.metadata,
        });
        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: args.senderId as string,
            entityType: "message",
            entityId: (result as any).id ?? "",
            action: "internal_note_added",
            sourceComponent: "messaging",
            newState: { conversationId: args.conversationId },
        });
        return result;
    },
});

/**
 * Create a message template (admin quick-reply).
 * Admin only: booking:approve.
 */
export const createMessageTemplate = mutation({
    args: {
        tenantId: v.id("tenants"),
        userId: v.id("users"),
        name: v.string(),
        body: v.string(),
        category: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireModuleEnabled(ctx, args.tenantId as string, "messaging");
        await requireActiveUser(ctx, args.userId);
        await requirePermission(ctx, args.userId, args.tenantId as string, "messaging:admin");

        const result = await ctx.runMutation((components.messaging.mutations as any).createMessageTemplate, {
            tenantId: args.tenantId as string,
            name: args.name,
            body: args.body,
            category: args.category,
        });
        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: args.userId as string,
            entityType: "messageTemplate",
            entityId: (result as any).id ?? "",
            action: "created",
            sourceComponent: "messaging",
            newState: { name: args.name, category: args.category },
        });
        return result;
    },
});

export const markMessagesAsRead = mutation({
    args: {
        conversationId: v.string(),
        userId: v.id("users"),
    },
    handler: async (ctx, { conversationId, userId }) => {
        await requireActiveUser(ctx, userId);

        return ctx.runMutation(components.messaging.mutations.markMessagesAsRead, {
            conversationId,
            userId: userId as string,
        });
    },
});

export const archiveConversation = mutation({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        const conversation = await ctx.runQuery(components.messaging.queries.getConversation, { id });
        if (conversation) {
            await rateLimit(ctx, { name: "sendMessage", key: rateLimitKeys.tenant((conversation as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.messaging.mutations.archiveConversation, { id });
        await withAudit(ctx, {
            tenantId: (conversation as any)?.tenantId ?? "",
            entityType: "conversation",
            entityId: id,
            action: "archived",
            sourceComponent: "messaging",
        });
        return result;
    },
});

export const resolveConversation = mutation({
    args: {
        id: v.string(),
        resolvedBy: v.id("users"),
    },
    handler: async (ctx, { id, resolvedBy }) => {
        await requireActiveUser(ctx, resolvedBy);

        const conversation = await ctx.runQuery(components.messaging.queries.getConversation, { id });
        if (conversation) {
            await rateLimit(ctx, { name: "sendMessage", key: rateLimitKeys.tenant((conversation as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.messaging.mutations.resolveConversation, {
            id,
            resolvedBy: resolvedBy as string,
        });

        await withAudit(ctx, {
            tenantId: (conversation as any)?.tenantId ?? "",
            userId: resolvedBy as string,
            entityType: "conversation",
            entityId: id,
            action: "resolved",
            sourceComponent: "messaging",
        });

        return result;
    },
});

export const reopenConversation = mutation({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        const conversation = await ctx.runQuery(components.messaging.queries.getConversation, { id });
        if (conversation) {
            await rateLimit(ctx, { name: "sendMessage", key: rateLimitKeys.tenant((conversation as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.messaging.mutations.reopenConversation, { id });
        await withAudit(ctx, {
            tenantId: (conversation as any)?.tenantId ?? "",
            entityType: "conversation",
            entityId: id,
            action: "reopened",
            sourceComponent: "messaging",
        });
        return result;
    },
});

export const assignConversation = mutation({
    args: {
        id: v.string(),
        assigneeId: v.id("users"),
    },
    handler: async (ctx, { id, assigneeId }) => {
        await requireActiveUser(ctx, assigneeId);

        const conversation = await ctx.runQuery(components.messaging.queries.getConversation, { id });
        if (conversation) {
            await rateLimit(ctx, { name: "sendMessage", key: rateLimitKeys.tenant((conversation as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.messaging.mutations.assignConversation, {
            id,
            assigneeId: assigneeId as string,
        });

        await withAudit(ctx, {
            tenantId: (conversation as any)?.tenantId ?? "",
            userId: assigneeId as string,
            entityType: "conversation",
            entityId: id,
            action: "assigned",
            sourceComponent: "messaging",
            newState: { assigneeId: assigneeId as string },
        });

        return result;
    },
});

export const unassignConversation = mutation({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        const conversation = await ctx.runQuery(components.messaging.queries.getConversation, { id });
        if (conversation) {
            await rateLimit(ctx, { name: "sendMessage", key: rateLimitKeys.tenant((conversation as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.messaging.mutations.unassignConversation, { id });
        await withAudit(ctx, {
            tenantId: (conversation as any)?.tenantId ?? "",
            entityType: "conversation",
            entityId: id,
            action: "unassigned",
            sourceComponent: "messaging",
        });
        return result;
    },
});

export const setConversationPriority = mutation({
    args: {
        id: v.string(),
        priority: v.string(),
    },
    handler: async (ctx, { id, priority }) => {
        const conversation = await ctx.runQuery(components.messaging.queries.getConversation, { id });
        if (conversation) {
            await rateLimit(ctx, { name: "sendMessage", key: rateLimitKeys.tenant((conversation as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.messaging.mutations.setConversationPriority, {
            id,
            priority,
        });
        await withAudit(ctx, {
            tenantId: (conversation as any)?.tenantId ?? "",
            entityType: "conversation",
            entityId: id,
            action: "priority_changed",
            sourceComponent: "messaging",
            newState: { priority },
        });
        return result;
    },
});
