/**
 * Messaging Component — Mutation Functions
 *
 * Write operations for conversations and messages.
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// CONVERSATION MUTATIONS
// =============================================================================

export const createConversation = mutation({
    args: {
        tenantId: v.string(),
        userId: v.string(),
        participants: v.array(v.string()),
        subject: v.optional(v.string()),
        bookingId: v.optional(v.string()),
        resourceId: v.optional(v.string()),
        conversationType: v.optional(v.union(v.literal("booking"), v.literal("general"))),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const type = args.conversationType ?? (args.bookingId ? "booking" : "general");
        const id = await ctx.db.insert("conversations", {
            tenantId: args.tenantId,
            userId: args.userId,
            participants: args.participants,
            subject: args.subject,
            bookingId: args.bookingId,
            resourceId: args.resourceId,
            conversationType: type,
            status: "open",
            unreadCount: 0,
            metadata: args.metadata ?? {},
        });
        return { id: id as string };
    },
});

/**
 * Get or create a 1:1 conversation for a booking. Enforces one thread per booking.
 */
export const getOrCreateConversationForBooking = mutation({
    args: {
        tenantId: v.string(),
        bookingId: v.string(),
        userId: v.string(),
        resourceId: v.optional(v.string()),
    },
    returns: v.object({ conversationId: v.string() }),
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("conversations")
            .withIndex("by_tenant_booking", (q) =>
                q.eq("tenantId", args.tenantId).eq("bookingId", args.bookingId)
            )
            .first();

        if (existing) {
            return { conversationId: existing._id as string };
        }

        const id = await ctx.db.insert("conversations", {
            tenantId: args.tenantId,
            userId: args.userId,
            bookingId: args.bookingId,
            resourceId: args.resourceId,
            conversationType: "booking",
            participants: [args.userId],
            status: "open",
            unreadCount: 0,
            metadata: {},
        });
        return { conversationId: id as string };
    },
});

export const archiveConversation = mutation({
    args: { id: v.id("conversations") },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        await ctx.db.patch(id, { status: "archived" });
        return { success: true };
    },
});

export const resolveConversation = mutation({
    args: {
        id: v.id("conversations"),
        resolvedBy: v.string(),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, resolvedBy }) => {
        await ctx.db.patch(id, {
            status: "resolved",
            resolvedAt: Date.now(),
            resolvedBy,
        });
        return { success: true };
    },
});

export const reopenConversation = mutation({
    args: { id: v.id("conversations") },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        await ctx.db.patch(id, {
            status: "open",
            resolvedAt: undefined,
            resolvedBy: undefined,
            reopenedAt: Date.now(),
        });
        return { success: true };
    },
});

export const assignConversation = mutation({
    args: {
        id: v.id("conversations"),
        assigneeId: v.string(),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, assigneeId }) => {
        await ctx.db.patch(id, { assigneeId, assignedAt: Date.now() });
        return { success: true };
    },
});

export const unassignConversation = mutation({
    args: { id: v.id("conversations") },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        await ctx.db.patch(id, { assigneeId: undefined, assignedAt: undefined });
        return { success: true };
    },
});

export const setConversationPriority = mutation({
    args: {
        id: v.id("conversations"),
        priority: v.string(),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, priority }) => {
        await ctx.db.patch(id, { priority });
        return { success: true };
    },
});

// =============================================================================
// MESSAGE MUTATIONS
// =============================================================================

export const sendMessage = mutation({
    args: {
        tenantId: v.string(),
        conversationId: v.id("conversations"),
        senderId: v.string(),
        /** requester | admin | system */
        senderType: v.optional(v.string()),
        /** public = customer-visible; internal = admin-only note */
        visibility: v.optional(v.union(v.literal("public"), v.literal("internal"))),
        content: v.string(),
        messageType: v.optional(v.string()),
        attachments: v.optional(v.array(v.any())),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const now = Date.now();
        const visibility = args.visibility ?? "public";
        const senderType = args.senderType ?? "user";

        const messageId = await ctx.db.insert("messages", {
            tenantId: args.tenantId,
            conversationId: args.conversationId,
            senderId: args.senderId,
            senderType,
            visibility,
            content: args.content,
            messageType: args.messageType ?? "text",
            attachments: args.attachments ?? [],
            metadata: args.metadata ?? {},
            sentAt: now,
        });

        const conversation = await ctx.db.get(args.conversationId);
        if (conversation) {
            await ctx.db.patch(args.conversationId, {
                lastMessageAt: now,
                unreadCount: (conversation.unreadCount || 0) + 1,
            });
        }

        return { id: messageId as string };
    },
});

/**
 * Add an internal note (admin-only, not visible to requester).
 */
