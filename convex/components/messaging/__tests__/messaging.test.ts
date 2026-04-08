import { convexTest } from "convex-test";
import { expect, describe, it } from "vitest";
import schema from "../schema";
import { modules } from "../testSetup.test-util";
import { api } from "../_generated/api";

const TENANT = "tenant-msg-1";
const TENANT_B = "tenant-msg-2";
const USER = "user-1";
const USER_B = "user-2";
const ADMIN = "admin-1";

// =============================================================================
// CONVERSATION MUTATIONS
// =============================================================================

describe("messaging/mutations — createConversation", () => {
    it("creates a general conversation", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.mutations.createConversation, {
            tenantId: TENANT,
            userId: USER,
            participants: [USER, ADMIN],
            subject: "Spørsmål om booking",
        });
        expect(result.id).toBeDefined();

        const conv = await t.query(api.queries.getConversation, { id: result.id as any }) as any;
        expect(conv!.status).toBe("open");
        expect(conv!.unreadCount).toBe(0);
        expect(conv!.conversationType).toBe("general");
        expect(conv!.participants).toHaveLength(2);
    });

    it("creates a booking conversation", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.mutations.createConversation, {
            tenantId: TENANT,
            userId: USER,
            participants: [USER],
            bookingId: "booking-1",
            resourceId: "resource-1",
        });

        const conv = await t.query(api.queries.getConversation, { id: result.id as any }) as any;
        expect(conv!.conversationType).toBe("booking");
        expect(conv!.bookingId).toBe("booking-1");
    });
});

describe("messaging/mutations — getOrCreateConversationForBooking", () => {
    it("creates new conversation for booking", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.mutations.getOrCreateConversationForBooking, {
            tenantId: TENANT,
            bookingId: "booking-new",
            userId: USER,
        });
        expect(result.conversationId).toBeDefined();
    });

    it("returns existing conversation for same booking", async () => {
        const t = convexTest(schema, modules);
        const first = await t.mutation(api.mutations.getOrCreateConversationForBooking, {
            tenantId: TENANT,
            bookingId: "booking-dup",
            userId: USER,
        });
        const second = await t.mutation(api.mutations.getOrCreateConversationForBooking, {
            tenantId: TENANT,
            bookingId: "booking-dup",
            userId: USER_B,
        });
        expect(second.conversationId).toBe(first.conversationId);
    });
});

describe("messaging/mutations — conversation lifecycle", () => {
    it("archives a conversation", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createConversation, {
            tenantId: TENANT,
            userId: USER,
            participants: [USER],
        });
        await t.mutation(api.mutations.archiveConversation, { id: id as any });

        const conv = await t.query(api.queries.getConversation, { id: id as any }) as any;
        expect(conv!.status).toBe("archived");
    });

    it("resolves a conversation", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createConversation, {
            tenantId: TENANT,
            userId: USER,
            participants: [USER],
        });
        await t.mutation(api.mutations.resolveConversation, {
            id: id as any,
            resolvedBy: ADMIN,
        });

        const conv = await t.query(api.queries.getConversation, { id: id as any }) as any;
        expect(conv!.status).toBe("resolved");
        expect(conv!.resolvedBy).toBe(ADMIN);
        expect(conv!.resolvedAt).toBeDefined();
    });

    it("reopens a resolved conversation", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createConversation, {
            tenantId: TENANT,
            userId: USER,
            participants: [USER],
        });
        await t.mutation(api.mutations.resolveConversation, { id: id as any, resolvedBy: ADMIN });
        await t.mutation(api.mutations.reopenConversation, { id: id as any });

        const conv = await t.query(api.queries.getConversation, { id: id as any }) as any;
        expect(conv!.status).toBe("open");
        expect(conv!.reopenedAt).toBeDefined();
    });

    it("assigns and unassigns a conversation", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createConversation, {
            tenantId: TENANT,
            userId: USER,
            participants: [USER],
        });

        await t.mutation(api.mutations.assignConversation, { id: id as any, assigneeId: ADMIN });
        let conv = await t.query(api.queries.getConversation, { id: id as any }) as any;
        expect(conv!.assigneeId).toBe(ADMIN);
        expect(conv!.assignedAt).toBeDefined();

        await t.mutation(api.mutations.unassignConversation, { id: id as any });
        conv = await t.query(api.queries.getConversation, { id: id as any }) as any;
        expect(conv!.assigneeId).toBeUndefined();
    });

    it("sets priority", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createConversation, {
            tenantId: TENANT,
            userId: USER,
            participants: [USER],
        });

        await t.mutation(api.mutations.setConversationPriority, {
            id: id as any,
            priority: "high",
        });

        const conv = await t.query(api.queries.getConversation, { id: id as any }) as any;
        expect(conv!.priority).toBe("high");
    });
});

