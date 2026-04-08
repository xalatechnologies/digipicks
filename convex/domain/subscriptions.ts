/**
 * Subscriptions Facade — Creator subscription management
 *
 * Thin facade over the subscriptions component.
 * Handles:
 *   - Public tier listing for pricing page
 *   - Subscription initiation (Stripe checkout redirect)
 *   - Subscription cancellation
 *   - Subscription status queries
 *   - Creator Connect account queries
 *   - Audit + event bus integration
 */

import { action, internalMutation, mutation, query } from "../_generated/server";
import { components } from "../_generated/api";
import { api, internal } from "../_generated/api";
import { v, ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { requireActiveUser } from "../lib/auth";
import { rateLimit, rateLimitKeys } from "../lib/rateLimits";
import { withAudit } from "../lib/auditHelpers";
import { emitEvent } from "../lib/eventBus";

// =============================================================================
// QUERY FACADES
// =============================================================================

/**
 * List publicly visible, active membership tiers for a tenant.
 * Used by the web pricing page — no auth required.
 */
export const listPublicTiers = query({
    args: { tenantId: v.optional(v.string()) },
    handler: async (ctx, { tenantId }) => {
        if (!tenantId) return [];

        const tiers = await ctx.runQuery(components.subscriptions.functions.listTiers, {
            tenantId,
            publicOnly: true,
            activeOnly: true,
        });

        return tiers;
    },
});

/**
 * Get a single tier by ID.
 */
export const getTier = query({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        return ctx.runQuery(components.subscriptions.functions.getTier, { id: id as any });
    },
});

/**
 * Get the current user's subscription to a specific creator.
 */
export const getMySubscription = query({
    args: {
        userId: v.id("users"),
        creatorId: v.string(),
    },
    handler: async (ctx, { userId, creatorId }) => {
        const subscription = await ctx.runQuery(
            components.subscriptions.functions.getUserCreatorSubscription,
            { userId: userId as string, creatorId }
        );

        if (!subscription) return null;

        // Enrich with tier data
        const tier = subscription.tierId
            ? await ctx.runQuery(components.subscriptions.functions.getTier, {
                  id: subscription.tierId as any,
              }).catch(() => null)
            : null;

        return {
            ...subscription,
            tier: tier ? { name: tier.name, slug: tier.slug, price: tier.price, currency: tier.currency } : null,
        };
    },
});

/**
 * Check if user has an active subscription to a creator.
 */
export const isSubscribed = query({
    args: {
        userId: v.optional(v.string()),
        creatorId: v.string(),
    },
    handler: async (ctx, { userId, creatorId }) => {
        if (!userId) return false;

        const subscription = await ctx.runQuery(
            components.subscriptions.functions.getUserCreatorSubscription,
            { userId, creatorId }
        );

        return subscription?.status === "active";
    },
});

/**
 * List subscribers for a creator.
 */
export const listCreatorSubscribers = query({
    args: {
        tenantId: v.id("tenants"),
        creatorId: v.id("users"),
        status: v.optional(v.string()),
    },
    handler: async (ctx, { tenantId: _tenantId, creatorId, status }) => {
        const subscribers = await ctx.runQuery(
            components.subscriptions.functions.listCreatorSubscribers,
            { creatorId: creatorId as string, status }
        );

        // Enrich with user data
        const enriched = await Promise.all(
            (subscribers as any[]).map(async (sub: any) => {
                const user = sub.userId
                    ? await ctx.db.get(sub.userId as Id<"users">).catch(() => null)
                    : null;
                return {
                    ...sub,
                    user: user
                        ? { id: user._id, name: user.name, displayName: user.displayName }
                        : null,
                };
            })
        );

        return enriched;
    },
});

/**
 * Get creator's Connect account status.
 */
export const getCreatorAccount = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        return ctx.runQuery(
            components.subscriptions.functions.getCreatorAccount,
            { userId: userId as string }
        );
    },
});

// =============================================================================
// ACTION FACADES (Stripe interactions)
// =============================================================================

/**
 * Initiate a subscription checkout via Stripe.
 * Returns the Stripe checkout URL for redirect.
 */
