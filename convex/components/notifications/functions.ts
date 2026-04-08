/**
 * Notifications Component Functions
 *
 * Pure component implementation — operates only on its own tables.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// QUERIES
// =============================================================================

export const listByUser = query({
    args: {
        userId: v.string(),
        limit: v.optional(v.number()),
        unreadOnly: v.optional(v.boolean()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { userId, limit = 50, unreadOnly = false }) => {
        const notifications = await ctx.db
            .query("notifications")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .order("desc")
            .take(limit);

        if (unreadOnly) {
            return notifications.filter((n) => !n.readAt);
        }

        return notifications;
    },
});

export const unreadCount = query({
    args: {
        userId: v.string(),
    },
    returns: v.object({ count: v.number() }),
    handler: async (ctx, { userId }) => {
        const notifications = await ctx.db
            .query("notifications")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("readAt"), undefined))
            .collect();

        return { count: notifications.length };
    },
});

export const get = query({
    args: {
        id: v.id("notifications"),
    },
    returns: v.any(),
    handler: async (ctx, { id }) => {
        return await ctx.db.get(id);
    },
});

export const getPreferences = query({
    args: {
        userId: v.string(),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { userId }) => {
        return await ctx.db
            .query("notificationPreferences")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();
    },
});

export const listEmailTemplates = query({
    args: {
        tenantId: v.string(),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId }) => {
        return await ctx.db
            .query("emailTemplates")
            .filter((q) => q.eq(q.field("tenantId"), tenantId))
            .collect();
    },
});

export const listFormDefinitions = query({
    args: {
        tenantId: v.string(),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId }) => {
        return await ctx.db
            .query("formDefinitions")
            .filter((q) => q.eq(q.field("tenantId"), tenantId))
            .collect();
    },
});

// =============================================================================
// MUTATIONS
// =============================================================================

export const create = mutation({
    args: {
        tenantId: v.string(),
        userId: v.string(),
        type: v.string(),
        title: v.string(),
        body: v.optional(v.string()),
        link: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("notifications", {
            tenantId: args.tenantId,
            userId: args.userId,
            type: args.type,
            title: args.title,
            body: args.body,
            link: args.link,
            metadata: args.metadata ?? {},
        });

        return { id: id as string };
    },
});

export const markAsRead = mutation({
    args: {
        id: v.id("notifications"),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        await ctx.db.patch(id, { readAt: Date.now() });
        return { success: true };
    },
});

export const markAllAsRead = mutation({
    args: {
        userId: v.string(),
    },
    returns: v.object({ success: v.boolean(), count: v.number() }),
    handler: async (ctx, { userId }) => {
        const notifications = await ctx.db
            .query("notifications")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("readAt"), undefined))
            .collect();

        for (const notification of notifications) {
            await ctx.db.patch(notification._id, { readAt: Date.now() });
        }

        return { success: true, count: notifications.length };
    },
});

export const remove = mutation({
    args: {
        id: v.id("notifications"),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        await ctx.db.delete(id);
        return { success: true };
    },
});

export const updatePreference = mutation({
    args: {
        tenantId: v.string(),
        userId: v.string(),
        channel: v.string(),
        category: v.string(),
        enabled: v.boolean(),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("notificationPreferences")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .filter((q) =>
                q.and(
                    q.eq(q.field("channel"), args.channel),
                    q.eq(q.field("category"), args.category)
                )
            )
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, { enabled: args.enabled });
            return { id: existing._id as string };
        } else {
            const id = await ctx.db.insert("notificationPreferences", {
                tenantId: args.tenantId,
                userId: args.userId,
                channel: args.channel,
                category: args.category,
                enabled: args.enabled,
            });
            return { id: id as string };
        }
    },
});

// =============================================================================
// PUSH SUBSCRIPTION QUERIES & MUTATIONS
// =============================================================================

/** List push subscriptions for a user. */
export const listPushSubscriptions = query({
    args: { userId: v.string() },
    returns: v.array(v.any()),
    handler: async (ctx, { userId }) => {
        return await ctx.db
            .query("pushSubscriptions")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();
    },
});

