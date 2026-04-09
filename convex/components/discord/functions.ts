/**
 * Discord Component Functions
 *
 * Pure component implementation — operates only on its own tables.
 * Uses v.string() for all external references (tenantId, userId, etc.).
 * Discord API calls happen in the facade layer (actions).
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// CONNECTION QUERIES
// =============================================================================

/**
 * Get a user's Discord connection for a tenant.
 */
export const getConnection = query({
    args: {
        tenantId: v.string(),
        userId: v.string(),
    },
    returns: v.any(),
    handler: async (ctx, { tenantId, userId }) => {
        return ctx.db
            .query("discordConnections")
            .withIndex("by_tenant_and_user", (q) =>
                q.eq("tenantId", tenantId).eq("userId", userId)
            )
            .first();
    },
});

/**
 * Get a Discord connection by Discord user ID.
 */
export const getConnectionByDiscordId = query({
    args: {
        discordUserId: v.string(),
    },
    returns: v.any(),
    handler: async (ctx, { discordUserId }) => {
        return ctx.db
            .query("discordConnections")
            .withIndex("by_discord_user", (q) => q.eq("discordUserId", discordUserId))
            .first();
    },
});

/**
 * List all Discord connections for a tenant.
 */
export const listConnections = query({
    args: {
        tenantId: v.string(),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, limit }) => {
        const connections = await ctx.db
            .query("discordConnections")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .take(limit ?? 100);

        return connections;
    },
});

// =============================================================================
// CONNECTION MUTATIONS
// =============================================================================

/**
 * Create or update a Discord OAuth connection for a user.
 */
export const upsertConnection = mutation({
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
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("discordConnections")
            .withIndex("by_tenant_and_user", (q) =>
                q.eq("tenantId", args.tenantId).eq("userId", args.userId)
            )
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                discordUserId: args.discordUserId,
                discordUsername: args.discordUsername,
                accessToken: args.accessToken,
                refreshToken: args.refreshToken,
                tokenExpiresAt: args.tokenExpiresAt,
                scopes: args.scopes,
                isActive: true,
                lastRefreshedAt: Date.now(),
            });
            return { id: existing._id as string };
        }

        const id = await ctx.db.insert("discordConnections", {
            tenantId: args.tenantId,
            userId: args.userId,
            discordUserId: args.discordUserId,
            discordUsername: args.discordUsername,
            accessToken: args.accessToken,
            refreshToken: args.refreshToken,
            tokenExpiresAt: args.tokenExpiresAt,
            scopes: args.scopes,
            isActive: true,
            connectedAt: Date.now(),
        });

        return { id: id as string };
    },
});

/**
 * Disconnect (deactivate) a user's Discord connection.
 */
export const disconnectUser = mutation({
    args: {
        tenantId: v.string(),
        userId: v.string(),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { tenantId, userId }) => {
        const connection = await ctx.db
            .query("discordConnections")
            .withIndex("by_tenant_and_user", (q) =>
                q.eq("tenantId", tenantId).eq("userId", userId)
            )
            .first();

        if (!connection) {
            throw new Error("No Discord connection found for this user");
        }

        await ctx.db.patch(connection._id, { isActive: false });
        return { success: true };
    },
});

// =============================================================================
// SERVER CONFIG QUERIES
// =============================================================================

/**
 * Get a creator's Discord server configuration.
 */
export const getServerConfig = query({
    args: {
        tenantId: v.string(),
        creatorId: v.string(),
    },
    returns: v.any(),
    handler: async (ctx, { tenantId, creatorId }) => {
        return ctx.db
            .query("discordServerConfigs")
            .withIndex("by_tenant_and_creator", (q) =>
                q.eq("tenantId", tenantId).eq("creatorId", creatorId)
            )
            .first();
    },
});

// =============================================================================
// SERVER CONFIG MUTATIONS
// =============================================================================

/**
 * Create or update a creator's Discord server configuration.
 */
export const upsertServerConfig = mutation({
    args: {
        tenantId: v.string(),
        creatorId: v.string(),
        guildId: v.string(),
        guildName: v.optional(v.string()),
        botToken: v.string(),
        clientId: v.string(),
        clientSecret: v.string(),
        isEnabled: v.optional(v.boolean()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const now = Date.now();
        const existing = await ctx.db
            .query("discordServerConfigs")
            .withIndex("by_tenant_and_creator", (q) =>
                q.eq("tenantId", args.tenantId).eq("creatorId", args.creatorId)
            )
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                guildId: args.guildId,
                guildName: args.guildName,
                botToken: args.botToken,
                clientId: args.clientId,
                clientSecret: args.clientSecret,
                isEnabled: args.isEnabled ?? existing.isEnabled,
                updatedAt: now,
            });
            return { id: existing._id as string };
        }

        const id = await ctx.db.insert("discordServerConfigs", {
            tenantId: args.tenantId,
            creatorId: args.creatorId,
            guildId: args.guildId,
            guildName: args.guildName,
            botToken: args.botToken,
            clientId: args.clientId,
            clientSecret: args.clientSecret,
            isEnabled: args.isEnabled ?? true,
            createdAt: now,
            updatedAt: now,
        });

        return { id: id as string };
    },
});

/**
 * Toggle a creator's Discord integration on/off.
 */
