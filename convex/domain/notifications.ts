/**
 * Notifications Facade
 *
 * Thin facade that delegates to the notifications component.
 * Preserves api.domain.notifications.* for SDK compatibility.
 */

import { mutation, query } from "../_generated/server";
import { internal, components } from "../_generated/api";
import { v } from "convex/values";
import { requireActiveUser } from "../lib/auth";
import { withAudit } from "../lib/auditHelpers";
import { rateLimit, rateLimitKeys } from "../lib/rateLimits";
import { emitEvent } from "../lib/eventBus";

// =============================================================================
// QUERY FACADES
// =============================================================================

export const listByUser = query({
    args: {
        userId: v.id("users"),
        limit: v.optional(v.number()),
        unreadOnly: v.optional(v.boolean()),
    },
    handler: async (ctx, { userId, limit, unreadOnly }) => {
        return ctx.runQuery(components.notifications.functions.listByUser, {
            userId: userId as string,
            limit,
            unreadOnly,
        });
    },
});

export const unreadCount = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, { userId }) => {
        return ctx.runQuery(components.notifications.functions.unreadCount, {
            userId: userId as string,
        });
    },
});

export const get = query({
    args: {
        id: v.string(),
    },
    handler: async (ctx, { id }) => {
        return ctx.runQuery(components.notifications.functions.get, { id });
    },
});

export const getPreferences = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, { userId }) => {
        return ctx.runQuery(components.notifications.functions.getPreferences, {
            userId: userId as string,
        });
    },
});

export const listEmailTemplates = query({
    args: {
        tenantId: v.string(),
    },
    handler: async (ctx, { tenantId }) => {
        return ctx.runQuery(components.notifications.functions.listEmailTemplates, {
            tenantId,
        });
    },
});

export const listFormDefinitions = query({
    args: {
        tenantId: v.string(),
    },
    handler: async (ctx, { tenantId }) => {
        return ctx.runQuery(components.notifications.functions.listFormDefinitions, {
            tenantId,
        });
    },
});

// =============================================================================
// MUTATION FACADES
// =============================================================================

export const create = mutation({
    args: {
        tenantId: v.id("tenants"),
        userId: v.id("users"),
        type: v.string(),
        title: v.string(),
        body: v.optional(v.string()),
        link: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        await rateLimit(ctx, { name: "mutateNotification", key: rateLimitKeys.tenant(args.tenantId as string), throws: true });
        await requireActiveUser(ctx, args.userId);

        const result = await ctx.runMutation(components.notifications.functions.create, {
            tenantId: args.tenantId as string,
            userId: args.userId as string,
            type: args.type,
            title: args.title,
            body: args.body,
            link: args.link,
            metadata: args.metadata,
        });

        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: args.userId as string,
            entityType: "notification",
            entityId: (result as any).id ?? (result as any)._id ?? "unknown",
            action: "created",
            sourceComponent: "notifications",
            newState: { type: args.type, title: args.title },
        });

        await emitEvent(ctx, "notifications.notification.created", args.tenantId as string, "notifications", {
            notificationId: (result as any).id ?? (result as any)._id ?? "unknown", userId: args.userId as string, type: args.type,
        });

        return result;
    },
});

export const markAsRead = mutation({
    args: {
        id: v.string(),
    },
    handler: async (ctx, { id }) => {
        const notification = await ctx.runQuery(components.notifications.functions.get, { id });
        if (notification) {
            await rateLimit(ctx, { name: "mutateNotification", key: rateLimitKeys.user((notification as any).userId), throws: true });
        }
        const result = await ctx.runMutation(components.notifications.functions.markAsRead, { id });

        await emitEvent(ctx, "notifications.notification.read", (notification as any)?.tenantId ?? "", "notifications", {
            notificationId: id,
        });

        return result;
    },
});

export const markAllAsRead = mutation({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, { userId }) => {
        await requireActiveUser(ctx, userId);

        const result = await ctx.runMutation(components.notifications.functions.markAllAsRead, {
            userId: userId as string,
        });

        await emitEvent(ctx, "notifications.notification.allRead", "", "notifications", {
            userId: userId as string,
        });

        return result;
    },
});

