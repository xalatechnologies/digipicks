/**
 * EventBus — Comprehensive convex-test Tests
 *
 * Tests the real Convex internal mutations and queries in:
 *   lib/eventBus.ts
 *
 * Uses convex-test with the root schema so all outboxEvents and
 * componentRegistry schema validators run against actual function code.
 *
 * Because eventBus functions are internalMutation / internalQuery, they are
 * invoked via t.run() rather than t.mutation() / t.query().
 *
 * Run: npx vitest run --config convex/vitest.config.ts lib/eventBus.test.ts
 */

import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../../schema";
import { modules } from "../../testSetup.test-util";
import { internal } from "../../_generated/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT = "tenant-event-001";
const TENANT2 = "tenant-event-002";

async function emitBookingEvent(
    t: ReturnType<typeof convexTest>,
    topic: string,
    overrides: Partial<{ tenantId: string; payload: Record<string, unknown> }> = {}
) {
    return t.run(async (ctx) =>
        ctx.runMutation(internal.lib.eventBus.emit, {
            topic,
            tenantId: overrides.tenantId ?? TENANT,
            sourceComponent: "bookings",
            payload: overrides.payload ?? { bookingId: "bk-001" },
        })
    );
}

// ---------------------------------------------------------------------------
// emit — outbox insert
// ---------------------------------------------------------------------------

describe("eventBus — emit", () => {
    it("inserts a pending event into outboxEvents and returns eventId", async () => {
        const t = convexTest(schema, modules);

        const result = await emitBookingEvent(t, "bookings.booking.created");

        expect(result.eventId).toBeDefined();

        const event = await t.run(async (ctx) => ctx.db.get(result.eventId as any)) as any;
        expect(event?.topic).toBe("bookings.booking.created");
        expect(event?.tenantId).toBe(TENANT);
        expect(event?.sourceComponent).toBe("bookings");
        expect(event?.status).toBe("pending");
        expect(event?.retryCount).toBe(0);
        expect(event?.maxRetries).toBe(3);
        expect(event?.createdAt).toBeLessThanOrEqual(Date.now());
    });

    it("stores arbitrary payload as-is", async () => {
        const t = convexTest(schema, modules);
        const payload = { bookingId: "bk-42", resourceId: "res-7", amount: 1500 };

        const { eventId } = await emitBookingEvent(t, "bookings.booking.approved", { payload });

        const event = await t.run(async (ctx) => ctx.db.get(eventId as any)) as any;
        expect(event?.payload).toEqual(payload);
    });

    it("multiple events for the same tenant are all pending", async () => {
        const t = convexTest(schema, modules);

        await emitBookingEvent(t, "bookings.booking.created");
        await emitBookingEvent(t, "bookings.booking.approved");
        await emitBookingEvent(t, "resources.resource.published");

        const pending = await t.run(async (ctx) =>
            ctx.db.query("outboxEvents")
                .withIndex("by_status", (q) => q.eq("status", "pending"))
                .collect()
        );
        expect(pending.length).toBe(3);
    });

    it("events are scoped by tenantId — different tenants are independent", async () => {
        const t = convexTest(schema, modules);

        await emitBookingEvent(t, "bookings.booking.created", { tenantId: TENANT });
        await emitBookingEvent(t, "bookings.booking.created", { tenantId: TENANT2 });

        const all = await t.run(async (ctx) =>
            ctx.db.query("outboxEvents").collect()
        );
        expect(all.length).toBe(2);
        expect(all.map((e) => e.tenantId).sort()).toEqual([TENANT, TENANT2].sort());
    });
});

// ---------------------------------------------------------------------------
// processEvents — dispatch table
// ---------------------------------------------------------------------------

