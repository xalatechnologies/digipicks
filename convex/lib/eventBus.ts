/**
 * Event Bus — Outbox Pattern for Component Communication
 *
 * Components communicate through events, never through direct function calls.
 * This enables the plug-and-play architecture where components can be swapped
 * without affecting subscribers.
 *
 * Topic format: {component}.{entity}.{action}
 * Examples: "bookings.booking.created", "reviews.review.moderated"
 *
 * @see docs/CONVENTIONS.md for the outbox event specification
 */

import { v } from "convex/values";
import {
    internalMutation,
    internalQuery,
} from "../_generated/server";
import { components } from "../_generated/api";


// =============================================================================
// EVENT EMISSION
// =============================================================================

/**
 * Emit an event to the outbox. Called by facade functions after primary operations.
 * Events are processed asynchronously by the event worker.
 */
export const emit = internalMutation({
    args: {
        topic: v.string(),
        tenantId: v.string(),
        sourceComponent: v.string(),
        payload: v.any(),
    },
    handler: async (ctx, args) => {
        const eventId = await ctx.db.insert("outboxEvents", {
            topic: args.topic,
            tenantId: args.tenantId,
            sourceComponent: args.sourceComponent,
            payload: args.payload,
            status: "pending",
            retryCount: 0,
            maxRetries: 3,
            createdAt: Date.now(),
        });
        return { eventId };
    },
});

// =============================================================================
// SAFE COMPONENT LOOKUPS (for event handlers)
// =============================================================================

/** Look up a review by ID, returning null if deleted or not found. */
async function safeGetReview(
    ctx: { runQuery: (ref: any, args: any) => Promise<any> },
    reviewId: string
): Promise<Record<string, unknown> | null> {
    try {
        return await ctx.runQuery(components.reviews.functions.get, { id: reviewId });
    } catch {
        return null;
    }
}

// =============================================================================
// EVENT PROCESSING
// =============================================================================

/**
 * Process pending events — dispatches to subscribing components.
 * Called every minute by the processEventBus cron job.
 *
 * Processing pipeline:
 * 1. Recover stale events stuck in "processing" (>5 min = likely crashed)
 * 2. Promote "failed" events whose exponential backoff period has elapsed
 * 3. Process up to batchSize "pending" events through the handler dispatch table
 *
 * Backoff schedule: 30s × 2^retryCount (capped at 5 min)
 * After maxRetries (default 3): event moves to "dead_letter"
 */