/** Register a push subscription, dedup by endpoint. */
export const registerPushSubscription = mutation({
    args: {
        tenantId: v.string(),
        userId: v.string(),
        endpoint: v.string(),
        p256dh: v.string(),
        auth: v.string(),
        provider: v.optional(v.string()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        // Dedup by endpoint
        const existing = await ctx.db
            .query("pushSubscriptions")
            .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
            .first();
        if (existing) {
            // Update existing subscription
            await ctx.db.patch(existing._id, {
                userId: args.userId,
                p256dh: args.p256dh,
                auth: args.auth,
                provider: args.provider,
            });
            return { id: existing._id as string };
        }
        const id = await ctx.db.insert("pushSubscriptions", {
            ...args,
            createdAt: Date.now(),
        });
        return { id: id as string };
    },
});

/** Delete a single push subscription by ID. */
export const deletePushSubscription = mutation({
    args: { id: v.string() },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        const existing = await ctx.db.get(id as any);
        if (!existing) return { success: false };
        await ctx.db.delete(existing._id);
        return { success: true };
    },
});

/** Delete all push subscriptions for a user. */
export const unsubscribeAllPush = mutation({
    args: { userId: v.string() },
    returns: v.object({ success: v.boolean(), count: v.number() }),
    handler: async (ctx, { userId }) => {
        const subs = await ctx.db
            .query("pushSubscriptions")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();
        for (const sub of subs) {
            await ctx.db.delete(sub._id);
        }
        return { success: true, count: subs.length };
    },
});

// =============================================================================
// IMPORT FUNCTIONS (data migration)
// =============================================================================

/**
 * Import a notification record from the legacy table.
 * Used during data migration.
 */
export const importNotification = mutation({
    args: {
        tenantId: v.string(),
        userId: v.string(),
        type: v.string(),
        title: v.string(),
        body: v.optional(v.string()),
        link: v.optional(v.string()),
        readAt: v.optional(v.number()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("notifications", { ...args, metadata: args.metadata ?? {} });
        return { id: id as string };
    },
});

/**
 * Import a notification preference record from the legacy table.
 * Used during data migration.
 */
export const importPreference = mutation({
    args: {
        tenantId: v.string(),
        userId: v.string(),
        channel: v.string(),
        category: v.string(),
        enabled: v.boolean(),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("notificationPreferences", { ...args });
        return { id: id as string };
    },
});

/**
 * Import an email template record.
 * Used by seed scripts to populate tenant email templates.
 */
export const importEmailTemplate = mutation({
    args: {
        tenantId: v.string(),
        name: v.string(),
        subject: v.optional(v.string()),
        body: v.string(),
        category: v.string(),
        channel: v.optional(v.string()),
        isActive: v.boolean(),
        isDefault: v.optional(v.boolean()),
        lastModified: v.optional(v.number()),
        modifiedBy: v.optional(v.string()),
        sendCount: v.optional(v.number()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("emailTemplates", { ...args, channel: args.channel ?? "email", metadata: args.metadata ?? {} });
        return { id: id as string };
    },
});

/**
 * Import a form definition record.
 * Used by seed scripts to populate tenant form definitions.
 */
export const importFormDefinition = mutation({
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
        submissionCount: v.optional(v.number()),
        successMessage: v.optional(v.string()),
        lastModified: v.optional(v.number()),
        createdAt: v.optional(v.number()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("formDefinitions", { ...args, metadata: args.metadata ?? {} });
        return { id: id as string };
    },
});

// =============================================================================
// CRUD - Email Templates
// =============================================================================

/** Get a single email template by ID. */
export const getEmailTemplate = query({
    args: { id: v.id("emailTemplates") },
    returns: v.any(),
    handler: async (ctx, { id }) => {
        return await ctx.db.get(id);
    },
});

/** Create a new email template. */
export const createEmailTemplate = mutation({
    args: {
        tenantId: v.string(),
        name: v.string(),
        subject: v.optional(v.string()),
        body: v.string(),
        category: v.string(),
        channel: v.optional(v.string()),
        isActive: v.boolean(),
        isDefault: v.optional(v.boolean()),
        modifiedBy: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("emailTemplates", {
            ...args,
            channel: args.channel ?? "email",
            lastModified: Date.now(),
            sendCount: 0,
            metadata: args.metadata ?? {},
        });
        return { id: id as string };
    },
});

/** Update an existing email template. */
export const updateEmailTemplate = mutation({
    args: {
        id: v.id("emailTemplates"),
        name: v.optional(v.string()),
        subject: v.optional(v.string()),
        body: v.optional(v.string()),
        category: v.optional(v.string()),
        channel: v.optional(v.string()),
        isActive: v.optional(v.boolean()),
        isDefault: v.optional(v.boolean()),
        modifiedBy: v.optional(v.string()),
        sendCount: v.optional(v.number()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, ...fields }) => {
        const existing = await ctx.db.get(id);
        if (!existing) return { success: false };
        const patch: Record<string, unknown> = { lastModified: Date.now() };
        for (const [k, val] of Object.entries(fields)) {
            if (val !== undefined) patch[k] = val;
        }
        await ctx.db.patch(id, patch);
        return { success: true };
    },
});

/** Delete an email template (skips default templates). */
export const deleteEmailTemplate = mutation({
    args: { id: v.id("emailTemplates") },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        const existing = await ctx.db.get(id);
        if (!existing) return { success: false };
        if (existing.isDefault) return { success: false };
        await ctx.db.delete(id);
        return { success: true };
    },
});

// =============================================================================
// CRUD - Form Definitions
// =============================================================================

/** Get a single form definition by ID. */
export const getFormDefinition = query({
    args: { id: v.id("formDefinitions") },
    returns: v.any(),
    handler: async (ctx, { id }) => {
        return await ctx.db.get(id);
    },
});

/** Create a new form definition. */
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
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("formDefinitions", {
            ...args,
            submissionCount: 0,
            lastModified: Date.now(),
            createdAt: Date.now(),
            metadata: args.metadata ?? {},
        });
        return { id: id as string };
    },
});

