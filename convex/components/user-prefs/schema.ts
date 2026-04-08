/**
 * User Preferences Component Schema
 *
 * Covers: favorites + savedFilters.
 * External references use v.string() for component isolation.
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    favorites: defineTable({
        tenantId: v.string(),
        userId: v.string(),
        resourceId: v.string(),
        notes: v.optional(v.string()),
        tags: v.array(v.string()),
        metadata: v.any(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_user", ["userId"])
        .index("by_resource", ["resourceId"])
        .index("by_user_resource", ["userId", "resourceId"]),

    savedFilters: defineTable({
        tenantId: v.string(),
        userId: v.string(),
        name: v.string(),
        type: v.string(),
        filters: v.any(),
        isDefault: v.optional(v.boolean()),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_user", ["userId"]),
});