describe("messaging/mutations — addParticipant", () => {
    it("adds a participant (idempotent)", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createConversation, {
            tenantId: TENANT,
            userId: USER,
            participants: [USER],
        });

        await t.mutation(api.mutations.addParticipant, { id: id as any, userId: USER_B });
        const conv = await t.query(api.queries.getConversation, { id: id as any }) as any;
        expect(conv!.participants).toContain(USER_B);

        // Idempotent — adding same user again
        await t.mutation(api.mutations.addParticipant, { id: id as any, userId: USER_B });
        const conv2 = await t.query(api.queries.getConversation, { id: id as any }) as any;
        expect(conv2!.participants.filter((p: string) => p === USER_B)).toHaveLength(1);
    });
});

// =============================================================================
// MESSAGE MUTATIONS
// =============================================================================

describe("messaging/mutations — sendMessage", () => {
    it("sends a message and updates conversation", async () => {
        const t = convexTest(schema, modules);
        const { id: convId } = await t.mutation(api.mutations.createConversation, {
            tenantId: TENANT,
            userId: USER,
            participants: [USER],
        });

        const result = await t.mutation(api.mutations.sendMessage, {
            tenantId: TENANT,
            conversationId: convId as any,
            senderId: USER,
            content: "Hei, kan jeg booke lørdag?",
        });
        expect(result.id).toBeDefined();

        const conv = await t.query(api.queries.getConversation, { id: convId as any }) as any;
        expect(conv!.unreadCount).toBe(1);
        expect(conv!.lastMessageAt).toBeDefined();
    });

    it("sends with visibility and senderType", async () => {
        const t = convexTest(schema, modules);
        const { id: convId } = await t.mutation(api.mutations.createConversation, {
            tenantId: TENANT,
            userId: USER,
            participants: [USER],
        });

        await t.mutation(api.mutations.sendMessage, {
            tenantId: TENANT,
            conversationId: convId as any,
            senderId: ADMIN,
            senderType: "admin",
            visibility: "internal",
            content: "Admin note",
        });

        const messages = await t.query(api.queries.listMessages, {
            conversationId: convId as any,
        });
        expect(messages).toHaveLength(1);
        expect(messages[0].visibility).toBe("internal");
        expect(messages[0].senderType).toBe("admin");
    });
});

describe("messaging/mutations — addInternalNote", () => {
    it("adds an internal note", async () => {
        const t = convexTest(schema, modules);
        const { id: convId } = await t.mutation(api.mutations.createConversation, {
            tenantId: TENANT,
            userId: USER,
            participants: [USER],
        });

        const result = await t.mutation(api.mutations.addInternalNote, {
            tenantId: TENANT,
            conversationId: convId as any,
            senderId: ADMIN,
            content: "Intern merknad",
        });
        expect(result.id).toBeDefined();

        const messages = await t.query(api.queries.listMessages, {
            conversationId: convId as any,
        });
        expect(messages[0].visibility).toBe("internal");
        expect(messages[0].senderType).toBe("admin");
    });
});

