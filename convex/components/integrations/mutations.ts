/**
 * Integrations Component — Mutation Functions
 *
 * Write operations for integration configs, webhooks, and sync logs.
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// CONFIG MUTATIONS
// =============================================================================

/**
 * Configure a new integration for a tenant.
 */
export const configure = mutation({
    args: {
        tenantId: v.string(),
        integrationType: v.string(),
        name: v.string(),
        config: v.any(),
        apiKey: v.optional(v.string()),
        secretKey: v.optional(v.string()),
        webhookSecret: v.optional(v.string()),
        environment: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        // Check for existing config of same type for tenant
        const existing = await ctx.db
            .query("integrationConfigs")
            .withIndex("by_type", (q) =>
                q.eq("tenantId", args.tenantId).eq("integrationType", args.integrationType)
            )
            .first();

        if (existing) {
            throw new Error(
                `Integration "${args.integrationType}" already configured for this tenant`
            );
        }

        const now = Date.now();
        const id = await ctx.db.insert("integrationConfigs", {
            tenantId: args.tenantId,
            integrationType: args.integrationType,
            name: args.name,
            isEnabled: true,
            config: args.config,
            apiKey: args.apiKey,
            secretKey: args.secretKey,
            webhookSecret: args.webhookSecret,
            environment: args.environment,
            metadata: args.metadata,
            createdAt: now,
            updatedAt: now,
        });

        return { id: id as string };
    },
});

/**
 * Update an existing integration config.
 */
export const updateConfig = mutation({
    args: {
        id: v.string(),
        name: v.optional(v.string()),
        config: v.optional(v.any()),
        apiKey: v.optional(v.string()),
        secretKey: v.optional(v.string()),
        webhookSecret: v.optional(v.string()),
        environment: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, ...updates }) => {
        const config = await ctx.db.get(id as any);
        if (!config) throw new Error("Integration config not found");

        const filteredUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );

        await ctx.db.patch(id as any, {
            ...filteredUpdates,
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});

/**
 * Disable an integration.
 */
export const disableIntegration = mutation({
    args: {
        id: v.string(),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        const config = await ctx.db.get(id as any);
        if (!config) throw new Error("Integration config not found");

        await ctx.db.patch(id as any, {
            isEnabled: false,
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});

/**
 * Enable an integration.
 */
export const enableIntegration = mutation({
    args: {
        id: v.string(),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        const config = await ctx.db.get(id as any);
        if (!config) throw new Error("Integration config not found");

        await ctx.db.patch(id as any, {
            isEnabled: true,
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});

/**
 * Remove an integration and its associated webhooks.
 */
export const removeIntegration = mutation({
    args: {
        id: v.string(),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        const config = await ctx.db.get(id as any);
        if (!config) throw new Error("Integration config not found");

        // Remove associated webhook registrations
        const webhooks = await ctx.db
            .query("webhookRegistrations")
            .withIndex("by_integration", (q) => q.eq("integrationId", id as any))
            .collect();

        for (const webhook of webhooks) {
            await ctx.db.delete(webhook._id);
        }

        // Remove the integration config itself
        await ctx.db.delete(id as any);

        return { success: true };
    },
});

/**
 * Test connection for an integration (updates last sync status).
 */
export const testConnection = mutation({
    args: {
        id: v.string(),
    },
    returns: v.object({ success: v.boolean(), status: v.string() }),
    handler: async (ctx, { id }) => {
        const config = await ctx.db.get(id as any);
        if (!config) throw new Error("Integration config not found");

        // Mark as tested — actual connection testing is done by the caller
        // through the integration-specific adapter layer
        const now = Date.now();
        await ctx.db.patch(id as any, {
            lastSyncAt: now,
            lastSyncStatus: "connection_tested",
            updatedAt: now,
        });

        return { success: true, status: "connection_tested" };
    },
});

// =============================================================================
// WEBHOOK MUTATIONS
// =============================================================================

/**
 * Register a new webhook for an integration.
 */
export const registerWebhook = mutation({
    args: {
        tenantId: v.string(),
        integrationId: v.id("integrationConfigs"),
        events: v.array(v.string()),
        callbackUrl: v.string(),
        secret: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        // Verify the integration exists
        const config = await ctx.db.get(args.integrationId);
        if (!config) throw new Error("Integration config not found");

        const now = Date.now();
        const id = await ctx.db.insert("webhookRegistrations", {
            tenantId: args.tenantId,
            integrationId: args.integrationId,
            events: args.events,
            callbackUrl: args.callbackUrl,
            secret: args.secret,
            isActive: true,
            failureCount: 0,
            metadata: args.metadata,
            createdAt: now,
        });

        return { id: id as string };
    },
});

/**
 * Update an existing webhook registration.
 */
export const updateWebhook = mutation({
    args: {
        id: v.id("webhookRegistrations"),
        events: v.optional(v.array(v.string())),
        callbackUrl: v.optional(v.string()),
        secret: v.optional(v.string()),
        isActive: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, ...updates }) => {
        const webhook = await ctx.db.get(id);
        if (!webhook) throw new Error("Webhook registration not found");

        const filteredUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );

        await ctx.db.patch(id, filteredUpdates);

        return { success: true };
    },
});

/**
 * Delete a webhook registration.
 */
export const deleteWebhook = mutation({
    args: {
        id: v.id("webhookRegistrations"),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        const webhook = await ctx.db.get(id);
        if (!webhook) throw new Error("Webhook registration not found");

        await ctx.db.delete(id);

        return { success: true };
    },
});

// =============================================================================
// SYNC LOG MUTATIONS
// =============================================================================

/**
 * Start a new sync operation and create a log entry.
 */
export const startSync = mutation({
    args: {
        tenantId: v.string(),
        integrationId: v.id("integrationConfigs"),
        syncType: v.string(),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        // Verify the integration exists and is enabled
        const config = await ctx.db.get(args.integrationId);
        if (!config) throw new Error("Integration config not found");
        if (!config.isEnabled) throw new Error("Integration is disabled");

        const now = Date.now();
        const id = await ctx.db.insert("syncLogs", {
            tenantId: args.tenantId,
            integrationId: args.integrationId,
            syncType: args.syncType,
            status: "started",
            startedAt: now,
        });

        // Update the integration's last sync timestamp
        await ctx.db.patch(args.integrationId, {
            lastSyncAt: now,
            lastSyncStatus: "started",
            updatedAt: now,
        });

        return { id: id as string };
    },
});

/**
 * Complete a sync log entry with results.
 */
export const completeSyncLog = mutation({
    args: {
        id: v.id("syncLogs"),
        status: v.string(),
        recordsProcessed: v.optional(v.number()),
        recordsFailed: v.optional(v.number()),
        error: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, status, recordsProcessed, recordsFailed, error, metadata }) => {
        const log = await ctx.db.get(id);
        if (!log) throw new Error("Sync log not found");
        if (log.status !== "started") {
            throw new Error(`Cannot complete sync log with status "${log.status}"`);
        }

        const now = Date.now();
        await ctx.db.patch(id, {
            status,
            recordsProcessed,
            recordsFailed,
            error,
            completedAt: now,
            metadata,
        });

        // Update the integration's last sync status
        await ctx.db.patch(log.integrationId, {
            lastSyncAt: now,
            lastSyncStatus: status,
            updatedAt: now,
        });

        return { success: true };
    },
});
