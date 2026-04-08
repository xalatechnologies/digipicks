/**
 * Integrations Component Schema
 *
 * Integration config management extracted from tenant.settings.integrations
 * JSON blobs into dedicated tables for type-safe, indexed access.
 *
 * External references (tenantId) use v.string() because component tables
 * cannot reference app-level tables via v.id().
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    integrationConfigs: defineTable({
        tenantId: v.string(),
        integrationType: v.string(), // "stripe"|"vipps"|"google_calendar"|"outlook_calendar"|"erp"|"sms"|"email"|"webhook"|"altinn"
        name: v.string(),
        isEnabled: v.boolean(),
        config: v.any(), // Encrypted/masked config data
        apiKey: v.optional(v.string()),
        secretKey: v.optional(v.string()),
        webhookSecret: v.optional(v.string()),
        environment: v.optional(v.string()), // "production"|"sandbox"
        lastSyncAt: v.optional(v.number()),
        lastSyncStatus: v.optional(v.string()),
        metadata: v.optional(v.any()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_type", ["tenantId", "integrationType"])
        .index("by_enabled", ["tenantId", "isEnabled"]),

    webhookRegistrations: defineTable({
        tenantId: v.string(),
        integrationId: v.id("integrationConfigs"),
        events: v.array(v.string()),
        callbackUrl: v.string(),
        secret: v.optional(v.string()),
        isActive: v.boolean(),
        lastTriggeredAt: v.optional(v.number()),
        failureCount: v.number(),
        metadata: v.optional(v.any()),
        createdAt: v.number(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_integration", ["integrationId"])
        .index("by_active", ["tenantId", "isActive"]),

    syncLogs: defineTable({
        tenantId: v.string(),
        integrationId: v.id("integrationConfigs"),
        syncType: v.string(), // "full"|"incremental"|"manual"
        status: v.string(), // "started"|"completed"|"failed"|"partial"
        recordsProcessed: v.optional(v.number()),
        recordsFailed: v.optional(v.number()),
        error: v.optional(v.string()),
        startedAt: v.number(),
        completedAt: v.optional(v.number()),
        metadata: v.optional(v.any()),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_integration", ["integrationId"])
        .index("by_status", ["tenantId", "status"]),
});
