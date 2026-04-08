/**
 * Tenant Config Component Schema
 *
 * Feature flags, branding/white-labeling, and theme overrides.
 * External references use v.string() for component isolation.
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    flagDefinitions: defineTable({
        tenantId: v.string(),
        key: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        type: v.string(), // "boolean" | "string" | "number"
        defaultValue: v.any(),
        isActive: v.boolean(),
        metadata: v.optional(v.any()),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_key", ["tenantId", "key"]),

    flagRules: defineTable({
        tenantId: v.string(),
        flagId: v.id("flagDefinitions"),
        targetType: v.string(), // "tenant" | "organization" | "user" | "role"
        targetId: v.string(),
        value: v.any(),
        priority: v.number(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_flag", ["flagId"])
        .index("by_target", ["targetType", "targetId"]),

    brandConfigs: defineTable({
        tenantId: v.string(),
        primaryColor: v.optional(v.string()),
        secondaryColor: v.optional(v.string()),
        accentColor: v.optional(v.string()),
        fontFamily: v.optional(v.string()),
        borderRadius: v.optional(v.string()),
        darkMode: v.optional(v.boolean()),
        customCSS: v.optional(v.string()),
        metadata: v.optional(v.any()),
    })
        .index("by_tenant", ["tenantId"]),

    brandAssets: defineTable({
        tenantId: v.string(),
        assetType: v.string(), // "logo" | "favicon" | "background" | "header_image"
        storageId: v.optional(v.string()),
        url: v.optional(v.string()),
        alt: v.optional(v.string()),
        metadata: v.optional(v.any()),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_type", ["tenantId", "assetType"]),

    themeOverrides: defineTable({
        tenantId: v.string(),
        componentKey: v.string(),
        property: v.string(),
        value: v.string(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_component", ["tenantId", "componentKey"]),
});
