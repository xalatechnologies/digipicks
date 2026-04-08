/**
 * Support Component Schema
 *
 * Tickets and ticket messages. External references use v.string().
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    tickets: defineTable({
        tenantId: v.string(),
        subject: v.string(),
        description: v.string(),
        status: v.string(), // open | in_progress | waiting | resolved | closed
        priority: v.string(), // low | normal | high | urgent
        category: v.string(), // general | bug | feature | billing | access | other
        reporterUserId: v.string(),
        assigneeUserId: v.optional(v.string()),
        tags: v.array(v.string()),
        attachmentUrls: v.array(v.string()),
        resolvedAt: v.optional(v.number()),
        closedAt: v.optional(v.number()),
        firstResponseAt: v.optional(v.number()),
        slaDeadline: v.optional(v.number()),
        messageCount: v.number(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_tenant_status", ["tenantId", "status"])
        .index("by_tenant_assignee", ["tenantId", "assigneeUserId"])
        .index("by_tenant_reporter", ["tenantId", "reporterUserId"])
        .index("by_tenant_category", ["tenantId", "category"]),

    ticketMessages: defineTable({
        tenantId: v.string(),
        ticketId: v.id("tickets"),
        authorUserId: v.string(),
        body: v.string(),
        type: v.string(), // reply | internal_note | system
        attachmentUrls: v.array(v.string()),
    })
        .index("by_ticket", ["ticketId"])
        .index("by_tenant", ["tenantId"]),
});
