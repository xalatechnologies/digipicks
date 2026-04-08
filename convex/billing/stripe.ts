import { action, internalMutation, query } from "../_generated/server";
import { components } from "../_generated/api";
import { v, ConvexError } from "convex/values";
import { internal } from "../_generated/api";

// =============================================================================
// Stripe Checkout Integration
// Docs: https://docs.stripe.com/api/checkout/sessions
// Uses direct fetch() with URLSearchParams (no SDK dependency)
// =============================================================================

const STRIPE_API_BASE = "https://api.stripe.com";

// =============================================================================
// Configuration
// =============================================================================

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
// Create Checkout Session (action — called from SDK)
// =============================================================================

export const createCheckoutSession = action({
    args: {
        tenantId: v.id("tenants"),
        orderId: v.optional(v.string()),
        userId: v.optional(v.id("users")),
        amount: v.number(), // In minor units (øre), e.g. 70000 = 700.00 NOK
        currency: v.optional(v.string()),
        description: v.string(),
        returnUrl: v.string(),
        cancelUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { secretKey } = getStripeConfig();
        const currency = (args.currency || "NOK").toLowerCase();
        const reference = `xala-ord-${args.orderId || "direct"}-${Date.now()}`;

        // Stripe replaces {CHECKOUT_SESSION_ID} with the real session ID on redirect
        const successUrl = `${args.returnUrl}?reference=${encodeURIComponent(reference)}&status=success&sessionId={CHECKOUT_SESSION_ID}`;
        const cancelUrl = args.cancelUrl
            ? `${args.cancelUrl}?reference=${encodeURIComponent(reference)}&status=cancelled`
            : `${args.returnUrl}?reference=${encodeURIComponent(reference)}&status=cancelled`;

        const params = new URLSearchParams();
        params.append("mode", "payment");
        params.append("success_url", successUrl);
        params.append("cancel_url", cancelUrl);
        params.append("line_items[0][price_data][currency]", currency);
        params.append("line_items[0][price_data][product_data][name]", args.description);
        params.append("line_items[0][price_data][unit_amount]", String(args.amount));
        params.append("line_items[0][quantity]", "1");
        params.append("payment_method_types[0]", "card");
        params.append("metadata[orderId]", args.orderId || "");
        params.append("metadata[tenantId]", args.tenantId as string);
        params.append("client_reference_id", reference);

        const response = await fetch(`${STRIPE_API_BASE}/v1/checkout/sessions`, {
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
                title: "Stripe createCheckoutSession failed",
                status: response.status,
                detail: text,
            });
        }

        const result = await response.json();

        // Store payment record via billing component
        await ctx.runMutation(internal.billing.stripe.insertPayment, {
            tenantId: args.tenantId,
            bookingId: args.orderId,
            userId: args.userId,
            provider: "stripe",
            reference,
            externalId: result.id, // Stripe session ID
            amount: args.amount,
            currency: currency.toUpperCase(),
            description: args.description,
            status: "created",
        });

        return {
            sessionId: result.id,
            url: result.url,
            reference,
        };
    },
});

// =============================================================================
// Get Payment Status (query — reads from billing component)
// =============================================================================

export const getPaymentStatus = query({
    args: {
        tenantId: v.id("tenants"),
        reference: v.string(),
    },
    handler: async (ctx, { tenantId, reference }) => {
        return ctx.runQuery(
            components.billing.queries.getByReference,
            { tenantId: tenantId as string, reference }
        );
    },
});

// =============================================================================
// Sync Payment Status (action — polls Stripe and updates local)
// =============================================================================

export const syncPaymentStatus = action({
    args: {
        reference: v.string(),
        sessionId: v.string(),
    },
    handler: async (ctx, { reference, sessionId }) => {
        const { secretKey } = getStripeConfig();

        const response = await fetch(
            `${STRIPE_API_BASE}/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
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
                title: "Stripe getSession failed",
                status: response.status,
                detail: text,
            });
        }

        const session = await response.json();
        const status = mapStripeSessionStatus(session.status, session.payment_status);

        await ctx.runMutation(internal.billing.stripe.updatePaymentStatus, {
            reference,
            status,
            externalId: session.payment_intent ?? undefined,
        });

        // TODO: checkout facade was removed — post-payment order completion
        // callbacks should be re-wired when ticketing checkout is rebuilt.

        return {
            reference,
            status,
            stripeStatus: session.status,
            paymentStatus: session.payment_status,
        };
    },
});

// =============================================================================
// Create Refund (action)
// =============================================================================

export const createRefund = action({
    args: {
        reference: v.string(),
        paymentIntentId: v.string(),
        amount: v.optional(v.number()), // Partial refund amount in minor units; omit for full refund
        reason: v.optional(v.string()),
    },
    handler: async (ctx, { reference, paymentIntentId, amount, reason: _reason }) => {
        const { secretKey } = getStripeConfig();

        const params = new URLSearchParams();
        params.append("payment_intent", paymentIntentId);
        if (amount) {
            params.append("amount", String(amount));
        }

        const response = await fetch(`${STRIPE_API_BASE}/v1/refunds`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Bearer ${secretKey}`,
                "Idempotency-Key": `refund-${reference}-${Date.now()}`,
            },
            body: params.toString(),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new ConvexError({
                type: "about:blank",
                title: "Stripe refund failed",
                status: response.status,
                detail: text,
            });
        }

        const refund = await response.json();
        const refundedAmount = refund.amount;

        await ctx.runMutation(internal.billing.stripe.updatePaymentRefund, {
            reference,
            refundedAmount,
        });

        return { success: true, refundId: refund.id };
    },
});

