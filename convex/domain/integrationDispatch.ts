/**
 * Integration Dispatch Facade — Outbound Webhooks, WordPress CMS, Make.com
 *
 * Thin domain facade that dispatches events to external systems:
 *   - Generic webhook dispatch (POST to registered callbackUrls with HMAC)
 *   - WordPress REST API sync (create/update/delete events)
 *   - Make.com webhook triggers
 *
 * All actions use the integrations component for config and sync logging.
 * Actions are used because they perform external HTTP calls.
 */

import { action, query } from "../_generated/server";
import { components } from "../_generated/api";
import { v, ConvexError } from "convex/values";
import { internal } from "../_generated/api";

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Compute HMAC-SHA256 signature for webhook payload verification.
 * Uses the Web Crypto API (available in Convex edge runtime).
 */
async function computeHmacSignature(secret: string, payload: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    return Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * POST JSON to a URL with optional HMAC signature header.
 * Returns { success, statusCode, error? }.
 */
async function postWithSignature(
    url: string,
    body: Record<string, unknown>,
    secret?: string,
    timeoutMs = 15000
): Promise<{ success: boolean; statusCode: number; error?: string }> {
    const payload = JSON.stringify(body);
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "DigilistSaaS-Webhook/1.0",
    };

    if (secret) {
        const signature = await computeHmacSignature(secret, payload);
        headers["X-Webhook-Signature"] = `sha256=${signature}`;
    }

    try {
        const response = await fetch(url, {
            method: "POST",
            headers,
            body: payload,
            signal: AbortSignal.timeout(timeoutMs),
        });

        if (!response.ok) {
            const text = await response.text();
            return {
                success: false,
                statusCode: response.status,
                error: text.slice(0, 500),
            };
        }

        return { success: true, statusCode: response.status };
    } catch (err) {
        return {
            success: false,
            statusCode: 0,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}

// =============================================================================
// QUERY FACADES
// =============================================================================

/**
 * List webhook registrations for a tenant (via integrations component).
 */
export const listWebhooks = query({
    args: {
        tenantId: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, limit }) => {
        return ctx.runQuery(
            components.integrations.queries.listWebhooks,
            { tenantId, limit }
        );
    },
});

// =============================================================================
// GENERIC WEBHOOK DISPATCH
// =============================================================================

/**
 * Dispatch webhooks for a given topic + payload.
 *
 * Finds all active webhook registrations for this tenant whose `events` array
 * includes the given topic, then POSTs the payload to each callbackUrl with
 * HMAC-SHA256 signature (if the webhook has a secret configured).
 *
 * Results are logged and returned.
 */
export const dispatchWebhooks = action({
    args: {
        tenantId: v.string(),
        topic: v.string(),
        payload: v.any(),
    },
    handler: async (ctx, { tenantId, topic, payload }) => {
        // Fetch all active webhook registrations for this tenant
        const webhooks = await ctx.runQuery(
            components.integrations.queries.listWebhooks,
            { tenantId }
        ) as any[];

        // Filter to active webhooks that subscribe to this topic
        const matching = (webhooks ?? []).filter(
            (wh: any) =>
                wh.isActive &&
                Array.isArray(wh.events) &&
                (wh.events.includes(topic) || wh.events.includes("*"))
        );

        if (matching.length === 0) {
            return { dispatched: 0, results: [] };
        }

        const results: Array<{
            webhookId: string;
            callbackUrl: string;
            success: boolean;
            statusCode: number;
            error?: string;
        }> = [];

        const webhookPayload = {
            topic,
            tenantId,
            timestamp: new Date().toISOString(),
            data: payload,
        };

        for (const wh of matching) {
            const result = await postWithSignature(
                wh.callbackUrl,
                webhookPayload,
                wh.secret
            );

            results.push({
                webhookId: wh._id as string,
                callbackUrl: wh.callbackUrl,
                ...result,
            });
        }

        // Emit event for observability
        try {
            await ctx.runMutation(internal.lib.eventBus.emit, {
                topic: "integrations.webhook.dispatched",
                tenantId,
                sourceComponent: "integrations",
                payload: {
                    topic,
                    dispatched: results.length,
                    succeeded: results.filter((r) => r.success).length,
                    failed: results.filter((r) => !r.success).length,
                },
            });
        } catch {
            // Best-effort — don't fail the dispatch if event emission fails
        }

        return {
            dispatched: results.length,
            results,
        };
    },
});

// =============================================================================
// WORDPRESS CMS SYNC
// =============================================================================

/**
 * Push event data to a WordPress REST API endpoint.
 *
 * Reads the "wordpress_cms" integration config for the tenant to get:
 *   - config.baseUrl (e.g. "https://kulturhuset.no")
 *   - apiKey (WordPress Application Password or JWT)
 *
 * Maps resource data to the WordPress custom endpoint:
 *   POST   {baseUrl}/wp-json/xala/v1/events       (create)
 *   PUT    {baseUrl}/wp-json/xala/v1/events/{id}   (update)
 *   DELETE {baseUrl}/wp-json/xala/v1/events/{id}   (delete)
 */
export const syncToWordPress = action({
    args: {
        tenantId: v.string(),
        resourceId: v.string(),
        action: v.union(v.literal("create"), v.literal("update"), v.literal("delete")),
    },
    handler: async (ctx, { tenantId, resourceId, action: wpAction }) => {
        // Get WordPress integration config (unmasked)
        const config = await ctx.runQuery(
            components.integrations.queries.getConfigInternal,
            { tenantId, integrationType: "wordpress_cms" }
        ) as any;

        if (!config || !config.isEnabled) {
            throw new ConvexError({
                type: "about:blank",
                title: "WordPress not configured",
                status: 404,
                detail: "No active WordPress CMS integration found for this tenant.",
            });
        }

        const wpBaseUrl = config.config?.baseUrl as string | undefined;
        const apiKey = config.apiKey as string | undefined;
        if (!wpBaseUrl) {
            throw new ConvexError({
                type: "about:blank",
                title: "WordPress misconfigured",
                status: 400,
                detail: "WordPress config is missing baseUrl.",
            });
        }

        // Fetch the resource data for create/update
        let resourceData: Record<string, unknown> | null = null;
        if (wpAction !== "delete") {
            try {
                resourceData = await ctx.runQuery(
                    components.resources.queries.get,
                    { id: resourceId }
                ) as any;
            } catch {
                throw new ConvexError({
                    type: "about:blank",
                    title: "Resource not found",
                    status: 404,
                    detail: `Resource ${resourceId} not found.`,
                });
            }
        }

        // Build the WordPress API URL
        const endpoint = `${wpBaseUrl.replace(/\/$/, "")}/wp-json/xala/v1/events`;
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "User-Agent": "DigilistSaaS-WordPress/1.0",
        };

        if (apiKey) {
            headers["Authorization"] = `Basic ${btoa(`xala:${apiKey}`)}`;
        }

        let response: Response;

        try {
            if (wpAction === "create") {
                response = await fetch(endpoint, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        externalId: resourceId,
                        ...resourceData,
                    }),
                    signal: AbortSignal.timeout(15000),
                });
            } else if (wpAction === "update") {
                response = await fetch(`${endpoint}/${encodeURIComponent(resourceId)}`, {
                    method: "PUT",
                    headers,
                    body: JSON.stringify({
                        externalId: resourceId,
                        ...resourceData,
                    }),
                    signal: AbortSignal.timeout(15000),
                });
            } else {
                // delete
                response = await fetch(`${endpoint}/${encodeURIComponent(resourceId)}`, {
                    method: "DELETE",
                    headers,
                    signal: AbortSignal.timeout(15000),
                });
            }

            if (!response.ok) {
                const text = await response.text();
                throw new ConvexError({
                    type: "about:blank",
                    title: "WordPress sync failed",
                    status: response.status,
                    detail: `WordPress returned ${response.status}: ${text.slice(0, 500)}`,
                });
            }

            const result = await response.json().catch(() => ({}));

            // Emit event for observability
            try {
                await ctx.runMutation(internal.lib.eventBus.emit, {
                    topic: "integrations.wordpress.synced",
                    tenantId,
                    sourceComponent: "integrations",
                    payload: { resourceId, action: wpAction, wpPostId: (result as any).id },
                });
            } catch {
                // Best-effort
            }

            return {
                success: true,
                action: wpAction,
                resourceId,
                wpPostId: (result as any).id ?? null,
            };
        } catch (err) {
            if (err instanceof ConvexError) throw err;
            throw new ConvexError({
                type: "about:blank",
                title: "WordPress sync error",
                status: 502,
                detail: err instanceof Error ? err.message : String(err),
            });
        }
    },
});

