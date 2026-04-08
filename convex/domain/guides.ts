import { query } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";
import { withAudit } from "../lib/auditHelpers";
import { rateLimit, rateLimitKeys } from "../lib/rateLimits";
import { emitEvent } from "../lib/eventBus";

export const listGuides = query({
    args: {
        tenantId: v.string(),
        category: v.optional(v.string()),
        isPublished: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        return ctx.runQuery(components.guides.queries.listGuides, args);
    },
});

export const getGuide = query({
    args: {
        tenantId: v.string(),
        slug: v.string()
    },
    handler: async (ctx, args) => {
        return ctx.runQuery(components.guides.queries.getGuide, args);
    },
});

export const getArticle = query({
    args: {
        tenantId: v.string(),
        guideSlug: v.string(),
        articleSlug: v.string(),
    },
    handler: async (ctx, args) => {
        return ctx.runQuery(components.guides.queries.getArticle, args);
    },
});

export const getUserProgress = query({
    args: {
        userId: v.string(),
        guideId: v.string(),
    },
    handler: async (ctx, args) => {
        return ctx.runQuery(components.guides.queries.getUserProgress, args);
    },
});

import { mutation } from "../_generated/server";

export const markArticleRead = mutation({
    args: {
        tenantId: v.string(),
        userId: v.string(),
        guideId: v.string(),
        articleId: v.string(),
    },
    handler: async (ctx, args) => {
        await rateLimit(ctx, { name: "mutateGuide", key: rateLimitKeys.user(args.userId), throws: true });
        const result = await ctx.runMutation(components.guides.mutations.markArticleRead, args);
        await withAudit(ctx, {
            tenantId: args.tenantId,
            userId: args.userId,
            entityType: "article",
            entityId: args.articleId,
            action: "article_read",
            sourceComponent: "guides",
        });

        await emitEvent(ctx, "guides.article.read", args.tenantId, "guides", {
            userId: args.userId, guideId: args.guideId, articleId: args.articleId,
        });

        return result;
    },
});