export const processEvents = internalMutation({
    args: {
        batchSize: v.optional(v.number()),
    },
    handler: async (ctx, { batchSize = 50 }) => {
        const now = Date.now();

        // -----------------------------------------------------------------
        // Step 1: Recover stale "processing" events (stuck > 5 minutes)
        // This handles the case where a previous processor run timed out
        // after marking events as "processing" but before completing.
        // -----------------------------------------------------------------
        const STALE_THRESHOLD_MS = 5 * 60 * 1000;
        const staleEvents = await ctx.db
            .query("outboxEvents")
            .withIndex("by_status", (q) => q.eq("status", "processing"))
            .take(batchSize);

        let recovered = 0;
        for (const stale of staleEvents) {
            const startedAt = stale.lastAttemptAt ?? stale.createdAt;
            if (now - startedAt > STALE_THRESHOLD_MS) {
                await ctx.db.patch(stale._id, {
                    status: "pending",
                    error: `Recovered from stale processing state after ${Math.round((now - startedAt) / 1000)}s`,
                });
                recovered++;
            }
        }

        // -----------------------------------------------------------------
        // Step 2: Promote "failed" events whose backoff has expired
        // Backoff: 30s × 2^retryCount, capped at 5 minutes
        // -----------------------------------------------------------------
        const failedEvents = await ctx.db
            .query("outboxEvents")
            .withIndex("by_status", (q) => q.eq("status", "failed"))
            .take(batchSize);

        let promoted = 0;
        for (const failedEvent of failedEvents) {
            const backoffMs = Math.min(
                30_000 * Math.pow(2, failedEvent.retryCount), // 30s, 60s, 120s...
                5 * 60 * 1000 // max 5 minutes
            );
            const lastAttempt = failedEvent.lastAttemptAt ?? failedEvent.createdAt;
            if (now - lastAttempt >= backoffMs) {
                await ctx.db.patch(failedEvent._id, { status: "pending" });
                promoted++;
            }
        }

        // -----------------------------------------------------------------
        // Step 3: Process pending events
        // -----------------------------------------------------------------
        const pending = await ctx.db
            .query("outboxEvents")
            .withIndex("by_status", (q) => q.eq("status", "pending"))
            .take(batchSize);

        let processed = 0;
        let failed = 0;

        for (const event of pending) {
            try {
                // Mark as processing with attempt timestamp
                await ctx.db.patch(event._id, {
                    status: "processing",
                    lastAttemptAt: now,
                });

                // Dispatch to known subscriber handlers based on topic.
                //
                // Convex does not support storing and invoking arbitrary FunctionReferences
                // from a DB record. Instead we use a compile-time dispatch table keyed on
                // topic patterns. Each handler creates a notification via the notifications
                // component. Handlers are idempotent — duplicate events produce duplicate
                // notifications at worst (the notification UI deduplicates by type+metadata).
                //
                // To add a new subscriber: add a case here and call the relevant component.
                const payload = event.payload as Record<string, unknown>;

                if (event.topic === "resources.resource.created") {
                    // No notification needed — resource creation is an admin action
                    // Analytics tracking can be added here later

                } else if (event.topic === "resources.resource.published") {
                    // No notification needed — publishing is an admin action
                    // Could notify followers or subscribers in the future

                } else if (event.topic === "resources.resource.removed") {
                    // No notification needed — removal is an admin action
                    // Related booking cleanup is handled by the bookings component

                } else if (event.topic === "reviews.review.created") {
                    // Notify the resource owner that a new review was posted
                    // We don't have the owner ID in the payload, so skip for now
                    // (The review is visible in the backoffice immediately via Convex reactivity)

                } else if (event.topic === "reviews.review.moderated") {
                    // Notify the review author of the moderation decision
                    const review = payload.reviewId
                        ? await safeGetReview(ctx, payload.reviewId as string)
                        : null;
                    const reviewAuthor = (review as any)?.userId as string | undefined;
                    if (reviewAuthor) {
                        const isApproved = payload.status === "approved";
                        await ctx.runMutation(components.notifications.functions.create, {
                            tenantId: event.tenantId,
                            userId: reviewAuthor,
                            type: "review_moderated",
                            title: isApproved ? "Anmeldelse godkjent" : "Anmeldelse avvist",
                            body: isApproved
                                ? "Din anmeldelse er publisert."
                                : "Din anmeldelse ble ikke godkjent.",
                            metadata: { reviewId: payload.reviewId, status: payload.status },
                        });
                    }

                } else if (event.topic === "billing.payment.received") {
                    // Payment events don't include userId in the payload (only amount/provider).
                    // Notification for payer is typically handled in the billing facade.

                } else if (event.topic === "billing.invoice.created") {
                    // Invoice events include customerName but not userId.
                    // Notification for recipient is handled in the billing facade.

                } else if (event.topic === "messaging.conversation.created") {
                    // No-op: notification is handled synchronously in the messaging facade

                } else if (event.topic === "messaging.message.sent") {
                    // No-op: message notification is handled synchronously in the messaging facade

                // =============================================================
                // TICKETING EVENTS
                // =============================================================

                } else if (event.topic === "ticketing.performance.cancelled") {
                    // Notification to all ticket holders is handled in the facade
                    // (bulk cancel triggers individual ticket.cancelled events)

                } else if (event.topic === "ticketing.performance.on-sale") {
                    // Could notify members/followers — future enhancement

                } else if (event.topic === "ticketing.performance.sold-out") {
                    // Could trigger waitlist notifications — future enhancement

                } else if (event.topic === "ticketing.order.confirmed") {
                    // Notify customer that order is confirmed
                    if (payload.customerId) {
                        await ctx.runMutation(components.notifications.functions.create, {
                            tenantId: event.tenantId,
                            userId: payload.customerId as string,
                            type: "order_confirmed",
                            title: "Bestilling bekreftet",
                            body: `Din bestilling ${payload.orderNumber ?? ""} er bekreftet. Billettene er klare.`,
                            link: `/ordrer/${payload.orderId ?? ""}`,
                            metadata: { orderId: payload.orderId, orderNumber: payload.orderNumber },
                        });
                    }

                } else if (event.topic === "ticketing.order.cancelled") {
                    if (payload.customerId) {
                        await ctx.runMutation(components.notifications.functions.create, {
                            tenantId: event.tenantId,
                            userId: payload.customerId as string,
                            type: "order_cancelled",
                            title: "Bestilling kansellert",
                            body: payload.reason
                                ? `Din bestilling ble kansellert: ${payload.reason}`
                                : "Din bestilling har blitt kansellert.",
                            link: `/ordrer/${payload.orderId ?? ""}`,
                            metadata: { orderId: payload.orderId, reason: payload.reason },
                        });
                    }

                } else if (event.topic === "ticketing.order.refunded") {
                    if (payload.customerId) {
                        await ctx.runMutation(components.notifications.functions.create, {
                            tenantId: event.tenantId,
                            userId: payload.customerId as string,
                            type: "order_refunded",
                            title: "Refusjon behandlet",
                            body: "Refusjonen for din bestilling er behandlet.",
                            link: `/ordrer/${payload.orderId ?? ""}`,
                            metadata: { orderId: payload.orderId },
                        });
                    }

                } else if (event.topic === "ticketing.ticket.issued") {
                    // Ticket issuance notification handled in order.confirmed

                } else if (event.topic === "ticketing.ticket.checked-in") {
                    // Check-in is real-time — no async notification needed

                } else if (event.topic === "ticketing.ticket.cancelled") {
                    if (payload.ownerId) {
                        await ctx.runMutation(components.notifications.functions.create, {
                            tenantId: event.tenantId,
                            userId: payload.ownerId as string,
                            type: "ticket_cancelled",
                            title: "Billett kansellert",
                            body: `Billett ${payload.ticketNumber ?? ""} har blitt kansellert.`,
                            metadata: { ticketId: payload.ticketId, ticketNumber: payload.ticketNumber },
                        });
                    }

                } else if (event.topic === "ticketing.ticket.transferred") {
                    // Notify new owner
                    if (payload.toUserId) {
                        await ctx.runMutation(components.notifications.functions.create, {
                            tenantId: event.tenantId,
                            userId: payload.toUserId as string,
                            type: "ticket_received",
                            title: "Billett mottatt",
                            body: "Du har mottatt en billett.",
                            link: `/billetter/${payload.ticketId ?? ""}`,
                            metadata: { ticketId: payload.ticketId },
                        });
                    }

                // =============================================================
                // GIFT CARD EVENTS
                // =============================================================

                } else if (event.topic === "giftcards.giftcard.created") {
                    // Delivery email handled in facade

                } else if (event.topic === "giftcards.giftcard.redeemed") {
                    // No notification needed — user sees balance in UI

                } else if (event.topic === "giftcards.giftcard.depleted") {
                    if (payload.purchasedBy) {
                        await ctx.runMutation(components.notifications.functions.create, {
                            tenantId: event.tenantId,
                            userId: payload.purchasedBy as string,
                            type: "giftcard_depleted",
                            title: "Gavekort oppbrukt",
                            body: "Gavekortet ditt er nå oppbrukt.",
                            metadata: { giftCardId: payload.giftCardId },
                        });
                    }

                // =============================================================
                // SUBSCRIPTION EVENTS
                // =============================================================

                } else if (event.topic === "subscriptions.membership.created") {
                    if (payload.userId) {
                        await ctx.runMutation(components.notifications.functions.create, {
                            tenantId: event.tenantId,
                            userId: payload.userId as string,
                            type: "membership_welcome",
                            title: "Velkommen som medlem!",
                            body: `Du er nå ${payload.tierName ?? "medlem"}. Nyt fordelene dine!`,
                            link: "/medlemskap",
                            metadata: { membershipId: payload.membershipId, tierId: payload.tierId },
                        });
                    }

                } else if (event.topic === "subscriptions.membership.cancelled") {
                    if (payload.userId) {
                        await ctx.runMutation(components.notifications.functions.create, {
                            tenantId: event.tenantId,
                            userId: payload.userId as string,
                            type: "membership_cancelled",
                            title: "Medlemskap avsluttet",
                            body: "Ditt medlemskap er nå avsluttet.",
                            link: "/medlemskap",
                            metadata: { membershipId: payload.membershipId },
                        });
                    }

                } else if (event.topic === "subscriptions.membership.renewed") {
                    if (payload.userId) {
                        await ctx.runMutation(components.notifications.functions.create, {
                            tenantId: event.tenantId,
                            userId: payload.userId as string,
                            type: "membership_renewed",
                            title: "Medlemskap fornyet",
                            body: "Ditt medlemskap er fornyet for en ny periode.",
                            link: "/medlemskap",
                            metadata: { membershipId: payload.membershipId },
                        });
                    }

                } else if (event.topic === "subscriptions.membership.expired") {
                    if (payload.userId) {
                        await ctx.runMutation(components.notifications.functions.create, {
                            tenantId: event.tenantId,
                            userId: payload.userId as string,
                            type: "membership_expired",
                            title: "Medlemskap utløpt",
                            body: "Ditt medlemskap har utløpt. Forny for å beholde fordelene.",
                            link: "/medlemskap",
                            metadata: { membershipId: payload.membershipId },
                        });
                    }

                // =============================================================
                // RESALE EVENTS
                // =============================================================

                } else if (event.topic === "resale.listing.approved") {
                    // Notify seller that listing is now live
                    if (payload.sellerId) {
                        await ctx.runMutation(components.notifications.functions.create, {
                            tenantId: event.tenantId,
                            userId: payload.sellerId as string,
                            type: "resale_approved",
                            title: "Videresalg godkjent",
                            body: "Din billett er nå lagt ut på videresalg.",
                            metadata: { listingId: payload.listingId },
                        });
                    }

                } else if (event.topic === "resale.listing.rejected") {
                    // Notify seller with rejection reason
                    if (payload.sellerId) {
                        await ctx.runMutation(components.notifications.functions.create, {
                            tenantId: event.tenantId,
                            userId: payload.sellerId as string,
                            type: "resale_rejected",
                            title: "Videresalg avvist",
                            body: payload.reason
                                ? `Din billett ble avvist for videresalg: ${payload.reason}`
                                : "Din billett ble avvist for videresalg.",
                            metadata: { listingId: payload.listingId, reason: payload.reason },
                        });
                    }

                } else if (event.topic === "resale.listing.sold") {
                    // Notify seller
                    if (payload.sellerId) {
                        await ctx.runMutation(components.notifications.functions.create, {
                            tenantId: event.tenantId,
                            userId: payload.sellerId as string,
                            type: "resale_sold",
                            title: "Billett solgt",
                            body: "Din billett på videresalg er nå solgt.",
                            metadata: { listingId: payload.listingId },
                        });
                    }

                } else if (event.topic === "resale.dispute.opened") {
                    // Admin notification — could be handled via admin dashboard

                } else if (event.topic === "resale.dispute.resolved") {
                    if (payload.reportedBy) {
                        await ctx.runMutation(components.notifications.functions.create, {
                            tenantId: event.tenantId,
                            userId: payload.reportedBy as string,
                            type: "resale_dispute_resolved",
                            title: "Tvist løst",
                            body: "Din tvist om videresalg er nå løst.",
                            metadata: { disputeId: payload.disputeId, resolution: payload.resolution },
                        });
                    }

                // =============================================================
                // CATCH-ALL — unhandled topics are no-ops
                // =============================================================

                } else if (
                    event.topic.startsWith("ticketing.") ||
                    event.topic.startsWith("giftcards.") ||
                    event.topic.startsWith("subscriptions.") ||
                    event.topic.startsWith("resale.")
                ) {
                    // Known domain prefix, no handler yet — no-op
                }

                // Mark as processed
                await ctx.db.patch(event._id, {
                    status: "processed",
                    processedAt: now,
                });
                processed++;
            } catch (error) {
                const newRetryCount = event.retryCount + 1;
                const maxRetries = event.maxRetries ?? 3;

                await ctx.db.patch(event._id, {
                    status: newRetryCount >= maxRetries ? "dead_letter" : "failed",
                    retryCount: newRetryCount,
                    lastAttemptAt: now,
                    error: error instanceof Error ? error.message : String(error),
                });
                failed++;
            }
        }

        return { processed, failed, recovered, promoted, total: pending.length };
    },
});

