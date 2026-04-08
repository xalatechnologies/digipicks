import { action, internalMutation, query } from "../_generated/server";
import { components } from "../_generated/api";
import { v, ConvexError } from "convex/values";
import { internal } from "../_generated/api";

// =============================================================================
// Vipps ePayment Integration
// Docs: https://developer.vippsmobilepay.com/docs/APIs/epayment-api/
// =============================================================================

const VIPPS_API_BASE =
    "https://apitest.vipps.no";

// =============================================================================
// Access Token (internal — cached per-request)
// =============================================================================

async function getAccessToken(): Promise<string> {
    const clientId = process.env.VIPPS_CLIENT_ID!;
    const clientSecret = process.env.VIPPS_CLIENT_SECRET!;
    const subscriptionKey = process.env.VIPPS_SUBSCRIPTION_KEY!;
    const msn = process.env.VIPPS_MSN!;

    const response = await fetch(`${VIPPS_API_BASE}/accesstoken/get`, {
        method: "POST",
        headers: {
            client_id: clientId,
            client_secret: clientSecret,
            "Ocp-Apim-Subscription-Key": subscriptionKey,
            "Merchant-Serial-Number": msn,
        },
    });

    if (!response.ok) {
        const text = await response.text();
        throw new ConvexError({ type: "about:blank", title: "Vipps access token failed", status: response.status, detail: text });
    }

    const data = await response.json();
    return data.access_token;
}

// =============================================================================
// Create Payment (action — called from SDK)
// =============================================================================

export const createPayment = action({
    args: {
        tenantId: v.id("tenants"),
        bookingId: v.optional(v.string()),
        orderId: v.optional(v.string()),
        userId: v.optional(v.id("users")),
        amount: v.number(), // In minor units (øre)
        currency: v.optional(v.string()),
        description: v.string(),
        returnUrl: v.string(),
    },
    handler: async (ctx, args) => {
        const currency = args.currency || "NOK";
        const entityId = args.orderId || args.bookingId || "direct";
        const prefix = args.orderId ? "ord" : "bkg";
        const reference = `xala-${prefix}-${entityId}-${Date.now()}`;

        const accessToken = await getAccessToken();
        const msn = process.env.VIPPS_MSN!;
        const subscriptionKey = process.env.VIPPS_SUBSCRIPTION_KEY!;

        const payload = {
            amount: {
                currency,
                value: args.amount,
            },
            paymentMethod: {
                type: "WALLET",
            },
            reference,
            returnUrl: `${args.returnUrl}?reference=${encodeURIComponent(reference)}`,
            userFlow: "WEB_REDIRECT",
            paymentDescription: args.description,
        };

        const response = await fetch(`${VIPPS_API_BASE}/epayment/v1/payments`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
                "Ocp-Apim-Subscription-Key": subscriptionKey,
                "Merchant-Serial-Number": msn,
                "Idempotency-Key": reference,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new ConvexError({ type: "about:blank", title: "Vipps createPayment failed", status: response.status, detail: text });
        }

        const result = await response.json();

        // Store payment record via billing component
        await ctx.runMutation(internal.billing.vipps.insertPayment, {
            tenantId: args.tenantId,
            bookingId: args.bookingId,
            userId: args.userId,
            provider: "vipps",
            reference,
            externalId: result.reference,
            amount: args.amount,
            currency,
            description: args.description,
            status: "created",
            redirectUrl: result.redirectUrl,
        });

        return {
            reference,
            redirectUrl: result.redirectUrl,
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
// Sync Payment Status (action — polls Vipps and updates local)
// =============================================================================

export const syncPaymentStatus = action({
    args: {
        reference: v.string(),
    },
    handler: async (ctx, { reference }) => {
        const accessToken = await getAccessToken();
        const subscriptionKey = process.env.VIPPS_SUBSCRIPTION_KEY!;
        const msn = process.env.VIPPS_MSN!;

        const response = await fetch(
            `${VIPPS_API_BASE}/epayment/v1/payments/${encodeURIComponent(reference)}`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Ocp-Apim-Subscription-Key": subscriptionKey,
                    "Merchant-Serial-Number": msn,
                },
            }
        );

        if (!response.ok) {
            const text = await response.text();
            throw new ConvexError({ type: "about:blank", title: "Vipps getPayment failed", status: response.status, detail: text });
        }

        const vippsPayment = await response.json();
        const status = mapVippsState(vippsPayment.state);

        await ctx.runMutation(internal.billing.vipps.updatePaymentStatus, {
            reference,
            status,
            externalId: vippsPayment.pspReference,
        });

        return { reference, status, vippsState: vippsPayment.state };
    },
});

// =============================================================================
// Capture Payment (action)
// =============================================================================

export const capturePayment = action({
    args: {
        reference: v.string(),
        amount: v.optional(v.number()),
    },
    handler: async (ctx, { reference, amount }) => {
        const accessToken = await getAccessToken();
        const subscriptionKey = process.env.VIPPS_SUBSCRIPTION_KEY!;
        const msn = process.env.VIPPS_MSN!;

        // If no amount specified, get full amount from our record
        let captureAmount = amount;
        if (!captureAmount) {
            const payment = await ctx.runMutation(internal.billing.vipps.getPaymentByReference, {
                reference,
            });
            if (!payment) throw new ConvexError({ type: "about:blank", title: "Payment not found", status: 404, detail: `No payment with reference: ${reference}` });
            captureAmount = payment.amount;
        }

        const response = await fetch(
            `${VIPPS_API_BASE}/epayment/v1/payments/${encodeURIComponent(reference)}/capture`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                    "Ocp-Apim-Subscription-Key": subscriptionKey,
                    "Merchant-Serial-Number": msn,
                    "Idempotency-Key": `capture-${reference}-${Date.now()}`,
                },
                body: JSON.stringify({
                    modificationAmount: {
                        currency: "NOK",
                        value: captureAmount,
                    },
                }),
            }
        );

        if (!response.ok) {
            const text = await response.text();
            throw new ConvexError({ type: "about:blank", title: "Vipps capture failed", status: response.status, detail: text });
        }

        await ctx.runMutation(internal.billing.vipps.updatePaymentStatus, {
            reference,
            status: "captured",
            capturedAmount: captureAmount,
        });

        return { success: true };
    },
});

