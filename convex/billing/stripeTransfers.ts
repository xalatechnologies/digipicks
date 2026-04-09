"use node";
/**
 * Stripe Transfers — Creator Payout via Stripe Connect
 *
 * Handles the actual Stripe API calls to transfer funds to creator
 * Connect accounts. Called by the admin payouts dashboard.
 *
 * Uses direct fetch() with URLSearchParams (no SDK dependency),
 * consistent with stripe.ts and stripeConnect.ts.
 */

import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { v, ConvexError } from "convex/values";

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
// Create Transfer (action — initiates Stripe transfer to creator)
// =============================================================================

/**
 * Execute a Stripe transfer to a creator's Connect account.
 * This is called after a payout is requested via the admin dashboard.
 *
 * Flow:
 * 1. Mark payout as "processing"
 * 2. Call Stripe Transfer API
 * 3. On success: mark payout as "completed" with stripeTransferId
 * 4. On failure: mark payout as "failed" with reason
 */
export const executeTransfer = action({
    args: {
        payoutId: v.id("creatorPayouts"),
        stripeAccountId: v.string(),
        amount: v.number(), // Net amount in minor units (after platform fee)
        currency: v.optional(v.string()),
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { secretKey } = getStripeConfig();
        const currency = (args.currency ?? "NOK").toLowerCase();

        // Mark as processing
        await ctx.runMutation(internal.domain.adminPayouts.markPayoutProcessing, {
            payoutId: args.payoutId,
        });

        const params = new URLSearchParams();
        params.append("amount", String(args.amount));
        params.append("currency", currency);
        params.append("destination", args.stripeAccountId);
        params.append("description", args.description ?? "DigiPicks creator payout");
        params.append("metadata[payoutId]", args.payoutId as string);
        params.append("metadata[platform]", "digipicks");

        try {
            const response = await fetch(`${STRIPE_API_BASE}/v1/transfers`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: `Bearer ${secretKey}`,
                    "Idempotency-Key": `payout-${args.payoutId}`,
                },
                body: params.toString(),
            });

            if (!response.ok) {
                const text = await response.text();
                let errorDetail = text;
                try {
                    const errorJson = JSON.parse(text);
                    errorDetail = errorJson.error?.message ?? text;
                } catch {
                    // Use raw text
                }

                await ctx.runMutation(internal.domain.adminPayouts.failCreatorPayout, {
                    payoutId: args.payoutId,
                    failureReason: `Stripe error (${response.status}): ${errorDetail}`,
                });

                return {
                    success: false,
                    error: errorDetail,
                    status: response.status,
                };
            }

            const transfer = await response.json();

            // Mark as completed
            await ctx.runMutation(internal.domain.adminPayouts.completeCreatorPayout, {
                payoutId: args.payoutId,
                stripeTransferId: transfer.id,
            });

            return {
                success: true,
                transferId: transfer.id,
                amount: transfer.amount,
                currency: transfer.currency,
            };
        } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);

            await ctx.runMutation(internal.domain.adminPayouts.failCreatorPayout, {
                payoutId: args.payoutId,
                failureReason: `Transfer failed: ${reason}`,
            });

            return {
                success: false,
                error: reason,
            };
        }
    },
});

// =============================================================================
// Get Transfer Status (action — checks Stripe transfer status)
// =============================================================================

/**
 * Fetch the current status of a Stripe transfer.
 */
export const getTransferStatus = action({
    args: {
        stripeTransferId: v.string(),
    },
    handler: async (ctx, { stripeTransferId }) => {
        const { secretKey } = getStripeConfig();

        const response = await fetch(
            `${STRIPE_API_BASE}/v1/transfers/${encodeURIComponent(stripeTransferId)}`,
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
                title: "Stripe getTransfer failed",
                status: response.status,
                detail: text,
            });
        }

        const transfer = await response.json();

        return {
            id: transfer.id,
            amount: transfer.amount,
            currency: transfer.currency,
            destination: transfer.destination,
            reversed: transfer.reversed,
            created: transfer.created,
            description: transfer.description,
        };
    },
});

// =============================================================================
// Reverse Transfer (action — for refunding a creator payout)
// =============================================================================

/**
 * Reverse (refund) a Stripe transfer.
 * Used when a payout needs to be clawed back.
 */
export const reverseTransfer = action({
    args: {
        stripeTransferId: v.string(),
        amount: v.optional(v.number()), // Partial reversal amount; omit for full
        reason: v.optional(v.string()),
    },
    handler: async (ctx, { stripeTransferId, amount, reason: _reason }) => {
        const { secretKey } = getStripeConfig();

        const params = new URLSearchParams();
        if (amount) {
            params.append("amount", String(amount));
        }

        const response = await fetch(
            `${STRIPE_API_BASE}/v1/transfers/${encodeURIComponent(stripeTransferId)}/reversals`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: `Bearer ${secretKey}`,
                    "Idempotency-Key": `reversal-${stripeTransferId}`,
                },
                body: params.toString(),
            }
        );

        if (!response.ok) {
            const text = await response.text();
            throw new ConvexError({
                type: "about:blank",
                title: "Stripe transfer reversal failed",
                status: response.status,
                detail: text,
            });
        }

        const reversal = await response.json();

        return {
            success: true,
            reversalId: reversal.id,
            amount: reversal.amount,
        };
    },
});

// =============================================================================
// List Transfers (action — for reconciliation)
// =============================================================================

/**
 * List recent Stripe transfers for a Connect account.
 */
export const listAccountTransfers = action({
    args: {
        stripeAccountId: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { stripeAccountId, limit = 25 }) => {
        const { secretKey } = getStripeConfig();

        const params = new URLSearchParams();
        params.append("destination", stripeAccountId);
        params.append("limit", String(limit));

        const response = await fetch(
            `${STRIPE_API_BASE}/v1/transfers?${params.toString()}`,
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
                title: "Stripe listTransfers failed",
                status: response.status,
                detail: text,
            });
        }

        const result = await response.json();

        return {
            transfers: (result.data ?? []).map((t: any) => ({
                id: t.id,
                amount: t.amount,
                currency: t.currency,
                created: t.created,
                reversed: t.reversed,
                description: t.description,
            })),
            hasMore: result.has_more,
        };
    },
});