// =============================================================================
// EVENT QUERIES
// =============================================================================

/**
 * List recent events for monitoring/debugging.
 */
export const listRecent = internalQuery({
    args: {
        tenantId: v.optional(v.string()),
        topic: v.optional(v.string()),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, topic, status, limit = 50 }) => {
        let events;

        if (status) {
            events = await ctx.db
                .query("outboxEvents")
                .withIndex("by_status", (q) =>
                    q.eq("status", status as "pending" | "processing" | "processed" | "failed" | "dead_letter")
                )
                .take(limit);
        } else {
            events = await ctx.db
                .query("outboxEvents")
                .order("desc")
                .take(limit);
        }

        // Apply additional filters in memory
        if (tenantId) {
            events = events.filter((e) => e.tenantId === tenantId);
        }
        if (topic) {
            events = events.filter((e) => e.topic === topic);
        }

        return events;
    },
});

/**
 * Get dead letter events that need manual intervention.
 */
export const listDeadLetters = internalQuery({
    args: {
        tenantId: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, limit = 100 }) => {
        let events = await ctx.db
            .query("outboxEvents")
            .withIndex("by_status", (q) => q.eq("status", "dead_letter"))
            .take(limit);

        if (tenantId) {
            events = events.filter((e) => e.tenantId === tenantId);
        }

        return events;
    },
});

