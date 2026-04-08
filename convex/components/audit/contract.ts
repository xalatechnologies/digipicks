/**
 * Audit Component Contract
 *
 * Defines the standardized API shape for the audit component.
 * Any component implementing this contract can serve as the audit system.
 */

import { v } from "convex/values";
import { defineContract } from "../../lib/componentContract";

export const CONTRACT = defineContract({
    name: "audit",
    version: "1.0.0",
    category: "infrastructure",
    description: "General-purpose audit logging for all entities",

    queries: {
        listForTenant: {
            args: {
                tenantId: v.string(),
                entityType: v.optional(v.string()),
                limit: v.optional(v.number()),
                cursor: v.optional(v.string()),
            },
            returns: v.array(v.any()),
            description: "List audit entries for a tenant, optionally filtered by entity type",
        },
        listByEntity: {
            args: {
                entityType: v.string(),
                entityId: v.string(),
                limit: v.optional(v.number()),
            },
            returns: v.array(v.any()),
            description: "List audit entries for a specific entity",
        },
        listByUser: {
            args: {
                userId: v.string(),
                limit: v.optional(v.number()),
            },
            returns: v.array(v.any()),
            description: "List audit entries by a specific user",
        },
        listByAction: {
            args: {
                tenantId: v.string(),
                action: v.string(),
                limit: v.optional(v.number()),
            },
            returns: v.array(v.any()),
            description: "List audit entries by action type",
        },
        get: {
            args: { id: v.string() },
            returns: v.any(),
            description: "Get a single audit entry by ID",
        },
        getSummary: {
            args: {
                tenantId: v.string(),
                periodStart: v.optional(v.number()),
                periodEnd: v.optional(v.number()),
            },
            returns: v.any(),
            description: "Get audit summary statistics for a tenant",
        },
    },

    mutations: {
        create: {
            args: {
                tenantId: v.string(),
                userId: v.optional(v.string()),
                userEmail: v.optional(v.string()),
                userName: v.optional(v.string()),
                entityType: v.string(),
                entityId: v.string(),
                action: v.string(),
                previousState: v.optional(v.any()),
                newState: v.optional(v.any()),
                changedFields: v.optional(v.array(v.string())),
                details: v.optional(v.any()),
                reason: v.optional(v.string()),
                sourceComponent: v.optional(v.string()),
                ipAddress: v.optional(v.string()),
                metadata: v.optional(v.any()),
            },
            returns: v.object({ id: v.string() }),
            description: "Create an audit log entry",
        },
    },

    emits: [
        "audit.entry.created",
    ],

    subscribes: [],

    dependencies: {
        core: ["tenants", "users"],
        components: [],
    },
});
