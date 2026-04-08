/**
 * Classification Component Schema
 *
 * Hierarchical categories, flat tags, and custom attribute definitions.
 * External references use v.string().
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    categories: defineTable({
        tenantId: v.string(),
        parentId: v.optional(v.id("categories")),
        name: v.string(),
        slug: v.string(),
        description: v.optional(v.string()),
        icon: v.optional(v.string()),
        color: v.optional(v.string()),
        sortOrder: v.number(),
        isActive: v.boolean(),
        metadata: v.optional(v.any()),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_tenant_parent", ["tenantId", "parentId"])
        .index("by_tenant_slug", ["tenantId", "slug"]),

    tags: defineTable({
        tenantId: v.string(),
        name: v.string(),
        slug: v.string(),
        color: v.optional(v.string()),
        isActive: v.boolean(),
        metadata: v.optional(v.any()),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_tenant_slug", ["tenantId", "slug"]),

    attributeDefinitions: defineTable({
        tenantId: v.string(),
        categoryId: v.id("categories"),
        key: v.string(),
        name: v.string(),
        type: v.string(),
        options: v.optional(v.array(v.string())),
        isRequired: v.boolean(),
        sortOrder: v.number(),
        metadata: v.optional(v.any()),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_category", ["categoryId"])
        .index("by_tenant_key", ["tenantId", "key"]),
});
