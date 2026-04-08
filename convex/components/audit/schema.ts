/**
 * Audit Component Schema
 *
 * General-purpose audit log for ALL entities across the platform.
 * Replaces the limited bookingAudit table with a polymorphic entity-based design.
 *
 * External references (tenantId, userId, entityId) use v.string()
 * because component tables cannot reference app-level tables via v.id().
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    auditLog: defineTable({
        // Tenant scope
        tenantId: v.string(),

        // Who performed the action
        userId: v.optional(v.string()),
        userEmail: v.optional(v.string()),
        userName: v.optional(v.string()),

        // What was affected (polymorphic)
        entityType: v.string(), // "booking", "resource", "user", "role", "review", etc.
        entityId: v.string(),   // The ID of the affected entity

        // What happened
        action: v.string(), // "created", "updated", "deleted", "approved", "rejected", etc.

        // State change tracking
        previousState: v.optional(v.any()),
        newState: v.optional(v.any()),
        changedFields: v.optional(v.array(v.string())),

        // Context
        details: v.optional(v.any()),
        reason: v.optional(v.string()),
        sourceComponent: v.optional(v.string()), // Which component triggered this

        // Request metadata
        ipAddress: v.optional(v.string()),
        userAgent: v.optional(v.string()),

        // Timestamp
        timestamp: v.number(),
        metadata: v.optional(v.any()),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_entity", ["entityType", "entityId"])
        .index("by_tenant_entity", ["tenantId", "entityType"])
        .index("by_user", ["userId"])
        .index("by_action", ["action", "timestamp"])
        .index("by_timestamp", ["tenantId", "timestamp"]),
});