export const initiateSubscription = action({
    args: {
        tenantId: v.id("tenants"),
        userId: v.id("users"),
        tierId: v.string(),
        creatorId: v.string(),
        customerEmail: v.optional(v.string()),
        returnUrl: v.string(),
        cancelUrl: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<{ sessionId: string; url: string; reference: string }> => {
        // Get the tier to find Stripe price ID
        const tier: any = await ctx.runQuery(api.domain.subscriptions.getTier, {
            id: args.tierId,
        });

        if (!tier) {
            throw new ConvexError({
                type: "about:blank",
                title: "Tier not found",
                status: 404,
                detail: `Subscription tier ${args.tierId} not found`,
            });
        }

        if (!tier.stripePriceId) {
            throw new ConvexError({
                type: "about:blank",
                title: "Tier not configured for Stripe",
                status: 400,
                detail: "This tier does not have a Stripe price configured",
            });
        }

        // Check if user already has an active subscription to this creator
        const existing: any = await ctx.runQuery(api.domain.subscriptions.isSubscribed, {
            userId: args.userId as string,
            creatorId: args.creatorId,
        });

        if (existing) {
            throw new ConvexError({
                type: "about:blank",
                title: "Already subscribed",
                status: 409,
                detail: "You already have an active subscription to this creator",
            });
        }

        // Create Stripe subscription checkout
        const result: { sessionId: string; url: string; reference: string } = await ctx.runAction(api.billing.stripe.createSubscriptionCheckout, {
            tenantId: args.tenantId,
            userId: args.userId,
            tierId: args.tierId,
            creatorId: args.creatorId,
            stripePriceId: tier.stripePriceId,
            customerEmail: args.customerEmail,
            returnUrl: args.returnUrl,
            cancelUrl: args.cancelUrl,
        });

        return result;
    },
});

/**
 * Cancel a subscription via Stripe.
 */
export const cancelSubscription = action({
    args: {
        userId: v.id("users"),
        creatorId: v.string(),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const subscription: any = await ctx.runQuery(api.domain.subscriptions.getMySubscription, {
            userId: args.userId,
            creatorId: args.creatorId,
        });

        if (!subscription || subscription.status !== "active") {
            throw new ConvexError({
                type: "about:blank",
                title: "No active subscription",
                status: 404,
                detail: "No active subscription found to cancel",
            });
        }

        if (!subscription.stripeSubscriptionId) {
            throw new ConvexError({
                type: "about:blank",
                title: "No Stripe subscription",
                status: 400,
                detail: "This subscription is not managed by Stripe",
            });
        }

        // Cancel at period end via Stripe API
        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey) {
            throw new ConvexError({
                type: "about:blank",
                title: "Stripe not configured",
                status: 500,
                detail: "STRIPE_SECRET_KEY environment variable is not set",
            });
        }

        const params = new URLSearchParams();
        params.append("cancel_at_period_end", "true");

        const response = await fetch(
            `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscription.stripeSubscriptionId)}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: `Bearer ${secretKey}`,
                },
                body: params.toString(),
            }
        );

        if (!response.ok) {
            const text = await response.text();
            throw new ConvexError({
                type: "about:blank",
                title: "Stripe cancel failed",
                status: response.status,
                detail: text,
            });
        }

        // Update local membership status
        await ctx.runMutation(internal.domain.subscriptions.markCancelled, {
            membershipId: subscription._id,
            userId: args.userId as string,
            reason: args.reason,
        });

        return { success: true, cancelAtPeriodEnd: true };
    },
});

/**
 * Set up Stripe Connect for a creator.
 * Returns the onboarding URL.
 */
export const setupCreatorPayouts = action({
    args: {
        tenantId: v.id("tenants"),
        userId: v.id("users"),
        email: v.string(),
        refreshUrl: v.string(),
        returnUrl: v.string(),
    },
    handler: async (ctx, args) => {
        // Create or get Connect account
        const accountResult: any = await ctx.runAction(api.billing.stripeConnect.createConnectAccount, {
            tenantId: args.tenantId,
            userId: args.userId,
            email: args.email,
        });

        // Generate onboarding link
        const linkResult: any = await ctx.runAction(api.billing.stripeConnect.createAccountLink, {
            stripeAccountId: accountResult.accountId,
            refreshUrl: args.refreshUrl,
            returnUrl: args.returnUrl,
        });

        return {
            accountId: accountResult.accountId,
            onboardingUrl: linkResult.url,
            alreadyExists: accountResult.alreadyExists,
        };
    },
});

/**
 * Sync creator's Connect account status from Stripe.
 */
export const syncCreatorAccountStatus = action({
    args: { userId: v.string() },
    handler: async (ctx, { userId }): Promise<any> => {
        return ctx.runAction(api.billing.stripeConnect.syncAccountStatus, { userId });
    },
});

// =============================================================================
// INTERNAL MUTATIONS (called by actions after Stripe API calls)
// =============================================================================

export const markCancelled = internalMutation({
    args: {
        membershipId: v.string(),
        userId: v.string(),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, { membershipId, userId, reason }) => {
        const now = Date.now();

        await ctx.runMutation(components.subscriptions.functions.updateMembershipStatus, {
            id: membershipId as any,
            status: "cancelled",
            cancelledAt: now,
            cancelledBy: userId,
            cancelReason: reason,
        });

        await withAudit(ctx, {
            tenantId: "",
            userId,
            entityType: "subscription",
            entityId: membershipId,
            action: "cancelled",
            newState: { reason },
            sourceComponent: "subscriptions",
        });
    },
});
