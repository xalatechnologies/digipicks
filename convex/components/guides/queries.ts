import { query } from "./_generated/server";
import { v } from "convex/values";

export const listGuides = query({
    args: {
        tenantId: v.string(),
        category: v.optional(v.string()),
        isPublished: v.optional(v.boolean()),
    },
    returns: v.array(v.any()), // Structuring return type properly would be better but keeping it flexible for now
    handler: async (ctx, { tenantId, category, isPublished = true }) => {
        let guides = await ctx.db
            .query("guides")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .collect();

        if (category) guides = guides.filter((g) => g.category === category);
        if (isPublished !== undefined) guides = guides.filter((g) => g.isPublished === isPublished);

        return guides;
    },
});

export const getGuide = query({
    args: {
        tenantId: v.string(),
        slug: v.string()
    },
    returns: v.any(),
    handler: async (ctx, { tenantId, slug }) => {
        const guide = await ctx.db
            .query("guides")
            .withIndex("by_slug", (q) => q.eq("tenantId", tenantId).eq("slug", slug))
            .first();

        if (!guide) return null;

        // Fetch sections and articles for the ToC
        const sections = await ctx.db
            .query("sections")
            .withIndex("by_guide", (q) => q.eq("guideId", guide._id))
            .collect();

        sections.sort((a, b) => a.order - b.order);

        // Fetch all articles for this guide to map them to sections
        // Note: In a large app we might want to fetch just titles/slugs, but for now fetching all is fine or we can optimize
        const articles = await ctx.db
            .query("articles")
            .withIndex("by_guide", (q) => q.eq("guideId", guide._id))
            .collect();

        const sectionsWithArticles = sections.map(section => ({
            ...section,
            articles: articles
                .filter(a => a.sectionId === section._id && a.isPublished)
                .sort((a, b) => a.order - b.order)
                .map(a => ({ title: a.title, slug: a.slug, order: a.order }))
        }));

        return {
            ...guide,
            sections: sectionsWithArticles
        };
    },
});

export const getArticle = query({
    args: {
        tenantId: v.string(),
        guideSlug: v.string(),
        articleSlug: v.string(),
    },
    returns: v.any(),
    handler: async (ctx, { tenantId, guideSlug, articleSlug }) => {
        const guide = await ctx.db
            .query("guides")
            .withIndex("by_slug", (q) => q.eq("tenantId", tenantId).eq("slug", guideSlug))
            .first();

        if (!guide) return null;

        const article = await ctx.db
            .query("articles")
            // We don't have a direct index for guide + article slug, but we can search by guide and filter
            // Or better, add an index later. For now, let's filter in memory or adds index if needed.
            // Wait, I defined `by_section` and `by_guide` indices.
            // Let's find via guide and filter by slug.
            .withIndex("by_guide", (q) => q.eq("guideId", guide._id))
            .filter(q => q.eq(q.field("slug"), articleSlug))
            .first();

        return article;
    },
});
export const getUserProgress = query({
    args: {
        userId: v.string(),
        guideId: v.id("guides"),
    },
    returns: v.union(
        v.null(),
        v.object({
            _id: v.id("userProgress"),
            status: v.string(),
            completedArticles: v.array(v.id("articles")),
            lastAccessedAt: v.number(),
        })
    ),
    handler: async (ctx, { userId, guideId }) => {
        const progress = await ctx.db
            .query("userProgress")
            .withIndex("by_user_guide", (q) => q.eq("userId", userId).eq("guideId", guideId))
            .first();

        if (!progress) return null;

        return {
            _id: progress._id,
            status: progress.status,
            completedArticles: progress.completedArticles,
            lastAccessedAt: progress.lastAccessedAt,
        };
    },
});