// =============================================================================
// Cancel Payment Intent (action)
// =============================================================================

export const cancelPaymentIntent = action({
    args: {
        reference: v.string(),
        paymentIntentId: v.string(),
    },
    handler: async (ctx, { reference, paymentIntentId }) => {
        const { secretKey } = getStripeConfig();

        const response = await fetch(
            `${STRIPE_API_BASE}/v1/payment_intents/${encodeURIComponent(paymentIntentId)}/cancel`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: `Bearer ${secretKey}`,
                    "Idempotency-Key": `cancel-${reference}-${Date.now()}`,
                },
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

        await ctx.runMutation(internal.billing.stripe.updatePaymentStatus, {
            reference,
            status: "cancelled",
        });

        return { success: true };
    },
});

// =============================================================================
// Internal Mutations (DB operations via billing component)
// =============================================================================

export const insertPayment = internalMutation({
    args: {
        tenantId: v.id("tenants"),
        bookingId: v.optional(v.string()),
        userId: v.optional(v.id("users")),
        provider: v.string(),
        reference: v.string(),
        externalId: v.optional(v.string()),
        amount: v.number(),
        currency: v.string(),
        description: v.optional(v.string()),
        status: v.string(),
    },
    handler: async (ctx, args) => {
        const result = await ctx.runMutation(
            components.billing.mutations.createPayment,
            {
                tenantId: args.tenantId as string,
                bookingId: args.bookingId,
                userId: args.userId as string | undefined,
                provider: args.provider,
                reference: args.reference,
                amount: args.amount,
                currency: args.currency,
                description: args.description,
            }
        );
        return result.id;
    },
});

export const updatePaymentStatus = internalMutation({
    args: {
        reference: v.string(),
        status: v.union(
            v.literal("created"),
            v.literal("authorized"),
            v.literal("captured"),
            v.literal("failed"),
            v.literal("refunded"),
            v.literal("cancelled"),
        ),
        externalId: v.optional(v.string()),
        capturedAmount: v.optional(v.number()),
    },
    handler: async (ctx, { reference, status, externalId, capturedAmount }) => {
        const payment = await ctx.runQuery(
            components.billing.queries.getByReferenceGlobal,
            { reference }
        );
        if (!payment) return;

        await ctx.runMutation(
            components.billing.mutations.updatePaymentStatus,
            {
                id: payment._id,
                status,
                externalId,
                capturedAmount,
            }
        );
    },
});

export const updatePaymentRefund = internalMutation({
    args: {
        reference: v.string(),
        refundedAmount: v.number(),
    },
    handler: async (ctx, { reference, refundedAmount }) => {
        const payment = await ctx.runQuery(
            components.billing.queries.getByReferenceGlobal,
            { reference }
        );
        if (!payment) return;

        const currentRefunded = ((payment as any).refundedAmount || 0) + refundedAmount;
        const newStatus = currentRefunded >= (payment as any).amount ? "refunded" : "captured";

        await ctx.runMutation(
            components.billing.mutations.updatePaymentStatus,
            {
                id: payment._id,
                status: newStatus,
                refundedAmount: currentRefunded,
            }
        );
    },
});

export const getPaymentByReference = internalMutation({
    args: {
        reference: v.string(),
    },
    handler: async (ctx, { reference }) => {
        return ctx.runQuery(
            components.billing.queries.getByReferenceGlobal,
            { reference }
        );
    },
});

// =============================================================================
// Helpers
// =============================================================================

function mapStripeSessionStatus(
    sessionStatus: string,
    paymentStatus: string
): "created" | "authorized" | "captured" | "failed" | "refunded" | "cancelled" {
    if (sessionStatus === "complete" && paymentStatus === "paid") {
        return "captured";
    }
    if (sessionStatus === "expired") {
        return "failed";
    }
    if (sessionStatus === "open") {
        return "created";
    }
    return "created";
}
