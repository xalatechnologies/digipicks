/**
 * Discord Facade — Auto-assign Discord roles by subscription status
 *
 * Thin facade over the discord component.
 * Handles:
 *   - Discord OAuth connection flow
 *   - Creator server configuration + role mapping
 *   - Role assignment/removal via Discord API
 *   - Subscription event-driven role sync
 *   - Audit + event bus integration
 */

import { action, internalAction, internalMutation, mutation, query } from "../_generated/server";
import { components } from "../_generated/api";
import { internal } from "../_generated/api";
import { v, ConvexError } from "convex/values";
import { withAudit } from "../lib/auditHelpers";
import { emitEvent } from "../lib/eventBus";

// =============================================================================
// QUERY FACADES
// =============================================================================

/**
 * Get the current user's Discord connection.
 */
export const getConnection = query({
    args: {
        tenantId: v.string(),
        userId: v.string(),
    },
    handler: async (ctx, { tenantId, userId }) => {
        if (!tenantId || !userId) return null;
        const connection = await ctx.runQuery(
            components.discord.functions.getConnection,
            { tenantId, userId }
        );
        if (!connection) return null;
        // Redact tokens from query results
        return {
            ...connection,
            accessToken: undefined,
            refreshToken: undefined,
            discordUserId: connection.discordUserId,
            discordUsername: connection.discordUsername,
            isActive: connection.isActive,
            connectedAt: connection.connectedAt,
        };
    },
});

/**
 * Get a creator's Discord server configuration (redacted for non-admin use).
 */
export const getServerConfig = query({
    args: {
        tenantId: v.string(),
        creatorId: v.string(),
    },
    handler: async (ctx, { tenantId, creatorId }) => {
        const config = await ctx.runQuery(
            components.discord.functions.getServerConfig,
            { tenantId, creatorId }
        );
        if (!config) return null;
        // Redact sensitive fields
        return {
            _id: config._id,
            tenantId: config.tenantId,
            creatorId: config.creatorId,
            guildId: config.guildId,
            guildName: config.guildName,
            isEnabled: config.isEnabled,
            createdAt: config.createdAt,
            updatedAt: config.updatedAt,
        };
    },
});

/**
 * List role mappings for a creator.
 */
export const listRoleMappings = query({
    args: {
        tenantId: v.string(),
        creatorId: v.string(),
    },
    handler: async (ctx, { tenantId, creatorId }) => {
        const mappings = await ctx.runQuery(
            components.discord.functions.listRoleMappings,
            { tenantId, creatorId }
        );
        return (mappings as any[]).filter((m: any) => m.isActive);
    },
});

/**
 * List sync log for a user.
 */
export const listSyncLog = query({
    args: {
        tenantId: v.string(),
        userId: v.string(),
    },
    handler: async (ctx, { tenantId, userId }) => {
        return ctx.runQuery(
            components.discord.functions.listSyncLog,
            { tenantId, userId }
        );
    },
});

// =============================================================================
// MUTATION FACADES
// =============================================================================

/**
 * Save a Discord OAuth connection after the OAuth callback.
 */
export const saveConnection = mutation({
    args: {
        tenantId: v.id("tenants"),
        userId: v.id("users"),
        discordUserId: v.string(),
        discordUsername: v.string(),
        accessToken: v.string(),
        refreshToken: v.string(),
        tokenExpiresAt: v.number(),
        scopes: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        const result = await ctx.runMutation(
            components.discord.functions.upsertConnection,
            {
                tenantId: args.tenantId as string,
                userId: args.userId as string,
                discordUserId: args.discordUserId,
                discordUsername: args.discordUsername,
                accessToken: args.accessToken,
                refreshToken: args.refreshToken,
                tokenExpiresAt: args.tokenExpiresAt,
                scopes: args.scopes,
            }
        );

        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: args.userId as string,
            entityType: "discord_connection",
            entityId: result.id,
            action: "connected",
            newState: {
                discordUserId: args.discordUserId,
                discordUsername: args.discordUsername,
            },
            sourceComponent: "discord",
        });

        await emitEvent(
            ctx,
            "discord.connection.created",
            args.tenantId as string,
            "discord",
            {
                userId: args.userId as string,
                discordUserId: args.discordUserId,
                connectionId: result.id,
            }
        );

        return result;
    },
});

