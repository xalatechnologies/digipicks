/**
 * Discord Component Schema
 *
 * Auto-assign Discord server roles based on subscription status.
 * External references (tenantId, userId, tierId) use v.string()
 * because component tables cannot reference app-level tables.
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    /**
     * Discord OAuth connections — links a platform user to their Discord account.
     * One connection per user per tenant (a user can connect Discord once per creator).
     */
    discordConnections: defineTable({
        tenantId: v.string(),
        userId: v.string(),
        discordUserId: v.string(),
        discordUsername: v.string(),
        accessToken: v.string(),
        refreshToken: v.string(),
        tokenExpiresAt: v.number(),
        scopes: v.array(v.string()),
        isActive: v.boolean(),
        connectedAt: v.number(),
        lastRefreshedAt: v.optional(v.number()),
    })
        .index("by_tenant_and_user", ["tenantId", "userId"])
        .index("by_discord_user", ["discordUserId"])
        .index("by_tenant", ["tenantId"]),

    /**
     * Creator Discord server configuration — a creator links their Discord server
     * and configures which bot token / guild to use for role management.
     */
    discordServerConfigs: defineTable({
        tenantId: v.string(),
        creatorId: v.string(),
        guildId: v.string(),
        guildName: v.optional(v.string()),
        botToken: v.string(),
        clientId: v.string(),
        clientSecret: v.string(),
        isEnabled: v.boolean(),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_tenant_and_creator", ["tenantId", "creatorId"])
        .index("by_guild", ["guildId"]),

    /**
     * Role mappings — maps subscription tiers to Discord roles.
     * When a user subscribes to a tier, they receive the mapped Discord role.
     * When they cancel/downgrade, the role is removed.
     */
    discordRoleMappings: defineTable({
        tenantId: v.string(),
        creatorId: v.string(),
        tierId: v.string(),
        discordRoleId: v.string(),
        discordRoleName: v.optional(v.string()),
        isActive: v.boolean(),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_tenant_and_creator", ["tenantId", "creatorId"])
        .index("by_tier", ["tenantId", "tierId"]),

    /**
     * Role sync log — tracks every role assignment/removal for auditing
     * and retry on failure.
     */
    discordRoleSyncLog: defineTable({
        tenantId: v.string(),
        userId: v.string(),
        discordUserId: v.string(),
        guildId: v.string(),
        discordRoleId: v.string(),
        action: v.union(v.literal("assign"), v.literal("remove")),
        trigger: v.string(), // Event topic that triggered this sync
        status: v.union(
            v.literal("pending"),
            v.literal("success"),
            v.literal("failed")
        ),
        error: v.optional(v.string()),
        membershipId: v.optional(v.string()),
        tierId: v.optional(v.string()),
        attemptedAt: v.number(),
        completedAt: v.optional(v.number()),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_user", ["tenantId", "userId"])
        .index("by_status", ["status"]),
});
