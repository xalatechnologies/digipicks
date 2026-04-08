import { describe, it, expect } from "vitest";
import { components } from "../../_generated/api";
import { createDomainTest, seedTestTenant } from "./testHelper.test-util";

describe("domain/retention", () => {
    // =========================================================================
    // NOTIFICATIONS — cleanupOld
    // =========================================================================

    describe("notifications.cleanupOld", () => {
        function setup() {
            return createDomainTest(["notifications"]);
        }

        it("deletes read notifications when threshold is zero (all read are eligible)", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const tid = tenantId as string;
            const uid = userId as string;

            // Create two notifications
            await t.mutation(components.notifications.functions.create, {
                tenantId: tid,
                userId: uid,
                type: "info",
                title: "Notification A",
            });
            await t.mutation(components.notifications.functions.create, {
                tenantId: tid,
                userId: uid,
                type: "info",
                title: "Notification B",
            });

            // Mark both as read
            const all = await t.query(components.notifications.functions.listByUser, {
                userId: uid,
            });
            for (const n of all) {
                await t.mutation(components.notifications.functions.markAsRead, {
                    id: n._id,
                });
            }

            // Cleanup with 0 threshold = all read notifications are eligible
            const result = await t.mutation(components.notifications.functions.cleanupOld, {
                tenantId: tid,
                olderThanMs: 0,
            });

            expect(result.purged).toBe(2);

            // Verify they are gone
            const remaining = await t.query(components.notifications.functions.listByUser, {
                userId: uid,
            });
            expect(remaining).toHaveLength(0);
        });

        it("does not delete unread notifications even with zero threshold", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const tid = tenantId as string;
            const uid = userId as string;

            // Create an unread notification
            await t.mutation(components.notifications.functions.create, {
                tenantId: tid,
                userId: uid,
                type: "info",
                title: "Unread notification",
            });

            const result = await t.mutation(components.notifications.functions.cleanupOld, {
                tenantId: tid,
                olderThanMs: 0,
            });

            expect(result.purged).toBe(0);

            const remaining = await t.query(components.notifications.functions.listByUser, {
                userId: uid,
            });
            expect(remaining).toHaveLength(1);
            expect(remaining[0].title).toBe("Unread notification");
        });

        it("does not delete recent read notifications with high threshold", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const tid = tenantId as string;
            const uid = userId as string;

            // Create and read a notification
            await t.mutation(components.notifications.functions.create, {
                tenantId: tid,
                userId: uid,
                type: "info",
                title: "Recently read",
            });
            const all = await t.query(components.notifications.functions.listByUser, {
                userId: uid,
            });
            await t.mutation(components.notifications.functions.markAsRead, {
                id: all[0]._id,
            });

            // Use a very high threshold (999 days) — recently created won't be old enough
            const result = await t.mutation(components.notifications.functions.cleanupOld, {
                tenantId: tid,
                olderThanMs: 999 * 24 * 60 * 60 * 1000,
            });

            expect(result.purged).toBe(0);
        });

        it("returns zero when no notifications exist", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const result = await t.mutation(components.notifications.functions.cleanupOld, {
                tenantId: tenantId as string,
                olderThanMs: 90 * 24 * 60 * 60 * 1000,
            });

            expect(result.purged).toBe(0);
        });
    });

    // =========================================================================
    // AUDIT — cleanupOld
    // =========================================================================

    describe("audit.cleanupOld", () => {
        function setup() {
            return createDomainTest(["audit"]);
        }

        it("deletes audit entries older than threshold", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const tid = tenantId as string;
            const uid = userId as string;
            const now = Date.now();
            const oldTimestamp = now - 800 * 24 * 60 * 60 * 1000; // 800 days ago

            // Use importRecord to set a custom timestamp (create sets Date.now())
            await t.mutation(components.audit.functions.importRecord, {
                tenantId: tid,
                userId: uid,
                entityType: "resource",
                entityId: "res-001",
                action: "created",
                timestamp: oldTimestamp,
            });

            // Create a recent audit entry via importRecord with current timestamp
            await t.mutation(components.audit.functions.importRecord, {
                tenantId: tid,
                userId: uid,
                entityType: "resource",
                entityId: "res-002",
                action: "updated",
                timestamp: now,
            });

            // Run cleanup with 730-day threshold
            const result = await t.mutation(components.audit.functions.cleanupOld, {
                tenantId: tid,
                olderThanMs: 730 * 24 * 60 * 60 * 1000,
            });

            expect(result.purged).toBe(1);

            // Recent entry should still exist
            const remaining = await t.query(components.audit.functions.listForTenant, {
                tenantId: tid,
            });
            expect(remaining).toHaveLength(1);
            expect((remaining[0] as any).entityId).toBe("res-002");
        });

        it("does not delete entries within retention window", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const tid = tenantId as string;

            // Create a recent audit entry
            await t.mutation(components.audit.functions.create, {
                tenantId: tid,
                userId: userId as string,
                entityType: "user",
                entityId: "user-001",
                action: "login",
            });

            const result = await t.mutation(components.audit.functions.cleanupOld, {
                tenantId: tid,
                olderThanMs: 730 * 24 * 60 * 60 * 1000,
            });

            expect(result.purged).toBe(0);
        });

        it("returns zero when no entries exist", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const result = await t.mutation(components.audit.functions.cleanupOld, {
                tenantId: tenantId as string,
                olderThanMs: 730 * 24 * 60 * 60 * 1000,
            });

            expect(result.purged).toBe(0);
        });
    });

    // =========================================================================
    // MESSAGING — cleanupOld
    // =========================================================================

    describe("messaging.cleanupOld", () => {
        function setup() {
            return createDomainTest(["messaging"]);
        }

        it("deletes resolved conversations and their messages with zero threshold", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const tid = tenantId as string;
            const uid = userId as string;

            // Create a conversation
            const { id: convId } = await t.mutation(
                components.messaging.mutations.createConversation,
                {
                    tenantId: tid,
                    userId: uid,
                    participants: [uid],
                    subject: "Resolved conversation",
                }
            );

            // Add a message
            await t.mutation(components.messaging.mutations.sendMessage, {
                tenantId: tid,
                conversationId: convId as any,
                senderId: uid,
                content: "Hello",
            });

            // Resolve the conversation
            await t.mutation(components.messaging.mutations.resolveConversation, {
                id: convId as any,
                resolvedBy: uid,
            });

            // Run cleanup with 0 threshold (any resolved conversation)
            const result = await t.mutation(components.messaging.mutations.cleanupOld, {
                tenantId: tid,
                olderThanMs: 0,
            });

            // Should have purged the conversation + its message
            expect(result.purged).toBeGreaterThanOrEqual(2);
        });

        it("does not delete archived conversations within retention window", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const tid = tenantId as string;
            const uid = userId as string;

            // Create and archive a conversation
            const { id: convId } = await t.mutation(
                components.messaging.mutations.createConversation,
                {
                    tenantId: tid,
                    userId: uid,
                    participants: [uid],
                    subject: "Archived conversation",
                }
            );
            await t.mutation(components.messaging.mutations.archiveConversation, {
                id: convId as any,
            });

            // High threshold — recently created conversation should survive
            const result = await t.mutation(components.messaging.mutations.cleanupOld, {
                tenantId: tid,
                olderThanMs: 365 * 24 * 60 * 60 * 1000,
            });

            expect(result.purged).toBe(0);
        });

        it("does not delete open conversations", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const tid = tenantId as string;
            const uid = userId as string;

            // Create an open conversation
            await t.mutation(components.messaging.mutations.createConversation, {
                tenantId: tid,
                userId: uid,
                participants: [uid],
                subject: "Active conversation",
            });

            const result = await t.mutation(components.messaging.mutations.cleanupOld, {
                tenantId: tid,
                olderThanMs: 0,
            });

            expect(result.purged).toBe(0);
        });

        it("returns zero when no conversations exist", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const result = await t.mutation(components.messaging.mutations.cleanupOld, {
                tenantId: tenantId as string,
                olderThanMs: 365 * 24 * 60 * 60 * 1000,
            });

            expect(result.purged).toBe(0);
        });
    });
});