describe("messaging/mutations — markMessagesAsRead", () => {
    it("marks unread messages and resets count", async () => {
        const t = convexTest(schema, modules);
        const { id: convId } = await t.mutation(api.mutations.createConversation, {
            tenantId: TENANT,
            userId: USER,
            participants: [USER, ADMIN],
        });

        // Admin sends 2 messages
        await t.mutation(api.mutations.sendMessage, {
            tenantId: TENANT,
            conversationId: convId as any,
            senderId: ADMIN,
            content: "Msg 1",
        });
        await t.mutation(api.mutations.sendMessage, {
            tenantId: TENANT,
            conversationId: convId as any,
            senderId: ADMIN,
            content: "Msg 2",
        });

        // User reads them
        const result = await t.mutation(api.mutations.markMessagesAsRead, {
            conversationId: convId as any,
            userId: USER,
        });
        expect(result.count).toBe(2);

        const conv = await t.query(api.queries.getConversation, { id: convId as any }) as any;
        expect(conv!.unreadCount).toBe(0);
    });
});

describe("messaging/mutations — createMessageTemplate", () => {
    it("creates a message template", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.mutations.createMessageTemplate, {
            tenantId: TENANT,
            name: "Bekreftelse",
            body: "Din booking er bekreftet.",
            category: "booking",
        });
        expect(result.id).toBeDefined();
    });
});

// =============================================================================
// CONVERSATION QUERIES
// =============================================================================

describe("messaging/queries — listConversations", () => {
    it("lists conversations for user", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createConversation, {
            tenantId: TENANT,
            userId: USER,
            participants: [USER],
        });
        await t.mutation(api.mutations.createConversation, {
            tenantId: TENANT,
            userId: USER_B,
            participants: [USER_B],
        });

        const convs = await t.query(api.queries.listConversations, { userId: USER });
        expect(convs).toHaveLength(1);
    });

    it("filters by status", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createConversation, {
            tenantId: TENANT,
            userId: USER,
            participants: [USER],
        });
        await t.mutation(api.mutations.createConversation, {
            tenantId: TENANT,
            userId: USER,
            participants: [USER],
        });
        await t.mutation(api.mutations.archiveConversation, { id: id as any });

        const open = await t.query(api.queries.listConversations, { userId: USER, status: "open" });
        expect(open).toHaveLength(1);
    });
});

describe("messaging/queries — getConversationByBooking", () => {
    it("finds conversation by booking", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createConversation, {
            tenantId: TENANT,
            userId: USER,
            participants: [USER],
            bookingId: "booking-find",
        });

        const conv = await t.query(api.queries.getConversationByBooking, {
            tenantId: TENANT,
            bookingId: "booking-find",
        }) as any;
        expect(conv).not.toBeNull();
        expect(conv!.bookingId).toBe("booking-find");
    });

    it("returns null for nonexistent booking", async () => {
        const t = convexTest(schema, modules);
        const conv = await t.query(api.queries.getConversationByBooking, {
            tenantId: TENANT,
            bookingId: "nonexistent",
        });
        expect(conv).toBeNull();
    });
});

describe("messaging/queries — listConversationsByAssignee", () => {
    it("lists assigned conversations", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createConversation, {
            tenantId: TENANT,
            userId: USER,
            participants: [USER],
        });
        await t.mutation(api.mutations.assignConversation, { id: id as any, assigneeId: ADMIN });

        const convs = await t.query(api.queries.listConversationsByAssignee, {
            assigneeId: ADMIN,
        });
        expect(convs).toHaveLength(1);
    });
});

describe("messaging/queries — unreadMessageCount", () => {
    it("returns total unread across conversations", async () => {
        const t = convexTest(schema, modules);
        const { id: c1 } = await t.mutation(api.mutations.createConversation, {
            tenantId: TENANT,
            userId: USER,
            participants: [USER, ADMIN],
        });
        const { id: c2 } = await t.mutation(api.mutations.createConversation, {
            tenantId: TENANT,
            userId: USER,
            participants: [USER, ADMIN],
        });

        await t.mutation(api.mutations.sendMessage, {
            tenantId: TENANT,
            conversationId: c1 as any,
            senderId: ADMIN,
            content: "A",
        });
        await t.mutation(api.mutations.sendMessage, {
            tenantId: TENANT,
            conversationId: c2 as any,
            senderId: ADMIN,
            content: "B",
        });
        await t.mutation(api.mutations.sendMessage, {
            tenantId: TENANT,
            conversationId: c2 as any,
            senderId: ADMIN,
            content: "C",
        });

        const result = await t.query(api.queries.unreadMessageCount, { userId: USER });
        expect(result.count).toBe(3);
    });
});

