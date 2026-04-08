/**
 * Stripe Connect Integration
 *
 * Handles creator onboarding and payout setup via Stripe Connect (Standard accounts).
 * Docs: https://docs.stripe.com/connect
 *
 * Uses direct fetch() with URLSearchParams (no SDK dependency).
 */

import { action, internalMutation, internalQuery } from "../_generated/server";
import { components } from "../_generated/api";
import { v, ConvexError } from "convex/values";
import { internal } from "../_generated/api";

const STRIPE_API_BASE = "https://api.stripe.com";

function getStripeConfig() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        throw new ConvexError({
            type: "about:blank",
            title: "Stripe not configured",
            status: 500,
            detail: "STRIPE_SECRET_KEY environment variable is not set",
        });
    }
    return { secretKey };
}

// =============================================================================
// Create Connect Account (action — initiates creator onboarding)
// =============================================================================

export const createConnectAccount = action({
    args: {
        tenantId: v.id("tenants"),
        userId: v.id("users"),
        email: v.string(),
        country: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<{ accountId: string; alreadyExists: boolean }> => {
        const { secretKey } = getStripeConfig();

        // Check if creator already has a Connect account
        const existing: any = await ctx.runQuery(
            internal.billing.stripeConnect.getCreatorAccountInternal,
            { userId: args.userId as string }
        );
        if (existing) {
            return {
                accountId: existing.stripeAccountId,
                alreadyExists: true,
            };
        }

        const params = new URLSearchParams();
        params.append("type", "standard");
        params.append("email", args.email);
        params.append("country", args.country ?? "US");
        params.append("metadata[tenantId]", args.tenantId as string);
        params.append("metadata[userId]", args.userId as string);
        params.append("metadata[platform]", "digipicks");

        const response = await fetch(`${STRIPE_API_BASE}/v1/accounts`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Bearer ${secretKey}`,
            },
            body: params.toString(),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new ConvexError({
                type: "about:blank",
                title: "Stripe Connect account creation failed",
                status: response.status,
                detail: text,
            });
        }

        const account = await response.json();

        // Store creator account record
        await ctx.runMutation(internal.billing.stripeConnect.insertCreatorAccount, {
            tenantId: args.tenantId,
            userId: args.userId,
            stripeAccountId: account.id,
        });

        return {
            accountId: account.id,
            alreadyExists: false,
        };
    },
});

// =============================================================================
// Create Account Link (action — generates onboarding URL)
// =============================================================================

export const createAccountLink = action({
    args: {
        stripeAccountId: v.string(),
        refreshUrl: v.string(),
        returnUrl: v.string(),
    },
    handler: async (ctx, args) => {
        const { secretKey } = getStripeConfig();

        const params = new URLSearchParams();
        params.append("account", args.stripeAccountId);
        params.append("type", "account_onboarding");
        params.append("refresh_url", args.refreshUrl);
        params.append("return_url", args.returnUrl);

        const response = await fetch(`${STRIPE_API_BASE}/v1/account_links`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Bearer ${secretKey}`,
            },
            body: params.toString(),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new ConvexError({
                type: "about:blank",
                title: "Stripe account link creation failed",
                status: response.status,
                detail: text,
            });
        }

        const link = await response.json();
        return { url: link.url, expiresAt: link.expires_at };
    },
});

// =============================================================================
// Get Account Status (action — fetches live status from Stripe)
// =============================================================================

export const syncAccountStatus = action({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, { userId }): Promise<any> => {
        const { secretKey } = getStripeConfig();

        const account: any = await ctx.runQuery(
            internal.billing.stripeConnect.getCreatorAccountInternal,
            { userId }
        );

        if (!account) {
            return null;
        }

        const stripeAccountId: string = account.stripeAccountId;

        const response = await fetch(
            `${STRIPE_API_BASE}/v1/accounts/${encodeURIComponent(stripeAccountId)}`,
            {
                headers: {
                    Authorization: `Bearer ${secretKey}`,
                },
            }
        );

        if (!response.ok) {
            const text = await response.text();
            throw new ConvexError({
                type: "about:blank",
                title: "Stripe account fetch failed",
                status: response.status,
                detail: text,
            });
        }

        const stripeAccount = await response.json();

        let status: string = "pending";
        if (stripeAccount.details_submitted && stripeAccount.charges_enabled && stripeAccount.payouts_enabled) {
            status = "active";
        } else if (stripeAccount.details_submitted) {
            status = "restricted";
        } else {
            status = "onboarding";
        }

        // Update local record
        await ctx.runMutation(internal.billing.stripeConnect.updateCreatorAccountInternal, {
            id: (account as any)._id,
            status,
            chargesEnabled: stripeAccount.charges_enabled ?? false,
            payoutsEnabled: stripeAccount.payouts_enabled ?? false,
            detailsSubmitted: stripeAccount.details_submitted ?? false,
        });

        return {
            stripeAccountId,
            status,
            chargesEnabled: stripeAccount.charges_enabled ?? false,
            payoutsEnabled: stripeAccount.payouts_enabled ?? false,
            detailsSubmitted: stripeAccount.details_submitted ?? false,
        };
    },
});

// =============================================================================
// Internal queries/mutations (via subscriptions component)
// =============================================================================

export const getCreatorAccountInternal = internalQuery({
    args: { userId: v.string() },
    handler: async (ctx, { userId }) => {
        return ctx.runQuery(components.subscriptions.functions.getCreatorAccount, { userId });
    },
});

export const insertCreatorAccount = internalMutation({
    args: {
        tenantId: v.id("tenants"),
        userId: v.id("users"),
        stripeAccountId: v.string(),
    },
    handler: async (ctx, args) => {
        return ctx.runMutation(components.subscriptions.functions.createCreatorAccount, {
            tenantId: args.tenantId as string,
            userId: args.userId as string,
            stripeAccountId: args.stripeAccountId,
        });
    },
});

export const updateCreatorAccountInternal = internalMutation({
    args: {
        id: v.string(),
        status: v.optional(v.string()),
        chargesEnabled: v.optional(v.boolean()),
        payoutsEnabled: v.optional(v.boolean()),
        detailsSubmitted: v.optional(v.boolean()),
    },
    handler: async (ctx, { id, ...updates }) => {
        return ctx.runMutation(components.subscriptions.functions.updateCreatorAccount, {
            id: id as any,
            ...updates,
        });
    },
});
