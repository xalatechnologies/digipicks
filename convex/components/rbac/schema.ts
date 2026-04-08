/**
 * RBAC Component Schema
 *
 * Roles and user-role assignments for tenant-scoped authorization.
 * External references (tenantId, userId) use v.string()
 * because component tables cannot reference app-level tables via v.id().
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    roles: defineTable({
        tenantId: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        permissions: v.array(v.string()),
        isDefault: v.boolean(),
        isSystem: v.boolean(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_name", ["tenantId", "name"]),

    userRoles: defineTable({
        userId: v.string(),
        roleId: v.id("roles"),
        tenantId: v.string(),
        assignedAt: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_role", ["roleId"])
        .index("by_tenant_user", ["tenantId", "userId"]),
});
