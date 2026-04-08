import { action, internalMutation, query } from "../_generated/server";
import { components } from "../_generated/api";
import { v, ConvexError } from "convex/values";
import { internal } from "../_generated/api";

// =============================================================================
// Adyen Payment Integration
// @deprecated — Replaced by Stripe Checkout (convex/billing/stripe.ts).
// Kept for in-flight payments during transition. Do not use for new payments.
// Docs: https://docs.adyen.com/api-explorer/
// Supports: Web payments (Checkout sessions), Terminal/POS, Capture, Refund, Cancel
// =============================================================================

const ADYEN_CHECKOUT_BASE = "https://checkout-test.adyen.com";
const ADYEN_TERMINAL_BASE = "https://terminal-api-test.adyen.com";

// =============================================================================
// Configuration
// =============================================================================

function getAdyenConfig() {
    const apiKey = process.env.ADYEN_API_KEY;
    const merchantAccount = process.env.ADYEN_MERCHANT_ACCOUNT;
    const hmacKey = process.env.ADYEN_HMAC_KEY;
    const terminalPoiId = process.env.ADYEN_TERMINAL_POIID;

    if (!apiKey) {
        throw new ConvexError({
            type: "about:blank",
            title: "Adyen not configured",
            status: 500,
            detail: "ADYEN_API_KEY environment variable is not set",
        });
    }
    if (!merchantAccount) {
        throw new ConvexError({
            type: "about:blank",
            title: "Adyen not configured",
            status: 500,
            detail: "ADYEN_MERCHANT_ACCOUNT environment variable is not set",
        });
    }

    return { apiKey, merchantAccount, hmacKey, terminalPoiId };
}

// =============================================================================
// Create Web Payment (action — Adyen Checkout Sessions API)
// =============================================================================

