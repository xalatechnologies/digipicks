/**
 * Support Component — Query Functions
 *
 * Read-only operations for tickets and ticket messages.
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// TICKET QUERIES
// =============================================================================

export const listTickets = query({
    args: {
        tenantId: v.string(),
        status: v.optional(v.string()),
        assigneeUserId: v.optional(v.string()),
        category: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, status, assigneeUserId, category, limit = 50 }) => {
        let tickets;

        if (status) {
            tickets = await ctx.db
                .query("tickets")
                .withIndex("by_tenant_status", (q) => q.eq("tenantId", tenantId).eq("status", status))
                .order("desc")
                .take(limit);
        } else if (assigneeUserId) {
            tickets = await ctx.db
                .query("tickets")
                .withIndex("by_tenant_assignee", (q) => q.eq("tenantId", tenantId).eq("assigneeUserId", assigneeUserId))
                .order("desc")
                .take(limit);
        } else if (category) {
            tickets = await ctx.db
                .query("tickets")
                .withIndex("by_tenant_category", (q) => q.eq("tenantId", tenantId).eq("category", category))
                .order("desc")
                .take(limit);
        } else {
            tickets = await ctx.db
                .query("tickets")
                .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
                .order("desc")
                .take(limit);
        }

        return tickets;
    },
});

export const getTicket = query({
    args: { id: v.id("tickets") },
    returns: v.any(),
    handler: async (ctx, { id }) => {
        return await ctx.db.get(id);
    },
});

export const listTicketMessages = query({
    args: {
        ticketId: v.id("tickets"),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { ticketId, limit = 100 }) => {
        return await ctx.db
            .query("ticketMessages")
            .withIndex("by_ticket", (q) => q.eq("ticketId", ticketId))
            .order("asc")
            .take(limit);
    },
});

export const getTicketCounts = query({
    args: { tenantId: v.string() },
    returns: v.any(),
    handler: async (ctx, { tenantId }) => {
        const all = await ctx.db
            .query("tickets")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .collect();

        const counts: Record<string, number> = {
            all: all.length,
            open: 0,
            in_progress: 0,
            waiting: 0,
            resolved: 0,
            closed: 0,
        };

        for (const ticket of all) {
            if (counts[ticket.status] !== undefined) {
                counts[ticket.status]++;
            }
        }

        return counts;
    },
});
