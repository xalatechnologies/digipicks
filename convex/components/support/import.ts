/**
 * Support Component — Import Functions
 *
 * Data seeding helpers for tickets and ticket messages.
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const importTicket = mutation({
    args: {
        tenantId: v.string(),
        subject: v.string(),
        description: v.string(),
        status: v.string(),
        priority: v.string(),
        category: v.string(),
        reporterUserId: v.string(),
        assigneeUserId: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        attachmentUrls: v.optional(v.array(v.string())),
        resolvedAt: v.optional(v.number()),
        closedAt: v.optional(v.number()),
        firstResponseAt: v.optional(v.number()),
        slaDeadline: v.optional(v.number()),
        messageCount: v.optional(v.number()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        // Find-or-create by tenantId + subject (idempotent)
        const existing = await ctx.db
            .query("tickets")
            .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
            .filter((q) => q.eq(q.field("subject"), args.subject))
            .first();

        if (existing) {
            return { id: existing._id as string };
        }

        const id = await ctx.db.insert("tickets", {
            tenantId: args.tenantId,
            subject: args.subject,
            description: args.description,
            status: args.status,
            priority: args.priority,
            category: args.category,
            reporterUserId: args.reporterUserId,
            assigneeUserId: args.assigneeUserId,
            tags: args.tags ?? [],
            attachmentUrls: args.attachmentUrls ?? [],
            resolvedAt: args.resolvedAt,
            closedAt: args.closedAt,
            firstResponseAt: args.firstResponseAt,
            slaDeadline: args.slaDeadline,
            messageCount: args.messageCount ?? 0,
        });
        return { id: id as string };
    },
});

export const importTicketMessage = mutation({
    args: {
        tenantId: v.string(),
        ticketId: v.id("tickets"),
        authorUserId: v.string(),
        body: v.string(),
        type: v.string(),
        attachmentUrls: v.optional(v.array(v.string())),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("ticketMessages", {
            tenantId: args.tenantId,
            ticketId: args.ticketId,
            authorUserId: args.authorUserId,
            body: args.body,
            type: args.type,
            attachmentUrls: args.attachmentUrls ?? [],
        });
        return { id: id as string };
    },
});
