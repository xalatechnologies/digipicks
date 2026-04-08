/**
 * Audit Component — Comprehensive convex-test Tests
 *
 * Tests the real Convex mutation and query functions in:
 *   components/audit/functions.ts  (create, listForTenant, listForEntity, getHistory)
 *
 * Covers:
 *   - Audit entry creation with all fields
 *   - Polymorphic entity-type queries
 *   - State-change tracking (previousState / newState / changedFields)
 *   - All 5 schema indexes (by_tenant, by_entity, by_tenant_entity, by_user, by_timestamp)
 *
 * Run: npx vitest --config convex/vitest.config.ts components/audit/audit.test.ts
 */

import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "vitest";
import schema from "../schema";
import { modules } from "../testSetup.test-util";
import { api } from "../_generated/api";

const TENANT = "tenant-001";
const TENANT_B = "tenant-002";
const USER = "user-001";
const BOOKING_ID = "booking-abc123";
const RESOURCE_ID = "resource-xyz456";

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

describe("audit/functions — create", () => {
    it("creates an audit entry with required fields and returns the id", async () => {
        const t = convexTest(schema, modules);

        const { id } = await t.mutation(api.functions.create, {
            tenantId: TENANT,
            entityType: "booking",
            entityId: BOOKING_ID,
            action: "created",
        });

        expect(id).toBeDefined();

        const entry = await t.run(async (ctx) => ctx.db.get(id as any));
        expect(entry?.tenantId).toBe(TENANT);
        expect(entry?.entityType).toBe("booking");
        expect(entry?.entityId).toBe(BOOKING_ID);
        expect(entry?.action).toBe("created");
        expect(entry?.timestamp).toBeGreaterThan(0);
    });

    it("persists optional caller identity fields", async () => {
        const t = convexTest(schema, modules);

        const { id } = await t.mutation(api.functions.create, {
            tenantId: TENANT,
            userId: USER,
            userEmail: "admin@example.com",
            userName: "Admin User",
            entityType: "resource",
            entityId: RESOURCE_ID,
            action: "updated",
        });

        const entry = await t.run(async (ctx) => ctx.db.get(id as any));
        expect(entry?.userId).toBe(USER);
        expect(entry?.userEmail).toBe("admin@example.com");
        expect(entry?.userName).toBe("Admin User");
    });

    it("persists previousState, newState, and changedFields for update audit", async () => {
        const t = convexTest(schema, modules);

        const previousState = { status: "pending" };
        const newState = { status: "confirmed" };

        const { id } = await t.mutation(api.functions.create, {
            tenantId: TENANT,
            entityType: "booking",
            entityId: BOOKING_ID,
            action: "approved",
            previousState,
            newState,
            changedFields: ["status"],
        });

        const entry = await t.run(async (ctx) => ctx.db.get(id as any));
        expect(entry?.previousState).toMatchObject(previousState);
        expect(entry?.newState).toMatchObject(newState);
        expect(entry?.changedFields).toEqual(["status"]);
    });

    it("persists sourceComponent field", async () => {
        const t = convexTest(schema, modules);

        const { id } = await t.mutation(api.functions.create, {
            tenantId: TENANT,
            entityType: "booking",
            entityId: BOOKING_ID,
            action: "hard_deleted",
            sourceComponent: "bookings",
        });

        const entry = await t.run(async (ctx) => ctx.db.get(id as any));
        expect(entry?.sourceComponent).toBe("bookings");
    });

    it("persists cascadeCount in details metadata", async () => {
        const t = convexTest(schema, modules);

        const { id } = await t.mutation(api.functions.create, {
            tenantId: TENANT,
            entityType: "booking",
            entityId: BOOKING_ID,
            action: "hard_deleted",
            details: { cascadeCount: 3 },
        });

        const entry = await t.run(async (ctx) => ctx.db.get(id as any));
        expect((entry?.details as any).cascadeCount).toBe(3);
    });
});

// ---------------------------------------------------------------------------
// listForTenant
// ---------------------------------------------------------------------------