export const toggleServerConfig = mutation({
    args: {
        tenantId: v.string(),
        creatorId: v.string(),
        isEnabled: v.boolean(),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { tenantId, creatorId, isEnabled }) => {
        const config = await ctx.db
            .query("discordServerConfigs")
            .withIndex("by_tenant_and_creator", (q) =>
                q.eq("tenantId", tenantId).eq("creatorId", creatorId)
            )
            .first();

        if (!config) {
            throw new Error("No Discord server configuration found");
        }

        await ctx.db.patch(config._id, { isEnabled, updatedAt: Date.now() });
        return { success: true };
    },
});

// =============================================================================
// ROLE MAPPING QUERIES
// =============================================================================

/**
 * List role mappings for a creator.
 */
export const listRoleMappings = query({
    args: {
        tenantId: v.string(),
        creatorId: v.string(),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, creatorId }) => {
        return ctx.db
            .query("discordRoleMappings")
            .withIndex("by_tenant_and_creator", (q) =>
                q.eq("tenantId", tenantId).eq("creatorId", creatorId)
            )
            .collect();
    },
});

/**
 * Get role mapping for a specific tier.
 */
export const getRoleMappingByTier = query({
    args: {
        tenantId: v.string(),
        tierId: v.string(),
    },
    returns: v.any(),
    handler: async (ctx, { tenantId, tierId }) => {
        return ctx.db
            .query("discordRoleMappings")
            .withIndex("by_tier", (q) =>
                q.eq("tenantId", tenantId).eq("tierId", tierId)
            )
            .first();
    },
});

// =============================================================================
// ROLE MAPPING MUTATIONS
// =============================================================================

/**
 * Create or update a role mapping for a subscription tier.
 */
export const upsertRoleMapping = mutation({
    args: {
        tenantId: v.string(),
        creatorId: v.string(),
        tierId: v.string(),
        discordRoleId: v.string(),
        discordRoleName: v.optional(v.string()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const now = Date.now();

        // Check for existing mapping for this tier
        const existing = await ctx.db
            .query("discordRoleMappings")
            .withIndex("by_tier", (q) =>
                q.eq("tenantId", args.tenantId).eq("tierId", args.tierId)
            )
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                discordRoleId: args.discordRoleId,
                discordRoleName: args.discordRoleName,
                isActive: true,
                updatedAt: now,
            });
            return { id: existing._id as string };
        }

        const id = await ctx.db.insert("discordRoleMappings", {
            tenantId: args.tenantId,
            creatorId: args.creatorId,
            tierId: args.tierId,
            discordRoleId: args.discordRoleId,
            discordRoleName: args.discordRoleName,
            isActive: true,
            createdAt: now,
            updatedAt: now,
        });

        return { id: id as string };
    },
});

/**
 * Remove (deactivate) a role mapping.
 */
export const removeRoleMapping = mutation({
    args: {
        tenantId: v.string(),
        tierId: v.string(),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { tenantId, tierId }) => {
        const mapping = await ctx.db
            .query("discordRoleMappings")
            .withIndex("by_tier", (q) =>
                q.eq("tenantId", tenantId).eq("tierId", tierId)
            )
            .first();

        if (!mapping) {
            throw new Error("No role mapping found for this tier");
        }

        await ctx.db.patch(mapping._id, { isActive: false, updatedAt: Date.now() });
        return { success: true };
    },
});

// =============================================================================
// SYNC LOG QUERIES
// =============================================================================

/**
 * List role sync log entries for a user.
 */
export const listSyncLog = query({
    args: {
        tenantId: v.string(),
        userId: v.string(),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, userId, limit }) => {
        const entries = await ctx.db
            .query("discordRoleSyncLog")
            .withIndex("by_user", (q) =>
                q.eq("tenantId", tenantId).eq("userId", userId)
            )
            .order("desc")
            .take(limit ?? 50);

        return entries;
    },
});

/**
 * List pending sync log entries (for retry processing).
 */
export const listPendingSyncs = query({
    args: {
        limit: v.optional(v.number()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { limit }) => {
        return ctx.db
            .query("discordRoleSyncLog")
            .withIndex("by_status", (q) => q.eq("status", "pending"))
            .take(limit ?? 50);
    },
});

// =============================================================================
// SYNC LOG MUTATIONS
// =============================================================================

/**
 * Create a sync log entry.
 */
export const createSyncLogEntry = mutation({
    args: {
        tenantId: v.string(),
        userId: v.string(),
        discordUserId: v.string(),
        guildId: v.string(),
        discordRoleId: v.string(),
        action: v.union(v.literal("assign"), v.literal("remove")),
        trigger: v.string(),
        membershipId: v.optional(v.string()),
        tierId: v.optional(v.string()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("discordRoleSyncLog", {
            tenantId: args.tenantId,
            userId: args.userId,
            discordUserId: args.discordUserId,
            guildId: args.guildId,
            discordRoleId: args.discordRoleId,
            action: args.action,
            trigger: args.trigger,
            status: "pending",
            membershipId: args.membershipId,
            tierId: args.tierId,
            attemptedAt: Date.now(),
        });

        return { id: id as string };
    },
});

/**
 * Update a sync log entry status after Discord API call.
 */
export const updateSyncLogStatus = mutation({
    args: {
        id: v.id("discordRoleSyncLog"),
        status: v.union(v.literal("success"), v.literal("failed")),
        error: v.optional(v.string()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, status, error }) => {
        const entry = await ctx.db.get(id);
        if (!entry) {
            throw new Error("Sync log entry not found");
        }

        await ctx.db.patch(id, {
            status,
            error,
            completedAt: Date.now(),
        });

        return { success: true };
    },
});
