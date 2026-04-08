/**
 * Disputes Component — Mutation Functions
 *
 * Write operations for disputes and dispute messages.
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// DISPUTE MUTATIONS
// =============================================================================

export const createDispute = mutation({
    args: {
        tenantId: v.string(),
        subject: v.string(),
        description: v.string(),
        priority: v.string(),
        category: v.string(),
        filedByUserId: v.string(),
        respondentUserId: v.string(),
        relatedPickId: v.optional(v.string()),
        relatedMembershipId: v.optional(v.string()),
        evidenceUrls: v.optional(v.array(v.string())),
        tags: v.optional(v.array(v.string())),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("disputes", {
            tenantId: args.tenantId,
            subject: args.subject,
            description: args.description,
            status: "open",
            priority: args.priority,
            category: args.category,
            filedByUserId: args.filedByUserId,
            respondentUserId: args.respondentUserId,
            relatedPickId: args.relatedPickId,
            relatedMembershipId: args.relatedMembershipId,
            evidenceUrls: args.evidenceUrls ?? [],
            tags: args.tags ?? [],
            messageCount: 0,
        });
        return { id: id as string };
    },
});

export const updateDispute = mutation({
    args: {
        id: v.id("disputes"),
        subject: v.optional(v.string()),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
        priority: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, ...updates }) => {
        const patch: Record<string, unknown> = {};
        if (updates.subject !== undefined) patch.subject = updates.subject;
        if (updates.description !== undefined) patch.description = updates.description;
        if (updates.category !== undefined) patch.category = updates.category;
        if (updates.priority !== undefined) patch.priority = updates.priority;
        if (updates.tags !== undefined) patch.tags = updates.tags;

        await ctx.db.patch(id, patch);
        return { success: true };
    },
});

export const assignMediator = mutation({
    args: {
        id: v.id("disputes"),
        mediatorUserId: v.string(),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, mediatorUserId }) => {
        const dispute = await ctx.db.get(id);
        if (!dispute) throw new Error("Dispute not found");

        const patch: Record<string, unknown> = { mediatorUserId };

        if (dispute.status === "open") {
            patch.status = "under_review";
        }

        await ctx.db.patch(id, patch);
        return { success: true };
    },
});

export const changeStatus = mutation({
    args: {
        id: v.id("disputes"),
        status: v.string(),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, status }) => {
        const patch: Record<string, unknown> = { status };

        if (status === "resolved") {
            patch.resolvedAt = Date.now();
        } else if (status === "closed") {
            patch.closedAt = Date.now();
        }

        await ctx.db.patch(id, patch);
        return { success: true };
    },
});

export const resolveDispute = mutation({
    args: {
        id: v.id("disputes"),
        resolution: v.string(),
        resolutionNote: v.optional(v.string()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, resolution, resolutionNote }) => {
        const dispute = await ctx.db.get(id);
        if (!dispute) throw new Error("Dispute not found");

        await ctx.db.patch(id, {
            status: "resolved",
            resolution,
            resolutionNote,
            resolvedAt: Date.now(),
        });
        return { success: true };
    },
});

export const escalateDispute = mutation({
    args: {
        id: v.id("disputes"),
        newPriority: v.optional(v.string()),
        newMediatorUserId: v.optional(v.string()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, newPriority, newMediatorUserId }) => {
        const dispute = await ctx.db.get(id);
        if (!dispute) throw new Error("Dispute not found");

        const patch: Record<string, unknown> = {
            escalatedAt: Date.now(),
        };

        if (newPriority) {
            patch.priority = newPriority;
        } else {
            const priorities = ["low", "normal", "high", "urgent"];
            const currentIdx = priorities.indexOf(dispute.priority);
            if (currentIdx < priorities.length - 1) {
                patch.priority = priorities[currentIdx + 1];
            }
        }

        if (newMediatorUserId) {
            patch.mediatorUserId = newMediatorUserId;
        }

        if (dispute.status === "open" || dispute.status === "awaiting_evidence") {
            patch.status = "under_review";
        }

        await ctx.db.patch(id, patch);
        return { success: true };
    },
});

export const addMessage = mutation({
    args: {
        tenantId: v.string(),
        disputeId: v.id("disputes"),
        authorUserId: v.string(),
        body: v.string(),
        type: v.string(), // reply | evidence | internal_note | system
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

        const dispute = await ctx.db.get(args.disputeId);
        if (dispute) {
            await ctx.db.patch(args.disputeId, {
                messageCount: (dispute.messageCount ?? 0) + 1,
            });
        }

        return { id: id as string };
    },
});
