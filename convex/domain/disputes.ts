/**
 * Disputes Facade
 *
 * Delegates to the disputes component.
 * Enriches results with user data from core tables (names, avatars).
 * Preserves api.domain.disputes.* for SDK compatibility.
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

export const listDisputes = query({
    args: {
        tenantId: v.id("tenants"),
        status: v.optional(v.string()),
        filedByUserId: v.optional(v.string()),
        respondentUserId: v.optional(v.string()),
        mediatorUserId: v.optional(v.string()),
        category: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, status, filedByUserId, respondentUserId, mediatorUserId, category, limit }) => {
        const disputes = await ctx.runQuery(components.disputes.queries.listDisputes, {
            tenantId: tenantId as string,
            status,
            filedByUserId,
            respondentUserId,
            mediatorUserId,
            category,
            limit,
        });

        const filerIds = [...new Set((disputes as any[]).map((d: any) => d.filedByUserId).filter(Boolean))];
        const respIds = [...new Set((disputes as any[]).map((d: any) => d.respondentUserId).filter(Boolean))];
        const medIds = [...new Set((disputes as any[]).map((d: any) => d.mediatorUserId).filter(Boolean))];
        const allUserIds = [...new Set([...filerIds, ...respIds, ...medIds])];

        const userResults = await Promise.all(
            allUserIds.map((uid) => ctx.db.get(uid as Id<"users">).catch(() => null))
        );
        const userMap = new Map(userResults.filter(Boolean).map((u: any) => [u._id, u]));

        return (disputes as any[]).map((d: any) => {
            const filer = d.filedByUserId ? userMap.get(d.filedByUserId) : null;
            const respondent = d.respondentUserId ? userMap.get(d.respondentUserId) : null;
            const mediator = d.mediatorUserId ? userMap.get(d.mediatorUserId) : null;
            return {
                ...d,
                filerName: (filer as any)?.name || "Ukjent",
                filerEmail: (filer as any)?.email,
                filerAvatar: (filer as any)?.avatarUrl,
                respondentName: (respondent as any)?.name || "Ukjent",
                respondentEmail: (respondent as any)?.email,
                respondentAvatar: (respondent as any)?.avatarUrl,
                mediatorName: (mediator as any)?.name,
                mediatorEmail: (mediator as any)?.email,
                mediatorAvatar: (mediator as any)?.avatarUrl,
            };
        });
    },
});

export const listUserDisputes = query({
    args: {
        tenantId: v.id("tenants"),
        userId: v.id("users"),
        role: v.optional(v.string()), // "filer" | "respondent" | undefined (both)
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, userId, role, limit }) => {
        const allDisputes = await ctx.runQuery(components.disputes.queries.listDisputes, {
            tenantId: tenantId as string,
            filedByUserId: role === "filer" ? (userId as string) : undefined,
            respondentUserId: role === "respondent" ? (userId as string) : undefined,
            limit,
        });

        // If no role filter, get both filed and respondent disputes
        let userDisputes = allDisputes as any[];
        if (!role) {
            userDisputes = userDisputes.filter(
                (d: any) => d.filedByUserId === (userId as string) || d.respondentUserId === (userId as string)
            );
        }

        const user = await ctx.db.get(userId);
        return userDisputes.map((d: any) => ({
            ...d,
            filerName: d.filedByUserId === (userId as string) ? user?.name || "Ukjent" : undefined,
            respondentName: d.respondentUserId === (userId as string) ? user?.name || "Ukjent" : undefined,
        }));
    },
});

export const getDispute = query({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        const dispute = await ctx.runQuery(
            components.disputes.queries.getDispute,
            { id: id as any }
        );
        if (!dispute) return null;

        const filer = dispute.filedByUserId
            ? await ctx.db.get(dispute.filedByUserId as Id<"users">)
            : null;
        const respondent = dispute.respondentUserId
            ? await ctx.db.get(dispute.respondentUserId as Id<"users">)
            : null;
        const mediator = dispute.mediatorUserId
            ? await ctx.db.get(dispute.mediatorUserId as Id<"users">)
            : null;

        return {
            ...dispute,
            filerName: filer?.name || "Ukjent",
            filerEmail: filer?.email,
            filerAvatar: filer?.avatarUrl,
            respondentName: respondent?.name || "Ukjent",
            respondentEmail: respondent?.email,
            respondentAvatar: respondent?.avatarUrl,
            mediatorName: mediator?.name,
            mediatorEmail: mediator?.email,
            mediatorAvatar: mediator?.avatarUrl,
        };
    },
});

export const listDisputeMessages = query({
    args: {
        disputeId: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { disputeId, limit }) => {
        const messages = await ctx.runQuery(
            components.disputes.queries.listDisputeMessages,
            { disputeId: disputeId as any, limit }
        );

        const authorIds = [...new Set((messages as any[]).map((m: any) => m.authorUserId).filter(Boolean))];
        const authorResults = await Promise.all(
            authorIds.map((uid) => ctx.db.get(uid as Id<"users">).catch(() => null))
        );
        const authorMap = new Map(authorResults.filter(Boolean).map((u: any) => [u._id, u]));

        return (messages as any[]).map((m: any) => {
            const author = m.authorUserId ? authorMap.get(m.authorUserId) : null;
            return {
                ...m,
                authorName: (author as any)?.name || "System",
                authorAvatar: (author as any)?.avatarUrl,
            };
        });
    },
});

export const getDisputeCounts = query({
    args: { tenantId: v.id("tenants") },
    handler: async (ctx, { tenantId }) => {
        return ctx.runQuery(components.disputes.queries.getDisputeCounts, {
            tenantId: tenantId as string,
        });
    },
});

// =============================================================================
// MUTATION FACADES
// =============================================================================

export const createDispute = mutation({
    args: {
        tenantId: v.id("tenants"),
        subject: v.string(),
        description: v.string(),
        priority: v.string(),
        category: v.string(),
        filedByUserId: v.id("users"),
        respondentUserId: v.id("users"),
        relatedPickId: v.optional(v.string()),
        relatedMembershipId: v.optional(v.string()),
        evidenceUrls: v.optional(v.array(v.string())),
        tags: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        await requireModuleEnabled(ctx, args.tenantId as string, "disputes");
        await requireActiveUser(ctx, args.filedByUserId);

        await rateLimit(ctx, {
            name: "createSupportTicket",
            key: rateLimitKeys.user(args.filedByUserId as string),
            throws: true,
        });

        const result = await ctx.runMutation(components.disputes.mutations.createDispute, {
            tenantId: args.tenantId as string,
            subject: args.subject,
            description: args.description,
            priority: args.priority,
            category: args.category,
            filedByUserId: args.filedByUserId as string,
            respondentUserId: args.respondentUserId as string,
            relatedPickId: args.relatedPickId,
            relatedMembershipId: args.relatedMembershipId,
            evidenceUrls: args.evidenceUrls,
            tags: args.tags,
        });

        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: args.filedByUserId as string,
            entityType: "dispute",
            entityId: result.id,
            action: "dispute_created",
            details: { subject: args.subject, priority: args.priority, category: args.category, respondentUserId: args.respondentUserId as string },
            sourceComponent: "disputes",
        });

        await emitEvent(ctx, "disputes.dispute.created", args.tenantId as string, "disputes", {
            disputeId: result.id,
            subject: args.subject,
            priority: args.priority,
            category: args.category,
            filedByUserId: args.filedByUserId as string,
            respondentUserId: args.respondentUserId as string,
            relatedPickId: args.relatedPickId,
        });

        return result;
    },
});

export const updateDispute = mutation({
    args: {
        id: v.string(),
        subject: v.optional(v.string()),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
        priority: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
    },
    handler: async (ctx, { id, ...updates }) => {
        const dispute = await ctx.runQuery(components.disputes.queries.getDispute, { id: id as any });
        if (dispute) {
            await rateLimit(ctx, { name: "createSupportTicket", key: rateLimitKeys.tenant((dispute as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.disputes.mutations.updateDispute, {
            id: id as any,
            ...updates,
        });
        await withAudit(ctx, {
            tenantId: (dispute as any)?.tenantId ?? "",
            entityType: "dispute",
            entityId: id,
            action: "dispute_updated",
            sourceComponent: "disputes",
            newState: updates,
        });
        return result;
    },
});

export const assignMediator = mutation({
    args: {
        id: v.string(),
        mediatorUserId: v.id("users"),
    },
    handler: async (ctx, { id, mediatorUserId }) => {
        await requireActiveUser(ctx, mediatorUserId);

        const dispute = await ctx.runQuery(components.disputes.queries.getDispute, { id: id as any });
        if (dispute) {
            await rateLimit(ctx, { name: "createSupportTicket", key: rateLimitKeys.tenant((dispute as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.disputes.mutations.assignMediator, {
            id: id as any,
            mediatorUserId: mediatorUserId as string,
        });
        await withAudit(ctx, {
            tenantId: (dispute as any)?.tenantId ?? "",
            userId: mediatorUserId as string,
            entityType: "dispute",
            entityId: id,
            action: "mediator_assigned",
            sourceComponent: "disputes",
            newState: { mediatorUserId: mediatorUserId as string },
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
        const dispute = await ctx.runQuery(components.disputes.queries.getDispute, { id: id as any });
        if (dispute) {
            await rateLimit(ctx, { name: "createSupportTicket", key: rateLimitKeys.tenant((dispute as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.disputes.mutations.changeStatus, {
            id: id as any,
            status,
        });
        await withAudit(ctx, {
            tenantId: (dispute as any)?.tenantId ?? "",
            entityType: "dispute",
            entityId: id,
            action: "status_changed",
            sourceComponent: "disputes",
            newState: { status },
        });

        if (status === "resolved" && (dispute as any)?.tenantId) {
            await emitEvent(ctx, "disputes.dispute.resolved", (dispute as any).tenantId, "disputes", {
                disputeId: id,
                resolution: (dispute as any).resolution,
                filedByUserId: (dispute as any).filedByUserId,
                respondentUserId: (dispute as any).respondentUserId,
                resolvedAt: Date.now(),
            });
        }

        if (status === "appealed" && (dispute as any)?.tenantId) {
            await emitEvent(ctx, "disputes.dispute.appealed", (dispute as any).tenantId, "disputes", {
                disputeId: id,
                filedByUserId: (dispute as any).filedByUserId,
                respondentUserId: (dispute as any).respondentUserId,
            });
        }

        return result;
    },
});

export const resolveDispute = mutation({
    args: {
        id: v.string(),
        resolution: v.string(),
        resolutionNote: v.optional(v.string()),
        userId: v.id("users"),
    },
    handler: async (ctx, { id, resolution, resolutionNote, userId }) => {
        await requireActiveUser(ctx, userId);

        const dispute = await ctx.runQuery(components.disputes.queries.getDispute, { id: id as any });
        if (dispute) {
            await rateLimit(ctx, { name: "createSupportTicket", key: rateLimitKeys.tenant((dispute as any).tenantId), throws: true });
        }

        const result = await ctx.runMutation(components.disputes.mutations.resolveDispute, {
            id: id as any,
            resolution,
            resolutionNote,
        });

        await withAudit(ctx, {
            tenantId: (dispute as any)?.tenantId ?? "",
            userId: userId as string,
            entityType: "dispute",
            entityId: id,
            action: "dispute_resolved",
            sourceComponent: "disputes",
            newState: { resolution, resolutionNote },
        });

        if ((dispute as any)?.tenantId) {
            await emitEvent(ctx, "disputes.dispute.resolved", (dispute as any).tenantId, "disputes", {
                disputeId: id,
                resolution,
                resolutionNote,
                filedByUserId: (dispute as any).filedByUserId,
                respondentUserId: (dispute as any).respondentUserId,
                resolvedAt: Date.now(),
            });
        }

        return result;
    },
});

export const escalateDispute = mutation({
    args: {
        id: v.string(),
        userId: v.id("users"),
        newPriority: v.optional(v.string()),
        newMediatorUserId: v.optional(v.id("users")),
    },
    handler: async (ctx, { id, userId, newPriority, newMediatorUserId }) => {
        await requireActiveUser(ctx, userId);

        await rateLimit(ctx, {
            name: "escalateSupportTicket",
            key: rateLimitKeys.user(userId as string),
            throws: true,
        });

        const result = await ctx.runMutation(components.disputes.mutations.escalateDispute, {
            id: id as any,
            newPriority,
            newMediatorUserId: newMediatorUserId as string | undefined,
        });
        const dispute = await ctx.runQuery(components.disputes.queries.getDispute, { id: id as any });
        await withAudit(ctx, {
            tenantId: (dispute as any)?.tenantId ?? "",
            userId: userId as string,
            entityType: "dispute",
            entityId: id,
            action: "dispute_escalated",
            sourceComponent: "disputes",
            newState: { newPriority, newMediatorUserId: newMediatorUserId as string | undefined },
        });

        if ((dispute as any)?.tenantId) {
            await emitEvent(ctx, "disputes.dispute.escalated", (dispute as any).tenantId, "disputes", {
                disputeId: id,
                filedByUserId: (dispute as any).filedByUserId,
                respondentUserId: (dispute as any).respondentUserId,
                newPriority: (dispute as any).priority,
            });
        }

        return result;
    },
});

export const addMessage = mutation({
    args: {
        tenantId: v.id("tenants"),
        disputeId: v.string(),
        authorUserId: v.id("users"),
        body: v.string(),
        type: v.string(),
        attachmentUrls: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        await requireModuleEnabled(ctx, args.tenantId as string, "disputes");
        await requireActiveUser(ctx, args.authorUserId);

        await rateLimit(ctx, {
            name: "addSupportMessage",
            key: rateLimitKeys.user(args.authorUserId as string),
            throws: true,
        });

        const result = await ctx.runMutation(components.disputes.mutations.addMessage, {
            tenantId: args.tenantId as string,
            disputeId: args.disputeId as any,
            authorUserId: args.authorUserId as string,
            body: args.body,
            type: args.type,
            attachmentUrls: args.attachmentUrls,
        });
        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: args.authorUserId as string,
            entityType: "dispute_message",
            entityId: (result as any).id ?? "",
            action: "message_added",
            sourceComponent: "disputes",
            newState: { disputeId: args.disputeId, type: args.type },
        });
        return result;
    },
});
