/**
 * Reminders Facade — Scheduled Event Reminders
 *
 * Manages scheduled reminders for upcoming performances.
 * Uses the existing notification system to deliver reminders via email/SMS/push.
 * Reminders are configured per performance with an offset (hours before event).
 */

import { mutation, query, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { requireActiveUser } from "../lib/auth";
import { rateLimit, rateLimitKeys } from "../lib/rateLimits";
import { withAudit } from "../lib/auditHelpers";
import { emitEvent } from "../lib/eventBus";

// =============================================================================
// QUERY FACADES
// =============================================================================

/**
 * List reminders configured for a performance.
 */
export const listReminders = query({
    args: {
        tenantId: v.id("tenants"),
        performanceId: v.optional(v.string()),
    },
    handler: async (ctx, { tenantId, performanceId }) => {
        if (performanceId) {
            return ctx.db
                .query("outboxEvents")
                .withIndex("by_topic", (q) =>
                    q.eq("topic", "reminders.scheduled").eq("status", "pending")
                )
                .collect()
                .then((events) =>
                    events.filter(
                        (e) =>
                            (e.payload as any)?.tenantId === (tenantId as string) &&
                            (e.payload as any)?.performanceId === performanceId
                    )
                );
        }

        return ctx.db
            .query("outboxEvents")
            .withIndex("by_topic", (q) =>
                q.eq("topic", "reminders.scheduled").eq("status", "pending")
            )
            .collect()
            .then((events) =>
                events.filter((e) => (e.payload as any)?.tenantId === (tenantId as string))
            );
    },
});

// =============================================================================
// MUTATION FACADES
// =============================================================================

/**
 * Schedule a reminder for a performance.
 */
export const scheduleReminder = mutation({
    args: {
        tenantId: v.id("tenants"),
        performanceId: v.string(),
        performanceTitle: v.string(),
        performanceDate: v.number(),
        offsetHours: v.number(),
        channel: v.string(),
        templateId: v.optional(v.string()),
        customMessage: v.optional(v.string()),
        createdBy: v.id("users"),
    },
    handler: async (ctx, args) => {
        await requireActiveUser(ctx, args.createdBy);

        await rateLimit(ctx, {
            name: "mutateResale",
            key: rateLimitKeys.tenant(args.tenantId as string),
            throws: true,
        });

        const MILLISECONDS_PER_HOUR = 3600000;
        const triggerAt = args.performanceDate - args.offsetHours * MILLISECONDS_PER_HOUR;

        if (triggerAt < Date.now()) {
            throw new Error("Reminder trigger time is in the past");
        }

        const id = await ctx.db.insert("outboxEvents", {
            topic: "reminders.scheduled",
            tenantId: args.tenantId as string,
            sourceComponent: "reminders",
            payload: {
                tenantId: args.tenantId as string,
                performanceId: args.performanceId,
                performanceTitle: args.performanceTitle,
                performanceDate: args.performanceDate,
                offsetHours: args.offsetHours,
                channel: args.channel,
                templateId: args.templateId,
                customMessage: args.customMessage,
                triggerAt,
                createdBy: args.createdBy as string,
            },
            status: "pending",
            retryCount: 0,
            createdAt: Date.now(),
        });

        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: args.createdBy as string,
            entityType: "reminder",
            entityId: id as string,
            action: "scheduled",
            newState: {
                performanceId: args.performanceId,
                offsetHours: args.offsetHours,
                channel: args.channel,
                triggerAt: new Date(triggerAt).toISOString(),
            },
            sourceComponent: "reminders",
        });

        await emitEvent(ctx, "reminders.reminder.scheduled", args.tenantId as string, "reminders", {
            reminderId: id as string,
            performanceId: args.performanceId,
            triggerAt,
        });

        return { id: id as string, triggerAt };
    },
});

/**
 * Cancel a scheduled reminder.
 */
export const cancelReminder = mutation({
    args: {
        tenantId: v.id("tenants"),
        reminderId: v.id("outboxEvents"),
        cancelledBy: v.id("users"),
    },
    handler: async (ctx, { tenantId, reminderId, cancelledBy }) => {
        await requireActiveUser(ctx, cancelledBy);

        const event = await ctx.db.get(reminderId);
        if (!event || event.topic !== "reminders.scheduled") {
            throw new Error("Reminder not found");
        }

        await ctx.db.patch(reminderId, {
            status: "processed",
            processedAt: Date.now(),
            error: "cancelled_by_admin",
        });

        await withAudit(ctx, {
            tenantId: tenantId as string,
            userId: cancelledBy as string,
            entityType: "reminder",
            entityId: reminderId as string,
            action: "cancelled",
            sourceComponent: "reminders",
        });

        return { success: true };
    },
});

/**
 * Process due reminders (called by cron).
 */
export const processDueReminders = internalMutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();

        const pendingReminders = await ctx.db
            .query("outboxEvents")
            .withIndex("by_topic", (q) =>
                q.eq("topic", "reminders.scheduled").eq("status", "pending")
            )
            .collect();

        let processedCount = 0;

        for (const reminder of pendingReminders) {
            const payload = reminder.payload as any;
            if (!payload?.triggerAt || payload.triggerAt > now) continue;

            await ctx.db.patch(reminder._id, {
                status: "processing",
                lastAttemptAt: now,
            });

            await ctx.db.insert("outboxEvents", {
                topic: "notifications.send_bulk",
                tenantId: payload.tenantId,
                sourceComponent: "reminders",
                payload: {
                    type: "event_reminder",
                    performanceId: payload.performanceId,
                    performanceTitle: payload.performanceTitle,
                    channel: payload.channel,
                    message: payload.customMessage || `Paaminnelse om arrangement: ${payload.performanceTitle}`,
                    templateId: payload.templateId,
                },
                status: "pending",
                retryCount: 0,
                createdAt: now,
            });

            await ctx.db.patch(reminder._id, {
                status: "processed",
                processedAt: now,
            });

            processedCount++;
        }

        return { processedCount };
    },
});