// =============================================================================
// Refund Payment (action)
// =============================================================================

export const refundPayment = action({
    args: {
        reference: v.string(),
        amount: v.number(),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, { reference, amount, reason: _reason }) => {
        const accessToken = await getAccessToken();
        const subscriptionKey = process.env.VIPPS_SUBSCRIPTION_KEY!;
        const msn = process.env.VIPPS_MSN!;

        const response = await fetch(
            `${VIPPS_API_BASE}/epayment/v1/payments/${encodeURIComponent(reference)}/refund`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                    "Ocp-Apim-Subscription-Key": subscriptionKey,
                    "Merchant-Serial-Number": msn,
                    "Idempotency-Key": `refund-${reference}-${Date.now()}`,
                },
                body: JSON.stringify({
                    modificationAmount: {
                        currency: "NOK",
                        value: amount,
                    },
                }),
            }
        );

        if (!response.ok) {
            const text = await response.text();
            throw new ConvexError({ type: "about:blank", title: "Vipps refund failed", status: response.status, detail: text });
        }

        await ctx.runMutation(internal.billing.vipps.updatePaymentRefund, {
            reference,
            refundedAmount: amount,
        });

        return { success: true };
    },
});

// =============================================================================
// Cancel Payment (action)
// =============================================================================

export const cancelPayment = action({
    args: {
        reference: v.string(),
    },
    handler: async (ctx, { reference }) => {
        const accessToken = await getAccessToken();
        const subscriptionKey = process.env.VIPPS_SUBSCRIPTION_KEY!;
        const msn = process.env.VIPPS_MSN!;

        const response = await fetch(
            `${VIPPS_API_BASE}/epayment/v1/payments/${encodeURIComponent(reference)}/cancel`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                    "Ocp-Apim-Subscription-Key": subscriptionKey,
                    "Merchant-Serial-Number": msn,
                    "Idempotency-Key": `cancel-${reference}-${Date.now()}`,
                },
            }
        );

        if (!response.ok) {
            const text = await response.text();
            throw new ConvexError({ type: "about:blank", title: "Vipps cancel failed", status: response.status, detail: text });
        }

        await ctx.runMutation(internal.billing.vipps.updatePaymentStatus, {
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
        redirectUrl: v.optional(v.string()),
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

function mapVippsState(state: string): "created" | "authorized" | "captured" | "failed" | "refunded" | "cancelled" {
    switch (state) {
        case "CREATED":
            return "created";
        case "AUTHORIZED":
            return "authorized";
        case "ABORTED":
            return "cancelled";
        case "EXPIRED":
            return "failed";
        case "TERMINATED":
            return "cancelled";
        default:
            return "failed";
    }
}
