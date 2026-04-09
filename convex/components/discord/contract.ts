/**
 * Discord Component Contract
 *
 * Auto-assign Discord server roles based on subscription status.
 */

import { v } from "convex/values";
import { defineContract } from "../../lib/componentContract";

export const CONTRACT = defineContract({
    name: "discord",
    version: "1.0.0",
    category: "domain",
    description: "Discord integration — auto-assign roles by subscription status",

    queries: {
        getConnection: {
            args: { tenantId: v.string(), userId: v.string() },
            returns: v.any(),
        },
        getServerConfig: {
            args: { tenantId: v.string(), creatorId: v.string() },
            returns: v.any(),
        },
        listRoleMappings: {
            args: { tenantId: v.string(), creatorId: v.string() },
            returns: v.array(v.any()),
        },
        listSyncLog: {
            args: { tenantId: v.string(), userId: v.string() },
            returns: v.array(v.any()),
        },
    },

    mutations: {
        upsertConnection: {
            args: {
                tenantId: v.string(),
                userId: v.string(),
                discordUserId: v.string(),
                discordUsername: v.string(),
                accessToken: v.string(),
                refreshToken: v.string(),
                tokenExpiresAt: v.number(),
                scopes: v.array(v.string()),
            },
            returns: v.object({ id: v.string() }),
        },
        upsertServerConfig: {
            args: {
                tenantId: v.string(),
                creatorId: v.string(),
                guildId: v.string(),
                botToken: v.string(),
                clientId: v.string(),
                clientSecret: v.string(),
            },
            returns: v.object({ id: v.string() }),
        },
        upsertRoleMapping: {
            args: {
                tenantId: v.string(),
                creatorId: v.string(),
                tierId: v.string(),
                discordRoleId: v.string(),
            },
            returns: v.object({ id: v.string() }),
        },
        createSyncLogEntry: {
            args: {
                tenantId: v.string(),
                userId: v.string(),
                discordUserId: v.string(),
                guildId: v.string(),
                discordRoleId: v.string(),
                action: v.string(),
                trigger: v.string(),
            },
            returns: v.object({ id: v.string() }),
        },
    },

    actions: {
        syncRole: {
            args: {
                tenantId: v.string(),
                userId: v.string(),
                creatorId: v.string(),
                action: v.string(),
                trigger: v.string(),
            },
            returns: v.object({ success: v.boolean() }),
        },
    },

    emits: [
        "discord.role.assigned",
        "discord.role.removed",
        "discord.connection.created",
        "discord.connection.revoked",
    ],

    subscribes: [
        "subscriptions.membership.created",
        "subscriptions.membership.cancelled",
        "subscriptions.membership.expired",
        "subscriptions.membership.upgraded",
    ],

    dependencies: {
        core: ["tenants", "users"],
        components: ["subscriptions"],
    },
});
