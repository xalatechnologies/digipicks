/**
 * Guides Component Contract
 */

import { v } from "convex/values";
import { defineContract } from "../../lib/componentContract";

export const CONTRACT = defineContract({
    name: "guides",
    version: "1.0.0",
    category: "domain",
    description: "User guides with sections, articles, and progress tracking",

    queries: {
        listGuides: {
            args: {
                tenantId: v.string(),
                category: v.optional(v.string()),
                isPublished: v.optional(v.boolean()),
            },
            returns: v.array(v.any()),
        },
        getGuide: {
            args: {
                tenantId: v.string(),
                slug: v.string(),
            },
            returns: v.any(),
        },
        getArticle: {
            args: {
                tenantId: v.string(),
                guideSlug: v.string(),
                articleSlug: v.string(),
            },
            returns: v.any(),
        },
        getUserProgress: {
            args: {
                userId: v.string(),
                guideId: v.string(),
            },
            returns: v.any(),
        },
    },

    mutations: {
        markArticleRead: {
            args: {
                tenantId: v.string(),
                userId: v.string(),
                guideId: v.string(),
                articleId: v.string(),
            },
            returns: v.any(),
        },
        importGuide: {
            args: {
                tenantId: v.string(),
                title: v.string(),
                slug: v.string(),
                description: v.string(),
                category: v.optional(v.string()),
                isPublished: v.boolean(),
                authorId: v.optional(v.string()),
            },
            returns: v.object({ id: v.string() }),
        },
        importSection: {
            args: {
                tenantId: v.string(),
                guideId: v.string(),
                title: v.string(),
                description: v.optional(v.string()),
                order: v.number(),
                isPublished: v.boolean(),
            },
            returns: v.object({ id: v.string() }),
        },
        importArticle: {
            args: {
                tenantId: v.string(),
                sectionId: v.string(),
                guideId: v.string(),
                title: v.string(),
                slug: v.string(),
                content: v.optional(v.string()),
                videoUrl: v.optional(v.string()),
                order: v.number(),
                isPublished: v.boolean(),
            },
            returns: v.object({ id: v.string() }),
        },
    },

    emits: [
        "guides.article.read",
        "guides.guide.imported",
    ],

    subscribes: [],

    dependencies: {
        core: ["tenants", "users"],
        components: [],
    },
});
