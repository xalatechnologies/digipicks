/**
 * Support Component — Mutation Functions
 *
 * Write operations for tickets and ticket messages.
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// TICKET MUTATIONS
// =============================================================================

// Default SLA: 24 hours from creation
const DEFAULT_SLA_MS = 24 * 60 * 60 * 1000;

export const createTicket = mutation({
    args: {
        tenantId: v.string(),
        subject: v.string(),
        description: v.string(),
        priority: v.string(),
        category: v.string(),
        reporterUserId: v.string(),
        tags: v.optional(v.array(v.string())),
        attachmentUrls: v.optional(v.array(v.string())),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const now = Date.now();
        const slaDeadline = now + DEFAULT_SLA_MS;

        const id = await ctx.db.insert("tickets", {
            tenantId: args.tenantId,
            subject: args.subject,
            description: args.description,
            status: "open",
            priority: args.priority,
            category: args.category,
            reporterUserId: args.reporterUserId,
            tags: args.tags ?? [],
            attachmentUrls: args.attachmentUrls ?? [],
            slaDeadline,
            messageCount: 0,
        });
        return { id: id as string };
    },
});

export const updateTicket = mutation({
    args: {
        id: v.id("tickets"),
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

export const assignTicket = mutation({
    args: {
        id: v.id("tickets"),
        assigneeUserId: v.string(),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, assigneeUserId }) => {
        const ticket = await ctx.db.get(id);
        if (!ticket) throw new Error("Ticket not found");

        const patch: Record<string, unknown> = { assigneeUserId };

        // Track first response time
        if (!ticket.firstResponseAt) {
            patch.firstResponseAt = Date.now();
        }

        // Auto-transition to in_progress when assigned
        if (ticket.status === "open") {
            patch.status = "in_progress";
        }

        await ctx.db.patch(id, patch);
        return { success: true };
    },
});

export const changeStatus = mutation({
    args: {
        id: v.id("tickets"),
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

export const addMessage = mutation({
    args: {
        tenantId: v.string(),
        ticketId: v.id("tickets"),
        authorUserId: v.string(),
        body: v.string(),
        type: v.string(), // reply | internal_note | system
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

        // Increment message count on ticket
        const ticket = await ctx.db.get(args.ticketId);
        if (ticket) {
            await ctx.db.patch(args.ticketId, {
                messageCount: (ticket.messageCount ?? 0) + 1,
            });
        }

        return { id: id as string };
    },
});

export const escalateTicket = mutation({
    args: {
        id: v.id("tickets"),
        newPriority: v.optional(v.string()),
        newAssigneeUserId: v.optional(v.string()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, newPriority, newAssigneeUserId }) => {
        const ticket = await ctx.db.get(id);
        if (!ticket) throw new Error("Ticket not found");

        const patch: Record<string, unknown> = {};

        // Bump priority if not specified
        if (newPriority) {
            patch.priority = newPriority;
        } else {
            const priorities = ["low", "normal", "high", "urgent"];
            const currentIdx = priorities.indexOf(ticket.priority);
            if (currentIdx < priorities.length - 1) {
                patch.priority = priorities[currentIdx + 1];
            }
        }

        if (newAssigneeUserId) {
            patch.assigneeUserId = newAssigneeUserId;
        }

        // Ensure ticket is in_progress
        if (ticket.status === "open" || ticket.status === "waiting") {
            patch.status = "in_progress";
        }

        await ctx.db.patch(id, patch);
        return { success: true };
    },
});
