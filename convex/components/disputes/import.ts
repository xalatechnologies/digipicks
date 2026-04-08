/**
 * Disputes Component — Import Functions
 *
 * Data seeding helpers for disputes and dispute messages.
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const importDispute = mutation({
    args: {
        tenantId: v.string(),
        subject: v.string(),
        description: v.string(),
        status: v.string(),
        priority: v.string(),
        category: v.string(),
        filedByUserId: v.string(),
        respondentUserId: v.string(),
        mediatorUserId: v.optional(v.string()),
        resolution: v.optional(v.string()),
        resolutionNote: v.optional(v.string()),
        relatedPickId: v.optional(v.string()),
        relatedMembershipId: v.optional(v.string()),
        evidenceUrls: v.optional(v.array(v.string())),
        tags: v.optional(v.array(v.string())),
        escalatedAt: v.optional(v.number()),
        resolvedAt: v.optional(v.number()),
        closedAt: v.optional(v.number()),
        messageCount: v.optional(v.number()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        // Find-or-create by tenantId + subject + filedByUserId (idempotent)
        const existing = await ctx.db
            .query("disputes")
            .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
            .filter((q) =>
                q.and(
                    q.eq(q.field("subject"), args.subject),
                    q.eq(q.field("filedByUserId"), args.filedByUserId)
                )
            )
            .first();

        if (existing) {
            return { id: existing._id as string };
        }

        const id = await ctx.db.insert("disputes", {
            tenantId: args.tenantId,
            subject: args.subject,
            description: args.description,
            status: args.status,
            priority: args.priority,
            category: args.category,
            filedByUserId: args.filedByUserId,
            respondentUserId: args.respondentUserId,
            mediatorUserId: args.mediatorUserId,
            resolution: args.resolution,
            resolutionNote: args.resolutionNote,
            relatedPickId: args.relatedPickId,
            relatedMembershipId: args.relatedMembershipId,
            evidenceUrls: args.evidenceUrls ?? [],
            tags: args.tags ?? [],
            escalatedAt: args.escalatedAt,
            resolvedAt: args.resolvedAt,
            closedAt: args.closedAt,
            messageCount: args.messageCount ?? 0,
        });
        return { id: id as string };
    },
});

export const importDisputeMessage = mutation({
    args: {
        tenantId: v.string(),
        disputeId: v.id("disputes"),
        authorUserId: v.string(),
        body: v.string(),
        type: v.string(),
        attachmentUrls: v.optional(v.array(v.string())),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("disputeMessages", {
            tenantId: args.tenantId,
            disputeId: args.disputeId,
            authorUserId: args.authorUserId,
            body: args.body,
            type: args.type,
            attachmentUrls: args.attachmentUrls ?? [],
        });
        return { id: id as string };
    },
});
