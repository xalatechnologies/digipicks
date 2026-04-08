import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "../schema";
import { modules } from "../testSetup.test-util";
import { api } from "../_generated/api";

const TENANT = "tenant-integrations-test";

// =============================================================================
// CONFIG MUTATIONS
// =============================================================================

describe("integrations/mutations — config", () => {
    it("configures a new integration", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.mutations.configure, {
            tenantId: TENANT, integrationType: "stripe", name: "Stripe Payments",
            config: { mode: "live" }, apiKey: "sk_live_abc123",
        });
        expect(result.id).toBeDefined();
    });

    it("rejects duplicate integration type for same tenant", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.configure, {
            tenantId: TENANT, integrationType: "stripe", name: "Stripe",
            config: {},
        });
        await expect(
            t.mutation(api.mutations.configure, {
                tenantId: TENANT, integrationType: "stripe", name: "Stripe 2",
                config: {},
            })
        ).rejects.toThrow("already configured");
    });

    it("allows same type for different tenants", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.configure, {
            tenantId: "t1", integrationType: "vipps", name: "Vipps", config: {},
        });
        const r2 = await t.mutation(api.mutations.configure, {
            tenantId: "t2", integrationType: "vipps", name: "Vipps", config: {},
        });
        expect(r2.id).toBeDefined();
    });

    it("updates config", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.configure, {
            tenantId: TENANT, integrationType: "stripe", name: "Stripe", config: {},
        });
        await t.mutation(api.mutations.updateConfig, { id, name: "Stripe Updated" });

        const config = await t.query(api.queries.getConfig, { tenantId: TENANT, integrationType: "stripe" }) as any;
        expect(config!.name).toBe("Stripe Updated");
    });

    it("disables an integration", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.configure, {
            tenantId: TENANT, integrationType: "stripe", name: "Stripe", config: {},
        });
        await t.mutation(api.mutations.disableIntegration, { id });

        const config = await t.query(api.queries.getConfig, { tenantId: TENANT, integrationType: "stripe" }) as any;
        expect(config!.isEnabled).toBe(false);
    });

    it("enables an integration", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.configure, {
            tenantId: TENANT, integrationType: "stripe", name: "Stripe", config: {},
        });
        await t.mutation(api.mutations.disableIntegration, { id });
        await t.mutation(api.mutations.enableIntegration, { id });

        const config = await t.query(api.queries.getConfig, { tenantId: TENANT, integrationType: "stripe" }) as any;
        expect(config!.isEnabled).toBe(true);
    });

    it("removes integration and cascades webhooks", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.configure, {
            tenantId: TENANT, integrationType: "stripe", name: "Stripe", config: {},
        });
        await t.mutation(api.mutations.registerWebhook, {
            tenantId: TENANT, integrationId: id as any,
            events: ["payment.completed"], callbackUrl: "https://example.com/hook",
        });
        await t.mutation(api.mutations.removeIntegration, { id });

        const configs = await t.query(api.queries.listConfigs, { tenantId: TENANT });
        expect(configs).toHaveLength(0);
    });

    it("tests connection", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.configure, {
            tenantId: TENANT, integrationType: "stripe", name: "Stripe", config: {},
        });
        const result = await t.mutation(api.mutations.testConnection, { id });
        expect(result.success).toBe(true);
        expect(result.status).toBe("connection_tested");
    });
});

// =============================================================================
// WEBHOOK MUTATIONS
// =============================================================================

describe("integrations/mutations — webhooks", () => {
    it("registers a webhook", async () => {
        const t = convexTest(schema, modules);
        const { id: configId } = await t.mutation(api.mutations.configure, {
            tenantId: TENANT, integrationType: "stripe", name: "Stripe", config: {},
        });
        const result = await t.mutation(api.mutations.registerWebhook, {
            tenantId: TENANT, integrationId: configId as any,
            events: ["payment.completed", "payment.failed"],
            callbackUrl: "https://example.com/hook",
        });
        expect(result.id).toBeDefined();
    });

    it("updates a webhook", async () => {
        const t = convexTest(schema, modules);
        const { id: configId } = await t.mutation(api.mutations.configure, {
            tenantId: TENANT, integrationType: "stripe", name: "Stripe", config: {},
        });
        const { id: webhookId } = await t.mutation(api.mutations.registerWebhook, {
            tenantId: TENANT, integrationId: configId as any,
            events: ["payment.completed"], callbackUrl: "https://example.com/hook",
        });
        await t.mutation(api.mutations.updateWebhook, {
            id: webhookId as any, isActive: false,
        });

        const webhooks = await t.query(api.queries.listWebhooks, { tenantId: TENANT });
        expect(webhooks[0].isActive).toBe(false);
    });

    it("deletes a webhook", async () => {
        const t = convexTest(schema, modules);
        const { id: configId } = await t.mutation(api.mutations.configure, {
            tenantId: TENANT, integrationType: "stripe", name: "Stripe", config: {},
        });
        const { id: webhookId } = await t.mutation(api.mutations.registerWebhook, {
            tenantId: TENANT, integrationId: configId as any,
            events: ["payment.completed"], callbackUrl: "https://example.com/hook",
        });
        const result = await t.mutation(api.mutations.deleteWebhook, { id: webhookId as any });
        expect(result.success).toBe(true);
    });
});

// =============================================================================
// SYNC LOG MUTATIONS
// =============================================================================

