/**
 * Support Facade
 *
 * Delegates to the support component.
 * Enriches results with user data from core tables (names, avatars).
 * Preserves api.domain.support.* for SDK compatibility.
 */

import { mutation, query } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { requireActiveUser } from "../lib/auth";
import { requireModuleEnabled } from "../lib/featureFlags";
import { rateLimit, rateLimitKeys } from "../lib/rateLimits";
import { withAudit } from "../lib/auditHelpers";
import { emitEvent } from "../lib/eventBus";

// =============================================================================
// QUERY FACADES
// =============================================================================

export const listTickets = query({
    args: {
        tenantId: v.id("tenants"),
        status: v.optional(v.string()),
        assigneeUserId: v.optional(v.string()),
        category: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, status, assigneeUserId, category, limit }) => {
        const tickets = await ctx.runQuery(components.support.queries.listTickets, {
            tenantId: tenantId as string,
            status,
            assigneeUserId,
            category,
            limit,
        });

        // Batch pre-fetch all unique reporters and assignees to avoid N+1 queries
        const reporterIds = [...new Set(tickets.map((t: any) => t.reporterUserId).filter(Boolean))];
        const assigneeIds = [...new Set(tickets.map((t: any) => t.assigneeUserId).filter(Boolean))];
        const allUserIds = [...new Set([...reporterIds, ...assigneeIds])];

        const userResults = await Promise.all(
            allUserIds.map((uid) => ctx.db.get(uid as Id<"users">).catch(() => null))
        );
        const userMap = new Map(userResults.filter(Boolean).map((u: any) => [u._id, u]));

        return tickets.map((t: any) => {
            const reporter = t.reporterUserId ? userMap.get(t.reporterUserId) : null;
            const assignee = t.assigneeUserId ? userMap.get(t.assigneeUserId) : null;
            return {
                ...t,
                reporterName: (reporter as any)?.name || "Ukjent",
                reporterEmail: (reporter as any)?.email,
                reporterAvatar: (reporter as any)?.avatarUrl,
                assigneeName: (assignee as any)?.name,
                assigneeEmail: (assignee as any)?.email,
                assigneeAvatar: (assignee as any)?.avatarUrl,
            };
        });
    },
});

export const listUserTickets = query({
    args: {
        tenantId: v.id("tenants"),
        reporterUserId: v.id("users"),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, reporterUserId, limit }) => {
        const tickets = await ctx.runQuery(components.support.queries.listTickets, {
            tenantId: tenantId as string,
            status: undefined,
            assigneeUserId: undefined,
            category: undefined,
            limit,
        });

        // Filter by reporter on the facade side (component may not expose reporter filter)
        const userTickets = tickets.filter((t: any) => t.reporterUserId === (reporterUserId as string));

        // Enrich with reporter info (single user lookup since all tickets are from the same reporter)
        const reporter = await ctx.db.get(reporterUserId);
        return userTickets.map((t: any) => ({
            ...t,
            reporterName: reporter?.name || "Ukjent",
            reporterEmail: reporter?.email,
            reporterAvatar: reporter?.avatarUrl,
        }));
    },
});

export const getTicket = query({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        const ticket = await ctx.runQuery(
            components.support.queries.getTicket,
            { id: id as any }
        );
        if (!ticket) return null;

        const reporter = ticket.reporterUserId
            ? await ctx.db.get(ticket.reporterUserId as Id<"users">)
            : null;
        const assignee = ticket.assigneeUserId
            ? await ctx.db.get(ticket.assigneeUserId as Id<"users">)
            : null;

        return {
            ...ticket,
            reporterName: reporter?.name || "Ukjent",
            reporterEmail: reporter?.email,
            reporterAvatar: reporter?.avatarUrl,
            assigneeName: assignee?.name,
            assigneeEmail: assignee?.email,
            assigneeAvatar: assignee?.avatarUrl,
        };
    },
});

export const listTicketMessages = query({
    args: {
        ticketId: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { ticketId, limit }) => {
        const messages = await ctx.runQuery(
            components.support.queries.listTicketMessages,
            { ticketId: ticketId as any, limit }
        );

        // Batch pre-fetch all unique authors to avoid N+1 queries
        const authorIds = [...new Set(messages.map((m: any) => m.authorUserId).filter(Boolean))];
        const authorResults = await Promise.all(
            authorIds.map((uid) => ctx.db.get(uid as Id<"users">).catch(() => null))
        );
        const authorMap = new Map(authorResults.filter(Boolean).map((u: any) => [u._id, u]));

        return messages.map((m: any) => {
            const author = m.authorUserId ? authorMap.get(m.authorUserId) : null;
            return {
                ...m,
                authorName: (author as any)?.name || "System",
                authorAvatar: (author as any)?.avatarUrl,
            };
        });
    },
});

export const getTicketCounts = query({
    args: { tenantId: v.id("tenants") },
    handler: async (ctx, { tenantId }) => {
        return ctx.runQuery(components.support.queries.getTicketCounts, {
            tenantId: tenantId as string,
        });
    },
});

// =============================================================================
// MUTATION FACADES
// =============================================================================

