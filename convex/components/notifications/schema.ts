/**
 * Notifications Component Schema
 *
 * External references use v.string() for component isolation.
 * Includes email templates and form definitions for tenant-level config.
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    notifications: defineTable({
        tenantId: v.string(),
        userId: v.string(),
        type: v.string(),
        title: v.string(),
        body: v.optional(v.string()),
        link: v.optional(v.string()),
        readAt: v.optional(v.number()),
        metadata: v.optional(v.any()),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_user", ["userId"])
        .index("by_user_unread", ["userId", "readAt"]),

    notificationPreferences: defineTable({
        tenantId: v.string(),
        userId: v.string(),
        channel: v.string(),
        category: v.string(),
        enabled: v.boolean(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_user", ["userId"]),

    emailTemplates: defineTable({
        tenantId: v.string(),
        name: v.string(),
        subject: v.optional(v.string()),  // Optional for SMS templates
        body: v.string(),
        category: v.string(),
        channel: v.optional(v.string()),  // "email" | "sms" — defaults to "email"
        isActive: v.boolean(),
        isDefault: v.optional(v.boolean()),
        lastModified: v.optional(v.number()),
        modifiedBy: v.optional(v.string()),
        sendCount: v.optional(v.number()),
        metadata: v.optional(v.any()),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_tenant_category", ["tenantId", "category"])
        .index("by_tenant_active", ["tenantId", "isActive"]),

    pushSubscriptions: defineTable({
        tenantId: v.string(),
        userId: v.string(),
        endpoint: v.string(),
        p256dh: v.string(),
        auth: v.string(),
        provider: v.optional(v.string()),
        createdAt: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_endpoint", ["endpoint"]),

    formDefinitions: defineTable({
        tenantId: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        category: v.string(),
        fields: v.array(v.object({
            id: v.string(),
            type: v.string(),
            label: v.string(),
            required: v.boolean(),
            options: v.optional(v.array(v.string())),
        })),
        isPublished: v.boolean(),
        submissionCount: v.optional(v.number()),
        successMessage: v.optional(v.string()),
        lastModified: v.optional(v.number()),
        createdAt: v.optional(v.number()),
        metadata: v.optional(v.any()),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_tenant_category", ["tenantId", "category"])
        .index("by_tenant_published", ["tenantId", "isPublished"]),
});