/**
 * Retry a dead letter event.
 */
export const retryDeadLetter = internalMutation({
    args: {
        eventId: v.id("outboxEvents"),
    },
    handler: async (ctx, { eventId }) => {
        const event = await ctx.db.get(eventId);
        if (!event) {
            throw new Error("Event not found");
        }
        if (event.status !== "dead_letter" && event.status !== "failed") {
            throw new Error("Event is not in dead_letter or failed status");
        }

        await ctx.db.patch(eventId, {
            status: "pending",
            retryCount: 0,
            error: undefined,
            lastAttemptAt: undefined,
        });

        return { success: true };
    },
});

/**
 * Bulk retry all dead letter events, optionally filtered by tenant or topic.
 */
export const retryAllDeadLetters = internalMutation({
    args: {
        tenantId: v.optional(v.string()),
        topic: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, topic, limit = 100 }) => {
        let events = await ctx.db
            .query("outboxEvents")
            .withIndex("by_status", (q) => q.eq("status", "dead_letter"))
            .take(limit);

        if (tenantId) {
            events = events.filter((e) => e.tenantId === tenantId);
        }
        if (topic) {
            events = events.filter((e) => e.topic === topic);
        }

        let retried = 0;
        for (const event of events) {
            await ctx.db.patch(event._id, {
                status: "pending",
                retryCount: 0,
                error: undefined,
                lastAttemptAt: undefined,
            });
            retried++;
        }

        return { retried };
    },
});

