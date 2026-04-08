/**
 * Broadcasts Component Schema
 *
 * External references (tenantId, creatorId, recipientIds) use v.string()
 * because component tables cannot reference app-level tables.
 *
 * Broadcasts are one-to-many messages from a creator to all subscribers.
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    broadcasts: defineTable({
        tenantId: v.string(),
        creatorId: v.string(),

        // Message content
        title: v.string(),
        body: v.string(),
        messageType: v.string(), // "text_update", "pick_alert", "announcement"

        // Delivery tracking
        recipientCount: v.number(),
        status: v.string(), // "draft", "sent"
        sentAt: v.optional(v.number()),

        // Optional linked pick (for pick_alert type)
        pickId: v.optional(v.string()),

        // Metadata
        metadata: v.optional(v.any()),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_creator", ["creatorId"])
        .index("by_tenant_creator", ["tenantId", "creatorId"])
        .index("by_tenant_status", ["tenantId", "status"]),

    broadcastReceipts: defineTable({
        tenantId: v.string(),
        broadcastId: v.string(),
        userId: v.string(),
        readAt: v.optional(v.number()),
    })
        .index("by_broadcast", ["broadcastId"])
        .index("by_user", ["userId"])
        .index("by_tenant_user", ["tenantId", "userId"])
        .index("by_user_broadcast", ["userId", "broadcastId"]),
});