export const remove = mutation({
    args: {
        id: v.string(),
    },
    handler: async (ctx, { id }) => {
        const notification = await ctx.runQuery(components.notifications.functions.get, { id });
        if (notification) {
            await rateLimit(ctx, { name: "mutateNotification", key: rateLimitKeys.user((notification as any).userId), throws: true });
        }
        return ctx.runMutation(components.notifications.functions.remove, { id });
    },
});

export const updatePreference = mutation({
    args: {
        tenantId: v.id("tenants"),
        userId: v.id("users"),
        channel: v.string(),
        category: v.string(),
        enabled: v.boolean(),
    },
    handler: async (ctx, args) => {
        await requireActiveUser(ctx, args.userId);

        const result = await ctx.runMutation(components.notifications.functions.updatePreference, {
            tenantId: args.tenantId as string,
            userId: args.userId as string,
            channel: args.channel,
            category: args.category,
            enabled: args.enabled,
        });
        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: args.userId as string,
            entityType: "notificationPreference",
            entityId: `${args.channel}:${args.category}`,
            action: "updated",
            sourceComponent: "notifications",
            newState: { enabled: args.enabled },
        });

        await emitEvent(ctx, "notifications.preference.updated", args.tenantId as string, "notifications", {
            userId: args.userId as string, channel: args.channel, category: args.category, enabled: args.enabled,
        });

        return result;
    },
});

// =============================================================================
// PUSH SUBSCRIPTION FACADES
// =============================================================================

export const listPushSubscriptions = query({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, { userId }) => {
        return ctx.runQuery((components.notifications.functions as any).listPushSubscriptions, {
            userId,
        });
    },
});

export const registerPushSubscription = mutation({
    args: {
        tenantId: v.string(),
        userId: v.string(),
        endpoint: v.string(),
        p256dh: v.string(),
        auth: v.string(),
        provider: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const result = await ctx.runMutation((components.notifications.functions as any).registerPushSubscription, {
            tenantId: args.tenantId,
            userId: args.userId,
            endpoint: args.endpoint,
            p256dh: args.p256dh,
            auth: args.auth,
            provider: args.provider,
        });

        await withAudit(ctx, {
            tenantId: args.tenantId,
            userId: args.userId,
            entityType: "pushSubscription",
            entityId: (result as any).id ?? "unknown",
            action: "created",
            sourceComponent: "notifications",
        });

        return result;
    },
});

export const deletePushSubscription = mutation({
    args: {
        id: v.string(),
    },
    handler: async (ctx, { id }) => {
        return ctx.runMutation((components.notifications.functions as any).deletePushSubscription, { id });
    },
});

export const unsubscribeAllPush = mutation({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, { userId }) => {
        const result = await ctx.runMutation((components.notifications.functions as any).unsubscribeAllPush, {
            userId,
        });

        await withAudit(ctx, {
            tenantId: "",
            userId,
            entityType: "pushSubscription",
            entityId: userId,
            action: "unsubscribed_all",
            sourceComponent: "notifications",
        });

        return result;
    },
});

// =============================================================================
// EMAIL TEMPLATE CRUD FACADES
// =============================================================================

export const getEmailTemplate = query({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        return ctx.runQuery(components.notifications.functions.getEmailTemplate, { id } as any);
    },
});

export const createEmailTemplate = mutation({
    args: {
        tenantId: v.string(),
        name: v.string(),
        subject: v.string(),
        body: v.string(),
        category: v.string(),
        isActive: v.boolean(),
        isDefault: v.optional(v.boolean()),
        modifiedBy: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const result = await ctx.runMutation(components.notifications.functions.createEmailTemplate, args);
        await withAudit(ctx, {
            tenantId: args.tenantId,
            entityType: "email_template",
            entityId: (result as any).id ?? (result as any)._id ?? "unknown",
            action: "created",
            sourceComponent: "notifications",
            newState: { name: args.name, category: args.category },
        });

        await emitEvent(ctx, "notifications.emailTemplate.created", args.tenantId, "notifications", {
            templateId: (result as any).id ?? (result as any)._id ?? "unknown", name: args.name,
        });

        return result;
    },
});

