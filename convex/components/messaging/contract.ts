/**
 * Messaging Component Contract
 */

import { v } from "convex/values";
import { defineContract } from "../../lib/componentContract";

export const CONTRACT = defineContract({
    name: "messaging",
    version: "1.0.0",
    category: "domain",
    description: "Conversations and messages between users",

    queries: {
        listConversations: {
            args: { tenantId: v.string() },
            returns: v.array(v.any()),
        },
        getConversation: {
            args: { id: v.string() },
            returns: v.any(),
        },
        listConversationsByAssignee: {
            args: { tenantId: v.string(), assigneeId: v.string() },
            returns: v.array(v.any()),
        },
        unreadMessageCount: {
            args: { tenantId: v.string(), userId: v.string() },
            returns: v.number(),
        },
        listMessages: {
            args: { conversationId: v.string() },
            returns: v.array(v.any()),
        },
    },

    mutations: {
        createConversation: {
            args: { tenantId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        archiveConversation: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        resolveConversation: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        reopenConversation: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        assignConversation: {
            args: { id: v.string(), assigneeId: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        sendMessage: {
            args: { conversationId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        markMessagesAsRead: {
            args: { conversationId: v.string(), userId: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
    },

    emits: [
        "messaging.conversation.created",
        "messaging.conversation.resolved",
        "messaging.message.sent",
    ],

    subscribes: [
        "bookings.booking.created",
    ],

    dependencies: {
        core: ["tenants", "users"],
        components: [],
    },
});
