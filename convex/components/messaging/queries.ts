/**
 * Messaging Component — Query Functions
 *
 * Read-only operations for conversations and messages.
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// CONVERSATION QUERIES
// =============================================================================

export const listConversations = query({
    args: {
        userId: v.string(),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { userId, status, limit = 50 }) => {
        let conversations = await ctx.db
            .query("conversations")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .order("desc")
            .take(limit);

        if (status) {
            conversations = conversations.filter((c) => c.status === status);
        }
        return conversations;
    },
});

export const getConversation = query({
    args: { id: v.id("conversations") },
    returns: v.any(),
    handler: async (ctx, { id }) => {
        return await ctx.db.get(id);
    },
});

/**
 * Get conversation by tenant + booking (1:1 for booking threads).
 */
export const getConversationByBooking = query({
    args: {
        tenantId: v.string(),
        bookingId: v.string(),
    },
    returns: v.union(v.any(), v.null()),
    handler: async (ctx, { tenantId, bookingId }) => {
        return await ctx.db
            .query("conversations")
            .withIndex("by_tenant_booking", (q) =>
                q.eq("tenantId", tenantId).eq("bookingId", bookingId)
            )
            .first();
    },
});

export const listConversationsByAssignee = query({
    args: {
        assigneeId: v.string(),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { assigneeId, status, limit = 50 }) => {
        let conversations = await ctx.db
            .query("conversations")
            .withIndex("by_assignee", (q) => q.eq("assigneeId", assigneeId))
            .order("desc")
            .take(limit);

        if (status) {
            conversations = conversations.filter((c) => c.status === status);
        }
        return conversations;
    },
});

/**
 * List all conversations for a tenant (backoffice inbox).
 * Includes assigned conversations AND unassigned booking threads.
 * Sorted by lastMessageAt descending (most recent first).
 */
export const listConversationsByTenant = query({
    args: {
        tenantId: v.string(),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, status, limit = 100 }) => {
        let conversations = await ctx.db
            .query("conversations")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .collect();

        if (status) {
            conversations = conversations.filter((c) => c.status === status);
        }
        conversations.sort((a, b) => {
            const aTime = a.lastMessageAt ?? a._creationTime ?? 0;
            const bTime = b.lastMessageAt ?? b._creationTime ?? 0;
            return bTime - aTime;
        });
        return conversations.slice(0, limit);
    },
});

export const unreadMessageCount = query({
    args: { userId: v.string() },
    returns: v.object({ count: v.number() }),
    handler: async (ctx, { userId }) => {
        const conversations = await ctx.db
            .query("conversations")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();
        const total = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
        return { count: total };
    },
});

// =============================================================================
// MESSAGE QUERIES
// =============================================================================

export const listMessages = query({
    args: {
        conversationId: v.id("conversations"),
        limit: v.optional(v.number()),
        /** "public" = customer-visible only (exclude internal notes); "all" = include internal */
        visibilityFilter: v.optional(v.union(v.literal("all"), v.literal("public"))),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { conversationId, limit = 100, visibilityFilter = "all" }) => {
        let messages = await ctx.db
            .query("messages")
            .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
            .order("asc")
            .take(limit);

        if (visibilityFilter === "public") {
            messages = messages.filter(
                (m) => !m.deletedAt && (m.visibility === "public" || m.visibility === undefined)
            );
        } else {
            messages = messages.filter((m) => !m.deletedAt);
        }
        return messages;
    },
});

// =============================================================================
// MESSAGE TEMPLATE QUERIES
// =============================================================================

export const listMessageTemplates = query({
    args: {
        tenantId: v.string(),
        activeOnly: v.optional(v.boolean()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, activeOnly = true }) => {
        if (activeOnly) {
            return await ctx.db
                .query("messageTemplates")
                .withIndex("by_tenant_active", (q) =>
                    q.eq("tenantId", tenantId).eq("isActive", true)
                )
                .collect();
        }
        return await ctx.db
            .query("messageTemplates")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .collect();
    },
});