export const updateEmailTemplate = mutation({
    args: {
        id: v.string(),
        name: v.optional(v.string()),
        subject: v.optional(v.string()),
        body: v.optional(v.string()),
        category: v.optional(v.string()),
        isActive: v.optional(v.boolean()),
        modifiedBy: v.optional(v.string()),
        sendCount: v.optional(v.number()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.runQuery(components.notifications.functions.getEmailTemplate, { id: args.id } as any);
        if (existing) {
            await rateLimit(ctx, { name: "mutateNotification", key: rateLimitKeys.tenant((existing as any).tenantId ?? "system"), throws: true });
        }
        const result = await ctx.runMutation(components.notifications.functions.updateEmailTemplate, args as any);
        await withAudit(ctx, {
            tenantId: (existing as any)?.tenantId ?? "system",
            entityType: "email_template",
            entityId: args.id,
            action: "updated",
            sourceComponent: "notifications",
            newState: { name: args.name, isActive: args.isActive },
        });

        await emitEvent(ctx, "notifications.emailTemplate.updated", (existing as any)?.tenantId ?? "system", "notifications", {
            templateId: args.id,
        });

        return result;
    },
});

export const deleteEmailTemplate = mutation({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        const existing = await ctx.runQuery(components.notifications.functions.getEmailTemplate, { id } as any);
        if (existing) {
            await rateLimit(ctx, { name: "mutateNotification", key: rateLimitKeys.tenant((existing as any).tenantId ?? "system"), throws: true });
        }
        const result = await ctx.runMutation(components.notifications.functions.deleteEmailTemplate, { id } as any);
        await withAudit(ctx, {
            tenantId: (existing as any)?.tenantId ?? "system",
            entityType: "email_template",
            entityId: id,
            action: "deleted",
            sourceComponent: "notifications",
        });

        await emitEvent(ctx, "notifications.emailTemplate.deleted", (existing as any)?.tenantId ?? "system", "notifications", {
            templateId: id,
        });

        return result;
    },
});

// =============================================================================
// FORM DEFINITION CRUD FACADES
// =============================================================================

export const getFormDefinition = query({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        return ctx.runQuery(components.notifications.functions.getFormDefinition, { id } as any);
    },
});

export const createFormDefinition = mutation({
    args: {
        tenantId: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        category: v.string(),
        fields: v.array(v.object({
            id: v.string(),
            type: v.string(),
            label: v.string(),
            required: v.boolean(),
            options: v.optional(v.array(v.string())),
        })),
        isPublished: v.boolean(),
        successMessage: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const result = await ctx.runMutation(components.notifications.functions.createFormDefinition, args as any);
        await withAudit(ctx, {
            tenantId: args.tenantId,
            entityType: "formDefinition",
            entityId: (result as any).id ?? (result as any)._id ?? "",
            action: "created",
            sourceComponent: "notifications",
            newState: { name: args.name, category: args.category },
        });

        await emitEvent(ctx, "notifications.formDefinition.created", args.tenantId, "notifications", {
            formDefinitionId: (result as any).id ?? (result as any)._id ?? "", name: args.name,
        });

        return result;
    },
});

