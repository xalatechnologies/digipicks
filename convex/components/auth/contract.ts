/**
 * Auth Component Contract
 */

import { v } from "convex/values";
import { defineContract } from "../../lib/componentContract";

export const CONTRACT = defineContract({
    name: "auth",
    version: "1.0.0",
    category: "platform",
    description: "Sessions, OAuth states, magic links, and demo tokens",

    queries: {
        validateSession: {
            args: { token: v.string() },
            returns: v.any(),
        },
        getSessionByToken: {
            args: { token: v.string() },
            returns: v.any(),
        },
        validateDemoToken: {
            args: { token: v.string() },
            returns: v.any(),
        },
    },

    mutations: {
        createSession: {
            args: { userId: v.string(), tenantId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        invalidateSession: {
            args: { token: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        createOAuthState: {
            args: { tenantId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        consumeOAuthState: {
            args: { state: v.string() },
            returns: v.any(),
        },
        createMagicLink: {
            args: { email: v.string(), tenantId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        consumeMagicLink: {
            args: { token: v.string() },
            returns: v.any(),
        },
        createDemoToken: {
            args: { tenantId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        cleanupExpired: {
            args: {},
            returns: v.any(),
        },
    },

    emits: [
        "auth.session.created",
        "auth.session.invalidated",
        "auth.magic-link.created",
        "auth.demo-token.created",
    ],

    subscribes: [],

    dependencies: {
        core: ["tenants", "users"],
        components: [],
    },
});
