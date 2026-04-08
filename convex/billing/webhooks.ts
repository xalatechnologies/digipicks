import { internalAction, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal, components } from "../_generated/api";
import { emitEvent } from "../lib/eventBus";

/**
 * Stripe Webhook Handler
 * Processes Checkout Session events from Stripe.
 * Events: checkout.session.completed, checkout.session.expired, charge.refunded
 *
 * HMAC-SHA256 signature verification is enforced when STRIPE_WEBHOOK_SECRET is set.
 * Stripe signature header format: t=timestamp,v1=signature[,v1=signature...]
 */

/**
 * Verify the Stripe webhook signature.
 * Computes HMAC-SHA256 of `${timestamp}.${payload}` using the webhook secret
 * and compares to the v1 signature(s) in the Stripe-Signature header.
 */
async function verifyStripeSignature(
    payload: string,
    signatureHeader: string,
    secret: string
): Promise<boolean> {
    const parts = signatureHeader.split(",");
    const timestampPart = parts.find((p) => p.startsWith("t="));
    const signatureParts = parts.filter((p) => p.startsWith("v1="));

    if (!timestampPart || signatureParts.length === 0) return false;

    const timestamp = timestampPart.slice(2);
    const signedPayload = `${timestamp}.${payload}`;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign(
        "HMAC",
        cryptoKey,
        encoder.encode(signedPayload)
    );

    // Convert to hex string
    const computed = Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    // Compare against all v1 signatures (Stripe may send multiple during key rotation)
    return signatureParts.some((p) => p.slice(3) === computed);
}