export const addInternalNote = mutation({
    args: {
        tenantId: v.string(),
        conversationId: v.id("conversations"),
        senderId: v.string(),
        content: v.string(),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const now = Date.now();
        const messageId = await ctx.db.insert("messages", {
            tenantId: args.tenantId,
            conversationId: args.conversationId,
            senderId: args.senderId,
            senderType: "admin",
            visibility: "internal",
            content: args.content,
            messageType: "text",
            attachments: [],
            metadata: args.metadata ?? {},
            sentAt: now,
        });

        const conversation = await ctx.db.get(args.conversationId);
        if (conversation) {
            await ctx.db.patch(args.conversationId, {
                lastMessageAt: now,
                unreadCount: (conversation.unreadCount || 0) + 1,
            });
        }

        return { id: messageId as string };
    },
});

export const createMessageTemplate = mutation({
    args: {
        tenantId: v.string(),
        name: v.string(),
        body: v.string(),
        category: v.optional(v.string()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("messageTemplates", {
            tenantId: args.tenantId,
            name: args.name,
            body: args.body,
            category: args.category,
            isActive: true,
            createdAt: Date.now(),
        });
        return { id: id as string };
    },
});

export const markMessagesAsRead = mutation({
    args: {
        conversationId: v.id("conversations"),
        userId: v.string(),
    },
    returns: v.object({ success: v.boolean(), count: v.number() }),
    handler: async (ctx, { conversationId, userId }) => {
        const now = Date.now();

        const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
            .filter((q) =>
                q.and(
                    q.neq(q.field("senderId"), userId),
                    q.eq(q.field("readAt"), undefined)
                )
            )
            .collect();

        for (const message of messages) {
            await ctx.db.patch(message._id, { readAt: now });
        }

        await ctx.db.patch(conversationId, { unreadCount: 0 });

        return { success: true, count: messages.length };
    },
});

/**
 * Add a user to the conversation's participants list (idempotent).
 */
export const addParticipant = mutation({
    args: {
        id: v.id("conversations"),
        userId: v.string(),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, userId }) => {
        const conv = await ctx.db.get(id);
        if (!conv) return { success: false };
        if (conv.participants.includes(userId)) return { success: true };
        await ctx.db.patch(id, {
            participants: [...conv.participants, userId],
        });
        return { success: true };
    },
});

// =============================================================================
// CLEANUP / ADMIN MUTATIONS
// =============================================================================

/**
 * Hard-delete ALL conversations, messages, and templates for a tenant.
 * Used by seed reset scripts — not exposed to SDK.
 */
export const purgeAllForTenant = mutation({
    args: { tenantId: v.string() },
    returns: v.object({ conversations: v.number(), messages: v.number(), templates: v.number() }),
    handler: async (ctx, { tenantId }) => {
        let conversations = 0;
        let messages = 0;
        let templates = 0;

        // Delete all messages for this tenant
        const allMessages = await ctx.db
            .query("messages")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .collect();
        for (const m of allMessages) {
            await ctx.db.delete(m._id);
            messages++;
        }

        // Delete all conversations for this tenant
        const allConversations = await ctx.db
            .query("conversations")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .collect();
        for (const c of allConversations) {
            await ctx.db.delete(c._id);
            conversations++;
        }

        // Delete all message templates for this tenant
        const allTemplates = await ctx.db
            .query("messageTemplates")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .collect();
        for (const t of allTemplates) {
            await ctx.db.delete(t._id);
            templates++;
        }

        return { conversations, messages, templates };
    },
});

// =============================================================================
// RETENTION CLEANUP
// =============================================================================

/**
 * Delete resolved/archived conversations (and their messages) older than the threshold.
 * Called by the retention cron job (convex/domain/retention.ts).
 * Only targets conversations with status "resolved" or "archived".
 */
export const cleanupOld = mutation({
    args: {
        tenantId: v.string(),
        olderThanMs: v.number(),
    },
    returns: v.object({ purged: v.number() }),
    handler: async (ctx, { tenantId, olderThanMs }) => {
        const cutoff = Date.now() - olderThanMs;
        let purged = 0;

        // Find resolved/archived conversations older than cutoff
        const conversations = await ctx.db
            .query("conversations")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .filter((q) =>
                q.and(
                    q.or(
                        q.eq(q.field("status"), "resolved"),
                        q.eq(q.field("status"), "archived")
                    ),
                    q.lt(q.field("_creationTime"), cutoff)
                )
            )
            .collect();

        for (const conv of conversations) {
            // Delete all messages in the conversation
            const messages = await ctx.db
                .query("messages")
                .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
                .collect();
            for (const msg of messages) {
                await ctx.db.delete(msg._id);
                purged++;
            }

            // Delete the conversation itself
            await ctx.db.delete(conv._id);
            purged++;
        }

        return { purged };
    },
});
