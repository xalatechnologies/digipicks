import { describe, it, expect } from "vitest";
import { api, components } from "../../_generated/api";
import { createDomainTest, seedTestTenant } from "./testHelper.test-util";

describe("domain/messaging", () => {
    function setup() {
        return createDomainTest(["messaging", "rbac", "notifications"]);
    }

    /**
     * Grant "booking:approve" permission via RBAC so admin-only facades work.
     */
    async function grantAdminPermission(
        t: ReturnType<typeof setup>,
        tenantId: string,
        userId: string
    ) {
        const role = await t.mutation(components.rbac.mutations.createRole, {
            tenantId,
            name: "Admin",
            permissions: ["booking:approve"],
            isSystem: true,
        });
        await t.mutation(components.rbac.mutations.assignRole, {
            tenantId,
            userId,
            roleId: role.id as any,
        });
        return role;
    }

    // =========================================================================
    // CREATE CONVERSATION
    // =========================================================================

    describe("createConversation", () => {
        it("creates a conversation between two users", async () => {
            const t = setup();
            const { tenantId, userId, adminId } = await seedTestTenant(t);

            const result = await t.mutation(
                api.domain.messaging.createConversation,
                {
                    tenantId,
                    userId,
                    participants: [userId, adminId],
                    subject: "Booking inquiry",
                }
            );

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
        });

        it("creates a conversation with metadata", async () => {
            const t = setup();
            const { tenantId, userId, adminId } = await seedTestTenant(t);

            const result = await t.mutation(
                api.domain.messaging.createConversation,
                {
                    tenantId,
                    userId,
                    participants: [userId, adminId],
                    subject: "Question about venue",
                    metadata: { category: "booking" },
                }
            );

            expect(result.id).toBeDefined();
        });

        it("rejects conversation from inactive user", async () => {
            const t = setup();
            const { tenantId, adminId } = await seedTestTenant(t);

            const inactiveId = await t.run(async (ctx) => {
                return ctx.db.insert("users", {
                    email: "inactive@test.no",
                    name: "Inactive",
                    role: "user",
                    status: "suspended",
                    tenantId,
                    metadata: {},
                });
            });

            await expect(
                t.mutation(api.domain.messaging.createConversation, {
                    tenantId,
                    userId: inactiveId,
                    participants: [inactiveId, adminId],
                    subject: "Should fail",
                })
            ).rejects.toThrow("User not found or inactive");
        });

        it("rejects when messaging module is disabled", async () => {
            const t = setup();
            // Create a tenant WITHOUT messaging enabled
            const { tenantId, userId, adminId } = await t.run(async (ctx) => {
                const tenantId = await ctx.db.insert("tenants", {
                    name: "No Messaging Tenant",
                    slug: "no-messaging",
                    status: "active",
                    settings: {},
                    seatLimits: { max: 100 },
                    featureFlags: { messaging: false },
                    enabledCategories: ["ALLE"],
                });
                const adminId = await ctx.db.insert("users", {
                    email: "admin@no-msg.no",
                    name: "Admin",
                    role: "admin",
                    status: "active",
                    tenantId,
                    metadata: {},
                });
                const userId = await ctx.db.insert("users", {
                    email: "user@no-msg.no",
                    name: "User",
                    role: "user",
                    status: "active",
                    tenantId,
                    metadata: {},
                });
                return { tenantId, adminId, userId };
            });

            await expect(
                t.mutation(api.domain.messaging.createConversation, {
                    tenantId,
                    userId,
                    participants: [userId, adminId],
                    subject: "Disabled module",
                })
            ).rejects.toThrow(/messaging.*not enabled/i);
        });
    });

    // =========================================================================
    // LIST CONVERSATIONS
    // =========================================================================

    describe("listConversations", () => {
        it("returns conversations for a user", async () => {
            const t = setup();
            const { tenantId, userId, adminId } = await seedTestTenant(t);

            await t.mutation(api.domain.messaging.createConversation, {
                tenantId,
                userId,
                participants: [userId, adminId],
                subject: "Conversation 1",
            });
            await t.mutation(api.domain.messaging.createConversation, {
                tenantId,
                userId,
                participants: [userId, adminId],
                subject: "Conversation 2",
            });

            const list = await t.query(
                api.domain.messaging.listConversations,
                { userId }
            );

            expect(list.length).toBe(2);
        });

        it("returns empty list for user with no conversations", async () => {
            const t = setup();
            const { userId } = await seedTestTenant(t);

            const list = await t.query(
                api.domain.messaging.listConversations,
                { userId }
            );

            expect(list.length).toBe(0);
        });
    });

    // =========================================================================
    // GET CONVERSATION
    // =========================================================================

    describe("getConversation", () => {
        it("returns conversation enriched with participant details", async () => {
            const t = setup();
            const { tenantId, userId, adminId } = await seedTestTenant(t);

            const { id } = await t.mutation(
                api.domain.messaging.createConversation,
                {
                    tenantId,
                    userId,
                    participants: [userId, adminId],
                    subject: "Test Conversation",
                }
            );

            const conversation = await t.query(
                api.domain.messaging.getConversation,
                { id }
            );

            expect(conversation).toBeDefined();
            expect(conversation.subject).toBe("Test Conversation");
            expect(conversation.participantDetails).toBeDefined();
            expect(conversation.participantDetails.length).toBeGreaterThanOrEqual(1);

            // Verify participant enrichment
            const userDetail = conversation.participantDetails.find(
                (p: any) => p.email === "user@test.no"
            );
            expect(userDetail).toBeDefined();
            expect(userDetail.name).toBe("Test User");
        });

        it("throws for invalid conversation ID", async () => {
            const t = setup();
            await seedTestTenant(t);

            // Component validates ID format, so invalid IDs throw
            await expect(
                t.query(api.domain.messaging.getConversation, {
                    id: "nonexistent-conv-id",
                })
            ).rejects.toThrow();
        });
    });

    // =========================================================================
    // SEND MESSAGE
    // =========================================================================

    describe("sendMessage", () => {
        it("sends a message in a conversation", async () => {
            const t = setup();
            const { tenantId, userId, adminId } = await seedTestTenant(t);

            const { id: conversationId } = await t.mutation(
                api.domain.messaging.createConversation,
                {
                    tenantId,
                    userId,
                    participants: [userId, adminId],
                    subject: "Chat",
                }
            );

            const result = await t.mutation(api.domain.messaging.sendMessage, {
                tenantId,
                conversationId,
                senderId: userId,
                content: "Hello, I have a question about my booking.",
            });

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
        });

        it("rejects message from inactive user", async () => {
            const t = setup();
            const { tenantId, userId, adminId } = await seedTestTenant(t);

            const { id: conversationId } = await t.mutation(
                api.domain.messaging.createConversation,
                {
                    tenantId,
                    userId,
                    participants: [userId, adminId],
                }
            );

            const inactiveId = await t.run(async (ctx) => {
                return ctx.db.insert("users", {
                    email: "suspended@test.no",
                    name: "Suspended",
                    role: "user",
                    status: "suspended",
                    tenantId,
                    metadata: {},
                });
            });

            await expect(
                t.mutation(api.domain.messaging.sendMessage, {
                    tenantId,
                    conversationId,
                    senderId: inactiveId,
                    content: "Should fail",
                })
            ).rejects.toThrow("User not found or inactive");
        });
    });

    // =========================================================================
    // LIST MESSAGES
    // =========================================================================

    describe("listMessages", () => {
        it("returns messages enriched with sender names", async () => {
            const t = setup();
            const { tenantId, userId, adminId } = await seedTestTenant(t);

            const { id: conversationId } = await t.mutation(
                api.domain.messaging.createConversation,
                {
                    tenantId,
                    userId,
                    participants: [userId, adminId],
                }
            );

            await t.mutation(api.domain.messaging.sendMessage, {
                tenantId,
                conversationId,
                senderId: userId,
                content: "First message",
            });

            const messages = await t.query(api.domain.messaging.listMessages, {
                conversationId,
            });

            expect(messages.length).toBe(1);
            expect(messages[0].content).toBe("First message");
            expect(messages[0].senderName).toBe("Test User");
        });
    });

    // =========================================================================
    // MARK MESSAGES AS READ
    // =========================================================================

    describe("markMessagesAsRead", () => {
        it("marks messages as read in a conversation", async () => {
            const t = setup();
            const { tenantId, userId, adminId } = await seedTestTenant(t);

            const { id: conversationId } = await t.mutation(
                api.domain.messaging.createConversation,
                {
                    tenantId,
                    userId,
                    participants: [userId, adminId],
                }
            );

            await t.mutation(api.domain.messaging.sendMessage, {
                tenantId,
                conversationId,
                senderId: adminId,
                content: "Admin message",
            });

            const result = await t.mutation(
                api.domain.messaging.markMessagesAsRead,
                {
                    conversationId,
                    userId,
                }
            );

            expect(result).toBeDefined();
        });
    });

    // =========================================================================
    // UNREAD MESSAGE COUNT
    // =========================================================================

    describe("unreadMessageCount", () => {
        it("returns zero when no unread messages", async () => {
            const t = setup();
            const { userId } = await seedTestTenant(t);

            const result = await t.query(
                api.domain.messaging.unreadMessageCount,
                { userId }
            );

            expect(result).toBeDefined();
        });
    });

    // =========================================================================
    // ARCHIVE / RESOLVE / REOPEN
    // =========================================================================

    describe("conversation lifecycle", () => {
        it("resolves a conversation", async () => {
            const t = setup();
            const { tenantId, userId, adminId } = await seedTestTenant(t);

            const { id } = await t.mutation(
                api.domain.messaging.createConversation,
                {
                    tenantId,
                    userId,
                    participants: [userId, adminId],
                    subject: "To resolve",
                }
            );

            const result = await t.mutation(
                api.domain.messaging.resolveConversation,
                { id, resolvedBy: adminId }
            );

            expect(result).toBeDefined();
        });

        it("archives a conversation", async () => {
            const t = setup();
            const { tenantId, userId, adminId } = await seedTestTenant(t);

            const { id } = await t.mutation(
                api.domain.messaging.createConversation,
                {
                    tenantId,
                    userId,
                    participants: [userId, adminId],
                    subject: "To archive",
                }
            );

            const result = await t.mutation(
                api.domain.messaging.archiveConversation,
                { id }
            );

            expect(result).toBeDefined();
        });

        it("reopens an archived conversation", async () => {
            const t = setup();
            const { tenantId, userId, adminId } = await seedTestTenant(t);

            const { id } = await t.mutation(
                api.domain.messaging.createConversation,
                {
                    tenantId,
                    userId,
                    participants: [userId, adminId],
                    subject: "To reopen",
                }
            );

            await t.mutation(api.domain.messaging.archiveConversation, { id });

            const result = await t.mutation(
                api.domain.messaging.reopenConversation,
                { id }
            );

            expect(result).toBeDefined();
        });
    });

    // =========================================================================
    // ASSIGN / UNASSIGN / PRIORITY
    // =========================================================================

    describe("conversation management", () => {
        it("assigns a conversation to a user", async () => {
            const t = setup();
            const { tenantId, userId, adminId } = await seedTestTenant(t);

            const { id } = await t.mutation(
                api.domain.messaging.createConversation,
                {
                    tenantId,
                    userId,
                    participants: [userId, adminId],
                }
            );

            const result = await t.mutation(
                api.domain.messaging.assignConversation,
                { id, assigneeId: adminId }
            );

            expect(result).toBeDefined();
        });

        it("unassigns a conversation", async () => {
            const t = setup();
            const { tenantId, userId, adminId } = await seedTestTenant(t);

            const { id } = await t.mutation(
                api.domain.messaging.createConversation,
                {
                    tenantId,
                    userId,
                    participants: [userId, adminId],
                }
            );

            await t.mutation(api.domain.messaging.assignConversation, {
                id,
                assigneeId: adminId,
            });

            const result = await t.mutation(
                api.domain.messaging.unassignConversation,
                { id }
            );

            expect(result).toBeDefined();
        });

        it("sets conversation priority", async () => {
            const t = setup();
            const { tenantId, userId, adminId } = await seedTestTenant(t);

            const { id } = await t.mutation(
                api.domain.messaging.createConversation,
                {
                    tenantId,
                    userId,
                    participants: [userId, adminId],
                }
            );

            const result = await t.mutation(
                api.domain.messaging.setConversationPriority,
                { id, priority: "high" }
            );

            expect(result).toBeDefined();
        });
    });
});