/** @deprecated Use stripe.createCheckoutSession instead */
export const createWebPayment = action({
    args: {
        tenantId: v.id("tenants"),
        orderId: v.optional(v.string()),
        userId: v.optional(v.id("users")),
        amount: v.number(), // In minor units (e.g. 10000 = 100.00 NOK)
        currency: v.optional(v.string()),
        description: v.string(),
        returnUrl: v.string(),
    },
    handler: async (ctx, args) => {
        const { apiKey, merchantAccount } = getAdyenConfig();
        const currency = args.currency || "NOK";
        const reference = `xala-ord-${args.orderId || "direct"}-${Date.now()}`;

        const payload = {
            merchantAccount,
            amount: {
                currency,
                value: args.amount,
            },
            reference,
            returnUrl: `${args.returnUrl}?reference=${encodeURIComponent(reference)}`,
            countryCode: "NO",
            shopperLocale: "nb-NO",
        };

        const response = await fetch(`${ADYEN_CHECKOUT_BASE}/v71/sessions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": apiKey,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new ConvexError({
                type: "about:blank",
                title: "Adyen createSession failed",
                status: response.status,
                detail: text,
            });
        }

        const result = await response.json();

        // Store payment record via billing component
        await ctx.runMutation(internal.billing.adyen.insertPayment, {
            tenantId: args.tenantId,
            bookingId: args.orderId,
            userId: args.userId,
            provider: "adyen",
            reference,
            externalId: result.id, // Adyen session ID
            amount: args.amount,
            currency,
            description: args.description,
            status: "created",
        });

        return {
            reference,
            sessionId: result.id,
            sessionData: result.sessionData,
        };
    },
});

// =============================================================================
// Create Payment Link (action — Adyen Payment Links API for hosted checkout)
// Returns a hosted URL where the user completes payment, then is redirected back.
// =============================================================================

/** @deprecated Use stripe.createCheckoutSession instead */
export const createPaymentLink = action({
    args: {
        tenantId: v.id("tenants"),
        orderId: v.optional(v.string()),
        userId: v.optional(v.id("users")),
        amount: v.number(), // In minor units (e.g. 70000 = 700.00 NOK)
        currency: v.optional(v.string()),
        description: v.string(),
        returnUrl: v.string(),
    },
    handler: async (ctx, args) => {
        const { apiKey, merchantAccount } = getAdyenConfig();
        const currency = args.currency || "NOK";
        const reference = `xala-ord-${args.orderId || "direct"}-${Date.now()}`;

        const payload = {
            merchantAccount,
            amount: {
                currency,
                value: args.amount,
            },
            reference,
            returnUrl: `${args.returnUrl}?reference=${encodeURIComponent(reference)}`,
            countryCode: "NO",
            shopperLocale: "nb-NO",
            description: args.description,
        };

        const response = await fetch(`${ADYEN_CHECKOUT_BASE}/v71/paymentLinks`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": apiKey,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new ConvexError({
                type: "about:blank",
                title: "Adyen createPaymentLink failed",
                status: response.status,
                detail: text,
            });
        }

        const result = await response.json();

        // Store payment record via billing component
        await ctx.runMutation(internal.billing.adyen.insertPayment, {
            tenantId: args.tenantId,
            bookingId: args.orderId,
            userId: args.userId,
            provider: "adyen",
            reference,
            externalId: result.id,
            amount: args.amount,
            currency,
            description: args.description,
            status: "created",
        });

        return {
            reference,
            paymentLinkId: result.id,
            url: result.url,
        };
    },
});

// =============================================================================
// Create Terminal Payment (action — Adyen Terminal API for POS)
// =============================================================================

/** @deprecated Terminal payments are being migrated */
export const createTerminalPayment = action({
    args: {
        tenantId: v.id("tenants"),
        orderId: v.optional(v.string()),
        userId: v.optional(v.id("users")),
        amount: v.number(), // In minor units (e.g. 10000 = 100.00 NOK)
        currency: v.optional(v.string()),
        description: v.string(),
        terminalId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { apiKey, terminalPoiId } = getAdyenConfig();
        const currency = args.currency || "NOK";
        const reference = `xala-pos-${args.orderId || "direct"}-${Date.now()}`;
        const poiId = args.terminalId || terminalPoiId;

        if (!poiId) {
            throw new ConvexError({
                type: "about:blank",
                title: "Terminal not configured",
                status: 500,
                detail: "No terminal ID provided and ADYEN_TERMINAL_POIID is not set",
            });
        }

        // Generate a unique service ID (max 10 chars for Terminal API)
        const serviceId = Date.now().toString(36).slice(-10);

        const payload = {
            SaleToPOIRequest: {
                MessageHeader: {
                    ProtocolVersion: "3.0",
                    MessageClass: "Service",
                    MessageCategory: "Payment",
                    MessageType: "Request",
                    ServiceID: serviceId,
                    SaleID: "DigilistSaaS-POS",
                    POIID: poiId,
                },
                PaymentRequest: {
                    SaleData: {
                        SaleTransactionID: {
                            TransactionID: reference,
                            TimeStamp: new Date().toISOString(),
                        },
                    },
                    PaymentTransaction: {
                        AmountsReq: {
                            Currency: currency,
                            RequestedAmount: args.amount / 100, // Terminal API uses major units
                        },
                    },
                },
            },
        };

        const response = await fetch(`${ADYEN_TERMINAL_BASE}/sync`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": apiKey,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new ConvexError({
                type: "about:blank",
                title: "Adyen terminal payment failed",
                status: response.status,
                detail: text,
            });
        }

        const result = await response.json();

        // Extract response details
        const poiResponse =
            result?.SaleToPOIResponse?.PaymentResponse;
        const resultCode =
            poiResponse?.Response?.Result;
        const pspReference =
            poiResponse?.PaymentResult?.PaymentAcquirerData?.AcquirerTransactionID?.TransactionID;

        const status = resultCode === "Success" ? "authorized" : "failed";

        // Store payment record via billing component
        await ctx.runMutation(internal.billing.adyen.insertPayment, {
            tenantId: args.tenantId,
            bookingId: args.orderId,
            userId: args.userId,
            provider: "adyen-terminal",
            reference,
            externalId: pspReference,
            amount: args.amount,
            currency,
            description: args.description,
            status,
        });

        return {
            reference,
            terminalResponse: {
                result: resultCode,
                pspReference,
                poiId,
            },
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
// Sync Payment Status (action — polls Adyen and updates local)
// =============================================================================

export const syncPaymentStatus = action({
    args: {
        reference: v.string(),
        pspReference: v.string(),
    },
    handler: async (ctx, { reference, pspReference }) => {
        const { apiKey } = getAdyenConfig();

        // Adyen doesn't have a single GET endpoint for payment status.
        // Instead we use the Checkout Payments Details or the Management API.
        // For simplicity, we query the payment using the Checkout utility.
        // In practice, status updates come via webhooks — this is a fallback poll.
        const response = await fetch(
            `${ADYEN_CHECKOUT_BASE}/v71/payments/${encodeURIComponent(pspReference)}`,
            {
                method: "GET",
                headers: {
                    "X-API-Key": apiKey,
                },
            }
        );

        if (!response.ok) {
            const text = await response.text();
            throw new ConvexError({
                type: "about:blank",
                title: "Adyen getPayment failed",
                status: response.status,
                detail: text,
            });
        }

        const adyenPayment = await response.json();
        const status = mapAdyenStatus(adyenPayment.resultCode || adyenPayment.status);

        await ctx.runMutation(internal.billing.adyen.updatePaymentStatus, {
            reference,
            status,
            externalId: adyenPayment.pspReference,
        });

        return {
            reference,
            status,
            adyenStatus: adyenPayment.resultCode || adyenPayment.status,
        };
    },
});

// =============================================================================
// Capture Payment (action)
// =============================================================================

export const capturePayment = action({
    args: {
        reference: v.string(),
        pspReference: v.string(),
        amount: v.optional(v.number()),
    },
    handler: async (ctx, { reference, pspReference, amount }) => {
        const { apiKey, merchantAccount } = getAdyenConfig();

        // If no amount specified, get full amount from our record
        let captureAmount = amount;
        if (!captureAmount) {
            const payment = await ctx.runMutation(
                internal.billing.adyen.getPaymentByReference,
                { reference }
            );
            if (!payment) {
                throw new ConvexError({
                    type: "about:blank",
                    title: "Payment not found",
                    status: 404,
                    detail: `No payment with reference: ${reference}`,
                });
            }
            captureAmount = payment.amount;
        }

        const response = await fetch(
            `${ADYEN_CHECKOUT_BASE}/v71/payments/${encodeURIComponent(pspReference)}/captures`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Key": apiKey,
                    "Idempotency-Key": `capture-${reference}-${Date.now()}`,
                },
                body: JSON.stringify({
                    merchantAccount,
                    amount: {
                        currency: "NOK",
                        value: captureAmount,
                    },
                    reference: `capture-${reference}`,
                }),
            }
        );

        if (!response.ok) {
            const text = await response.text();
            throw new ConvexError({
                type: "about:blank",
                title: "Adyen capture failed",
                status: response.status,
                detail: text,
            });
        }

        await ctx.runMutation(internal.billing.adyen.updatePaymentStatus, {
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
        pspReference: v.string(),
        amount: v.number(),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, { reference, pspReference, amount, reason: _reason }) => {
        const { apiKey, merchantAccount } = getAdyenConfig();

        const response = await fetch(
            `${ADYEN_CHECKOUT_BASE}/v71/payments/${encodeURIComponent(pspReference)}/refunds`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Key": apiKey,
                    "Idempotency-Key": `refund-${reference}-${Date.now()}`,
                },
                body: JSON.stringify({
                    merchantAccount,
                    amount: {
                        currency: "NOK",
                        value: amount,
                    },
                    reference: `refund-${reference}`,
                }),
            }
        );

        if (!response.ok) {
            const text = await response.text();
            throw new ConvexError({
                type: "about:blank",
                title: "Adyen refund failed",
                status: response.status,
                detail: text,
            });
        }

        await ctx.runMutation(internal.billing.adyen.updatePaymentRefund, {
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
        pspReference: v.string(),
    },
    handler: async (ctx, { reference, pspReference }) => {
        const { apiKey, merchantAccount } = getAdyenConfig();

        const response = await fetch(
            `${ADYEN_CHECKOUT_BASE}/v71/payments/${encodeURIComponent(pspReference)}/cancels`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Key": apiKey,
                    "Idempotency-Key": `cancel-${reference}-${Date.now()}`,
                },
                body: JSON.stringify({
                    merchantAccount,
                    reference: `cancel-${reference}`,
                }),
            }
        );

        if (!response.ok) {
            const text = await response.text();
            throw new ConvexError({
                type: "about:blank",
                title: "Adyen cancel failed",
                status: response.status,
                detail: text,
            });
        }

        await ctx.runMutation(internal.billing.adyen.updatePaymentStatus, {
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

function mapAdyenStatus(
    status: string
): "created" | "authorized" | "captured" | "failed" | "refunded" | "cancelled" {
    switch (status) {
        case "Authorised":
            return "authorized";
        case "Captured":
            return "captured";
        case "Cancelled":
            return "cancelled";
        case "Refused":
            return "failed";
        case "Error":
            return "failed";
        case "Pending":
            return "created";
        case "Received":
            return "created";
        case "RedirectShopper":
            return "created";
        default:
            return "failed";
    }
}
