/**
 * Support Component Contract
 */

import { v } from "convex/values";
import { defineContract } from "../../lib/componentContract";

export const CONTRACT = defineContract({
    name: "support",
    version: "1.0.0",
    category: "domain",
    description: "Support tickets and case management",

    queries: {
        listTickets: {
            args: { tenantId: v.string() },
            returns: v.array(v.any()),
        },
        getTicket: {
            args: { id: v.string() },
            returns: v.any(),
        },
        listTicketMessages: {
            args: { ticketId: v.string() },
            returns: v.array(v.any()),
        },
        getTicketCounts: {
            args: { tenantId: v.string() },
            returns: v.any(),
        },
    },

    mutations: {
        createTicket: {
            args: { tenantId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        updateTicket: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        assignTicket: {
            args: { id: v.string(), assigneeUserId: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        changeStatus: {
            args: { id: v.string(), status: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        addMessage: {
            args: { ticketId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        escalateTicket: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
    },

    emits: [
        "support.ticket.created",
        "support.ticket.resolved",
        "support.ticket.escalated",
        "support.message.added",
    ],

    subscribes: [],

    dependencies: {
        core: ["tenants", "users"],
        components: [],
    },
});
