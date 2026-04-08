/**
 * Notification Dispatch Facade
 *
 * High-level notification functions that resolve user contact info
 * and dispatch via SMS gateway or email transport.
 *
 * Template rendering is inlined via direct import from messaging/templates.ts.
 * User lookup uses internal.domain.userLookup.resolveUser (separate file
 * to avoid Convex circular type inference).
 *
 * Usage:
 *   await ctx.scheduler.runAfter(0, internal.domain.messagingNotify.sendNotification, {
 *     tenantId, to: "+4791234567", channel: "sms",
 *     template: "order_confirmation", vars: { ... }
 *   });
 *
 *   await ctx.scheduler.runAfter(0, internal.domain.messagingNotify.sendToUser, {
 *     tenantId, userId, template: "event_reminder", vars: { ... }
 *   });
 */

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import type { ActionCtx } from "../_generated/server";
import {
    renderTemplate,
    type Locale,
    type Channel,
    type TemplateVars,
} from "../messaging/templates";

// =============================================================================
// DISPATCH HELPER (plain function — not a Convex function)
// =============================================================================

async function dispatch(
    ctx: ActionCtx,
    opts: {
        tenantId: string;
        to: string;
        channel: Channel;
        template: string;
        locale?: string;
        vars: TemplateVars;
        userId?: string;
        category?: string;
    }
): Promise<Record<string, any>> {
    const locale = (opts.locale ?? "nb") as Locale;

    let rendered;
    try {
        rendered = renderTemplate(opts.template as any, opts.channel, locale, opts.vars);
    } catch (error) {
        return {
            success: false,
            reason: "template_error",
            error: error instanceof Error ? error.message : String(error),
        };
    }

    if (opts.channel === "sms") {
        return await ctx.runAction(internal.sms.gateway.sendMessage, {
            tenantId: opts.tenantId,
            to: opts.to,
            body: rendered.body,
            userId: opts.userId,
            category: opts.category,
        });
    } else {
        return await ctx.runAction(internal.lib.email.sendEmail, {
            tenantId: opts.tenantId,
            to: opts.to,
            subject: rendered.subject ?? "Notification",
            html: rendered.body,
            userId: opts.userId,
            emailCategory: opts.category,
        });
    }
}

// =============================================================================
// SEND NOTIFICATION — explicit recipient
// =============================================================================

/**
 * Send a templated notification via SMS or email to an explicit recipient.
 */
export const sendNotification = internalAction({
    args: {
        tenantId: v.string(),
        to: v.string(),
        channel: v.union(v.literal("sms"), v.literal("email")),
        template: v.string(),
        locale: v.optional(v.string()),
        vars: v.any(),
        userId: v.optional(v.string()),
        category: v.optional(v.string()),
    },
    returns: v.any(),
    handler: async (ctx, args): Promise<any> => {
        return await dispatch(ctx, {
            tenantId: args.tenantId,
            to: args.to,
            channel: args.channel as Channel,
            template: args.template,
            locale: args.locale ?? undefined,
            vars: args.vars as TemplateVars,
            userId: args.userId ?? undefined,
            category: args.category ?? undefined,
        });
    },
});

// =============================================================================
// SEND TO USER — resolve contact info, then dispatch
// =============================================================================

/**
 * Send a notification to a user on their preferred channel.
 */
export const sendToUser = internalAction({
    args: {
        tenantId: v.string(),
        userId: v.string(),
        template: v.string(),
        vars: v.any(),
        channel: v.optional(v.union(v.literal("sms"), v.literal("email"))),
        locale: v.optional(v.string()),
        category: v.optional(v.string()),
    },
    returns: v.any(),
    handler: async (ctx, args): Promise<any> => {
        const user = await ctx.runMutation(
            internal.domain.userLookup.resolveUser,
            { userId: args.userId }
        );

        if (!user) {
            return { success: false, reason: "user_not_found" };
        }

        const channel = (args.channel ?? "email") as Channel;
        const to = channel === "sms" ? user.phoneNumber : user.email;

        if (!to) {
            return { success: false, reason: `no_${channel}_for_user` };
        }

        return await dispatch(ctx, {
            tenantId: args.tenantId,
            to,
            channel,
            template: args.template,
            locale: args.locale ?? undefined,
            vars: args.vars as TemplateVars,
            userId: args.userId,
            category: args.category ?? undefined,
        });
    },
});

// =============================================================================
// MULTI-CHANNEL — send on ALL available channels for a user
// =============================================================================

/**
 * Send a notification on ALL channels available for a user.
 * Useful for critical messages (order confirmations, security alerts).
 */
export const sendMultiChannel = internalAction({
    args: {
        tenantId: v.string(),
        userId: v.string(),
        template: v.string(),
        vars: v.any(),
        locale: v.optional(v.string()),
        category: v.optional(v.string()),
    },
    returns: v.any(),
    handler: async (ctx, args): Promise<any> => {
        const user = await ctx.runMutation(
            internal.domain.userLookup.resolveUser,
            { userId: args.userId }
        );

        if (!user) {
            return { success: false, reason: "user_not_found" };
        }

        const results: Record<string, any> = {};

        if (user.email) {
            results.email = await dispatch(ctx, {
                tenantId: args.tenantId,
                to: user.email,
                channel: "email",
                template: args.template,
                locale: args.locale ?? undefined,
                vars: args.vars as TemplateVars,
                userId: args.userId,
                category: args.category ?? undefined,
            });
        }

        if (user.phoneNumber) {
            results.sms = await dispatch(ctx, {
                tenantId: args.tenantId,
                to: user.phoneNumber,
                channel: "sms",
                template: args.template,
                locale: args.locale ?? undefined,
                vars: args.vars as TemplateVars,
                userId: args.userId,
                category: args.category ?? undefined,
            });
        }

        return { success: true, channels: results };
    },
});
