import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const markArticleRead = mutation({
    args: {
        tenantId: v.string(),
        userId: v.string(),
        guideId: v.id("guides"),
        articleId: v.id("articles"),
    },
    handler: async (ctx, { tenantId, userId, guideId, articleId }) => {
        const existingProgress = await ctx.db
            .query("userProgress")
            .withIndex("by_user_guide", (q) => q.eq("userId", userId).eq("guideId", guideId))
            .first();

        const now = Date.now();

        if (existingProgress) {
            if (!existingProgress.completedArticles.includes(articleId)) {
                await ctx.db.patch(existingProgress._id, {
                    completedArticles: [...existingProgress.completedArticles, articleId],
                    lastAccessedAt: now,
                });
            } else {
                await ctx.db.patch(existingProgress._id, {
                    lastAccessedAt: now,
                });
            }
        } else {
            await ctx.db.insert("userProgress", {
                tenantId,
                userId,
                guideId,
                status: "in_progress",
                completedArticles: [articleId],
                lastAccessedAt: now,
            });
        }
    },
});
