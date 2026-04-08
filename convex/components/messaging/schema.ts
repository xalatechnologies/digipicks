/**
 * Messaging Component Schema
 *
 * Conversations and messages. External references use v.string().
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    conversations: defineTable({
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
        watcherIds: v.optional(v.array(v.string())),
        metadata: v.any(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_user", ["userId"])
        .index("by_booking", ["bookingId"])
        .index("by_tenant_booking", ["tenantId", "bookingId"])
        .index("by_status", ["status"])
        .index("by_assignee", ["assigneeId"]),

    messages: defineTable({
        tenantId: v.string(),
        conversationId: v.id("conversations"),
        senderId: v.string(),
        senderType: v.string(),
        visibility: v.optional(v.union(v.literal("public"), v.literal("internal"))),
        content: v.string(),
        messageType: v.string(),
        attachments: v.array(v.any()),
        readAt: v.optional(v.number()),
        editedAt: v.optional(v.number()),
        deletedAt: v.optional(v.number()),
        metadata: v.any(),
        sentAt: v.number(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_conversation", ["conversationId"])
        .index("by_sender", ["senderId"]),

    messageTemplates: defineTable({
        tenantId: v.string(),
        name: v.string(),
        body: v.string(),
        category: v.optional(v.string()),
        isActive: v.boolean(),
        createdAt: v.number(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_tenant_active", ["tenantId", "isActive"]),
});