export const stripeWebhook = internalAction({
    args: {
        body: v.string(),
        signature: v.string(),
    },
    handler: async (ctx, { body, signature }) => {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        // Verify signature
        if (webhookSecret) {
            const valid = await verifyStripeSignature(body, signature, webhookSecret);
            if (!valid) {
                console.error("Stripe webhook: signature verification failed");
                throw new Error("Invalid Stripe webhook signature");
            }
        } else {
            console.warn("Stripe webhook: STRIPE_WEBHOOK_SECRET not configured — skipping signature verification");
        }

        const event = JSON.parse(body);
        const eventType: string = event.type;
        const obj = event.data?.object;

        if (!obj) {
            console.log("Stripe webhook: no data.object in event", eventType);
            return { received: true };
        }

        switch (eventType) {
            case "checkout.session.completed": {
                const reference = obj.client_reference_id;
                const sessionMode = obj.mode;

                if (!reference) {
                    console.log("Stripe webhook: checkout.session.completed missing client_reference_id");
                    break;
                }

                if (sessionMode === "subscription") {
                    // Subscription checkout — create membership
                    const subscriptionId = obj.subscription;
                    const customerId = obj.customer;
                    const metadata = obj.metadata ?? {};

                    if (subscriptionId && metadata.userId && metadata.tierId) {
                        await ctx.runMutation(internal.billing.webhooks.activateSubscription, {
                            tenantId: metadata.tenantId,
                            userId: metadata.userId,
                            tierId: metadata.tierId,
                            creatorId: metadata.creatorId,
                            stripeSubscriptionId: subscriptionId,
                            stripeCustomerId: customerId,
                            reference,
                        });
                        console.log(`Stripe webhook: subscription checkout completed → ${reference}, sub=${subscriptionId}`);
                    }
                } else {
                    // One-time payment checkout
                    const paymentIntent = obj.payment_intent;
                    await ctx.runMutation(internal.billing.stripe.updatePaymentStatus, {
                        reference,
                        status: "captured",
                        externalId: paymentIntent,
                    });
                    console.log(`Stripe webhook: checkout.session.completed → ${reference}`);
                }
                break;
            }

            case "checkout.session.expired": {
                const reference = obj.client_reference_id;

                if (!reference) {
                    console.log("Stripe webhook: checkout.session.expired missing client_reference_id");
                    break;
                }

                await ctx.runMutation(internal.billing.stripe.updatePaymentStatus, {
                    reference,
                    status: "failed",
                });

                console.log(`Stripe webhook: checkout.session.expired → ${reference}`);
                break;
            }

            case "charge.refunded": {
                const paymentIntent = obj.payment_intent;
                const amountRefunded = obj.amount_refunded;

                if (paymentIntent) {
                    const reference = obj.metadata?.client_reference_id;
                    if (reference) {
                        await ctx.runMutation(internal.billing.stripe.updatePaymentRefund, {
                            reference,
                            refundedAmount: amountRefunded,
                        });
                        console.log(`Stripe webhook: charge.refunded → ${reference}, amount: ${amountRefunded}`);
                    } else {
                        console.log(`Stripe webhook: charge.refunded but no reference in metadata, pi=${paymentIntent}`);
                    }
                }
                break;
            }

            // -----------------------------------------------------------------
            // Subscription lifecycle events
            // -----------------------------------------------------------------

            case "customer.subscription.updated": {
                const subscriptionId = obj.id;
                const status = obj.status; // active, past_due, canceled, unpaid
                const metadata = obj.metadata ?? {};

                const membershipStatus = mapStripeSubscriptionStatus(status);
                if (membershipStatus) {
                    await ctx.runMutation(internal.billing.webhooks.updateSubscriptionStatus, {
                        stripeSubscriptionId: subscriptionId,
                        status: membershipStatus,
                        cancelAtPeriodEnd: obj.cancel_at_period_end ?? false,
                    });
                    console.log(`Stripe webhook: subscription.updated → ${subscriptionId}, status=${status}`);
                }
                break;
            }

            case "customer.subscription.deleted": {
                const subscriptionId = obj.id;

                await ctx.runMutation(internal.billing.webhooks.updateSubscriptionStatus, {
                    stripeSubscriptionId: subscriptionId,
                    status: "cancelled",
                    cancelAtPeriodEnd: false,
                });

                console.log(`Stripe webhook: subscription.deleted → ${subscriptionId}`);
                break;
            }

            case "invoice.paid": {
                const subscriptionId = obj.subscription;
                if (subscriptionId) {
                    await ctx.runMutation(internal.billing.webhooks.recordSubscriptionPayment, {
                        stripeSubscriptionId: subscriptionId,
                        amountPaid: obj.amount_paid,
                        periodEnd: obj.lines?.data?.[0]?.period?.end
                            ? obj.lines.data[0].period.end * 1000
                            : undefined,
                    });
                    console.log(`Stripe webhook: invoice.paid for subscription ${subscriptionId}`);
                }
                break;
            }

            case "invoice.payment_failed": {
                const subscriptionId = obj.subscription;
                if (subscriptionId) {
                    await ctx.runMutation(internal.billing.webhooks.updateSubscriptionStatus, {
                        stripeSubscriptionId: subscriptionId,
                        status: "past_due",
                        cancelAtPeriodEnd: false,
                    });
                    console.log(`Stripe webhook: invoice.payment_failed for subscription ${subscriptionId}`);
                }
                break;
            }

            // -----------------------------------------------------------------
            // Connect account events
            // -----------------------------------------------------------------

            case "account.updated": {
                const accountId = obj.id;
                if (accountId) {
                    let connectStatus = "pending";
                    if (obj.details_submitted && obj.charges_enabled && obj.payouts_enabled) {
                        connectStatus = "active";
                    } else if (obj.details_submitted) {
                        connectStatus = "restricted";
                    } else {
                        connectStatus = "onboarding";
                    }

                    await ctx.runMutation(internal.billing.webhooks.updateConnectAccountStatus, {
                        stripeAccountId: accountId,
                        status: connectStatus,
                        chargesEnabled: obj.charges_enabled ?? false,
                        payoutsEnabled: obj.payouts_enabled ?? false,
                        detailsSubmitted: obj.details_submitted ?? false,
                    });
                    console.log(`Stripe webhook: account.updated → ${accountId}, status=${connectStatus}`);
                }
                break;
            }

            default:
                console.log(`Stripe webhook: unhandled event type ${eventType}`);
        }

        return { received: true };
    },
});

// =============================================================================
// Stripe subscription status mapping
// =============================================================================

function mapStripeSubscriptionStatus(
    stripeStatus: string
): string | null {
    switch (stripeStatus) {
        case "active":
            return "active";
        case "past_due":
            return "past_due";
        case "canceled":
            return "cancelled";
        case "unpaid":
            return "past_due";
        case "trialing":
            return "active";
        case "incomplete":
            return "pending";
        case "incomplete_expired":
            return "expired";
        case "paused":
            return "paused";
        default:
            return null;
    }
}