// =============================================================================
// MAKE.COM DISPATCH
// =============================================================================

/**
 * Send an event payload to a Make.com (formerly Integromat) webhook URL.
 *
 * Reads the "make_crm" integration config for the tenant to get the
 * configured webhook URL from config.webhookUrl.
 */
export const dispatchToMake = action({
    args: {
        tenantId: v.string(),
        topic: v.string(),
        payload: v.any(),
    },
    handler: async (ctx, { tenantId, topic, payload }) => {
        // Get Make.com integration config (unmasked)
        const config = await ctx.runQuery(
            components.integrations.queries.getConfigInternal,
            { tenantId, integrationType: "make_crm" }
        ) as any;

        if (!config || !config.isEnabled) {
            throw new ConvexError({
                type: "about:blank",
                title: "Make.com not configured",
                status: 404,
                detail: "No active Make.com integration found for this tenant.",
            });
        }

        const webhookUrl = config.config?.webhookUrl as string | undefined;
        if (!webhookUrl) {
            throw new ConvexError({
                type: "about:blank",
                title: "Make.com misconfigured",
                status: 400,
                detail: "Make.com config is missing webhookUrl.",
            });
        }

        const makePayload = {
            topic,
            tenantId,
            timestamp: new Date().toISOString(),
            data: payload,
        };

        try {
            const response = await fetch(webhookUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "DigilistSaaS-Make/1.0",
                },
                body: JSON.stringify(makePayload),
                signal: AbortSignal.timeout(15000),
            });

            if (!response.ok) {
                const text = await response.text();
                throw new ConvexError({
                    type: "about:blank",
                    title: "Make.com dispatch failed",
                    status: response.status,
                    detail: `Make.com returned ${response.status}: ${text.slice(0, 500)}`,
                });
            }

            // Emit event for observability
            try {
                await ctx.runMutation(internal.lib.eventBus.emit, {
                    topic: "integrations.make.dispatched",
                    tenantId,
                    sourceComponent: "integrations",
                    payload: { topic, webhookUrl },
                });
            } catch {
                // Best-effort
            }

            return {
                success: true,
                topic,
                webhookUrl,
            };
        } catch (err) {
            if (err instanceof ConvexError) throw err;
            throw new ConvexError({
                type: "about:blank",
                title: "Make.com dispatch error",
                status: 502,
                detail: err instanceof Error ? err.message : String(err),
            });
        }
    },
});
