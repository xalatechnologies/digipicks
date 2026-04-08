/**
 * Broadcasts Domain Facade Tests
 *
 * Tests the facade layer (convex/domain/broadcasts.ts) which adds:
 *   - Auth checks (requireActiveUser)
 *   - Rate limiting (sendBroadcast: 10/day per creator)
 *   - Subscriber resolution via subscriptions component
 *   - Notification fan-out via notifications component
 *   - Audit logging via audit component
 *   - Event bus emission
 *   - Creator data enrichment (user name/displayName)
 *
 * Component-level logic (validation, receipts, message types)
 * is covered in components/broadcasts/__tests__/broadcasts.test.ts.
 *
 * Run: cd convex && npx vitest --config vitest.config.ts --run domain/__tests__/broadcasts.test.ts
 */

import { describe, it, expect } from "vitest";
import { api, components } from "../../_generated/api";
import { createDomainTest, seedTestTenant } from "./testHelper.test-util";
import type { Id } from "../../_generated/dataModel";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setup() {
    return createDomainTest(["broadcasts", "audit", "subscriptions", "notifications"]);
}

async function seedCreatorSubscription(
    t: ReturnType<typeof setup>,
    tenantId: string,
    subscriberId: string,
    creatorId: string
) {
    // Create a tier
    const tier = await (t as any).mutation(
        components.subscriptions.functions.createTier,
        {
            tenantId,
            name: "Premium",
            slug: `premium-${Date.now()}`,
            description: "Premium access",
            price: 999,
            currency: "USD",
            billingInterval: "monthly",
            benefits: [],
            sortOrder: 1,
            isActive: true,
            isPublic: true,
        }
    );

    // Create a membership linking subscriber to creator
    const membership = await (t as any).mutation(
        components.subscriptions.functions.createMembership,
        {
            tenantId,
            userId: subscriberId,
            tierId: tier.id,
            creatorId,
            memberNumber: `M-${Date.now()}`,
            status: "active",
            startDate: Date.now(),
            endDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
        }
    );

    return { tierId: tier.id, membershipId: membership.id };
}

// ---------------------------------------------------------------------------
// send
// ---------------------------------------------------------------------------

