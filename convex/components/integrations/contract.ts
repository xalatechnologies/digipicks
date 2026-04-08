/**
 * Integrations Component Contract
 */

import { v } from "convex/values";
import { defineContract } from "../../lib/componentContract";

export const CONTRACT = defineContract({
    name: "integrations",
    version: "1.0.0",
    category: "infrastructure",
    description: "Integration configs, webhooks, and sync logs",

    queries: {
        getConfig: {
            args: { tenantId: v.string(), provider: v.string() },
            returns: v.any(),
        },
        listConfigs: {
            args: { tenantId: v.string() },
            returns: v.array(v.any()),
        },
        listWebhooks: {
            args: { tenantId: v.string() },
            returns: v.array(v.any()),
        },
        listSyncLogs: {
            args: { tenantId: v.string() },
            returns: v.array(v.any()),
        },
        getSyncLog: {
            args: { id: v.string() },
            returns: v.any(),
        },
    },

    mutations: {
        configure: {
            args: { tenantId: v.string(), provider: v.string() },
            returns: v.object({ id: v.string() }),
        },
        updateConfig: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        disableIntegration: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        enableIntegration: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        removeIntegration: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        testConnection: {
            args: { id: v.string() },
            returns: v.any(),
        },
        registerWebhook: {
            args: { tenantId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        updateWebhook: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        deleteWebhook: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        startSync: {
            args: { tenantId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        completeSyncLog: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
    },

    emits: [
        "integrations.config.created",
        "integrations.config.updated",
        "integrations.webhook.registered",
        "integrations.sync.started",
        "integrations.sync.completed",
    ],

    subscribes: [],

    dependencies: {
        core: ["tenants"],
        components: [],
    },
});
