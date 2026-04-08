/**
 * Compliance Component Contract
 */

import { v } from "convex/values";
import { defineContract } from "../../lib/componentContract";

export const CONTRACT = defineContract({
    name: "compliance",
    version: "1.0.0",
    category: "infrastructure",
    description: "Consent records, DSAR requests, and policy version management",

    queries: {
        getConsent: {
            args: { userId: v.string(), tenantId: v.string() },
            returns: v.any(),
        },
        listConsent: {
            args: { tenantId: v.string() },
            returns: v.array(v.any()),
        },
        getConsentSummary: {
            args: { tenantId: v.string() },
            returns: v.any(),
        },
        getDSAR: {
            args: { id: v.string() },
            returns: v.any(),
        },
        listDSARRequests: {
            args: { tenantId: v.string() },
            returns: v.array(v.any()),
        },
        getPolicy: {
            args: { tenantId: v.string(), type: v.string() },
            returns: v.any(),
        },
        listPolicies: {
            args: { tenantId: v.string() },
            returns: v.array(v.any()),
        },
        getPolicyHistory: {
            args: { tenantId: v.string(), type: v.string() },
            returns: v.array(v.any()),
        },
    },

    mutations: {
        updateConsent: {
            args: { userId: v.string(), tenantId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        submitDSAR: {
            args: { tenantId: v.string(), userId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        updateDSARStatus: {
            args: { id: v.string(), status: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        publishPolicy: {
            args: { tenantId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        rollbackPolicy: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
    },

    emits: [
        "compliance.consent.updated",
        "compliance.dsar.submitted",
        "compliance.dsar.completed",
        "compliance.policy.published",
    ],

    subscribes: [],

    dependencies: {
        core: ["tenants", "users"],
        components: [],
    },
});