describe("broadcasts/facade — send", () => {
    it("sends a broadcast and resolves active subscribers", async () => {
        const t = setup();
        const { tenantId, adminId, userId } = await seedTestTenant(t);

        // Subscribe userId to adminId (creator)
        await seedCreatorSubscription(t, tenantId as string, userId as string, adminId as string);

        const result = await t.mutation(api.domain.broadcasts.send, {
            tenantId,
            creatorId: adminId,
            title: "Hot NBA Play",
            body: "Check the Lakers spread tonight.",
            messageType: "pick_alert",
        });

        expect(result.id).toBeDefined();
        expect(result.recipientCount).toBe(1);
    });

    it("rejects inactive user as creator", async () => {
        const t = setup();
        const { tenantId } = await seedTestTenant(t);

        // Create an inactive user
        const inactiveId = await t.run(async (ctx) =>
            ctx.db.insert("users", {
                email: "inactive@test.no",
                name: "Inactive",
                role: "user",
                status: "inactive",
                tenantId,
                metadata: {},
            })
        );

        await expect(
            t.mutation(api.domain.broadcasts.send, {
                tenantId,
                creatorId: inactiveId,
                title: "Test",
                body: "Should fail",
                messageType: "text_update",
            })
        ).rejects.toThrow(/not found or inactive/);
    });

    it("creates in-app notifications for each subscriber", async () => {
        const t = setup();
        const { tenantId, adminId, userId } = await seedTestTenant(t);

        await seedCreatorSubscription(t, tenantId as string, userId as string, adminId as string);

        await t.mutation(api.domain.broadcasts.send, {
            tenantId,
            creatorId: adminId,
            title: "Big Win Alert",
            body: "We hit!",
            messageType: "announcement",
        });

        // Check notification was created for the subscriber
        const notifications = await (t as any).query(
            components.notifications.functions.listByUser,
            { userId: userId as string }
        );

        expect(notifications.length).toBeGreaterThanOrEqual(1);
        expect(notifications[0].type).toBe("broadcast.announcement");
        expect(notifications[0].title).toContain("Big Win Alert");
    });

    it("creates audit entry", async () => {
        const t = setup();
        const { tenantId, adminId } = await seedTestTenant(t);

        await t.mutation(api.domain.broadcasts.send, {
            tenantId,
            creatorId: adminId,
            title: "Audited",
            body: "Check the audit log.",
            messageType: "text_update",
        });

        // Check audit entry was created
        const audits = await (t as any).query(
            components.audit.functions.listForTenant,
            { tenantId: tenantId as string }
        );

        const broadcastAudit = audits.find(
            (a: any) => a.entityType === "broadcast" && a.action === "sent"
        );
        expect(broadcastAudit).toBeDefined();
        expect(broadcastAudit.newState?.messageType).toBe("text_update");
    });

    it("emits event to outbox", async () => {
        const t = setup();
        const { tenantId, adminId } = await seedTestTenant(t);

        await t.mutation(api.domain.broadcasts.send, {
            tenantId,
            creatorId: adminId,
            title: "Event test",
            body: "Check the event bus.",
            messageType: "text_update",
        });

        // Check outbox event
        const events = await t.run(async (ctx) =>
            ctx.db.query("outboxEvents").collect()
        );

        const broadcastEvent = events.find(
            (e) => e.topic === "broadcasts.broadcast.sent"
        );
        expect(broadcastEvent).toBeDefined();
        expect(broadcastEvent?.payload).toMatchObject({
            creatorId: adminId as string,
            messageType: "text_update",
        });
    });

    it("handles zero subscribers gracefully", async () => {
        const t = setup();
        const { tenantId, adminId } = await seedTestTenant(t);

        // No subscriptions seeded
        const result = await t.mutation(api.domain.broadcasts.send, {
            tenantId,
            creatorId: adminId,
            title: "No audience",
            body: "Nobody will see this.",
            messageType: "text_update",
        });

        expect(result.recipientCount).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// listByCreator
// ---------------------------------------------------------------------------

describe("broadcasts/facade — listByCreator", () => {
    it("enriches broadcasts with creator data", async () => {
        const t = setup();
        const { tenantId, adminId } = await seedTestTenant(t);

        await t.mutation(api.domain.broadcasts.send, {
            tenantId,
            creatorId: adminId,
            title: "Enriched",
            body: "Test enrichment.",
            messageType: "text_update",
        });

        const list = await t.query(api.domain.broadcasts.listByCreator, {
            tenantId,
            creatorId: adminId as string,
        });

        expect(list).toHaveLength(1);
        expect(list[0].creator).toBeDefined();
        expect(list[0].creator?.name).toBe("Test Admin");
    });
});

// ---------------------------------------------------------------------------
// listForSubscriber
// ---------------------------------------------------------------------------

describe("broadcasts/facade — listForSubscriber", () => {
    it("lists broadcasts for a subscriber with creator enrichment", async () => {
        const t = setup();
        const { tenantId, adminId, userId } = await seedTestTenant(t);

        await seedCreatorSubscription(t, tenantId as string, userId as string, adminId as string);

        await t.mutation(api.domain.broadcasts.send, {
            tenantId,
            creatorId: adminId,
            title: "Subscriber sees this",
            body: "Content here.",
            messageType: "text_update",
        });

        const list = await t.query(api.domain.broadcasts.listForSubscriber, {
            tenantId,
            userId: userId as string,
        });

        expect(list).toHaveLength(1);
        expect(list[0].creator?.name).toBe("Test Admin");
    });
});

// ---------------------------------------------------------------------------
// markAsRead
// ---------------------------------------------------------------------------

describe("broadcasts/facade — markAsRead", () => {
    it("marks a broadcast as read", async () => {
        const t = setup();
        const { tenantId, adminId, userId } = await seedTestTenant(t);

        await seedCreatorSubscription(t, tenantId as string, userId as string, adminId as string);

        const { id } = await t.mutation(api.domain.broadcasts.send, {
            tenantId,
            creatorId: adminId,
            title: "Read me",
            body: "Mark as read test.",
            messageType: "text_update",
        });

        const result = await t.mutation(api.domain.broadcasts.markAsRead, {
            userId,
            broadcastId: id,
        });

        expect(result.success).toBe(true);

        // Unread count should be 0
        const { count } = await t.query(api.domain.broadcasts.unreadCount, {
            tenantId,
            userId: userId as string,
        });
        expect(count).toBe(0);
    });
});
