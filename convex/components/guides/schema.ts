import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    guides: defineTable({
        tenantId: v.string(),
        title: v.string(),
        slug: v.string(),
        description: v.string(),
        thumbnailUrl: v.optional(v.string()),
        category: v.optional(v.string()), // e.g., "Getting Started", "Features", "Admin"
        isPublished: v.boolean(),
        authorId: v.optional(v.string()), // Reference to users table
        createdAt: v.number(),
        updatedAt: v.optional(v.number()),
        metadata: v.any(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_slug", ["tenantId", "slug"])
        .index("by_published", ["tenantId", "isPublished"]),

    sections: defineTable({
        tenantId: v.string(),
        guideId: v.id("guides"),
        title: v.string(),
        description: v.optional(v.string()),
        order: v.number(),
        isPublished: v.boolean(),
    })
        .index("by_guide", ["guideId"])
        .index("by_guide_order", ["guideId", "order"]),

    articles: defineTable({
        tenantId: v.string(),
        sectionId: v.id("sections"),
        guideId: v.id("guides"),
        title: v.string(),
        slug: v.string(),
        content: v.optional(v.string()), // Markdown/MDX content
        videoUrl: v.optional(v.string()), // Optional video walkthrough
        order: v.number(),
        isPublished: v.boolean(),
        lastUpdatedBy: v.optional(v.string()),
        lastUpdatedAt: v.optional(v.number()),
    })
        .index("by_section", ["sectionId"])
        .index("by_guide", ["guideId"])
        .index("by_section_order", ["sectionId", "order"]),

    userProgress: defineTable({
        tenantId: v.string(),
        userId: v.string(),
        guideId: v.id("guides"),
        status: v.union(v.literal("in_progress"), v.literal("completed")),
        completedArticles: v.array(v.id("articles")),
        lastAccessedAt: v.number(),
        completedAt: v.optional(v.number()),
    })
        .index("by_user", ["userId"])
        .index("by_guide", ["guideId"])
        .index("by_user_guide", ["userId", "guideId"]),
});