export const createTicket = mutation({
    args: {
        tenantId: v.id("tenants"),
        subject: v.string(),
        description: v.string(),
        priority: v.string(),
        category: v.string(),
        reporterUserId: v.id("users"),
        tags: v.optional(v.array(v.string())),
        attachmentUrls: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        await requireModuleEnabled(ctx, args.tenantId as string, "support");
        await requireActiveUser(ctx, args.reporterUserId);

        await rateLimit(ctx, {
            name: "createSupportTicket",
            key: rateLimitKeys.user(args.reporterUserId as string),
            throws: true,
        });

        const result = await ctx.runMutation(components.support.mutations.createTicket, {
            tenantId: args.tenantId as string,
            subject: args.subject,
            description: args.description,
            priority: args.priority,
            category: args.category,
            reporterUserId: args.reporterUserId as string,
            tags: args.tags,
            attachmentUrls: args.attachmentUrls,
        });

        // Audit — withAudit auto-resolves userName/userEmail from userId
        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: args.reporterUserId as string,
            entityType: "support_ticket",
            entityId: result.id,
            action: "ticket_created",
            details: { subject: args.subject, priority: args.priority, category: args.category },
            sourceComponent: "support",
        });

        await emitEvent(ctx, "support.ticket.created", args.tenantId as string, "support", {
            ticketId: result.id,
            subject: args.subject,
            priority: args.priority,
            category: args.category,
            reporterUserId: args.reporterUserId as string,
        });

        return result;
    },
});

export const updateTicket = mutation({
    args: {
        id: v.string(),
        subject: v.optional(v.string()),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
        priority: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
    },
    handler: async (ctx, { id, ...updates }) => {
        const ticket = await ctx.runQuery(components.support.queries.getTicket, { id: id as any });
        if (ticket) {
            await rateLimit(ctx, { name: "createSupportTicket", key: rateLimitKeys.tenant((ticket as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.support.mutations.updateTicket, {
            id: id as any,
            ...updates,
        });
        await withAudit(ctx, {
            tenantId: (ticket as any)?.tenantId ?? "",
            entityType: "support_ticket",
            entityId: id,
            action: "ticket_updated",
            sourceComponent: "support",
            newState: updates,
        });
        return result;
    },
});

export const assignTicket = mutation({
    args: {
        id: v.string(),
        assigneeUserId: v.id("users"),
    },
    handler: async (ctx, { id, assigneeUserId }) => {
        await requireActiveUser(ctx, assigneeUserId);

        const ticket = await ctx.runQuery(components.support.queries.getTicket, { id: id as any });
        if (ticket) {
            await rateLimit(ctx, { name: "createSupportTicket", key: rateLimitKeys.tenant((ticket as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.support.mutations.assignTicket, {
            id: id as any,
            assigneeUserId: assigneeUserId as string,
        });
        await withAudit(ctx, {
            tenantId: (ticket as any)?.tenantId ?? "",
            userId: assigneeUserId as string,
            entityType: "support_ticket",
            entityId: id,
            action: "ticket_assigned",
            sourceComponent: "support",
            newState: { assigneeUserId: assigneeUserId as string },
        });
        return result;
    },
});

export const changeStatus = mutation({
    args: {
        id: v.string(),
        status: v.string(),
    },
    handler: async (ctx, { id, status }) => {
        const ticket = await ctx.runQuery(components.support.queries.getTicket, { id: id as any });
        if (ticket) {
            await rateLimit(ctx, { name: "createSupportTicket", key: rateLimitKeys.tenant((ticket as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.support.mutations.changeStatus, {
            id: id as any,
            status,
        });
        await withAudit(ctx, {
            tenantId: (ticket as any)?.tenantId ?? "",
            entityType: "support_ticket",
            entityId: id,
            action: "status_changed",
            sourceComponent: "support",
            newState: { status },
        });

        if (status === "resolved" && (ticket as any)?.tenantId) {
            await emitEvent(ctx, "support.ticket.resolved", (ticket as any).tenantId, "support", {
                ticketId: id,
                resolvedAt: Date.now(),
            });
        }

        return result;
    },
});

export const addMessage = mutation({
    args: {
        tenantId: v.id("tenants"),
        ticketId: v.string(),
        authorUserId: v.id("users"),
        body: v.string(),
        type: v.string(),
        attachmentUrls: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        await requireModuleEnabled(ctx, args.tenantId as string, "support");
        await requireActiveUser(ctx, args.authorUserId);

        await rateLimit(ctx, {
            name: "addSupportMessage",
            key: rateLimitKeys.user(args.authorUserId as string),
            throws: true,
        });

        const result = await ctx.runMutation(components.support.mutations.addMessage, {
            tenantId: args.tenantId as string,
            ticketId: args.ticketId as any,
            authorUserId: args.authorUserId as string,
            body: args.body,
            type: args.type,
            attachmentUrls: args.attachmentUrls,
        });
        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: args.authorUserId as string,
            entityType: "support_message",
            entityId: (result as any).id ?? "",
            action: "message_added",
            sourceComponent: "support",
            newState: { ticketId: args.ticketId, type: args.type },
        });
        return result;
    },
});

export const escalateTicket = mutation({
    args: {
        id: v.string(),
        userId: v.id("users"),
        newPriority: v.optional(v.string()),
        newAssigneeUserId: v.optional(v.id("users")),
    },
    handler: async (ctx, { id, userId, newPriority, newAssigneeUserId }) => {
        await requireActiveUser(ctx, userId);

        await rateLimit(ctx, {
            name: "escalateSupportTicket",
            key: rateLimitKeys.user(userId as string),
            throws: true,
        });

        const result = await ctx.runMutation(components.support.mutations.escalateTicket, {
            id: id as any,
            newPriority,
            newAssigneeUserId: newAssigneeUserId as string | undefined,
        });
        const ticket = await ctx.runQuery(components.support.queries.getTicket, { id: id as any });
        await withAudit(ctx, {
            tenantId: (ticket as any)?.tenantId ?? "",
            userId: userId as string,
            entityType: "support_ticket",
            entityId: id,
            action: "ticket_escalated",
            sourceComponent: "support",
            newState: { newPriority, newAssigneeUserId: newAssigneeUserId as string | undefined },
        });
        return result;
    },
});
