/**
 * Disputes Component Schema
 *
 * Dispute cases and messages for creator-subscriber conflict resolution.
 * External references use v.string().
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    disputes: defineTable({
        tenantId: v.string(),
        subject: v.string(),
        description: v.string(),
        status: v.string(), // open | under_review | awaiting_evidence | resolved | appealed | closed
        priority: v.string(), // low | normal | high | urgent
        category: v.string(), // pick_accuracy | billing | content | conduct | other
        resolution: v.optional(v.string()), // refund | partial_refund | warning | no_action | ban
        resolutionNote: v.optional(v.string()),
        filedByUserId: v.string(), // subscriber who filed
        respondentUserId: v.string(), // creator being disputed
        mediatorUserId: v.optional(v.string()), // admin mediator
        relatedPickId: v.optional(v.string()), // pick that triggered the dispute
        relatedMembershipId: v.optional(v.string()), // subscription context
        evidenceUrls: v.array(v.string()),
        tags: v.array(v.string()),
        escalatedAt: v.optional(v.number()),
        resolvedAt: v.optional(v.number()),
        closedAt: v.optional(v.number()),
        messageCount: v.number(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_tenant_status", ["tenantId", "status"])
        .index("by_tenant_filed_by", ["tenantId", "filedByUserId"])
        .index("by_tenant_respondent", ["tenantId", "respondentUserId"])
        .index("by_tenant_mediator", ["tenantId", "mediatorUserId"])
        .index("by_tenant_category", ["tenantId", "category"]),

    disputeMessages: defineTable({
        tenantId: v.string(),
        disputeId: v.id("disputes"),
        authorUserId: v.string(),
        body: v.string(),
        type: v.string(), // reply | evidence | internal_note | system
        attachmentUrls: v.array(v.string()),
    })
        .index("by_dispute", ["disputeId"])
        .index("by_tenant", ["tenantId"]),
});
