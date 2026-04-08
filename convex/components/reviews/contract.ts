/**
 * Reviews Component Contract
 */

import { v } from "convex/values";
import { defineContract } from "../../lib/componentContract";

export const CONTRACT = defineContract({
    name: "reviews",
    version: "1.0.0",
    category: "domain",
    description: "Resource reviews with moderation support",

    queries: {
        list: {
            args: {
                tenantId: v.string(),
                resourceId: v.optional(v.string()),
                status: v.optional(v.string()),
                limit: v.optional(v.number()),
            },
            returns: v.array(v.any()),
        },
        get: {
            args: { id: v.string() },
            returns: v.any(),
        },
        stats: {
            args: { resourceId: v.string() },
            returns: v.object({
                total: v.number(),
                averageRating: v.number(),
                distribution: v.any(),
                pending: v.number(),
            }),
        },
    },

    mutations: {
        create: {
            args: {
                tenantId: v.string(),
                resourceId: v.string(),
                userId: v.string(),
                rating: v.number(),
                title: v.optional(v.string()),
                text: v.optional(v.string()),
                metadata: v.optional(v.any()),
            },
            returns: v.object({ id: v.string() }),
        },
        update: {
            args: {
                id: v.string(),
                rating: v.optional(v.number()),
                title: v.optional(v.string()),
                text: v.optional(v.string()),
                metadata: v.optional(v.any()),
            },
            returns: v.object({ success: v.boolean() }),
        },
        remove: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        moderate: {
            args: {
                id: v.string(),
                status: v.string(),
                moderatedBy: v.string(),
                moderationNote: v.optional(v.string()),
            },
            returns: v.object({ success: v.boolean() }),
        },
    },

    emits: [
        "reviews.review.created",
        "reviews.review.updated",
        "reviews.review.deleted",
        "reviews.review.moderated",
    ],

    subscribes: [
        "resources.resource.deleted",
    ],

    dependencies: {
        core: ["tenants", "users", "resources"],
        components: [],
    },
});
