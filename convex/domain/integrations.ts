/**
 * Integrations Facade
 *
 * Thin facade that delegates to the integrations component.
 * Preserves api.domain.integrations.* for SDK compatibility.
 */

import { action, mutation, query } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";
import { withAudit } from "../lib/auditHelpers";
import { rateLimit, rateLimitKeys } from "../lib/rateLimits";
import { emitEvent } from "../lib/eventBus";

// =============================================================================
// QUERY FACADES
// =============================================================================

export const listConfigs = query({
    args: {
        tenantId: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        return ctx.runQuery(components.integrations.queries.listConfigs, args);
    },
});

export const getConfig = query({
    args: {
        tenantId: v.string(),
        integrationType: v.string(),
    },
    handler: async (ctx, args) => {
        return ctx.runQuery(components.integrations.queries.getConfig, args);
    },
});

export const getById = query({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        return ctx.runQuery(components.integrations.queries.getById, { id });
    },
});

// =============================================================================
// MUTATION FACADES
// =============================================================================

export const createConfig = mutation({
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
    handler: async (ctx, args) => {
        await rateLimit(ctx, { name: "mutateIntegration", key: rateLimitKeys.tenant(args.tenantId), throws: true });
        const result = await ctx.runMutation(components.integrations.mutations.configure, args);

        await withAudit(ctx, {
            tenantId: args.tenantId,
            entityType: "integration",
            entityId: (result as any).id ?? "",
            action: "created",
            sourceComponent: "integrations",
            newState: { integrationType: args.integrationType, name: args.name },
        });

        await emitEvent(ctx, "integrations.config.created", args.tenantId, "integrations", {
            integrationId: (result as any).id ?? "", integrationType: args.integrationType,
        });

        return result;
    },
});

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
    handler: async (ctx, args) => {
        const existing = await ctx.runQuery(components.integrations.queries.getById, { id: args.id });
        if (existing) {
            await rateLimit(ctx, { name: "mutateIntegration", key: rateLimitKeys.tenant((existing as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.integrations.mutations.updateConfig, args as any);

        await withAudit(ctx, {
            tenantId: (existing as any)?.tenantId ?? (result as any)?.tenantId ?? "",
            entityType: "integration",
            entityId: args.id,
            action: "updated",
            sourceComponent: "integrations",
        });

        await emitEvent(ctx, "integrations.config.updated", (existing as any)?.tenantId ?? (result as any)?.tenantId ?? "", "integrations", {
            integrationId: args.id,
        });

        return result;
    },
});

export const removeIntegration = mutation({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        const existing = await ctx.runQuery(components.integrations.queries.getById, { id });
        if (existing) {
            await rateLimit(ctx, { name: "mutateIntegration", key: rateLimitKeys.tenant((existing as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.integrations.mutations.removeIntegration, { id } as any);

        await withAudit(ctx, {
            tenantId: (result as any)?.tenantId ?? "",
            entityType: "integration",
            entityId: id,
            action: "removed",
            sourceComponent: "integrations",
        });

        await emitEvent(ctx, "integrations.integration.removed", (existing as any)?.tenantId ?? (result as any)?.tenantId ?? "", "integrations", {
            integrationId: id,
        });

        return result;
    },
});

export const enableIntegration = mutation({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        const existing = await ctx.runQuery(components.integrations.queries.getById, { id });
        if (existing) {
            await rateLimit(ctx, { name: "mutateIntegration", key: rateLimitKeys.tenant((existing as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.integrations.mutations.enableIntegration, { id } as any);

        await withAudit(ctx, {
            tenantId: (result as any)?.tenantId ?? "",
            entityType: "integration",
            entityId: id,
            action: "enabled",
            sourceComponent: "integrations",
        });

        await emitEvent(ctx, "integrations.integration.enabled", (existing as any)?.tenantId ?? (result as any)?.tenantId ?? "", "integrations", {
            integrationId: id,
        });

        return result;
    },
});

export const disableIntegration = mutation({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        const existing = await ctx.runQuery(components.integrations.queries.getById, { id });
        if (existing) {
            await rateLimit(ctx, { name: "mutateIntegration", key: rateLimitKeys.tenant((existing as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.integrations.mutations.disableIntegration, { id } as any);

        await withAudit(ctx, {
            tenantId: (result as any)?.tenantId ?? "",
            entityType: "integration",
            entityId: id,
            action: "disabled",
            sourceComponent: "integrations",
        });

        await emitEvent(ctx, "integrations.integration.disabled", (existing as any)?.tenantId ?? (result as any)?.tenantId ?? "", "integrations", {
            integrationId: id,
        });

        return result;
    },
});

export const testConnection = mutation({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        const existing = await ctx.runQuery(components.integrations.queries.getById, { id });
        if (existing) {
            await rateLimit(ctx, { name: "mutateIntegration", key: rateLimitKeys.tenant((existing as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.integrations.mutations.testConnection, { id } as any);
        await withAudit(ctx, {
            tenantId: (result as any)?.tenantId ?? "",
            entityType: "integration",
            entityId: id,
            action: "connection_tested",
            sourceComponent: "integrations",
            newState: { success: (result as any)?.success },
        });

        await emitEvent(ctx, "integrations.connection.tested", (existing as any)?.tenantId ?? (result as any)?.tenantId ?? "", "integrations", {
            integrationId: id, success: (result as any)?.success,
        });

        return result;
    },
});

// =============================================================================
// RCO LOCK ACCESS FACADES
// =============================================================================

/** Get RCO connection status by checking if an "rco" integration config exists. */
export const getRcoStatus = query({
    args: { tenantId: v.string() },
    handler: async (ctx, { tenantId }) => {
        const config = await ctx.runQuery(components.integrations.queries.getConfig, {
            tenantId,
            integrationType: "rco",
        });
        if (!config) return { connected: false, lastSyncAt: null };
        return {
            connected: (config as any).isEnabled === true,
            lastSyncAt: (config as any).lastSyncAt
                ? new Date((config as any).lastSyncAt).toISOString()
                : null,
        };
    },
});

/** Get connected RCO locks from config metadata. */
export const getRcoLocks = query({
    args: { tenantId: v.string() },
    handler: async (ctx, { tenantId }) => {
        const config = await ctx.runQuery(components.integrations.queries.getConfig, {
            tenantId,
            integrationType: "rco",
        });
        if (!config) return [];
        const meta = (config as any).metadata as Record<string, unknown> | undefined;
        return (meta?.locks as unknown[]) ?? [];
    },
});

/** Generate an access code for an RCO lock. TODO: call real RCO API. */
export const generateAccessCode = mutation({
    args: {
        tenantId: v.string(),
        lockId: v.string(),
        validFrom: v.string(),
        validUntil: v.string(),
    },
    handler: async (ctx, args) => {
        await rateLimit(ctx, { name: "mutateIntegration", key: rateLimitKeys.tenant(args.tenantId), throws: true });

        // Generate a 6-digit code (placeholder — real implementation calls RCO API)
        const code = String(Math.floor(100000 + Math.random() * 900000));

        await withAudit(ctx, {
            tenantId: args.tenantId,
            entityType: "rco_access_code",
            entityId: args.lockId,
            action: "generated",
            sourceComponent: "integrations",
            newState: { lockId: args.lockId, validFrom: args.validFrom, validUntil: args.validUntil },
        });

        return { code, expiresAt: args.validUntil };
    },
});

/** Remotely unlock an RCO lock. TODO: call real RCO API. */
export const remoteUnlock = mutation({
    args: {
        tenantId: v.string(),
        lockId: v.string(),
        duration: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        await rateLimit(ctx, { name: "mutateIntegration", key: rateLimitKeys.tenant(args.tenantId), throws: true });

        await withAudit(ctx, {
            tenantId: args.tenantId,
            entityType: "rco_lock",
            entityId: args.lockId,
            action: "remote_unlock",
            sourceComponent: "integrations",
            newState: { lockId: args.lockId, duration: args.duration },
        });

        // Placeholder — real implementation calls RCO API
        return { success: true };
    },
});

// =============================================================================
// VISMA ACCOUNTING FACADES
// =============================================================================

/** Get Visma connection status. */
export const getVismaStatus = query({
    args: { tenantId: v.string() },
    handler: async (ctx, { tenantId }) => {
        const config = await ctx.runQuery(components.integrations.queries.getConfig, {
            tenantId,
            integrationType: "visma",
        });
        if (!config) return { connected: false, lastSyncAt: null };
        return {
            connected: (config as any).isEnabled === true,
            lastSyncAt: (config as any).lastSyncAt
                ? new Date((config as any).lastSyncAt).toISOString()
                : null,
        };
    },
});

/** Get Visma invoices. TODO: real Visma API integration. */
export const getVismaInvoices = query({
    args: { tenantId: v.string() },
    handler: async (_ctx, _args) => {
        // Placeholder — real implementation fetches from Visma API
        return [];
    },
});

/** Create a Visma invoice. TODO: real Visma API integration. */
export const createVismaInvoice = mutation({
    args: {
        tenantId: v.string(),
        bookingId: v.string(),
        amount: v.number(),
        dueDate: v.string(),
    },
    handler: async (ctx, args) => {
        await rateLimit(ctx, { name: "mutateIntegration", key: rateLimitKeys.tenant(args.tenantId), throws: true });

        await withAudit(ctx, {
            tenantId: args.tenantId,
            entityType: "visma_invoice",
            entityId: args.bookingId,
            action: "created",
            sourceComponent: "integrations",
            newState: { bookingId: args.bookingId, amount: args.amount, dueDate: args.dueDate },
        });

        // Placeholder — real implementation calls Visma API
        return { invoiceId: `visma-${Date.now()}` };
    },
});

/** Sync data to Visma. TODO: real Visma API integration. */
export const syncToVisma = mutation({
    args: { tenantId: v.string() },
    handler: async (ctx, { tenantId }) => {
        await rateLimit(ctx, { name: "mutateIntegration", key: rateLimitKeys.tenant(tenantId), throws: true });

        await withAudit(ctx, {
            tenantId,
            entityType: "visma_sync",
            entityId: tenantId,
            action: "sync_triggered",
            sourceComponent: "integrations",
        });

        await emitEvent(ctx, "integrations.visma.synced", tenantId, "integrations", {});

        // Placeholder — real implementation calls Visma API
        return { success: true, syncedCount: 0 };
    },
});

// =============================================================================
// BRREG / NIF LOOKUP FACADES (Actions for HTTP calls)
// =============================================================================

/** Look up an organization in BRREG (Norwegian Business Registry). */
export const brregLookup = action({
    args: { orgNumber: v.string() },
    handler: async (_ctx, { orgNumber }) => {
        const sanitized = orgNumber.replace(/\s/g, "");
        const response = await fetch(
            `https://data.brreg.no/enhetsregisteret/api/enheter/${sanitized}`
        );
        if (!response.ok) {
            return null;
        }
        const data = await response.json();
        return {
            organisasjonsnummer: data.organisasjonsnummer,
            navn: data.navn,
            organisasjonsform: data.organisasjonsform?.kode ?? "",
            registreringsdatoEnhetsregisteret: data.registreringsdatoEnhetsregisteret,
            forretningsadresse: data.forretningsadresse
                ? {
                    adresse: data.forretningsadresse.adresse ?? [],
                    postnummer: data.forretningsadresse.postnummer ?? "",
                    poststed: data.forretningsadresse.poststed ?? "",
                }
                : undefined,
        };
    },
});

/** Verify an organization number against BRREG. */
export const verifyBrreg = action({
    args: { orgNumber: v.string() },
    handler: async (_ctx, { orgNumber }) => {
        const sanitized = orgNumber.replace(/\s/g, "");
        const response = await fetch(
            `https://data.brreg.no/enhetsregisteret/api/enheter/${sanitized}`
        );
        if (!response.ok) {
            return { valid: false, details: null };
        }
        const data = await response.json();
        return {
            valid: true,
            details: {
                organisasjonsnummer: data.organisasjonsnummer,
                navn: data.navn,
                organisasjonsform: data.organisasjonsform?.kode ?? "",
                registreringsdatoEnhetsregisteret: data.registreringsdatoEnhetsregisteret,
                forretningsadresse: data.forretningsadresse
                    ? {
                        adresse: data.forretningsadresse.adresse ?? [],
                        postnummer: data.forretningsadresse.postnummer ?? "",
                        poststed: data.forretningsadresse.poststed ?? "",
                    }
                    : undefined,
            },
        };
    },
});

/** Look up a sports organization in NIF. TODO: real NIF API integration. */
export const nifLookup = query({
    args: { orgNumber: v.string() },
    handler: async (_ctx, _args) => {
        // Placeholder — NIF does not have a public REST API yet
        return null;
    },
});

// =============================================================================
// CALENDAR SYNC FACADES
// =============================================================================

/** Get calendar sync status by checking google-calendar/outlook configs. */
export const getCalendarSyncStatus = query({
    args: { tenantId: v.string() },
    handler: async (ctx, { tenantId }) => {
        const googleConfig = await ctx.runQuery(components.integrations.queries.getConfig, {
            tenantId,
            integrationType: "google_calendar",
        });
        if (googleConfig && (googleConfig as any).isEnabled) {
            return {
                connected: true,
                provider: "google" as const,
                lastSyncAt: (googleConfig as any).lastSyncAt
                    ? new Date((googleConfig as any).lastSyncAt).toISOString()
                    : null,
            };
        }

        const outlookConfig = await ctx.runQuery(components.integrations.queries.getConfig, {
            tenantId,
            integrationType: "outlook_calendar",
        });
        if (outlookConfig && (outlookConfig as any).isEnabled) {
            return {
                connected: true,
                provider: "outlook" as const,
                lastSyncAt: (outlookConfig as any).lastSyncAt
                    ? new Date((outlookConfig as any).lastSyncAt).toISOString()
                    : null,
            };
        }

        return { connected: false, provider: null, lastSyncAt: null };
    },
});

/** Trigger calendar sync. TODO: real Calendar API integration. */
export const syncCalendar = mutation({
    args: { tenantId: v.string() },
    handler: async (ctx, { tenantId }) => {
        await rateLimit(ctx, { name: "mutateIntegration", key: rateLimitKeys.tenant(tenantId), throws: true });

        await withAudit(ctx, {
            tenantId,
            entityType: "calendar_sync",
            entityId: tenantId,
            action: "sync_triggered",
            sourceComponent: "integrations",
        });

        // Placeholder — real implementation calls Google/Outlook Calendar API
        return { success: true, syncedEvents: 0 };
    },
});
