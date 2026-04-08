import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../_generated/api";
import { createDomainTest, seedTestTenant } from "./testHelper.test-util";

describe("domain/audit", () => {
    function setup() {
        return createDomainTest(["audit"]);
    }

    describe("create", () => {
        it("creates an audit entry with required fields", async () => {
            const t = setup();
            const { tenantId, adminId } = await seedTestTenant(t);

            const result = await t.mutation(api.domain.audit.create, {
                tenantId,
                action: "booking.created",
                bookingId: "bk-001",
                userId: adminId,
            });

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
        });

        it("creates entry without optional fields", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const result = await t.mutation(api.domain.audit.create, {
                tenantId,
                action: "system.health_check",
            });

            expect(result.id).toBeDefined();
        });

        it("stores previousState and newState", async () => {
            const t = setup();
            const { tenantId, adminId } = await seedTestTenant(t);

            const prev = { status: "pending" };
            const next = { status: "confirmed" };

            const { id } = await t.mutation(api.domain.audit.create, {
                tenantId,
                action: "booking.confirmed",
                bookingId: "bk-002",
                userId: adminId,
                previousState: prev,
                newState: next,
                reason: "Admin approval",
            });

            const entry = await t.query(api.domain.audit.get, { id });
            expect(entry.previousState).toEqual(prev);
            expect(entry.newState).toEqual(next);
            expect(entry.reason).toBe("Admin approval");
        });
    });

    describe("logClientEvent", () => {
        it("creates entry from client-side event", async () => {
            const t = setup();
            await seedTestTenant(t);

            const result = await t.mutation(api.domain.audit.logClientEvent, {
                action: "listing.viewed",
                entityType: "listing",
                entityId: "res-123",
                severity: "info",
                metadata: { viewDuration: 5000 },
            });

            expect(result.id).toBeDefined();
        });

        it("defaults tenantId to 'client' when omitted", async () => {
            const t = setup();

            const { id } = await t.mutation(api.domain.audit.logClientEvent, {
                action: "error.unhandled",
                severity: "error",
            });

            const entry = await t.query(api.domain.audit.get, { id });
            expect(entry.tenantId).toBe("client");
            expect(entry.entityType).toBe("app");
        });
    });

    describe("get", () => {
        it("returns entry enriched with user details", async () => {
            const t = setup();
            const { tenantId, adminId } = await seedTestTenant(t);

            const { id } = await t.mutation(api.domain.audit.create, {
                tenantId,
                action: "resource.updated",
                bookingId: "res-001",
                userId: adminId,
            });

            const entry = await t.query(api.domain.audit.get, { id });
            expect(entry.user).toBeDefined();
            expect(entry.user.name).toBe("Test Admin");
            expect(entry.user.email).toBe("admin@test.no");
        });

        it("returns null user when userId is not set", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await t.mutation(api.domain.audit.create, {
                tenantId,
                action: "system.startup",
            });

            const entry = await t.query(api.domain.audit.get, { id });
            expect(entry.user).toBeNull();
        });
    });

    describe("listForTenant", () => {
        it("returns entries for specified tenant", async () => {
            const t = setup();
            const { tenantId, adminId } = await seedTestTenant(t);

            await t.mutation(api.domain.audit.create, {
                tenantId,
                action: "booking.created",
                bookingId: "bk-001",
                userId: adminId,
            });
            await t.mutation(api.domain.audit.create, {
                tenantId,
                action: "booking.cancelled",
                bookingId: "bk-002",
            });

            const entries = await t.query(api.domain.audit.listForTenant, {
                tenantId,
            });

            expect(entries.length).toBe(2);
            entries.forEach((e: any) => expect(e.tenantId).toBe(tenantId));
        });

        it("filters by entityType", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            // audit.create defaults entityType to "booking"
            await t.mutation(api.domain.audit.create, {
                tenantId,
                action: "booking.created",
                bookingId: "bk-001",
            });

            const entries = await t.query(api.domain.audit.listForTenant, {
                tenantId,
                entityType: "booking",
            });

            expect(entries.length).toBeGreaterThanOrEqual(1);
        });

        it("enriches entries with user details", async () => {
            const t = setup();
            const { tenantId, adminId } = await seedTestTenant(t);

            await t.mutation(api.domain.audit.create, {
                tenantId,
                action: "resource.published",
                bookingId: "res-001",
                userId: adminId,
            });

            const entries = await t.query(api.domain.audit.listForTenant, {
                tenantId,
            });

            const withUser = entries.find((e: any) => e.user !== null);
            expect(withUser).toBeDefined();
            expect(withUser.user.name).toBe("Test Admin");
        });
    });

    describe("listForBooking", () => {
        it("returns entries matching bookingId entity", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            await t.mutation(api.domain.audit.create, {
                tenantId,
                action: "booking.created",
                bookingId: "bk-target",
            });
            await t.mutation(api.domain.audit.create, {
                tenantId,
                action: "booking.updated",
                bookingId: "bk-target",
            });
            await t.mutation(api.domain.audit.create, {
                tenantId,
                action: "booking.created",
                bookingId: "bk-other",
            });

            const entries = await t.query(api.domain.audit.listForBooking, {
                bookingId: "bk-target",
            });

            expect(entries.length).toBe(2);
        });
    });

    describe("listByAction", () => {
        it("returns entries for specified action", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            await t.mutation(api.domain.audit.create, {
                tenantId,
                action: "booking.confirmed",
                bookingId: "bk-001",
            });
            await t.mutation(api.domain.audit.create, {
                tenantId,
                action: "booking.cancelled",
                bookingId: "bk-002",
            });

            const entries = await t.query(api.domain.audit.listByAction, {
                tenantId,
                action: "booking.confirmed",
            });

            expect(entries.length).toBe(1);
            expect(entries[0].action).toBe("booking.confirmed");
        });
    });

    describe("listByEntity", () => {
        it("returns entries by entityType and entityId", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            await t.mutation(api.domain.audit.create, {
                tenantId,
                action: "booking.created",
                bookingId: "bk-entity-test",
            });

            const entries = await t.query(api.domain.audit.listByEntity, {
                entityType: "booking",
                entityId: "bk-entity-test",
            });

            expect(entries.length).toBe(1);
        });
    });

    describe("listByUser", () => {
        it("returns entries for specified user", async () => {
            const t = setup();
            const { tenantId, adminId } = await seedTestTenant(t);

            await t.mutation(api.domain.audit.create, {
                tenantId,
                action: "booking.created",
                bookingId: "bk-001",
                userId: adminId,
            });

            const entries = await t.query(api.domain.audit.listByUser, {
                userId: adminId,
            });

            expect(entries.length).toBe(1);
        });
    });

    describe("getSummary", () => {
        it("returns summary for tenant within time range", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const now = Date.now();
            await t.mutation(api.domain.audit.create, {
                tenantId,
                action: "booking.created",
                bookingId: "bk-001",
            });

            const summary = await t.query(api.domain.audit.getSummary, {
                tenantId,
                startDate: now - 60_000,
                endDate: now + 60_000,
            });

            expect(summary).toBeDefined();
        });
    });
});