describe("audit/functions — listForTenant", () => {
    it("returns all entries for a tenant", async () => {
        const t = convexTest(schema, modules);

        await t.mutation(api.functions.create, {
            tenantId: TENANT, entityType: "booking", entityId: "b1", action: "created",
        });
        await t.mutation(api.functions.create, {
            tenantId: TENANT, entityType: "resource", entityId: "r1", action: "updated",
        });
        // Different tenant — should NOT appear
        await t.mutation(api.functions.create, {
            tenantId: TENANT_B, entityType: "booking", entityId: "b2", action: "created",
        });

        const entries = await t.query(api.functions.listForTenant, { tenantId: TENANT });

        expect(entries.length).toBe(2);
        entries.forEach((e: any) => expect(e.tenantId).toBe(TENANT));
    });

    it("filters by entityType when supplied", async () => {
        const t = convexTest(schema, modules);

        await t.mutation(api.functions.create, {
            tenantId: TENANT, entityType: "booking", entityId: "b1", action: "created",
        });
        await t.mutation(api.functions.create, {
            tenantId: TENANT, entityType: "resource", entityId: "r1", action: "published",
        });

        const bookingEntries = await t.query(api.functions.listForTenant, {
            tenantId: TENANT,
            entityType: "booking",
        });

        expect(bookingEntries.length).toBe(1);
        expect(bookingEntries[0].entityType).toBe("booking");
    });

    it("respects limit parameter", async () => {
        const t = convexTest(schema, modules);

        for (let i = 0; i < 5; i++) {
            await t.mutation(api.functions.create, {
                tenantId: TENANT, entityType: "booking", entityId: `b${i}`, action: "created",
            });
        }

        const limited = await t.query(api.functions.listForTenant, {
            tenantId: TENANT,
            limit: 2,
        });

        expect(limited.length).toBe(2);
    });
});

// ---------------------------------------------------------------------------
// Schema index correctness
// ---------------------------------------------------------------------------

