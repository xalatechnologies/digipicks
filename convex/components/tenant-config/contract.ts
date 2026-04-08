/**
 * Tenant Config Component Contract
 */

import { v } from "convex/values";
import { defineContract } from "../../lib/componentContract";

export const CONTRACT = defineContract({
    name: "tenant-config",
    version: "1.0.0",
    category: "infrastructure",
    description: "Feature flags, branding, and theme overrides per tenant",

    queries: {
        listFlags: {
            args: { tenantId: v.string() },
            returns: v.array(v.any()),
        },
        getFlag: {
            args: { tenantId: v.string(), key: v.string() },
            returns: v.any(),
        },
        evaluateFlag: {
            args: { tenantId: v.string(), key: v.string() },
            returns: v.any(),
        },
        evaluateAllFlags: {
            args: { tenantId: v.string() },
            returns: v.any(),
        },
        getBranding: {
            args: { tenantId: v.string() },
            returns: v.any(),
        },
        listBrandAssets: {
            args: { tenantId: v.string() },
            returns: v.array(v.any()),
        },
        listThemeOverrides: {
            args: { tenantId: v.string() },
            returns: v.array(v.any()),
        },
        getThemeCSS: {
            args: { tenantId: v.string() },
            returns: v.any(),
        },
    },

    mutations: {
        createFlag: {
            args: { tenantId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        updateFlag: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        deleteFlag: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        createFlagRule: {
            args: { tenantId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        deleteFlagRule: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        updateBranding: {
            args: { tenantId: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        uploadBrandAsset: {
            args: { tenantId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        removeBrandAsset: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        setThemeOverride: {
            args: { tenantId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        removeThemeOverride: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
    },

    emits: [
        "tenant-config.flag.created",
        "tenant-config.flag.updated",
        "tenant-config.branding.updated",
        "tenant-config.theme.updated",
    ],

    subscribes: [],

    dependencies: {
        core: ["tenants"],
        components: [],
    },
});