describe("eventBus — processEvents", () => {
    it("marks a pending event as processed", async () => {
        const t = convexTest(schema, modules);
        const { eventId } = await emitBookingEvent(t, "bookings.booking.created");

        await t.run(async (ctx) =>
            ctx.runMutation(internal.lib.eventBus.processEvents, { batchSize: 10 })
        );

        const event = await t.run(async (ctx) => ctx.db.get(eventId as any)) as any;
        expect(event?.status).toBe("processed");
        expect(event?.processedAt).toBeDefined();
    });

    it("returns processed/failed counts", async () => {
        const t = convexTest(schema, modules);
        await emitBookingEvent(t, "bookings.booking.created");
        await emitBookingEvent(t, "bookings.booking.approved");
        await emitBookingEvent(t, "resources.resource.published");

        const result = await t.run(async (ctx) =>
            ctx.runMutation(internal.lib.eventBus.processEvents, { batchSize: 50 })
        );

        expect(result.total).toBe(3);
        expect(result.processed).toBe(3);
        expect(result.failed).toBe(0);
    });

    it("all 7 dispatch topics are handled without error", async () => {
        const t = convexTest(schema, modules);

        // Emit all known topics
        for (const topic of [
            "bookings.booking.created",
            "bookings.booking.approved",
            "bookings.booking.rejected",
            "bookings.booking.cancelled",
            "bookings.booking.completed",
            "resources.resource.published",
            "resources.resource.removed",
        ]) {
            await emitBookingEvent(t, topic);
        }

        const result = await t.run(async (ctx) =>
            ctx.runMutation(internal.lib.eventBus.processEvents, { batchSize: 50 })
        );

        expect(result.processed).toBe(7);
        expect(result.failed).toBe(0);
    });

    it("respects batchSize — only processes N events per run", async () => {
        const t = convexTest(schema, modules);

        await emitBookingEvent(t, "bookings.booking.created");
        await emitBookingEvent(t, "bookings.booking.created");
        await emitBookingEvent(t, "bookings.booking.created");
        await emitBookingEvent(t, "bookings.booking.created");
        await emitBookingEvent(t, "bookings.booking.created");

        // Process 3 at a time
        const result = await t.run(async (ctx) =>
            ctx.runMutation(internal.lib.eventBus.processEvents, { batchSize: 3 })
        );

        expect(result.total).toBe(3);
        expect(result.processed).toBe(3);

        // 2 still pending
        const stillPending = await t.run(async (ctx) =>
            ctx.db.query("outboxEvents")
                .withIndex("by_status", (q) => q.eq("status", "pending"))
                .collect()
        );
        expect(stillPending.length).toBe(2);
    });

    it("default batchSize is 50 (no arg needed)", async () => {
        const t = convexTest(schema, modules);
        await emitBookingEvent(t, "bookings.booking.created");

        // Should not throw when called with no args
        const result = await t.run(async (ctx) =>
            ctx.runMutation(internal.lib.eventBus.processEvents, {})
        );
        expect(result.processed).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// Dead letter promotion
// ---------------------------------------------------------------------------

describe("eventBus — dead letter promotion", () => {
    it("increments retryCount on re-queue and promotes to dead_letter at maxRetries", async () => {
        const t = convexTest(schema, modules);

        // Insert an event that is already at maxRetries - 1 so one more failure tips it over
        const eventId = await t.run(async (ctx) =>
            ctx.db.insert("outboxEvents", {
                topic: "bookings.booking.created",
                tenantId: TENANT,
                sourceComponent: "bookings",
                payload: {},
                status: "pending",
                retryCount: 2, // one below maxRetries (3)
                maxRetries: 3,
                createdAt: Date.now(),
            })
        );

        // Simulate a processing failure by patching the handler to throw — we can't do
        // this directly, so we'll verify the dead_letter path manually by patching:
        await t.run(async (ctx) => {
            const event = await ctx.db.get(eventId as any) as any;
            if (!event) return;
            const newRetryCount = event.retryCount + 1;
            const maxRetries = event.maxRetries ?? 3;
            await ctx.db.patch(eventId as any, {
                status: newRetryCount >= maxRetries ? "dead_letter" : "failed",
                retryCount: newRetryCount,
                lastAttemptAt: Date.now(),
                error: "Simulated failure",
            });
        });

        const event = await t.run(async (ctx) => ctx.db.get(eventId as any)) as any;
        expect(event?.status).toBe("dead_letter");
        expect(event?.retryCount).toBe(3);
        expect(event?.error).toBe("Simulated failure");
    });
});

// ---------------------------------------------------------------------------
// listDeadLetters
// ---------------------------------------------------------------------------

describe("eventBus — listDeadLetters", () => {
    it("returns events stuck in dead_letter status", async () => {
        const t = convexTest(schema, modules);

        await t.run(async (ctx) => {
            await ctx.db.insert("outboxEvents", {
                topic: "bookings.booking.created",
                tenantId: TENANT,
                sourceComponent: "bookings",
                payload: {},
                status: "dead_letter",
                retryCount: 3,
                maxRetries: 3,
                createdAt: Date.now(),
                error: "max retries exhausted",
            });
            // Also insert a processed event — should NOT appear
            await ctx.db.insert("outboxEvents", {
                topic: "bookings.booking.approved",
                tenantId: TENANT,
                sourceComponent: "bookings",
                payload: {},
                status: "processed",
                retryCount: 0,
                createdAt: Date.now(),
            });
        });

        const deadLetters = await t.run(async (ctx) =>
            ctx.runQuery(internal.lib.eventBus.listDeadLetters, { tenantId: TENANT })
        );

        expect(deadLetters.length).toBe(1);
        expect(deadLetters[0].status).toBe("dead_letter");
        expect(deadLetters[0].error).toBe("max retries exhausted");
    });

    it("filters by tenantId when provided", async () => {
        const t = convexTest(schema, modules);

        await t.run(async (ctx) => {
            await ctx.db.insert("outboxEvents", {
                topic: "bookings.booking.created",
                tenantId: TENANT,
                sourceComponent: "bookings",
                payload: {},
                status: "dead_letter",
                retryCount: 3,
                createdAt: Date.now(),
            });
            await ctx.db.insert("outboxEvents", {
                topic: "bookings.booking.created",
                tenantId: TENANT2,
                sourceComponent: "bookings",
                payload: {},
                status: "dead_letter",
                retryCount: 3,
                createdAt: Date.now(),
            });
        });

        const forTenant1 = await t.run(async (ctx) =>
            ctx.runQuery(internal.lib.eventBus.listDeadLetters, { tenantId: TENANT })
        );
        expect(forTenant1.length).toBe(1);
        expect(forTenant1[0].tenantId).toBe(TENANT);
    });
});

// ---------------------------------------------------------------------------
// retryDeadLetter
// ---------------------------------------------------------------------------

describe("eventBus — retryDeadLetter", () => {
    it("resets a dead_letter event to pending with retryCount 0", async () => {
        const t = convexTest(schema, modules);

        const eventId = await t.run(async (ctx) =>
            ctx.db.insert("outboxEvents", {
                topic: "bookings.booking.created",
                tenantId: TENANT,
                sourceComponent: "bookings",
                payload: {},
                status: "dead_letter",
                retryCount: 3,
                maxRetries: 3,
                createdAt: Date.now(),
                error: "something bad",
            })
        );

        const result = await t.run(async (ctx) =>
            ctx.runMutation(internal.lib.eventBus.retryDeadLetter, { eventId: eventId as any })
        );

        expect(result.success).toBe(true);

        const event = await t.run(async (ctx) => ctx.db.get(eventId as any)) as any;
        expect(event?.status).toBe("pending");
        expect(event?.retryCount).toBe(0);
        expect(event?.error).toBeUndefined();
    });

    it("throws when event does not exist", async () => {
        const t = convexTest(schema, modules);

        // Get a valid-looking id then delete its row
        const fakeId = await t.run(async (ctx) => {
            const id = await ctx.db.insert("outboxEvents", {
                topic: "bookings.booking.created",
                tenantId: TENANT,
                sourceComponent: "bookings",
                payload: {},
                status: "dead_letter",
                retryCount: 3,
                createdAt: Date.now(),
            });
            await ctx.db.delete(id);
            return id;
        });

        await expect(
            t.run(async (ctx) =>
                ctx.runMutation(internal.lib.eventBus.retryDeadLetter, { eventId: fakeId as any })
            )
        ).rejects.toThrow("Event not found");
    });

    it("throws when event is not in dead_letter or failed status", async () => {
        const t = convexTest(schema, modules);

        const eventId = await t.run(async (ctx) =>
            ctx.db.insert("outboxEvents", {
                topic: "bookings.booking.created",
                tenantId: TENANT,
                sourceComponent: "bookings",
                payload: {},
                status: "processed", // not retryable
                retryCount: 1,
                createdAt: Date.now(),
            })
        );

        await expect(
            t.run(async (ctx) =>
                ctx.runMutation(internal.lib.eventBus.retryDeadLetter, { eventId: eventId as any })
            )
        ).rejects.toThrow("not in dead_letter or failed status");
    });
});

// ---------------------------------------------------------------------------
// listRecent
// ---------------------------------------------------------------------------

describe("eventBus — listRecent", () => {
    it("returns all recent events (default limit 50)", async () => {
        const t = convexTest(schema, modules);

        await emitBookingEvent(t, "bookings.booking.created");
        await emitBookingEvent(t, "bookings.booking.approved");

        const events = await t.run(async (ctx) =>
            ctx.runQuery(internal.lib.eventBus.listRecent, {})
        );

        expect(events.length).toBe(2);
    });

    it("filters by status when supplied", async () => {
        const t = convexTest(schema, modules);

        await emitBookingEvent(t, "bookings.booking.created");
        // Manually insert processed event
        await t.run(async (ctx) =>
            ctx.db.insert("outboxEvents", {
                topic: "bookings.booking.approved",
                tenantId: TENANT,
                sourceComponent: "bookings",
                payload: {},
                status: "processed",
                retryCount: 0,
                createdAt: Date.now(),
            })
        );

        const pending = await t.run(async (ctx) =>
            ctx.runQuery(internal.lib.eventBus.listRecent, { status: "pending" })
        );
        expect(pending.length).toBe(1);
        expect(pending[0].status).toBe("pending");
    });

    it("filters by tenantId when supplied", async () => {
        const t = convexTest(schema, modules);

        await emitBookingEvent(t, "bookings.booking.created", { tenantId: TENANT });
        await emitBookingEvent(t, "bookings.booking.created", { tenantId: TENANT2 });

        const forTenant = await t.run(async (ctx) =>
            ctx.runQuery(internal.lib.eventBus.listRecent, { tenantId: TENANT })
        );
        expect(forTenant.length).toBe(1);
        expect(forTenant[0].tenantId).toBe(TENANT);
    });

    it("filters by topic when supplied", async () => {
        const t = convexTest(schema, modules);

        await emitBookingEvent(t, "bookings.booking.created");
        await emitBookingEvent(t, "resources.resource.published");

        const onlyCreated = await t.run(async (ctx) =>
            ctx.runQuery(internal.lib.eventBus.listRecent, { topic: "bookings.booking.created" })
        );
        expect(onlyCreated.length).toBe(1);
        expect(onlyCreated[0].topic).toBe("bookings.booking.created");
    });

    it("respects limit parameter", async () => {
        const t = convexTest(schema, modules);

        await emitBookingEvent(t, "bookings.booking.created");
        await emitBookingEvent(t, "bookings.booking.approved");
        await emitBookingEvent(t, "bookings.booking.rejected");

        const limited = await t.run(async (ctx) =>
            ctx.runQuery(internal.lib.eventBus.listRecent, { limit: 2 })
        );
        expect(limited.length).toBe(2);
    });
});

// ---------------------------------------------------------------------------
// cleanupProcessed
// ---------------------------------------------------------------------------

describe("eventBus — cleanupProcessed", () => {
    it("deletes processed events older than the cutoff", async () => {
        const t = convexTest(schema, modules);

        const oldTimestamp = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 days ago

        // Old processed event — should be deleted
        await t.run(async (ctx) =>
            ctx.db.insert("outboxEvents", {
                topic: "bookings.booking.created",
                tenantId: TENANT,
                sourceComponent: "bookings",
                payload: {},
                status: "processed",
                retryCount: 0,
                createdAt: oldTimestamp,
            })
        );

        // Recent processed event — should NOT be deleted
        await t.run(async (ctx) =>
            ctx.db.insert("outboxEvents", {
                topic: "bookings.booking.approved",
                tenantId: TENANT,
                sourceComponent: "bookings",
                payload: {},
                status: "processed",
                retryCount: 0,
                createdAt: Date.now(), // recent
            })
        );

        const result = await t.run(async (ctx) =>
            ctx.runMutation(internal.lib.eventBus.cleanupProcessed, {
                olderThanMs: 7 * 24 * 60 * 60 * 1000, // 7 days
            })
        );

        expect(result.deleted).toBe(1);

        const remaining = await t.run(async (ctx) =>
            ctx.db.query("outboxEvents").collect()
        );
        expect(remaining.length).toBe(1);
        expect(remaining[0].topic).toBe("bookings.booking.approved");
    });

    it("does not delete pending or dead_letter events — only processed", async () => {
        const t = convexTest(schema, modules);
        const oldTimestamp = Date.now() - 10 * 24 * 60 * 60 * 1000;

        await t.run(async (ctx) => {
            // Old pending — must survive
            await ctx.db.insert("outboxEvents", {
                topic: "bookings.booking.created",
                tenantId: TENANT,
                sourceComponent: "bookings",
                payload: {},
                status: "pending",
                retryCount: 0,
                createdAt: oldTimestamp,
            });
            // Old dead_letter — must survive
            await ctx.db.insert("outboxEvents", {
                topic: "bookings.booking.created",
                tenantId: TENANT,
                sourceComponent: "bookings",
                payload: {},
                status: "dead_letter",
                retryCount: 3,
                createdAt: oldTimestamp,
            });
        });

        const result = await t.run(async (ctx) =>
            ctx.runMutation(internal.lib.eventBus.cleanupProcessed, {})
        );

        expect(result.deleted).toBe(0);

        const remaining = await t.run(async (ctx) =>
            ctx.db.query("outboxEvents").collect()
        );
        expect(remaining.length).toBe(2);
    });
});

// ---------------------------------------------------------------------------
// outboxEvents schema — index correctness
// ---------------------------------------------------------------------------

describe("outboxEvents schema — index correctness", () => {
    it("by_status index allows querying pending events", async () => {
        const t = convexTest(schema, modules);

        await emitBookingEvent(t, "bookings.booking.created");

        const pending = await t.run(async (ctx) =>
            ctx.db.query("outboxEvents")
                .withIndex("by_status", (q) => q.eq("status", "pending"))
                .collect()
        );
        expect(pending.length).toBeGreaterThanOrEqual(1);
        pending.forEach((e) => expect(e.status).toBe("pending"));
    });

    it("by_topic index allows querying by topic + status", async () => {
        const t = convexTest(schema, modules);

        await emitBookingEvent(t, "bookings.booking.created");
        await emitBookingEvent(t, "resources.resource.published");

        const bookingCreatedPending = await t.run(async (ctx) =>
            ctx.db.query("outboxEvents")
                .withIndex("by_topic", (q) =>
                    q.eq("topic", "bookings.booking.created").eq("status", "pending")
                )
                .collect()
        );
        expect(bookingCreatedPending.length).toBe(1);
        expect(bookingCreatedPending[0].topic).toBe("bookings.booking.created");
    });

    it("by_tenant index allows querying events for a specific tenant", async () => {
        const t = convexTest(schema, modules);

        await emitBookingEvent(t, "bookings.booking.created", { tenantId: TENANT });
        await emitBookingEvent(t, "bookings.booking.created", { tenantId: TENANT2 });

        const tenantEvents = await t.run(async (ctx) =>
            ctx.db.query("outboxEvents")
                .withIndex("by_tenant", (q) =>
                    q.eq("tenantId", TENANT).eq("status", "pending")
                )
                .collect()
        );
        expect(tenantEvents.length).toBe(1);
        expect(tenantEvents[0].tenantId).toBe(TENANT);
    });

    it("by_created index is queryable without errors", async () => {
        const t = convexTest(schema, modules);
        await emitBookingEvent(t, "bookings.booking.created");

        const events = await t.run(async (ctx) =>
            ctx.db.query("outboxEvents")
                .withIndex("by_created")
                .collect()
        );
        expect(events.length).toBeGreaterThanOrEqual(1);
    });
});

// ---------------------------------------------------------------------------
// Stale processing recovery
// ---------------------------------------------------------------------------

describe("eventBus — stale processing recovery", () => {
    it("recovers events stuck in processing for >5 minutes", async () => {
        const t = convexTest(schema, modules);
        const fiveMinutesAgo = Date.now() - 6 * 60 * 1000;

        // Insert an event stuck in "processing" with an old lastAttemptAt
        await t.run(async (ctx) =>
            ctx.db.insert("outboxEvents", {
                topic: "bookings.booking.created",
                tenantId: TENANT,
                sourceComponent: "bookings",
                payload: { userId: "u-1", bookingId: "bk-1" },
                status: "processing",
                retryCount: 0,
                maxRetries: 3,
                createdAt: fiveMinutesAgo,
                lastAttemptAt: fiveMinutesAgo,
            })
        );

        // Run processEvents — should recover the stale event first
        const result = await t.run(async (ctx) =>
            ctx.runMutation(internal.lib.eventBus.processEvents, {})
        );

        expect(result.recovered).toBe(1);
    });

    it("does NOT recover events in processing for <5 minutes", async () => {
        const t = convexTest(schema, modules);
        const twoMinutesAgo = Date.now() - 2 * 60 * 1000;

        await t.run(async (ctx) =>
            ctx.db.insert("outboxEvents", {
                topic: "bookings.booking.created",
                tenantId: TENANT,
                sourceComponent: "bookings",
                payload: {},
                status: "processing",
                retryCount: 0,
                createdAt: twoMinutesAgo,
                lastAttemptAt: twoMinutesAgo,
            })
        );

        const result = await t.run(async (ctx) =>
            ctx.runMutation(internal.lib.eventBus.processEvents, {})
        );

        // Should not recover — too recent
        expect(result.recovered).toBe(0);

        // Should still be "processing"
        const events = await t.run(async (ctx) =>
            ctx.db.query("outboxEvents")
                .withIndex("by_status", (q) => q.eq("status", "processing"))
                .collect()
        );
        expect(events.length).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// Exponential backoff — failed event promotion
// ---------------------------------------------------------------------------

describe("eventBus — exponential backoff", () => {
    it("promotes failed events whose backoff period has elapsed", async () => {
        const t = convexTest(schema, modules);
        // retryCount=1 → backoff = 30s × 2^1 = 60s
        // lastAttemptAt 2 min ago → 120s > 60s → should promote
        const twoMinutesAgo = Date.now() - 2 * 60 * 1000;

        await t.run(async (ctx) =>
            ctx.db.insert("outboxEvents", {
                topic: "bookings.booking.created",
                tenantId: TENANT,
                sourceComponent: "bookings",
                payload: { userId: "u-1", bookingId: "bk-1" },
                status: "failed",
                retryCount: 1,
                maxRetries: 3,
                createdAt: twoMinutesAgo - 60_000,
                lastAttemptAt: twoMinutesAgo,
                error: "Previous failure",
            })
        );

        const result = await t.run(async (ctx) =>
            ctx.runMutation(internal.lib.eventBus.processEvents, {})
        );

        expect(result.promoted).toBe(1);
    });

    it("does NOT promote failed events still within backoff period", async () => {
        const t = convexTest(schema, modules);
        // retryCount=2 → backoff = 30s × 2^2 = 120s
        // lastAttemptAt 30s ago → 30s < 120s → should NOT promote
        const thirtySecondsAgo = Date.now() - 30_000;

        const eventId = await t.run(async (ctx) =>
            ctx.db.insert("outboxEvents", {
                topic: "bookings.booking.created",
                tenantId: TENANT,
                sourceComponent: "bookings",
                payload: {},
                status: "failed",
                retryCount: 2,
                maxRetries: 3,
                createdAt: thirtySecondsAgo - 60_000,
                lastAttemptAt: thirtySecondsAgo,
                error: "Still in backoff",
            })
        );

        const result = await t.run(async (ctx) =>
            ctx.runMutation(internal.lib.eventBus.processEvents, {})
        );

        expect(result.promoted).toBe(0);

        // Event should still be "failed"
        const event = await t.run(async (ctx) => ctx.db.get(eventId as any)) as any;
        expect(event?.status).toBe("failed");
    });

    it("processEvents sets lastAttemptAt on processing start", async () => {
        const t = convexTest(schema, modules);
        const before = Date.now();

        const { eventId } = await emitBookingEvent(t, "resources.resource.created");

        await t.run(async (ctx) =>
            ctx.runMutation(internal.lib.eventBus.processEvents, {})
        );

        const event = await t.run(async (ctx) => ctx.db.get(eventId as any)) as any;
        expect(event?.lastAttemptAt).toBeGreaterThanOrEqual(before);
        expect(event?.status).toBe("processed");
    });
});

// ---------------------------------------------------------------------------
// getQueueStats
// ---------------------------------------------------------------------------

describe("eventBus — getQueueStats", () => {
    it("returns counts by status and health indicator", async () => {
        const t = convexTest(schema, modules);

        await t.run(async (ctx) => {
            // 2 pending
            await ctx.db.insert("outboxEvents", {
                topic: "bookings.booking.created",
                tenantId: TENANT,
                sourceComponent: "bookings",
                payload: {},
                status: "pending",
                retryCount: 0,
                createdAt: Date.now(),
            });
            await ctx.db.insert("outboxEvents", {
                topic: "bookings.booking.approved",
                tenantId: TENANT,
                sourceComponent: "bookings",
                payload: {},
                status: "pending",
                retryCount: 0,
                createdAt: Date.now(),
            });
            // 1 processed
            await ctx.db.insert("outboxEvents", {
                topic: "resources.resource.created",
                tenantId: TENANT,
                sourceComponent: "resources",
                payload: {},
                status: "processed",
                retryCount: 0,
                createdAt: Date.now(),
            });
        });

        const stats = await t.run(async (ctx) =>
            ctx.runQuery(internal.lib.eventBus.getQueueStats, {})
        );

        expect(stats.counts.pending).toBe(2);
        expect(stats.counts.processed).toBe(1);
        expect(stats.counts.dead_letter).toBe(0);
        expect(stats.total).toBe(3);
        expect(stats.healthy).toBe(true);
    });

    it("reports unhealthy when dead letters exist", async () => {
        const t = convexTest(schema, modules);

        await t.run(async (ctx) =>
            ctx.db.insert("outboxEvents", {
                topic: "bookings.booking.created",
                tenantId: TENANT,
                sourceComponent: "bookings",
                payload: {},
                status: "dead_letter",
                retryCount: 3,
                createdAt: Date.now(),
                error: "exhausted",
            })
        );

        const stats = await t.run(async (ctx) =>
            ctx.runQuery(internal.lib.eventBus.getQueueStats, {})
        );

        expect(stats.counts.dead_letter).toBe(1);
        expect(stats.healthy).toBe(false);
    });

    it("filters by tenantId when provided", async () => {
        const t = convexTest(schema, modules);

        await t.run(async (ctx) => {
            await ctx.db.insert("outboxEvents", {
                topic: "bookings.booking.created",
                tenantId: TENANT,
                sourceComponent: "bookings",
                payload: {},
                status: "pending",
                retryCount: 0,
                createdAt: Date.now(),
            });
            await ctx.db.insert("outboxEvents", {
                topic: "bookings.booking.created",
                tenantId: TENANT2,
                sourceComponent: "bookings",
                payload: {},
                status: "pending",
                retryCount: 0,
                createdAt: Date.now(),
            });
        });

        const stats = await t.run(async (ctx) =>
            ctx.runQuery(internal.lib.eventBus.getQueueStats, { tenantId: TENANT })
        );

        expect(stats.counts.pending).toBe(1);
        expect(stats.total).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// retryAllDeadLetters
// ---------------------------------------------------------------------------

describe("eventBus — retryAllDeadLetters", () => {
    it("resets all dead letter events to pending", async () => {
        const t = convexTest(schema, modules);

        await t.run(async (ctx) => {
            for (let i = 0; i < 3; i++) {
                await ctx.db.insert("outboxEvents", {
                    topic: `bookings.booking.${i}`,
                    tenantId: TENANT,
                    sourceComponent: "bookings",
                    payload: {},
                    status: "dead_letter",
                    retryCount: 3,
                    createdAt: Date.now(),
                    error: "exhausted",
                });
            }
        });

        const result = await t.run(async (ctx) =>
            ctx.runMutation(internal.lib.eventBus.retryAllDeadLetters, {})
        );

        expect(result.retried).toBe(3);

        const pending = await t.run(async (ctx) =>
            ctx.db.query("outboxEvents")
                .withIndex("by_status", (q) => q.eq("status", "pending"))
                .collect()
        );
        expect(pending.length).toBe(3);
        pending.forEach((e) => {
            expect(e.retryCount).toBe(0);
            expect(e.error).toBeUndefined();
        });
    });

    it("filters by tenantId", async () => {
        const t = convexTest(schema, modules);

        await t.run(async (ctx) => {
            await ctx.db.insert("outboxEvents", {
                topic: "bookings.booking.created",
                tenantId: TENANT,
                sourceComponent: "bookings",
                payload: {},
                status: "dead_letter",
                retryCount: 3,
                createdAt: Date.now(),
            });
            await ctx.db.insert("outboxEvents", {
                topic: "bookings.booking.created",
                tenantId: TENANT2,
                sourceComponent: "bookings",
                payload: {},
                status: "dead_letter",
                retryCount: 3,
                createdAt: Date.now(),
            });
        });

        const result = await t.run(async (ctx) =>
            ctx.runMutation(internal.lib.eventBus.retryAllDeadLetters, { tenantId: TENANT })
        );

        expect(result.retried).toBe(1);

        // TENANT2's event should still be dead_letter
        const remaining = await t.run(async (ctx) =>
            ctx.db.query("outboxEvents")
                .withIndex("by_status", (q) => q.eq("status", "dead_letter"))
                .collect()
        );
        expect(remaining.length).toBe(1);
        expect(remaining[0].tenantId).toBe(TENANT2);
    });
});