// =============================================================================
// Internal mutations for subscription webhook processing
// =============================================================================

export const activateSubscription = internalMutation({
    args: {
        tenantId: v.string(),
        userId: v.string(),
        tierId: v.string(),
        creatorId: v.optional(v.string()),
        stripeSubscriptionId: v.string(),
        stripeCustomerId: v.string(),
        reference: v.string(),
    },
    handler: async (ctx, args) => {
        // Check if membership already exists for this subscription
        const existing = await ctx.runQuery(
            components.subscriptions.functions.getMembershipByStripeSubscription,
            { stripeSubscriptionId: args.stripeSubscriptionId }
        );
        if (existing) {
            console.log(`Subscription ${args.stripeSubscriptionId} already activated, skipping`);
            return;
        }

        const now = Date.now();
        const oneMonth = 30 * 24 * 60 * 60 * 1000;

        await ctx.runMutation(components.subscriptions.functions.createMembership, {
            tenantId: args.tenantId,
            userId: args.userId,
            tierId: args.tierId,
            creatorId: args.creatorId,
            status: "active",
            startDate: now,
            endDate: now + oneMonth,
            autoRenew: true,
            nextBillingDate: now + oneMonth,
            lastPaymentDate: now,
            enrollmentChannel: "web",
            stripeSubscriptionId: args.stripeSubscriptionId,
            stripeCustomerId: args.stripeCustomerId,
        });

        // Increment tier member count
        const tier = await ctx.runQuery(components.subscriptions.functions.getTier, {
            id: args.tierId as any,
        });
        if (tier) {
            await ctx.runMutation(components.subscriptions.functions.updateTierMemberCount, {
                id: args.tierId as any,
                delta: 1,
            });
        }

        // Emit event for notification pipeline (welcome + new subscriber alerts)
        await emitEvent(ctx, "subscriptions.membership.created", args.tenantId, "subscriptions", {
            userId: args.userId,
            creatorId: args.creatorId,
            membershipId: args.stripeSubscriptionId,
            tierId: args.tierId,
            tierName: tier?.name,
        });
    },
});

export const updateSubscriptionStatus = internalMutation({
    args: {
        stripeSubscriptionId: v.string(),
        status: v.string(),
        cancelAtPeriodEnd: v.boolean(),
    },
    handler: async (ctx, { stripeSubscriptionId, status, cancelAtPeriodEnd }) => {
        const membership = await ctx.runQuery(
            components.subscriptions.functions.getMembershipByStripeSubscription,
            { stripeSubscriptionId }
        );

        if (!membership) {
            console.log(`No membership found for Stripe subscription ${stripeSubscriptionId}`);
            return;
        }

        const now = Date.now();
        const cancelFields: Record<string, unknown> = {};
        if (status === "cancelled") {
            cancelFields.cancelledAt = now;
            cancelFields.cancelEffectiveDate = now;
        }

        await ctx.runMutation(components.subscriptions.functions.updateMembershipStatus, {
            id: membership._id,
            status,
            ...cancelFields,
        });

        // If cancelled, decrement member count
        if (status === "cancelled" && membership.tierId) {
            await ctx.runMutation(components.subscriptions.functions.updateTierMemberCount, {
                id: membership.tierId as any,
                delta: -1,
            });
        }
    },
});

export const recordSubscriptionPayment = internalMutation({
    args: {
        stripeSubscriptionId: v.string(),
        amountPaid: v.optional(v.number()),
        periodEnd: v.optional(v.number()),
    },
    handler: async (ctx, { stripeSubscriptionId, amountPaid: _amountPaid, periodEnd }) => {
        const membership = await ctx.runQuery(
            components.subscriptions.functions.getMembershipByStripeSubscription,
            { stripeSubscriptionId }
        );

        if (!membership) return;

        const now = Date.now();
        await ctx.runMutation(components.subscriptions.functions.updateMembership, {
            id: membership._id,
            lastPaymentDate: now,
            failedPaymentCount: 0,
            nextBillingDate: periodEnd,
            endDate: periodEnd,
        });
    },
});

