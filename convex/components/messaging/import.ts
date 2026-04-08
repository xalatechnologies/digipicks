/**
 * Messaging Component — Import Functions
 *
 * Data migration helpers for conversations and messages.
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Import a conversation record from the legacy table.
 * Used during data migration.
 */
export const importConversation = mutation({
    args: {
        tenantId: v.string(),
        userId: v.string(),
        bookingId: v.optional(v.string()),
        resourceId: v.optional(v.string()),
        conversationType: v.optional(v.union(v.literal("booking"), v.literal("general"))),
        participants: v.array(v.string()),
        subject: v.optional(v.string()),
        status: v.string(),
        unreadCount: v.number(),
        lastMessageAt: v.optional(v.number()),
        assigneeId: v.optional(v.string()),
        assignedAt: v.optional(v.number()),
        resolvedAt: v.optional(v.number()),
        resolvedBy: v.optional(v.string()),
        reopenedAt: v.optional(v.number()),
        priority: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("conversations", { ...args, metadata: args.metadata ?? {} });
        return { id: id as string };
    },
});

/**
 * Import a message record from the legacy table.
 * Used during data migration.
 */
export const importMessage = mutation({
    args: {
        tenantId: v.string(),
        conversationId: v.id("conversations"),
        senderId: v.string(),
        senderType: v.string(),
        content: v.string(),
        messageType: v.string(),
        attachments: v.array(v.any()),
        readAt: v.optional(v.number()),
        metadata: v.optional(v.any()),
        sentAt: v.number(),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("messages", { ...args, metadata: args.metadata ?? {} });
        return { id: id as string };
    },
});