describe("integrations/mutations — sync logs", () => {
    it("starts a sync", async () => {
        const t = convexTest(schema, modules);
        const { id: configId } = await t.mutation(api.mutations.configure, {
            tenantId: TENANT, integrationType: "stripe", name: "Stripe", config: {},
        });
        const result = await t.mutation(api.mutations.startSync, {
            tenantId: TENANT, integrationId: configId as any, syncType: "full",
        });
        expect(result.id).toBeDefined();
    });

    it("rejects sync for disabled integration", async () => {
        const t = convexTest(schema, modules);
        const { id: configId } = await t.mutation(api.mutations.configure, {
            tenantId: TENANT, integrationType: "stripe", name: "Stripe", config: {},
        });
        await t.mutation(api.mutations.disableIntegration, { id: configId });
        await expect(
            t.mutation(api.mutations.startSync, {
                tenantId: TENANT, integrationId: configId as any, syncType: "full",
            })
        ).rejects.toThrow("disabled");
    });

    it("completes a sync log", async () => {
        const t = convexTest(schema, modules);
        const { id: configId } = await t.mutation(api.mutations.configure, {
            tenantId: TENANT, integrationType: "stripe", name: "Stripe", config: {},
        });
        const { id: syncId } = await t.mutation(api.mutations.startSync, {
            tenantId: TENANT, integrationId: configId as any, syncType: "full",
        });
        await t.mutation(api.mutations.completeSyncLog, {
            id: syncId as any, status: "completed", recordsProcessed: 100,
        });

        const log = await t.query(api.queries.getSyncLog, { id: syncId as any }) as any;
        expect(log!.status).toBe("completed");
        expect(log!.recordsProcessed).toBe(100);
    });

    it("rejects completing an already completed sync", async () => {
        const t = convexTest(schema, modules);
        const { id: configId } = await t.mutation(api.mutations.configure, {
            tenantId: TENANT, integrationType: "stripe", name: "Stripe", config: {},
        });
        const { id: syncId } = await t.mutation(api.mutations.startSync, {
            tenantId: TENANT, integrationId: configId as any, syncType: "full",
        });
        await t.mutation(api.mutations.completeSyncLog, { id: syncId as any, status: "completed" });
        await expect(
            t.mutation(api.mutations.completeSyncLog, { id: syncId as any, status: "failed" })
        ).rejects.toThrow("Cannot complete sync log");
    });
});

// =============================================================================
// QUERIES
// =============================================================================

describe("integrations/queries", () => {
    it("masks sensitive fields in getConfig", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.configure, {
            tenantId: TENANT, integrationType: "stripe", name: "Stripe",
            config: {}, apiKey: "sk_live_abcdefgh12345678", secretKey: "whsec_secret123",
        });

        const config = await t.query(api.queries.getConfig, { tenantId: TENANT, integrationType: "stripe" }) as any;
        expect(config!.apiKey).toContain("...");
        expect(config!.secretKey).toBe("••••••••");
    });

    it("returns null for non-existent config", async () => {
        const t = convexTest(schema, modules);
        const config = await t.query(api.queries.getConfig, { tenantId: TENANT, integrationType: "nope" });
        expect(config).toBeNull();
    });

    it("lists configs for a tenant", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.configure, { tenantId: TENANT, integrationType: "stripe", name: "Stripe", config: {} });
        await t.mutation(api.mutations.configure, { tenantId: TENANT, integrationType: "vipps", name: "Vipps", config: {} });

        const configs = await t.query(api.queries.listConfigs, { tenantId: TENANT });
        expect(configs).toHaveLength(2);
    });

    it("lists webhooks filtered by integration", async () => {
        const t = convexTest(schema, modules);
        const { id: configId } = await t.mutation(api.mutations.configure, {
            tenantId: TENANT, integrationType: "stripe", name: "Stripe", config: {},
        });
        await t.mutation(api.mutations.registerWebhook, {
            tenantId: TENANT, integrationId: configId as any,
            events: ["payment.completed"], callbackUrl: "https://example.com/hook",
        });

        const webhooks = await t.query(api.queries.listWebhooks, { tenantId: TENANT, integrationId: configId as any });
        expect(webhooks).toHaveLength(1);
    });

    it("lists sync logs", async () => {
        const t = convexTest(schema, modules);
        const { id: configId } = await t.mutation(api.mutations.configure, {
            tenantId: TENANT, integrationType: "stripe", name: "Stripe", config: {},
        });
        await t.mutation(api.mutations.startSync, { tenantId: TENANT, integrationId: configId as any, syncType: "full" });

        const logs = await t.query(api.queries.listSyncLogs, { tenantId: TENANT });
        expect(logs).toHaveLength(1);
    });

    it("getConfigInternal returns unmasked secrets", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.configure, {
            tenantId: TENANT, integrationType: "stripe", name: "Stripe",
            config: {}, apiKey: "sk_live_abc123",
        });

        const config = await t.query(api.queries.getConfigInternal, { tenantId: TENANT, integrationType: "stripe" }) as any;
        expect(config!.apiKey).toBe("sk_live_abc123");
    });
});

// =============================================================================
// SCHEMA INDEXES
// =============================================================================

describe("integrations/schema — indexes", () => {
    it("integrationConfigs by_type index works", async () => {
        const t = convexTest(schema, modules);
        await t.run(async (ctx) => {
            await ctx.db.insert("integrationConfigs", {
                tenantId: TENANT, integrationType: "stripe", name: "Stripe",
                isEnabled: true, config: {}, createdAt: Date.now(), updatedAt: Date.now(),
            });
            const found = await ctx.db.query("integrationConfigs")
                .withIndex("by_type", (q) => q.eq("tenantId", TENANT).eq("integrationType", "stripe")).first();
            expect(found).not.toBeNull();
        });
    });
});