export const updateConnectAccountStatus = internalMutation({
    args: {
        stripeAccountId: v.string(),
        status: v.string(),
        chargesEnabled: v.boolean(),
        payoutsEnabled: v.boolean(),
        detailsSubmitted: v.boolean(),
    },
    handler: async (ctx, args) => {
        const account = await ctx.runQuery(
            components.subscriptions.functions.getCreatorAccountByStripeId,
            { stripeAccountId: args.stripeAccountId }
        );

        if (!account) {
            console.log(`No creator account found for Stripe account ${args.stripeAccountId}`);
            return;
        }

        await ctx.runMutation(components.subscriptions.functions.updateCreatorAccount, {
            id: account._id,
            status: args.status,
            chargesEnabled: args.chargesEnabled,
            payoutsEnabled: args.payoutsEnabled,
            detailsSubmitted: args.detailsSubmitted,
        });
    },
});

/**
 * Vipps Webhook Handler
 * Processes ePayment webhook events from Vipps.
 * Events: epayments.payment.created.v1, .authorized.v1, .captured.v1,
 *         .cancelled.v1, .refunded.v1, .aborted.v1, .expired.v1
 */
export const vippsWebhook = internalAction({
    args: {
        payload: v.any(),
        headers: v.any(),
    },
    handler: async (ctx, { payload, headers: _headers }) => {
        // Vipps ePayment webhook payload structure:
        // { msn, reference, pspReference, name, amount, state, paymentMethod, ... }
        const reference = payload.reference;
        const state = payload.state;

        if (!reference) {
            console.log("Vipps webhook: missing reference", payload);
            return { received: true };
        }

        type PaymentStatus = "created" | "authorized" | "captured" | "failed" | "refunded" | "cancelled";
        let status: PaymentStatus;
        switch (state) {
            case "CREATED":
                status = "created";
                break;
            case "AUTHORIZED":
                status = "authorized";
                break;
            case "ABORTED":
            case "TERMINATED":
                status = "cancelled";
                break;
            case "EXPIRED":
                status = "failed";
                break;
            default:
                status = (state ? state.toLowerCase() : "failed") as PaymentStatus;
        }

        // Update payment record
        await ctx.runMutation(internal.billing.vipps.updatePaymentStatus, {
            reference,
            status,
            externalId: payload.pspReference,
            capturedAmount: state === "AUTHORIZED" ? payload.amount?.value : undefined,
        });

        // If payment is authorized, update the associated booking status
        if (status === "authorized") {
            const payment = await ctx.runMutation(
                internal.billing.vipps.getPaymentByReference,
                { reference }
            );
            if (payment?.bookingId) {
                console.log(
                    `Vipps payment authorized for booking ${payment.bookingId}`
                );
            }
        }

        // TODO: checkout facade was removed — Vipps post-payment order callbacks
        // should be re-wired when ticketing checkout is rebuilt.

        console.log(`Vipps webhook: ${reference} → ${status}`);
        return { received: true };
    },
});

/**
 * Adyen Webhook Handler
 * Processes payment notification webhooks from Adyen.
 * Events: AUTHORISATION, CAPTURE, CAPTURE_FAILED, CANCELLATION, REFUND, REFUND_FAILED
 *
 * Adyen batches notifications in `notificationItems`. Each item contains an
 * `eventCode` and `success` flag that together determine the payment status.
 *
 * HMAC-SHA256 signature verification is enforced when `ADYEN_HMAC_KEY` is set.
 */

type AdyenPaymentStatus =
    | "authorized"
    | "captured"
    | "failed"
    | "cancelled"
    | "refunded";

/**
 * Verify the HMAC-SHA256 signature that Adyen attaches to each notification item.
 *
 * The signed string is a colon-separated concatenation of:
 *   pspReference : originalReference : merchantAccountCode : merchantReference
 *   : amount.value : amount.currency : eventCode : success
 */
