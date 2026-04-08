/**
 * Subscriptions Component Contract
 */

import { v } from "convex/values";
import { defineContract } from "../../lib/componentContract";

export const CONTRACT = defineContract({
    name: "subscriptions",
    version: "1.0.0",
    category: "domain",
    description: "Club membership engine — tiers, memberships, benefit tracking",

    queries: {
        listTiers: {
            args: { tenantId: v.string() },
            returns: v.array(v.any()),
        },
        getTier: {
            args: { id: v.string() },
            returns: v.any(),
        },
        getMembershipByUser: {
            args: { userId: v.string() },
            returns: v.any(),
        },
        listMemberships: {
            args: { tenantId: v.string() },
            returns: v.array(v.any()),
        },
        getMembershipStats: {
            args: { tenantId: v.string() },
            returns: v.any(),
        },
    },

    mutations: {
        createTier: {
            args: {
                tenantId: v.string(),
                name: v.string(),
                slug: v.string(),
                price: v.number(),
                billingInterval: v.string(),
            },
            returns: v.object({ id: v.string() }),
        },
        createMembership: {
            args: {
                tenantId: v.string(),
                userId: v.string(),
                tierId: v.string(),
            },
            returns: v.object({ id: v.string() }),
        },
        updateMembershipStatus: {
            args: {
                id: v.string(),
                status: v.string(),
            },
            returns: v.object({ success: v.boolean() }),
        },
        createBenefitUsage: {
            args: {
                tenantId: v.string(),
                membershipId: v.string(),
                benefitId: v.string(),
                benefitType: v.string(),
                usedAt: v.number(),
            },
            returns: v.object({ id: v.string() }),
        },
    },

    emits: [
        "subscriptions.membership.created",
        "subscriptions.membership.activated",
        "subscriptions.membership.renewed",
        "subscriptions.membership.upgraded",
        "subscriptions.membership.paused",
        "subscriptions.membership.cancelled",
        "subscriptions.membership.expired",
        "subscriptions.tier.created",
        "subscriptions.tier.deactivated",
    ],

    subscribes: [],

    dependencies: {
        core: ["tenants", "users"],
        components: ["billing", "pricing"],
    },
});