/**
 * Disconnect a user's Discord account.
 */
export const disconnectUser = mutation({
    args: {
        tenantId: v.id("tenants"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const result = await ctx.runMutation(
            components.discord.functions.disconnectUser,
            {
                tenantId: args.tenantId as string,
                userId: args.userId as string,
            }
        );

        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: args.userId as string,
            entityType: "discord_connection",
            entityId: args.userId as string,
            action: "disconnected",
            sourceComponent: "discord",
        });

        await emitEvent(
            ctx,
            "discord.connection.revoked",
            args.tenantId as string,
            "discord",
            { userId: args.userId as string }
        );

        return result;
    },
});

/**
 * Configure a creator's Discord server for role management.
 */
export const configureServer = mutation({
    args: {
        tenantId: v.id("tenants"),
        creatorId: v.id("users"),
        guildId: v.string(),
        guildName: v.optional(v.string()),
        botToken: v.string(),
        clientId: v.string(),
        clientSecret: v.string(),
    },
    handler: async (ctx, args) => {
        const result = await ctx.runMutation(
            components.discord.functions.upsertServerConfig,
            {
                tenantId: args.tenantId as string,
                creatorId: args.creatorId as string,
                guildId: args.guildId,
                guildName: args.guildName,
                botToken: args.botToken,
                clientId: args.clientId,
                clientSecret: args.clientSecret,
            }
        );

        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: args.creatorId as string,
            entityType: "discord_server_config",
            entityId: result.id,
            action: "configured",
            newState: { guildId: args.guildId, guildName: args.guildName },
            sourceComponent: "discord",
        });

        return result;
    },
});

/**
 * Map a subscription tier to a Discord role.
 */
export const setRoleMapping = mutation({
    args: {
        tenantId: v.id("tenants"),
        creatorId: v.id("users"),
        tierId: v.string(),
        discordRoleId: v.string(),
        discordRoleName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const result = await ctx.runMutation(
            components.discord.functions.upsertRoleMapping,
            {
                tenantId: args.tenantId as string,
                creatorId: args.creatorId as string,
                tierId: args.tierId,
                discordRoleId: args.discordRoleId,
                discordRoleName: args.discordRoleName,
            }
        );

        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: args.creatorId as string,
            entityType: "discord_role_mapping",
            entityId: result.id,
            action: "mapped",
            newState: {
                tierId: args.tierId,
                discordRoleId: args.discordRoleId,
                discordRoleName: args.discordRoleName,
            },
            sourceComponent: "discord",
        });

        return result;
    },
});

/**
 * Remove a role mapping for a tier.
 */
export const removeRoleMapping = mutation({
    args: {
        tenantId: v.id("tenants"),
        tierId: v.string(),
    },
    handler: async (ctx, args) => {
        const result = await ctx.runMutation(
            components.discord.functions.removeRoleMapping,
            {
                tenantId: args.tenantId as string,
                tierId: args.tierId,
            }
        );

        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            entityType: "discord_role_mapping",
            entityId: args.tierId,
            action: "removed",
            sourceComponent: "discord",
        });

        return result;
    },
});

// =============================================================================
// ACTION FACADES (Discord API calls)
// =============================================================================

/**
 * Sync a Discord role for a user based on subscription status.
 * Called by the event bus when subscription events fire.
 *
 * Flow:
 * 1. Look up user's Discord connection
 * 2. Look up creator's server config
 * 3. Look up tier -> role mapping
 * 4. Call Discord API to assign/remove role
 * 5. Log the result
 */