async function verifyHmacSignature(
    notification: Record<string, any>,
    hmacKey: string
): Promise<boolean> {
    const item = notification;
    const signedString = [
        item.pspReference,
        item.originalReference || "",
        item.merchantAccountCode,
        item.merchantReference,
        String(item.amount.value),
        item.amount.currency,
        item.eventCode,
        item.success,
    ].join(":");

    // Decode hex key to Uint8Array
    const keyBytes = new Uint8Array(
        hmacKey.match(/.{1,2}/g)!.map((b) => parseInt(b, 16))
    );

    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const encoder = new TextEncoder();
    const signature = await crypto.subtle.sign(
        "HMAC",
        cryptoKey,
        encoder.encode(signedString)
    );

    // Convert ArrayBuffer to base64
    const computed = btoa(
        String.fromCharCode(...new Uint8Array(signature))
    );
    return computed === item.additionalData?.hmacSignature;
}

/**
 * Map an Adyen eventCode + success flag to an internal payment status.
 * Returns `null` when the event should be logged but not acted upon.
 */
function mapAdyenEventToStatus(
    eventCode: string,
    success: string
): AdyenPaymentStatus | null {
    const isSuccess = success === "true";

    switch (eventCode) {
        case "AUTHORISATION":
            return isSuccess ? "authorized" : "failed";
        case "CAPTURE":
            return isSuccess ? "captured" : "failed";
        case "CAPTURE_FAILED":
            return "failed";
        case "CANCELLATION":
            return isSuccess ? "cancelled" : null;
        case "REFUND":
            return isSuccess ? "refunded" : null;
        case "REFUND_FAILED":
            // Log warning but don't change status — requires manual investigation
            return null;
        default:
            return null;
    }
}

export const adyenWebhook = internalAction({
    args: {
        payload: v.any(),
        headers: v.any(),
    },
    handler: async (ctx, { payload, headers: _headers }) => {
        const hmacKey = process.env.ADYEN_HMAC_KEY;
        const notificationItems: any[] = payload.notificationItems ?? [];

        if (notificationItems.length === 0) {
            console.log("Adyen webhook: no notification items in payload");
            return { "[accepted]": true };
        }

        for (const entry of notificationItems) {
            const item = entry.NotificationRequestItem;
            if (!item) {
                console.log("Adyen webhook: malformed notification entry", entry);
                continue;
            }

            // --- HMAC verification ---
            if (hmacKey) {
                const valid = await verifyHmacSignature(item, hmacKey);
                if (!valid) {
                    console.error(
                        `Adyen webhook: HMAC verification failed for pspReference=${item.pspReference}`
                    );
                    continue;
                }
            } else {
                console.warn(
                    "Adyen webhook: ADYEN_HMAC_KEY not configured — skipping signature verification"
                );
            }

            const eventCode: string = item.eventCode;
            const success: string = item.success;
            const pspReference: string = item.pspReference;
            const merchantReference: string = item.merchantReference;

            // --- Map event to status ---
            const status = mapAdyenEventToStatus(eventCode, success);

            if (eventCode === "REFUND_FAILED") {
                console.warn(
                    `Adyen webhook: REFUND_FAILED for pspReference=${pspReference}, merchantReference=${merchantReference} — manual review required`
                );
            }

            if (!status) {
                console.log(
                    `Adyen webhook: unhandled or non-actionable event ${eventCode} (success=${success}) for ${merchantReference}`
                );
                continue;
            }

            // --- Update payment record ---
            await ctx.runMutation(internal.billing.adyen.updatePaymentStatus, {
                reference: merchantReference,
                status,
                externalId: pspReference,
                capturedAmount:
                    status === "captured"
                        ? item.amount?.value
                        : undefined,
            });

            // --- If authorized, log order association ---
            if (status === "authorized") {
                try {
                    const payment = await ctx.runMutation(
                        internal.billing.adyen.getPaymentByReference,
                        { reference: merchantReference }
                    );
                    if (payment?.bookingId) {
                        console.log(
                            `Adyen payment authorized for booking ${payment.bookingId}`
                        );
                    }
                } catch (err) {
                    console.warn(
                        `Adyen webhook: failed to look up payment for reference=${merchantReference}`,
                        err
                    );
                }
            }

            // TODO: checkout facade was removed — Adyen post-payment order callbacks
            // should be re-wired when ticketing checkout is rebuilt.

            console.log(
                `Adyen webhook: ${merchantReference} [${eventCode}/${success}] → ${status}`
            );
        }

        // Adyen expects "[accepted]" in the response to acknowledge receipt
        return { "[accepted]": true };
    },
});