describe("audit schema — index correctness", () => {
    it("by_entity index allows querying by entityType + entityId", async () => {
        const t = convexTest(schema, modules);

        await t.mutation(api.functions.create, {
            tenantId: TENANT, entityType: "booking", entityId: BOOKING_ID, action: "created",
        });
        await t.mutation(api.functions.create, {
            tenantId: TENANT, entityType: "booking", entityId: BOOKING_ID, action: "approved",
        });
        await t.mutation(api.functions.create, {
            tenantId: TENANT, entityType: "resource", entityId: RESOURCE_ID, action: "updated",
        });

        const bookingHistory = await t.run(async (ctx) =>
            ctx.db.query("auditLog")
                .withIndex("by_entity", (q) =>
                    q.eq("entityType", "booking").eq("entityId", BOOKING_ID)
                )
                .collect()
        );

        expect(bookingHistory.length).toBe(2);
        bookingHistory.forEach((e: any) => {
            expect(e.entityType).toBe("booking");
            expect(e.entityId).toBe(BOOKING_ID);
        });
    });

    it("by_tenant_entity index allows querying by tenant + entityType", async () => {
        const t = convexTest(schema, modules);

        await t.mutation(api.functions.create, {
            tenantId: TENANT, entityType: "role", entityId: "r1", action: "created",
        });
        await t.mutation(api.functions.create, {
            tenantId: TENANT_B, entityType: "role", entityId: "r2", action: "created",
        });

        const result = await t.run(async (ctx) =>
            ctx.db.query("auditLog")
                .withIndex("by_tenant_entity", (q) =>
                    q.eq("tenantId", TENANT).eq("entityType", "role")
                )
                .collect()
        );

        result.forEach((e: any) => expect(e.tenantId).toBe(TENANT));
    });

    it("by_user index allows querying by userId", async () => {
        const t = convexTest(schema, modules);

        await t.mutation(api.functions.create, {
            tenantId: TENANT, userId: USER, entityType: "booking", entityId: "b1", action: "created",
        });
        await t.mutation(api.functions.create, {
            tenantId: TENANT, userId: "user-002", entityType: "booking", entityId: "b2", action: "created",
        });

        const userEntries = await t.run(async (ctx) =>
            ctx.db.query("auditLog")
                .withIndex("by_user", (q) => q.eq("userId", USER))
                .collect()
        );

        expect(userEntries.length).toBeGreaterThanOrEqual(1);
        userEntries.forEach((e: any) => expect(e.userId).toBe(USER));
    });

    it("by_timestamp index is queryable without errors", async () => {
        const t = convexTest(schema, modules);

        await t.mutation(api.functions.create, {
            tenantId: TENANT, entityType: "booking", entityId: "b1", action: "created",
        });

        const result = await t.run(async (ctx) =>
            ctx.db.query("auditLog")
                .withIndex("by_timestamp", (q) => q.eq("tenantId", TENANT))
                .collect()
        );

        expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it("by_action index allows filtering by action", async () => {
        const t = convexTest(schema, modules);

        await t.mutation(api.functions.create, {
            tenantId: TENANT, entityType: "booking", entityId: "b1", action: "created",
        });
        await t.mutation(api.functions.create, {
            tenantId: TENANT, entityType: "booking", entityId: "b2", action: "approved",
        });

        const created = await t.run(async (ctx) =>
            ctx.db.query("auditLog")
                .withIndex("by_action", (q) => q.eq("action", "created"))
                .collect()
        );

        created.forEach((e: any) => expect(e.action).toBe("created"));
    });
});

// ---------------------------------------------------------------------------
// Multi-entity audit trail (booking lifecycle)
// ---------------------------------------------------------------------------

describe("audit — full booking lifecycle trail", () => {
    it("records all state transitions in sequence", async () => {
        const t = convexTest(schema, modules);

        const bookingId = "lifecycle-booking-001";
        const lifecycle = [
            { action: "created", previousState: null, newState: { status: "pending" } },
            { action: "approved", previousState: { status: "pending" }, newState: { status: "confirmed" } },
            { action: "completed", previousState: { status: "confirmed" }, newState: { status: "completed" } },
        ];

        for (const step of lifecycle) {
            await t.mutation(api.functions.create, {
                tenantId: TENANT,
                userId: USER,
                entityType: "booking",
                entityId: bookingId,
                action: step.action,
                previousState: step.previousState ?? undefined,
                newState: step.newState,
                changedFields: ["status"],
                sourceComponent: "bookings",
            });
        }

        const history = await t.run(async (ctx) =>
            ctx.db.query("auditLog")
                .withIndex("by_entity", (q) =>
                    q.eq("entityType", "booking").eq("entityId", bookingId)
                )
                .collect()
        );

        expect(history.length).toBe(3);
        const actions = history.map((e: any) => e.action).sort();
        expect(actions).toContain("created");
        expect(actions).toContain("approved");
        expect(actions).toContain("completed");
    });

    it("records cascade-delete meta in audit entry for hard_deleted", async () => {
        const t = convexTest(schema, modules);

        const { id } = await t.mutation(api.functions.create, {
            tenantId: TENANT,
            userId: USER,
            userName: "Admin",
            entityType: "booking",
            entityId: "del-booking-001",
            action: "hard_deleted",
            details: {
                cascadeCount: 3,
                cascadeBreakdown: {
                    rentalAgreements: 1,
                    bookingConflicts: 1,
                    bookingAddOns: 1,
                },
            },
            sourceComponent: "bookings",
        });

        const entry = await t.run(async (ctx) => ctx.db.get(id as any));
        const details = entry?.details as Record<string, unknown>;
        expect(details.cascadeCount).toBe(3);
        expect((details.cascadeBreakdown as any).rentalAgreements).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// listByEntity
// ---------------------------------------------------------------------------

describe("audit/functions — listByEntity", () => {
    it("returns entries for a specific entity", async () => {
        const t = convexTest(schema, modules);

        await t.mutation(api.functions.create, {
            tenantId: TENANT, entityType: "booking", entityId: BOOKING_ID, action: "created",
        });
        await t.mutation(api.functions.create, {
            tenantId: TENANT, entityType: "booking", entityId: BOOKING_ID, action: "approved",
        });
        await t.mutation(api.functions.create, {
            tenantId: TENANT, entityType: "booking", entityId: "other-booking", action: "created",
        });

        const entries = await t.query(api.functions.listByEntity, {
            entityType: "booking", entityId: BOOKING_ID,
        });

        expect(entries.length).toBe(2);
        entries.forEach((e: any) => expect(e.entityId).toBe(BOOKING_ID));
    });

    it("respects limit parameter", async () => {
        const t = convexTest(schema, modules);

        for (let i = 0; i < 5; i++) {
            await t.mutation(api.functions.create, {
                tenantId: TENANT, entityType: "resource", entityId: RESOURCE_ID, action: `action-${i}`,
            });
        }

        const entries = await t.query(api.functions.listByEntity, {
            entityType: "resource", entityId: RESOURCE_ID, limit: 3,
        });
        expect(entries.length).toBe(3);
    });
});

// ---------------------------------------------------------------------------
// listByUser
// ---------------------------------------------------------------------------

describe("audit/functions — listByUser", () => {
    it("returns entries created by a specific user", async () => {
        const t = convexTest(schema, modules);

        await t.mutation(api.functions.create, {
            tenantId: TENANT, userId: USER, entityType: "booking", entityId: "b1", action: "created",
        });
        await t.mutation(api.functions.create, {
            tenantId: TENANT, userId: USER, entityType: "resource", entityId: "r1", action: "updated",
        });
        await t.mutation(api.functions.create, {
            tenantId: TENANT, userId: "user-other", entityType: "booking", entityId: "b2", action: "created",
        });

        const entries = await t.query(api.functions.listByUser, { userId: USER });
        expect(entries.length).toBe(2);
        entries.forEach((e: any) => expect(e.userId).toBe(USER));
    });
});

// ---------------------------------------------------------------------------
// listByAction
// ---------------------------------------------------------------------------

describe("audit/functions — listByAction", () => {
    it("returns entries with a specific action for a tenant", async () => {
        const t = convexTest(schema, modules);

        await t.mutation(api.functions.create, {
            tenantId: TENANT, entityType: "booking", entityId: "b1", action: "created",
        });
        await t.mutation(api.functions.create, {
            tenantId: TENANT, entityType: "booking", entityId: "b2", action: "approved",
        });
        await t.mutation(api.functions.create, {
            tenantId: TENANT, entityType: "resource", entityId: "r1", action: "created",
        });

        const entries = await t.query(api.functions.listByAction, {
            tenantId: TENANT, action: "created",
        });
        expect(entries.length).toBe(2);
        entries.forEach((e: any) => expect(e.action).toBe("created"));
    });
});

// ---------------------------------------------------------------------------
// get
// ---------------------------------------------------------------------------

describe("audit/functions — get", () => {
    it("returns an entry by id", async () => {
        const t = convexTest(schema, modules);

        const { id } = await t.mutation(api.functions.create, {
            tenantId: TENANT, entityType: "booking", entityId: BOOKING_ID, action: "created",
        });

        const entry = await t.query(api.functions.get, { id: id as any });
        expect(entry.entityId).toBe(BOOKING_ID);
        expect(entry.action).toBe("created");
    });

    it("throws when entry does not exist", async () => {
        const t = convexTest(schema, modules);

        const staleId = await t.run(async (ctx) => {
            const id = await ctx.db.insert("auditLog", {
                tenantId: TENANT, entityType: "booking", entityId: "x",
                action: "created", timestamp: Date.now(), metadata: {},
            });
            await ctx.db.delete(id);
            return id;
        });

        await expect(
            t.query(api.functions.get, { id: staleId })
        ).rejects.toThrow("not found");
    });
});

// ---------------------------------------------------------------------------
// getSummary
// ---------------------------------------------------------------------------

describe("audit/functions — getSummary", () => {
    it("returns aggregate statistics for a tenant", async () => {
        const t = convexTest(schema, modules);

        await t.mutation(api.functions.create, {
            tenantId: TENANT, userId: USER, entityType: "booking", entityId: "b1", action: "created",
        });
        await t.mutation(api.functions.create, {
            tenantId: TENANT, userId: USER, entityType: "booking", entityId: "b2", action: "approved",
        });
        await t.mutation(api.functions.create, {
            tenantId: TENANT, userId: "user-002", entityType: "resource", entityId: "r1", action: "created",
        });

        const summary = await t.query(api.functions.getSummary, { tenantId: TENANT });
        expect(summary.total).toBe(3);
        expect(summary.byAction.created).toBe(2);
        expect(summary.byAction.approved).toBe(1);
        expect(summary.byEntityType.booking).toBe(2);
        expect(summary.byEntityType.resource).toBe(1);
        expect(summary.byUser[USER]).toBe(2);
    });
});

// ---------------------------------------------------------------------------
// importRecord
// ---------------------------------------------------------------------------

describe("audit/functions — importRecord", () => {
    it("imports a legacy audit record with explicit timestamp", async () => {
        const t = convexTest(schema, modules);

        const { id } = await t.mutation(api.functions.importRecord, {
            tenantId: TENANT, entityType: "booking", entityId: "legacy-1",
            action: "created", timestamp: 1000000,
        });

        const entry = await t.run(async (ctx) => ctx.db.get(id as any));
        expect(entry?.timestamp).toBe(1000000);
        expect(entry?.entityId).toBe("legacy-1");
    });
});