export const syncRole = action({
    args: {
        tenantId: v.string(),
        userId: v.string(),
        creatorId: v.string(),
        tierId: v.string(),
        action: v.union(v.literal("assign"), v.literal("remove")),
        trigger: v.string(),
        membershipId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // 1. Get user's Discord connection
        const connection: any = await ctx.runQuery(
            components.discord.functions.getConnection,
            { tenantId: args.tenantId, userId: args.userId }
        );

        if (!connection || !connection.isActive) {
            return { success: false, reason: "no_discord_connection" };
        }

        // 2. Get creator's server config
        const serverConfig: any = await ctx.runQuery(
            components.discord.functions.getServerConfig,
            { tenantId: args.tenantId, creatorId: args.creatorId }
        );

        if (!serverConfig || !serverConfig.isEnabled) {
            return { success: false, reason: "discord_not_configured" };
        }

        // 3. Get role mapping for the tier
        const roleMapping: any = await ctx.runQuery(
            components.discord.functions.getRoleMappingByTier,
            { tenantId: args.tenantId, tierId: args.tierId }
        );

        if (!roleMapping || !roleMapping.isActive) {
            return { success: false, reason: "no_role_mapping" };
        }

        // 4. Create sync log entry
        const logEntry: any = await ctx.runMutation(
            components.discord.functions.createSyncLogEntry,
            {
                tenantId: args.tenantId,
                userId: args.userId,
                discordUserId: connection.discordUserId,
                guildId: serverConfig.guildId,
                discordRoleId: roleMapping.discordRoleId,
                action: args.action,
                trigger: args.trigger,
                membershipId: args.membershipId,
                tierId: args.tierId,
            }
        );

        // 5. Call Discord API
        const discordEndpoint = args.action === "assign"
            ? `https://discord.com/api/v10/guilds/${encodeURIComponent(serverConfig.guildId)}/members/${encodeURIComponent(connection.discordUserId)}/roles/${encodeURIComponent(roleMapping.discordRoleId)}`
            : `https://discord.com/api/v10/guilds/${encodeURIComponent(serverConfig.guildId)}/members/${encodeURIComponent(connection.discordUserId)}/roles/${encodeURIComponent(roleMapping.discordRoleId)}`;

        const method = args.action === "assign" ? "PUT" : "DELETE";

        try {
            const response = await fetch(discordEndpoint, {
                method,
                headers: {
                    Authorization: `Bot ${serverConfig.botToken}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                // Update sync log with failure
                await ctx.runMutation(
                    components.discord.functions.updateSyncLogStatus,
                    {
                        id: logEntry.id as any,
                        status: "failed",
                        error: `Discord API ${response.status}: ${errorText}`,
                    }
                );
                return { success: false, reason: "discord_api_error", status: response.status };
            }

            // Update sync log with success
            await ctx.runMutation(
                components.discord.functions.updateSyncLogStatus,
                {
                    id: logEntry.id as any,
                    status: "success",
                }
            );

            // Emit event
            const eventTopic = args.action === "assign"
                ? "discord.role.assigned"
                : "discord.role.removed";

            await ctx.runMutation(internal.domain.discord.emitRoleEvent, {
                topic: eventTopic,
                tenantId: args.tenantId,
                userId: args.userId,
                discordUserId: connection.discordUserId,
                discordRoleId: roleMapping.discordRoleId,
                tierId: args.tierId,
                membershipId: args.membershipId,
            });

            return { success: true };
        } catch (err: any) {
            // Network / unexpected error
            await ctx.runMutation(
                components.discord.functions.updateSyncLogStatus,
                {
                    id: logEntry.id as any,
                    status: "failed",
                    error: err?.message ?? "Unknown error",
                }
            );
            return { success: false, reason: "network_error" };
        }
    },
});

// =============================================================================
// INTERNAL MUTATIONS (called by actions and event bus)
// =============================================================================

/**
 * Emit a role sync event to the outbox.
 */
export const emitRoleEvent = internalMutation({
    args: {
        topic: v.string(),
        tenantId: v.string(),
        userId: v.string(),
        discordUserId: v.string(),
        discordRoleId: v.string(),
        tierId: v.string(),
        membershipId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await emitEvent(ctx, args.topic, args.tenantId, "discord", {
            userId: args.userId,
            discordUserId: args.discordUserId,
            discordRoleId: args.discordRoleId,
            tierId: args.tierId,
            membershipId: args.membershipId,
        });
    },
});

/**
 * Handle a subscription event by syncing Discord roles.
 * Called by the event bus processEvents handler.
 */
export const handleSubscriptionEvent = internalMutation({
    args: {
        tenantId: v.string(),
        topic: v.string(),
        payload: v.any(),
    },
    handler: async (ctx, { tenantId, topic, payload }) => {
        const userId = payload.userId as string | undefined;
        const creatorId = payload.creatorId as string | undefined;
        const tierId = payload.tierId as string | undefined;
        const membershipId = payload.membershipId as string | undefined;

        if (!userId || !creatorId || !tierId) {
            return;
        }

        // Determine action based on event topic
        let roleAction: "assign" | "remove";
        if (
            topic === "subscriptions.membership.created" ||
            topic === "subscriptions.membership.upgraded"
        ) {
            roleAction = "assign";
        } else if (
            topic === "subscriptions.membership.cancelled" ||
            topic === "subscriptions.membership.expired"
        ) {
            roleAction = "remove";
        } else {
            return;
        }

        // Schedule the action to call Discord API
        await ctx.scheduler.runAfter(0, internal.domain.discord.syncRoleInternal, {
            tenantId,
            userId,
            creatorId,
            tierId,
            action: roleAction,
            trigger: topic,
            membershipId,
        });
    },
});

/**
 * Internal action wrapper for syncRole — called via scheduler from mutations.
 */
export const syncRoleInternal = internalAction({
    args: {
        tenantId: v.string(),
        userId: v.string(),
        creatorId: v.string(),
        tierId: v.string(),
        action: v.union(v.literal("assign"), v.literal("remove")),
        trigger: v.string(),
        membershipId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Delegate to the public syncRole action logic
        const connection: any = await ctx.runQuery(
            components.discord.functions.getConnection,
            { tenantId: args.tenantId, userId: args.userId }
        );

        if (!connection || !connection.isActive) {
            return { success: false, reason: "no_discord_connection" };
        }

        const serverConfig: any = await ctx.runQuery(
            components.discord.functions.getServerConfig,
            { tenantId: args.tenantId, creatorId: args.creatorId }
        );

        if (!serverConfig || !serverConfig.isEnabled) {
            return { success: false, reason: "discord_not_configured" };
        }

        const roleMapping: any = await ctx.runQuery(
            components.discord.functions.getRoleMappingByTier,
            { tenantId: args.tenantId, tierId: args.tierId }
        );

        if (!roleMapping || !roleMapping.isActive) {
            return { success: false, reason: "no_role_mapping" };
        }

        const logEntry: any = await ctx.runMutation(
            components.discord.functions.createSyncLogEntry,
            {
                tenantId: args.tenantId,
                userId: args.userId,
                discordUserId: connection.discordUserId,
                guildId: serverConfig.guildId,
                discordRoleId: roleMapping.discordRoleId,
                action: args.action,
                trigger: args.trigger,
                membershipId: args.membershipId,
                tierId: args.tierId,
            }
        );

        const discordEndpoint = `https://discord.com/api/v10/guilds/${encodeURIComponent(serverConfig.guildId)}/members/${encodeURIComponent(connection.discordUserId)}/roles/${encodeURIComponent(roleMapping.discordRoleId)}`;
        const method = args.action === "assign" ? "PUT" : "DELETE";

        try {
            const response = await fetch(discordEndpoint, {
                method,
                headers: {
                    Authorization: `Bot ${serverConfig.botToken}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                await ctx.runMutation(
                    components.discord.functions.updateSyncLogStatus,
                    {
                        id: logEntry.id as any,
                        status: "failed",
                        error: `Discord API ${response.status}: ${errorText}`,
                    }
                );
                return { success: false };
            }

            await ctx.runMutation(
                components.discord.functions.updateSyncLogStatus,
                {
                    id: logEntry.id as any,
                    status: "success",
                }
            );

            await ctx.runMutation(internal.domain.discord.emitRoleEvent, {
                topic: args.action === "assign" ? "discord.role.assigned" : "discord.role.removed",
                tenantId: args.tenantId,
                userId: args.userId,
                discordUserId: connection.discordUserId,
                discordRoleId: roleMapping.discordRoleId,
                tierId: args.tierId,
                membershipId: args.membershipId,
            });

            return { success: true };
        } catch (err: any) {
            await ctx.runMutation(
                components.discord.functions.updateSyncLogStatus,
                {
                    id: logEntry.id as any,
                    status: "failed",
                    error: err?.message ?? "Unknown error",
                }
            );
            return { success: false };
        }
    },
});