/**
 * Queue health metrics for monitoring. Returns counts by status
 * and identifies stale or backlogged events.
 */
export const getQueueStats = internalQuery({
    args: {
        tenantId: v.optional(v.string()),
    },
    handler: async (ctx, { tenantId }) => {
        const statuses = ["pending", "processing", "processed", "failed", "dead_letter"] as const;
        const counts: Record<string, number> = {};

        for (const status of statuses) {
            let events = await ctx.db
                .query("outboxEvents")
                .withIndex("by_status", (q) => q.eq("status", status))
                .collect();
            if (tenantId) {
                events = events.filter((e) => e.tenantId === tenantId);
            }
            counts[status] = events.length;
        }

        // Find oldest pending event (queue lag)
        const oldestPending = await ctx.db
            .query("outboxEvents")
            .withIndex("by_status", (q) => q.eq("status", "pending"))
            .first();

        const now = Date.now();
        const lagMs = oldestPending ? now - oldestPending.createdAt : 0;

        return {
            counts,
            total: Object.values(counts).reduce((a, b) => a + b, 0),
            lagMs,
            lagSeconds: Math.round(lagMs / 1000),
            healthy: counts.dead_letter === 0 && counts.failed < 10 && lagMs < 5 * 60 * 1000,
        };
    },
});

// =============================================================================
// CLEANUP
// =============================================================================

/**
 * Clean up old processed events. Call periodically to keep the table manageable.
 */
export const cleanupProcessed = internalMutation({
    args: {
        olderThanMs: v.optional(v.number()), // Default: 7 days
        batchSize: v.optional(v.number()),
    },
    handler: async (ctx, { olderThanMs = 7 * 24 * 60 * 60 * 1000, batchSize = 100 }) => {
        const cutoff = Date.now() - olderThanMs;

        const oldEvents = await ctx.db
            .query("outboxEvents")
            .withIndex("by_status", (q) => q.eq("status", "processed"))
            .take(batchSize);

        let deleted = 0;
        for (const event of oldEvents) {
            if (event.createdAt < cutoff) {
                await ctx.db.delete(event._id);
                deleted++;
            }
        }

        return { deleted };
    },
});

// =============================================================================
// HELPER — For use in facade functions
// =============================================================================

/**
 * Helper function to emit events from facade functions.
 * Inlines the outbox insert to avoid dynamic module resolution (Convex V8 isolate
 * does not support dynamic import). Import and call in domain facade mutations.
 *
 * Usage in a facade:
 *   import { emitEvent } from "../lib/eventBus";
 *   // After primary operation:
 *   await emitEvent(ctx, "reviews.review.created", tenantId, "reviews", { reviewId, resourceId });
 */
export async function emitEvent(
    ctx: { db: { insert: (table: any, doc: any) => Promise<any> } },
    topic: string,
    tenantId: string,
    sourceComponent: string,
    payload: Record<string, unknown>
): Promise<void> {
    await ctx.db.insert("outboxEvents", {
        topic,
        tenantId,
        sourceComponent,
        payload,
        status: "pending",
        retryCount: 0,
        maxRetries: 3,
        createdAt: Date.now(),
    });
}
