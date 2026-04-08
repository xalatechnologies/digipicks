/**
 * Disputes Component Contract
 */

import { v } from "convex/values";
import { defineContract } from "../../lib/componentContract";

export const CONTRACT = defineContract({
    name: "disputes",
    version: "1.0.0",
    category: "domain",
    description: "Dispute resolution center for creator-subscriber conflicts",

    queries: {
        listDisputes: {
            args: { tenantId: v.string() },
            returns: v.array(v.any()),
        },
        getDispute: {
            args: { id: v.string() },
            returns: v.any(),
        },
        listDisputeMessages: {
            args: { disputeId: v.string() },
            returns: v.array(v.any()),
        },
        getDisputeCounts: {
            args: { tenantId: v.string() },
            returns: v.any(),
        },
    },

    mutations: {
        createDispute: {
            args: { tenantId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        updateDispute: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        assignMediator: {
            args: { id: v.string(), mediatorUserId: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        changeStatus: {
            args: { id: v.string(), status: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        resolveDispute: {
            args: { id: v.string(), resolution: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        escalateDispute: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        addMessage: {
            args: { disputeId: v.string() },
            returns: v.object({ id: v.string() }),
        },
    },

    emits: [
        "disputes.dispute.created",
        "disputes.dispute.resolved",
        "disputes.dispute.escalated",
        "disputes.dispute.appealed",
        "disputes.message.added",
    ],

    subscribes: [],

    dependencies: {
        core: ["tenants", "users"],
        components: ["picks", "subscriptions"],
    },
});
