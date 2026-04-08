import { action, internalMutation, query } from "../_generated/server";
import { components } from "../_generated/api";
import { v, ConvexError } from "convex/values";
import { internal } from "../_generated/api";

// =============================================================================
// Stripe Payment Intent Integration (for inline Stripe Elements)
// Docs: https://docs.stripe.com/api/payment_intents
// =============================================================================

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
// Create Payment Intent (action — returns clientSecret for Stripe Elements)
// =============================================================================

export const createPaymentIntent = action({
    args: {
        tenantId: v.id("tenants"),
        amount: v.number(), // In minor units (øre), e.g. 70000 = 700.00 NOK
        currency: v.optional(v.string()),
        description: v.optional(v.string()),
        bookingId: v.optional(v.string()),
        customerEmail: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const { secretKey } = getStripeConfig();
        const currency = (args.currency || "NOK").toLowerCase();
        const reference = `xala-bkng-${args.bookingId || "direct"}-${Date.now()}`;

        const params = new URLSearchParams();
        params.append("amount", String(args.amount));
        params.append("currency", currency);
        params.append("automatic_payment_methods[enabled]", "true");
        if (args.description) {
            params.append("description", args.description);
        }
        if (args.customerEmail) {
            params.append("receipt_email", args.customerEmail);
        }
        params.append("metadata[reference]", reference);
        params.append("metadata[tenantId]", args.tenantId);
        if (args.bookingId) {
            params.append("metadata[bookingId]", args.bookingId);
        }

        const response = await fetch(`${STRIPE_API_BASE}/v1/payment_intents`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${secretKey}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new ConvexError({
                type: "about:blank",
                title: "Stripe PaymentIntent creation failed",
                status: response.status,
                detail: errorBody,
            });
        }

        const paymentIntent = await response.json();

        // Store payment record in billing component
        await ctx.runMutation(internal.billing.stripePaymentIntent.insertPayment, {
            tenantId: args.tenantId,
            reference: paymentIntent.id,
            provider: "stripe",
            amount: args.amount,
            currency: currency.toUpperCase(),
            status: "created",
            bookingId: args.bookingId,
        });

        return {
            clientSecret: paymentIntent.client_secret as string,
            paymentIntentId: paymentIntent.id as string,
            reference,
        };
    },
});

// =============================================================================
// Confirm Payment Intent status (action — called after Elements confirm)
// =============================================================================

export const confirmPaymentStatus = action({
    args: {
        paymentIntentId: v.string(),
        tenantId: v.id("tenants"),
    },
    handler: async (ctx, { paymentIntentId, tenantId }) => {
        const { secretKey } = getStripeConfig();

        const response = await fetch(
            `${STRIPE_API_BASE}/v1/payment_intents/${encodeURIComponent(paymentIntentId)}`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${secretKey}`,
                },
            },
        );

        if (!response.ok) {
            throw new ConvexError({
                type: "about:blank",
                title: "Failed to retrieve PaymentIntent",
                status: response.status,
                detail: await response.text(),
            });
        }

        const pi = await response.json();
        const status = pi.status === "succeeded" ? "captured"
            : pi.status === "requires_payment_method" ? "failed"
            : pi.status === "canceled" ? "cancelled"
            : "authorized";

        return {
            status,
            stripeStatus: pi.status as string,
            amount: pi.amount as number,
            currency: (pi.currency as string).toUpperCase(),
        };
    },
});

// =============================================================================
// Internal mutations for payment record management
// =============================================================================

export const insertPayment = internalMutation({
    args: {
        tenantId: v.id("tenants"),
        reference: v.string(),
        provider: v.string(),
        amount: v.number(),
        currency: v.string(),
        status: v.string(),
        bookingId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.runMutation(components.billing.mutations.createPayment, {
            tenantId: args.tenantId as string,
            reference: args.reference,
            provider: args.provider,
            amount: args.amount,
            currency: args.currency,
            description: `Booking payment`,
            metadata: args.bookingId ? { bookingId: args.bookingId } : undefined,
        });
    },
});