export const updateFormDefinition = mutation({
    args: {
        id: v.string(),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
        fields: v.optional(v.array(v.object({
            id: v.string(),
            type: v.string(),
            label: v.string(),
            required: v.boolean(),
            options: v.optional(v.array(v.string())),
        }))),
        isPublished: v.optional(v.boolean()),
        successMessage: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.runQuery(components.notifications.functions.getFormDefinition, { id: args.id } as any);
        if (existing) {
            await rateLimit(ctx, { name: "mutateNotification", key: rateLimitKeys.tenant((existing as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.notifications.functions.updateFormDefinition, args as any);
        await withAudit(ctx, {
            tenantId: (existing as any)?.tenantId ?? "",
            entityType: "formDefinition",
            entityId: args.id,
            action: "updated",
            sourceComponent: "notifications",
        });

        await emitEvent(ctx, "notifications.formDefinition.updated", (existing as any)?.tenantId ?? "", "notifications", {
            formDefinitionId: args.id,
        });

        return result;
    },
});

export const deleteFormDefinition = mutation({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        const existing = await ctx.runQuery(components.notifications.functions.getFormDefinition, { id } as any);
        if (existing) {
            await rateLimit(ctx, { name: "mutateNotification", key: rateLimitKeys.tenant((existing as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.notifications.functions.deleteFormDefinition, { id } as any);
        await withAudit(ctx, {
            tenantId: (existing as any)?.tenantId ?? "",
            entityType: "formDefinition",
            entityId: id,
            action: "deleted",
            sourceComponent: "notifications",
            previousState: { name: (existing as any)?.name },
        });

        await emitEvent(ctx, "notifications.formDefinition.deleted", (existing as any)?.tenantId ?? "", "notifications", {
            formDefinitionId: id,
        });

        return result;
    },
});

// =============================================================================
// SEND TEST EMAIL FACADE
// =============================================================================

export const sendTestEmail = mutation({
    args: {
        templateId: v.string(),
        recipientEmail: v.string(),
        tenantId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Get the template to find its tenantId and details
        const template = await ctx.runQuery(
            components.notifications.functions.getEmailTemplate,
            { id: args.templateId } as any
        );
        if (!template)
            return { success: false, message: "Template not found" };

        const tenantId =
            args.tenantId ?? (template as any).tenantId;

        // Increment sendCount
        await ctx.runMutation(
            components.notifications.functions.updateEmailTemplate,
            {
                id: args.templateId,
                sendCount: ((template as any).sendCount ?? 0) + 1,
            } as any
        );

        // Schedule real email send with sample variables
        await ctx.scheduler.runAfter(0, internal.email.send.send, {
            tenantId,
            templateCategory: (template as any).category,
            templateName: (template as any).name,
            recipientEmail: args.recipientEmail,
            variables: {
                user: {
                    name: "Test Bruker",
                    email: args.recipientEmail,
                },
                booking: {
                    listing: "Hovedscenen",
                    date: "01.03.2026",
                    time: "10:00 – 12:00",
                },
                tenant: { name: "Demo Venue" },
                invoice: {
                    number: "2026-001",
                    amount: "kr 2 500",
                    dueDate: "15.03.2026",
                },
            },
        });

        await withAudit(ctx, {
            tenantId,
            entityType: "email_template",
            entityId: args.templateId,
            action: "test_email_sent",
            sourceComponent: "notifications",
            newState: { recipientEmail: args.recipientEmail, templateName: (template as any).name },
        });

        await emitEvent(ctx, "notifications.testEmail.sent", tenantId, "notifications", {
            templateId: args.templateId, recipientEmail: args.recipientEmail,
        });

        return {
            success: true,
            message: `Test-e-post sendt til ${args.recipientEmail} med mal "${(template as any).name}"`,
        };
    },
});

// =============================================================================
// SEND EMAIL FACADE (manual dispatch)
// =============================================================================

export const sendEmail = mutation({
    args: {
        tenantId: v.string(),
        templateCategory: v.string(),
        templateName: v.optional(v.string()),
        recipientEmail: v.string(),
        recipientName: v.optional(v.string()),
        userId: v.optional(v.string()),
        variables: v.any(),
    },
    handler: async (ctx, args) => {
        await ctx.scheduler.runAfter(0, internal.email.send.send, {
            tenantId: args.tenantId,
            templateCategory: args.templateCategory,
            templateName: args.templateName,
            recipientEmail: args.recipientEmail,
            recipientName: args.recipientName,
            userId: args.userId,
            variables: args.variables,
        });
        await withAudit(ctx, {
            tenantId: args.tenantId,
            entityType: "email",
            entityId: args.recipientEmail,
            action: "email_queued",
            sourceComponent: "notifications",
            newState: { templateCategory: args.templateCategory, recipientEmail: args.recipientEmail },
        });

        await emitEvent(ctx, "notifications.email.queued", args.tenantId, "notifications", {
            recipientEmail: args.recipientEmail, templateCategory: args.templateCategory,
        });

        return { success: true, message: "Email queued" };
    },
});
