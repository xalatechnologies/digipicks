/**
 * Compliance Component Schema
 *
 * Consent management, DSAR (Data Subject Access Request) tracking,
 * and policy versioning. Extracts compliance data from JSON blobs
 * in user.metadata and tenant.settings into dedicated tables.
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    consentRecords: defineTable({
        tenantId: v.string(),
        userId: v.string(),
        category: v.string(), // "marketing" | "analytics" | "thirdParty" | "necessary"
        isConsented: v.boolean(),
        consentedAt: v.number(),
        withdrawnAt: v.optional(v.number()),
        ipAddress: v.optional(v.string()),
        userAgent: v.optional(v.string()),
        version: v.string(),
        metadata: v.optional(v.any()),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_user", ["userId"])
        .index("by_user_category", ["userId", "category"]),

    dsarRequests: defineTable({
        tenantId: v.string(),
        userId: v.string(),
        requestType: v.string(), // "access" | "deletion" | "rectification" | "portability" | "restriction"
        details: v.optional(v.string()),
        status: v.string(), // "submitted" | "in_progress" | "completed" | "rejected"
        submittedAt: v.number(),
        completedAt: v.optional(v.number()),
        processedBy: v.optional(v.string()),
        responseData: v.optional(v.any()),
        metadata: v.optional(v.any()),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_user", ["userId"])
        .index("by_status", ["tenantId", "status"]),

    policyVersions: defineTable({
        tenantId: v.string(),
        policyType: v.string(), // "privacy" | "terms" | "cookies" | "data_processing"
        version: v.string(),
        title: v.string(),
        content: v.string(),
        isPublished: v.boolean(),
        publishedAt: v.optional(v.number()),
        publishedBy: v.optional(v.string()),
        previousVersionId: v.optional(v.id("policyVersions")),
        metadata: v.optional(v.any()),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_type", ["tenantId", "policyType"])
        .index("by_published", ["tenantId", "isPublished"]),
});
