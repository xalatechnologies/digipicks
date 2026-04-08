/**
 * Email Campaigns Component Schema
 *
 * Supports transactional and marketing email campaigns with:
 * - Campaign creation and scheduling
 * - Audience segmentation (subscription tier, activity, custom tags)
 * - Delivery tracking (sends, opens, clicks, bounces, unsubscribes)
 * - Campaign analytics aggregation
 *
 * External references (tenantId, creatorId, userId) use v.string()
 * because component tables cannot reference app-level tables.
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    /**
     * Email campaigns — a single campaign targeting a segment of users.
     */
    campaigns: defineTable({
        tenantId: v.string(),
        creatorId: v.string(),

        // Content
        name: v.string(),
        subject: v.string(),
        body: v.string(),
        preheader: v.optional(v.string()),
        templateCategory: v.optional(v.string()),

        // Campaign type
        campaignType: v.string(), // "transactional" | "marketing" | "announcement"

        // Audience targeting
        segment: v.object({
            type: v.string(), // "all" | "tier" | "active" | "inactive" | "custom"
            tierId: v.optional(v.string()),
            activeSinceDays: v.optional(v.number()),
            inactiveSinceDays: v.optional(v.number()),
            tags: v.optional(v.array(v.string())),
        }),

        // Status
        status: v.string(), // "draft" | "scheduled" | "sending" | "sent" | "cancelled"
        scheduledAt: v.optional(v.number()),
        sentAt: v.optional(v.number()),
        completedAt: v.optional(v.number()),

        // Analytics summary (denormalized for fast reads)
        recipientCount: v.number(),
        sentCount: v.number(),
        openCount: v.number(),
        clickCount: v.number(),
        bounceCount: v.number(),
        unsubscribeCount: v.number(),

        metadata: v.optional(v.any()),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_tenant_status", ["tenantId", "status"])
        .index("by_tenant_type", ["tenantId", "campaignType"])
        .index("by_creator", ["creatorId"])
        .index("by_scheduled", ["status", "scheduledAt"]),

    /**
     * Per-recipient delivery records for a campaign.
     */
    campaignRecipients: defineTable({
        tenantId: v.string(),
        campaignId: v.string(),
        userId: v.string(),
        email: v.string(),

        // Delivery status
        status: v.string(), // "pending" | "sent" | "delivered" | "opened" | "clicked" | "bounced" | "unsubscribed"
        sentAt: v.optional(v.number()),
        openedAt: v.optional(v.number()),
        clickedAt: v.optional(v.number()),
        bouncedAt: v.optional(v.number()),
        bounceReason: v.optional(v.string()),
        unsubscribedAt: v.optional(v.number()),

        // Resend tracking
        resendId: v.optional(v.string()),
    })
        .index("by_campaign", ["campaignId"])
        .index("by_campaign_status", ["campaignId", "status"])
        .index("by_user", ["userId"])
        .index("by_tenant_user", ["tenantId", "userId"]),

    /**
     * Marketing email unsubscribe list (GDPR compliant).
     * Users who have opted out of marketing emails.
     */
    unsubscribes: defineTable({
        tenantId: v.string(),
        userId: v.string(),
        email: v.string(),
        reason: v.optional(v.string()),
        unsubscribedAt: v.number(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_tenant_email", ["tenantId", "email"])
        .index("by_user", ["userId"]),
});
