/**
 * Webhook Subscriptions Facade — Outbound Webhooks for CRM / Make
 *
 * Manages webhook subscriptions that receive event bus events via HTTP POST.
 * Each subscription filters by event topic patterns and signs payloads with HMAC-SHA256.
 */

import { action, mutation, query, internalMutation } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { v } from "convex/values";
import { requireActiveUser } from "../lib/auth";
import { rateLimit, rateLimitKeys } from "../lib/rateLimits";
import { withAudit } from "../lib/auditHelpers";

// =============================================================================
// HELPERS
// =============================================================================

function generateSecret(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let secret = "whsec_";
    for (let i = 0; i < 32; i++) {
        secret += chars[Math.floor(Math.random() * chars.length)];
    }
    return secret;
}

// =============================================================================
// QUERY FACADES
// =============================================================================

/**
 * List webhook subscriptions for a tenant.
 */
export const listSubscriptions = query({
    args: {
        tenantId: v.id("tenants"),
    },
    handler: async (ctx, { tenantId }) => {
        return ctx.db
            .query("webhookSubscriptions")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .collect();
    },
});

/**
 * List active webhook subscriptions for a tenant (internal, used by event fan-out).
 */
export const listActiveSubscriptions = query({
    args: {
        tenantId: v.id("tenants"),
    },
    handler: async (ctx, { tenantId }) => {
        return ctx.db
            .query("webhookSubscriptions")
            .withIndex("by_active", (q) =>
                q.eq("tenantId", tenantId).eq("isActive", true)
            )
            .collect();
    },
});

// =============================================================================
// MUTATION FACADES
// =============================================================================

/**
 * Create a webhook subscription.
 */
export const createSubscription = mutation({
    args: {
        tenantId: v.id("tenants"),
        url: v.string(),
        events: v.array(v.string()),
        description: v.optional(v.string()),
        createdBy: v.id("users"),
    },
    handler: async (ctx, args) => {
        await requireActiveUser(ctx, args.createdBy);

        await rateLimit(ctx, {
            name: "mutateResale",
            key: rateLimitKeys.tenant(args.tenantId as string),
            throws: true,
        });

        const secret = generateSecret();

        const id = await ctx.db.insert("webhookSubscriptions", {
            tenantId: args.tenantId,
            url: args.url,
            events: args.events,
            secret,
            isActive: true,
            description: args.description,
            failureCount: 0,
            createdBy: args.createdBy as string,
            createdAt: Date.now(),
        });

        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: args.createdBy as string,
            entityType: "webhook_subscription",
            entityId: id as string,
            action: "created",
            newState: { url: args.url, events: args.events },
            sourceComponent: "platform",
        });

        return { id: id as string, secret };
    },
});

/**
 * Delete a webhook subscription.
 */
export const deleteSubscription = mutation({
    args: {
        tenantId: v.id("tenants"),
        subscriptionId: v.id("webhookSubscriptions"),
        deletedBy: v.id("users"),
    },
    handler: async (ctx, { tenantId, subscriptionId, deletedBy }) => {
        await requireActiveUser(ctx, deletedBy);

        const sub = await ctx.db.get(subscriptionId);
        if (!sub) {
            throw new Error("Webhook subscription not found");
        }

        await ctx.db.delete(subscriptionId);

        await withAudit(ctx, {
            tenantId: tenantId as string,
            userId: deletedBy as string,
            entityType: "webhook_subscription",
            entityId: subscriptionId as string,
            action: "deleted",
            sourceComponent: "platform",
        });

        return { success: true };
    },
});

/**
 * Toggle a subscription active/inactive.
 */
export const toggleSubscription = mutation({
    args: {
        tenantId: v.id("tenants"),
        subscriptionId: v.id("webhookSubscriptions"),
        isActive: v.boolean(),
        updatedBy: v.id("users"),
    },
    handler: async (ctx, { tenantId, subscriptionId, isActive, updatedBy }) => {
        await requireActiveUser(ctx, updatedBy);

        await ctx.db.patch(subscriptionId, { isActive });

        await withAudit(ctx, {
            tenantId: tenantId as string,
            userId: updatedBy as string,
            entityType: "webhook_subscription",
            entityId: subscriptionId as string,
            action: isActive ? "enabled" : "disabled",
            sourceComponent: "platform",
        });

        return { success: true };
    },
});

/**
 * Update delivery status (internal, called after delivery attempt).
 */
export const updateDeliveryStatus = internalMutation({
    args: {
        subscriptionId: v.id("webhookSubscriptions"),
        status: v.string(),
        incrementFailure: v.boolean(),
    },
    handler: async (ctx, { subscriptionId, status, incrementFailure }) => {
        const sub = await ctx.db.get(subscriptionId);
        if (!sub) return;

        const MAX_FAILURES = 10;
        const newFailureCount = incrementFailure ? sub.failureCount + 1 : 0;

        await ctx.db.patch(subscriptionId, {
            lastDeliveredAt: Date.now(),
            lastDeliveryStatus: status,
            failureCount: newFailureCount,
            // Auto-disable after MAX_FAILURES consecutive failures
            ...(newFailureCount >= MAX_FAILURES ? { isActive: false } : {}),
        });
    },
});

/**
 * Test a webhook subscription by sending a test event.
 */
export const testSubscription = action({
    args: {
        tenantId: v.id("tenants"),
        subscriptionId: v.id("webhookSubscriptions"),
    },
    handler: async (ctx, { tenantId, subscriptionId }) => {
        const sub: any[] = await ctx.runQuery(api.domain.webhookSubscriptions.listSubscriptions as any, {
            tenantId,
        });

        const subscription: any = sub?.find((s: any) => (s._id as string) === (subscriptionId as string));
        if (!subscription) {
            throw new Error("Webhook subscription not found");
        }

        const testPayload = {
            event: "webhook.test",
            tenantId: tenantId as string,
            timestamp: new Date().toISOString(),
            data: { message: "This is a test webhook event" },
        };

        try {
            const response = await fetch(subscription.url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Webhook-Event": "webhook.test",
                    "X-Webhook-Timestamp": String(Date.now()),
                },
                body: JSON.stringify(testPayload),
            });

            const status = response.ok ? "success" : `failed:${response.status}`;

            await ctx.runMutation(internal.domain.webhookSubscriptions.updateDeliveryStatus, {
                subscriptionId,
                status,
                incrementFailure: !response.ok,
            });

            return { success: response.ok, status: response.status };
        } catch (err: any) {
            await ctx.runMutation(internal.domain.webhookSubscriptions.updateDeliveryStatus, {
                subscriptionId,
                status: `error:${err.message}`,
                incrementFailure: true,
            });

            return { success: false, error: err.message };
        }
    },
});