describe("messaging/queries — listMessages", () => {
    it("filters out internal messages with public visibility filter", async () => {
        const t = convexTest(schema, modules);
        const { id: convId } = await t.mutation(api.mutations.createConversation, {
            tenantId: TENANT,
            userId: USER,
            participants: [USER],
        });

        await t.mutation(api.mutations.sendMessage, {
            tenantId: TENANT,
            conversationId: convId as any,
            senderId: USER,
            content: "Public msg",
        });
        await t.mutation(api.mutations.addInternalNote, {
            tenantId: TENANT,
            conversationId: convId as any,
            senderId: ADMIN,
            content: "Internal note",
        });

        const all = await t.query(api.queries.listMessages, {
            conversationId: convId as any,
            visibilityFilter: "all",
        });
        expect(all).toHaveLength(2);

        const publicOnly = await t.query(api.queries.listMessages, {
            conversationId: convId as any,
            visibilityFilter: "public",
        });
        expect(publicOnly).toHaveLength(1);
        expect(publicOnly[0].content).toBe("Public msg");
    });
});

describe("messaging/queries — listMessageTemplates", () => {
    it("lists active templates", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createMessageTemplate, {
            tenantId: TENANT,
            name: "T1",
            body: "Body 1",
        });
        await t.mutation(api.mutations.createMessageTemplate, {
            tenantId: TENANT_B,
            name: "T2",
            body: "Body 2",
        });

        const templates = await t.query(api.queries.listMessageTemplates, {
            tenantId: TENANT,
        });
        expect(templates).toHaveLength(1);
        expect(templates[0].name).toBe("T1");
    });
});

// =============================================================================
// SCHEMA INDEXES
// =============================================================================

describe("messaging/schema — indexes", () => {
    it("conversations.by_user index works", async () => {
        const t = convexTest(schema, modules);
        await t.run(async (ctx) => {
            await ctx.db.insert("conversations", {
                tenantId: TENANT,
                userId: USER,
                participants: [USER],
                status: "open",
                unreadCount: 0,
                metadata: {},
            });
            const results = await ctx.db
                .query("conversations")
                .withIndex("by_user", (q) => q.eq("userId", USER))
                .collect();
            expect(results).toHaveLength(1);
        });
    });

    it("messages.by_conversation index works", async () => {
        const t = convexTest(schema, modules);
        await t.run(async (ctx) => {
            const convId = await ctx.db.insert("conversations", {
                tenantId: TENANT,
                userId: USER,
                participants: [USER],
                status: "open",
                unreadCount: 0,
                metadata: {},
            });
            await ctx.db.insert("messages", {
                tenantId: TENANT,
                conversationId: convId,
                senderId: USER,
                senderType: "user",
                content: "Hello",
                messageType: "text",
                attachments: [],
                metadata: {},
                sentAt: Date.now(),
            });
            const results = await ctx.db
                .query("messages")
                .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
                .collect();
            expect(results).toHaveLength(1);
        });
    });

    it("conversations.by_tenant_booking index works", async () => {
        const t = convexTest(schema, modules);
        await t.run(async (ctx) => {
            await ctx.db.insert("conversations", {
                tenantId: TENANT,
                userId: USER,
                bookingId: "b1",
                participants: [USER],
                status: "open",
                unreadCount: 0,
                metadata: {},
            });
            const results = await ctx.db
                .query("conversations")
                .withIndex("by_tenant_booking", (q) =>
                    q.eq("tenantId", TENANT).eq("bookingId", "b1")
                )
                .collect();
            expect(results).toHaveLength(1);
        });
    });
});
