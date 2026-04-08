import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const importGuide = mutation({
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
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("guides")
            .withIndex("by_slug", (q) => q.eq("tenantId", args.tenantId).eq("slug", args.slug))
            .first();

        if (existing) {
            return { id: existing._id };
        }

        const id = await ctx.db.insert("guides", {
            ...args,
            createdAt: Date.now(),
            metadata: {},
        });
        return { id };
    },
});

export const importSection = mutation({
    args: {
        tenantId: v.string(),
        guideId: v.id("guides"),
        title: v.string(),
        description: v.optional(v.string()),
        order: v.number(),
        isPublished: v.boolean(),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        // Simple check properly would involve checking guide + order or title, but for seeding we might just create
        const id = await ctx.db.insert("sections", args);
        return { id };
    },
});

export const importArticle = mutation({
    args: {
        tenantId: v.string(),
        sectionId: v.id("sections"),
        guideId: v.id("guides"),
        title: v.string(),
        slug: v.string(),
        content: v.optional(v.string()),
        videoUrl: v.optional(v.string()),
        order: v.number(),
        isPublished: v.boolean(),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("articles", args);
        return { id };
    },
});