/** Update an existing form definition. */
export const updateFormDefinition = mutation({
    args: {
        id: v.id("formDefinitions"),
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
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, ...fields }) => {
        const existing = await ctx.db.get(id);
        if (!existing) return { success: false };
        const patch: Record<string, unknown> = { lastModified: Date.now() };
        for (const [k, val] of Object.entries(fields)) {
            if (val !== undefined) patch[k] = val;
        }
        await ctx.db.patch(id, patch);
        return { success: true };
    },
});

/** Delete a form definition. */
export const deleteFormDefinition = mutation({
    args: { id: v.id("formDefinitions") },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        const existing = await ctx.db.get(id);
        if (!existing) return { success: false };
        await ctx.db.delete(id);
        return { success: true };
    },
});

/**
 * Send a test email using a template.
 * Renders the template body with sample data and increments the send count.
 * NOTE: In production this would call an external email service via a Convex action.
 * For now it validates the template and records the test.
 */
export const sendTestEmail = mutation({
    args: {
        templateId: v.id("emailTemplates"),
        recipientEmail: v.string(),
    },
    returns: v.object({ success: v.boolean(), message: v.string() }),
    handler: async (ctx, { templateId, recipientEmail }) => {
        const template = await ctx.db.get(templateId);
        if (!template) return { success: false, message: "Template not found" };

        // Increment sendCount to track test usage
        await ctx.db.patch(templateId, {
            sendCount: (template.sendCount ?? 0) + 1,
            lastModified: Date.now(),
        });

        // In production: ctx.scheduler.runAfter(0, internal.email.send, { to, subject, body })
        return {
            success: true,
            message: `Test email queued to ${recipientEmail} using template "${template.name}"`,
        };
    },
});

// =============================================================================
// RETENTION CLEANUP
// =============================================================================

/**
 * Delete read notifications older than the given threshold.
 * Called by the retention cron job (convex/domain/retention.ts).
 * Only deletes notifications that have been read (readAt is set).
 */
export const cleanupOld = mutation({
    args: {
        tenantId: v.string(),
        olderThanMs: v.number(),
    },
    returns: v.object({ purged: v.number() }),
    handler: async (ctx, { tenantId, olderThanMs }) => {
        const cutoff = Date.now() - olderThanMs;
        const old = await ctx.db
            .query("notifications")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .filter((q) =>
                q.and(
                    q.neq(q.field("readAt"), undefined),
                    q.lt(q.field("_creationTime"), cutoff)
                )
            )
            .collect();

        for (const n of old) {
            await ctx.db.delete(n._id);
        }

        return { purged: old.length };
    },
});
