import { describe, it, expect } from "vitest";
import { api } from "../../_generated/api";
import { createDomainTest, seedTestTenant } from "./testHelper.test-util";

describe("domain/integrations", () => {
    function setup() {
        return createDomainTest(["integrations"]);
    }

    // =========================================================================
    // QUERY FACADES
    // =========================================================================

    describe("listConfigs", () => {
        it("returns empty array when no integrations configured", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const configs = await t.query(api.domain.integrations.listConfigs, {
                tenantId: tenantId as string,
            });

            expect(configs).toEqual([]);
        });

        it("returns integrations for a tenant", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const tid = tenantId as string;

            await t.mutation(api.domain.integrations.createConfig, {
                tenantId: tid,
                integrationType: "vipps",
                name: "Vipps Payment",
                config: { merchantId: "12345" },
                apiKey: "sk_test_abcdefghij",
            });

            await t.mutation(api.domain.integrations.createConfig, {
                tenantId: tid,
                integrationType: "smtp",
                name: "Email SMTP",
                config: { host: "smtp.test.no", port: 587 },
            });

            const configs = await t.query(api.domain.integrations.listConfigs, {
                tenantId: tid,
            });

            expect(configs.length).toBe(2);
            const types = configs.map((c: any) => c.integrationType);
            expect(types).toContain("vipps");
            expect(types).toContain("smtp");
        });

        it("masks sensitive fields in returned configs", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const tid = tenantId as string;

            await t.mutation(api.domain.integrations.createConfig, {
                tenantId: tid,
                integrationType: "stripe",
                name: "Stripe",
                config: {},
                apiKey: "sk_live_abcdefghijklmnop",
                secretKey: "whsec_supersecret",
            });

            const configs = await t.query(api.domain.integrations.listConfigs, {
                tenantId: tid,
            });

            expect(configs.length).toBe(1);
            // apiKey should be masked (first 4 + ... + last 4)
            expect(configs[0].apiKey).toMatch(/^sk_l\.\.\.mnop$/);
            // secretKey should be fully masked
            expect(configs[0].secretKey).toBe("••••••••");
        });
    });

    describe("getConfig", () => {
        it("returns a specific integration by tenant and type", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const tid = tenantId as string;

            await t.mutation(api.domain.integrations.createConfig, {
                tenantId: tid,
                integrationType: "vipps",
                name: "Vipps",
                config: { merchantId: "99999" },
            });

            const config = await t.query(api.domain.integrations.getConfig, {
                tenantId: tid,
                integrationType: "vipps",
            });

            expect(config).toBeDefined();
            expect(config.name).toBe("Vipps");
            expect(config.integrationType).toBe("vipps");
        });

        it("returns null for non-existent integration type", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const config = await t.query(api.domain.integrations.getConfig, {
                tenantId: tenantId as string,
                integrationType: "nonexistent",
            });

            expect(config).toBeNull();
        });
    });

    describe("getById", () => {
        it("returns a config by its ID", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const tid = tenantId as string;

            const { id } = await t.mutation(api.domain.integrations.createConfig, {
                tenantId: tid,
                integrationType: "webhook",
                name: "Custom Webhook",
                config: { url: "https://hooks.test.no" },
            });

            const config = await t.query(api.domain.integrations.getById, { id });

            expect(config).toBeDefined();
            expect(config.name).toBe("Custom Webhook");
        });

        it("returns null for non-existent ID", async () => {
            const t = setup();
            await seedTestTenant(t);

            // Use a fabricated ID that looks valid but does not exist
            const config = await t.query(api.domain.integrations.getById, {
                id: "nonexistent-id-123",
            });

            expect(config).toBeNull();
        });
    });

    // =========================================================================
    // MUTATION FACADES
    // =========================================================================

    describe("createConfig", () => {
        it("creates a new integration config", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const result = await t.mutation(api.domain.integrations.createConfig, {
                tenantId: tenantId as string,
                integrationType: "sms",
                name: "SMS Gateway",
                config: { provider: "twilio" },
                environment: "production",
            });

            expect(result.id).toBeDefined();
        });

        it("rejects duplicate integration type for same tenant", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const tid = tenantId as string;

            await t.mutation(api.domain.integrations.createConfig, {
                tenantId: tid,
                integrationType: "vipps",
                name: "Vipps",
                config: {},
            });

            await expect(
                t.mutation(api.domain.integrations.createConfig, {
                    tenantId: tid,
                    integrationType: "vipps",
                    name: "Vipps Duplicate",
                    config: {},
                })
            ).rejects.toThrow(/already configured/);
        });
    });

    describe("updateConfig", () => {
        it("updates config name and environment", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await t.mutation(api.domain.integrations.createConfig, {
                tenantId: tenantId as string,
                integrationType: "email",
                name: "Email v1",
                config: { host: "smtp.old.no" },
                environment: "staging",
            });

            const result = await t.mutation(api.domain.integrations.updateConfig, {
                id,
                name: "Email v2",
                config: { host: "smtp.new.no" },
                environment: "production",
            });

            expect(result.success).toBe(true);

            const updated = await t.query(api.domain.integrations.getById, { id });
            expect(updated.name).toBe("Email v2");
            expect(updated.environment).toBe("production");
        });
    });

    describe("enableIntegration / disableIntegration", () => {
        it("disables and re-enables an integration", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await t.mutation(api.domain.integrations.createConfig, {
                tenantId: tenantId as string,
                integrationType: "analytics",
                name: "Analytics",
                config: {},
            });

            // Disable
            await t.mutation(api.domain.integrations.disableIntegration, { id });
            let config = await t.query(api.domain.integrations.getById, { id });
            expect(config.isEnabled).toBe(false);

            // Re-enable
            await t.mutation(api.domain.integrations.enableIntegration, { id });
            config = await t.query(api.domain.integrations.getById, { id });
            expect(config.isEnabled).toBe(true);
        });
    });

    describe("removeIntegration", () => {
        it("removes an integration config", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const tid = tenantId as string;

            const { id } = await t.mutation(api.domain.integrations.createConfig, {
                tenantId: tid,
                integrationType: "temp",
                name: "Temporary",
                config: {},
            });

            const result = await t.mutation(api.domain.integrations.removeIntegration, { id });
            expect(result.success).toBe(true);

            const deleted = await t.query(api.domain.integrations.getById, { id });
            expect(deleted).toBeNull();
        });
    });

    describe("testConnection", () => {
        it("marks integration as connection tested", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await t.mutation(api.domain.integrations.createConfig, {
                tenantId: tenantId as string,
                integrationType: "api",
                name: "External API",
                config: { baseUrl: "https://api.test.no" },
            });

            const result = await t.mutation(api.domain.integrations.testConnection, { id });

            expect(result.success).toBe(true);
            expect(result.status).toBe("connection_tested");
        });
    });
});
