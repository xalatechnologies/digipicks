import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "../schema";
import { modules } from "../testSetup.test-util";
import { api } from "../_generated/api";

const TENANT = "tenant-config-test";

// =============================================================================
// FEATURE FLAG MUTATIONS
// =============================================================================

describe("tenant-config/mutations — flags", () => {
    it("creates a feature flag", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.mutations.createFlag, {
            tenantId: TENANT, key: "dark_mode", name: "Dark Mode",
            type: "boolean", defaultValue: false,
        });
        expect(result.id).toBeDefined();
    });

    it("rejects duplicate flag key", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createFlag, {
            tenantId: TENANT, key: "dark_mode", name: "Dark Mode",
            type: "boolean", defaultValue: false,
        });
        await expect(
            t.mutation(api.mutations.createFlag, {
                tenantId: TENANT, key: "dark_mode", name: "Another",
                type: "boolean", defaultValue: true,
            })
        ).rejects.toThrow("already exists");
    });

    it("updates a flag", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createFlag, {
            tenantId: TENANT, key: "feature_x", name: "Feature X",
            type: "boolean", defaultValue: false,
        });
        await t.mutation(api.mutations.updateFlag, {
            id: id as any, defaultValue: true, description: "Enabled by default",
        });

        const flag = await t.query(api.queries.getFlag, { tenantId: TENANT, key: "feature_x" });
        expect(flag.defaultValue).toBe(true);
        expect(flag.description).toBe("Enabled by default");
    });

    it("deletes a flag and its rules", async () => {
        const t = convexTest(schema, modules);
        const { id: flagId } = await t.mutation(api.mutations.createFlag, {
            tenantId: TENANT, key: "temp", name: "Temp",
            type: "boolean", defaultValue: false,
        });
        await t.mutation(api.mutations.createFlagRule, {
            tenantId: TENANT, flagId: flagId as any,
            targetType: "user", targetId: "user-1", value: true, priority: 10,
        });
        const result = await t.mutation(api.mutations.deleteFlag, { id: flagId as any });
        expect(result.success).toBe(true);
    });
});

// =============================================================================
// FLAG RULE MUTATIONS
// =============================================================================

describe("tenant-config/mutations — flag rules", () => {
    it("creates a flag rule", async () => {
        const t = convexTest(schema, modules);
        const { id: flagId } = await t.mutation(api.mutations.createFlag, {
            tenantId: TENANT, key: "beta", name: "Beta",
            type: "boolean", defaultValue: false,
        });
        const result = await t.mutation(api.mutations.createFlagRule, {
            tenantId: TENANT, flagId: flagId as any,
            targetType: "user", targetId: "user-1", value: true, priority: 10,
        });
        expect(result.id).toBeDefined();
    });

    it("deletes a flag rule", async () => {
        const t = convexTest(schema, modules);
        const { id: flagId } = await t.mutation(api.mutations.createFlag, {
            tenantId: TENANT, key: "beta", name: "Beta",
            type: "boolean", defaultValue: false,
        });
        const { id: ruleId } = await t.mutation(api.mutations.createFlagRule, {
            tenantId: TENANT, flagId: flagId as any,
            targetType: "user", targetId: "user-1", value: true, priority: 10,
        });
        const result = await t.mutation(api.mutations.deleteFlagRule, { id: ruleId as any });
        expect(result.success).toBe(true);
    });
});

// =============================================================================
// FLAG QUERIES
// =============================================================================

describe("tenant-config/queries — flags", () => {
    it("lists flags for a tenant", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createFlag, { tenantId: TENANT, key: "a", name: "A", type: "boolean", defaultValue: false });
        await t.mutation(api.mutations.createFlag, { tenantId: TENANT, key: "b", name: "B", type: "string", defaultValue: "hello" });

        const flags = await t.query(api.queries.listFlags, { tenantId: TENANT });
        expect(flags).toHaveLength(2);
    });

    it("gets a flag by key", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createFlag, { tenantId: TENANT, key: "dark_mode", name: "Dark Mode", type: "boolean", defaultValue: false });

        const flag = await t.query(api.queries.getFlag, { tenantId: TENANT, key: "dark_mode" });
        expect(flag.name).toBe("Dark Mode");
    });

    it("throws for non-existent flag key", async () => {
        const t = convexTest(schema, modules);
        await expect(
            t.query(api.queries.getFlag, { tenantId: TENANT, key: "nope" })
        ).rejects.toThrow("not found");
    });

    it("evaluates flag — default value", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createFlag, { tenantId: TENANT, key: "beta", name: "Beta", type: "boolean", defaultValue: false });

        const result = await t.query(api.queries.evaluateFlag, { tenantId: TENANT, key: "beta" });
        expect(result.value).toBe(false);
        expect(result.source).toBe("default");
    });

    it("evaluates flag — rule override", async () => {
        const t = convexTest(schema, modules);
        const { id: flagId } = await t.mutation(api.mutations.createFlag, { tenantId: TENANT, key: "beta", name: "Beta", type: "boolean", defaultValue: false });
        await t.mutation(api.mutations.createFlagRule, {
            tenantId: TENANT, flagId: flagId as any,
            targetType: "user", targetId: "user-1", value: true, priority: 10,
        });

        const result = await t.query(api.queries.evaluateFlag, {
            tenantId: TENANT, key: "beta", targetType: "user", targetId: "user-1",
        });
        expect(result.value).toBe(true);
        expect(result.source).toBe("rule");
    });

    it("evaluates flag — inactive flag returns default", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createFlag, { tenantId: TENANT, key: "beta", name: "Beta", type: "boolean", defaultValue: false });
        await t.mutation(api.mutations.updateFlag, { id: id as any, isActive: false });

        const result = await t.query(api.queries.evaluateFlag, { tenantId: TENANT, key: "beta" });
        expect(result.value).toBe(false);
        expect(result.source).toBe("default");
    });

    it("evaluates all flags", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createFlag, { tenantId: TENANT, key: "a", name: "A", type: "boolean", defaultValue: true });
        await t.mutation(api.mutations.createFlag, { tenantId: TENANT, key: "b", name: "B", type: "string", defaultValue: "hello" });

        const results = await t.query(api.queries.evaluateAllFlags, { tenantId: TENANT });
        expect((results as any).a.value).toBe(true);
        expect((results as any).b.value).toBe("hello");
    });
});

// =============================================================================
// BRANDING MUTATIONS & QUERIES
// =============================================================================

describe("tenant-config/mutations — branding", () => {
    it("creates branding config", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.mutations.updateBranding, {
            tenantId: TENANT, primaryColor: "#1C362D", fontFamily: "Inter",
        });
        expect(result.id).toBeDefined();

        const branding = await t.query(api.queries.getBranding, { tenantId: TENANT });
        expect(branding!.primaryColor).toBe("#1C362D");
    });

    it("upserts branding config", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.updateBranding, { tenantId: TENANT, primaryColor: "#111" });
        await t.mutation(api.mutations.updateBranding, { tenantId: TENANT, primaryColor: "#222", accentColor: "#333" });

        const branding = await t.query(api.queries.getBranding, { tenantId: TENANT });
        expect(branding!.primaryColor).toBe("#222");
        expect(branding!.accentColor).toBe("#333");
    });

    it("returns null for tenant without branding", async () => {
        const t = convexTest(schema, modules);
        const branding = await t.query(api.queries.getBranding, { tenantId: "no-brand" });
        expect(branding).toBeNull();
    });
});

describe("tenant-config/mutations — brand assets", () => {
    it("uploads a brand asset", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.mutations.uploadBrandAsset, {
            tenantId: TENANT, assetType: "logo", url: "https://cdn.example.com/logo.png",
        });
        expect(result.id).toBeDefined();
    });

    it("replaces existing asset of same type", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.uploadBrandAsset, {
            tenantId: TENANT, assetType: "logo", url: "https://cdn.example.com/old.png",
        });
        await t.mutation(api.mutations.uploadBrandAsset, {
            tenantId: TENANT, assetType: "logo", url: "https://cdn.example.com/new.png",
        });

        const assets = await t.query(api.queries.listBrandAssets, { tenantId: TENANT });
        expect(assets).toHaveLength(1);
        expect(assets[0].url).toBe("https://cdn.example.com/new.png");
    });

    it("removes a brand asset", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.uploadBrandAsset, {
            tenantId: TENANT, assetType: "favicon", url: "https://cdn.example.com/fav.ico",
        });
        const result = await t.mutation(api.mutations.removeBrandAsset, { id: id as any });
        expect(result.success).toBe(true);
    });
});

// =============================================================================
// THEME OVERRIDES
// =============================================================================

describe("tenant-config/mutations — theme overrides", () => {
    it("sets a theme override", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.mutations.setThemeOverride, {
            tenantId: TENANT, componentKey: "button", property: "border-radius", value: "8px",
        });
        expect(result.id).toBeDefined();
    });

    it("upserts same component+property", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.setThemeOverride, {
            tenantId: TENANT, componentKey: "button", property: "bg", value: "#111",
        });
        await t.mutation(api.mutations.setThemeOverride, {
            tenantId: TENANT, componentKey: "button", property: "bg", value: "#222",
        });

        const overrides = await t.query(api.queries.listThemeOverrides, { tenantId: TENANT });
        expect(overrides).toHaveLength(1);
        expect(overrides[0].value).toBe("#222");
    });

    it("removes a theme override", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.setThemeOverride, {
            tenantId: TENANT, componentKey: "button", property: "bg", value: "#111",
        });
        const result = await t.mutation(api.mutations.removeThemeOverride, { id: id as any });
        expect(result.success).toBe(true);
    });
});

describe("tenant-config/queries — theme CSS", () => {
    it("generates CSS from branding + overrides", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.updateBranding, {
            tenantId: TENANT, primaryColor: "#1C362D", fontFamily: "Inter",
        });
        await t.mutation(api.mutations.setThemeOverride, {
            tenantId: TENANT, componentKey: "button", property: "bg", value: "#FF0000",
        });

        const css = await t.query(api.queries.getThemeCSS, { tenantId: TENANT });
        expect(css).toContain("--brand-primary: #1C362D");
        expect(css).toContain("--brand-font-family: Inter");
        expect(css).toContain("--button-bg: #FF0000");
    });

    it("returns minimal CSS for tenant without config", async () => {
        const t = convexTest(schema, modules);
        const css = await t.query(api.queries.getThemeCSS, { tenantId: "no-config" });
        expect(css).toContain(":root {");
        expect(css).toContain("}");
    });
});

// =============================================================================
// SCHEMA INDEXES
// =============================================================================

describe("tenant-config/schema — indexes", () => {
    it("flagDefinitions by_key index works", async () => {
        const t = convexTest(schema, modules);
        await t.run(async (ctx) => {
            await ctx.db.insert("flagDefinitions", {
                tenantId: TENANT, key: "test", name: "Test", type: "boolean",
                defaultValue: false, isActive: true,
            });
            const found = await ctx.db.query("flagDefinitions")
                .withIndex("by_key", (q) => q.eq("tenantId", TENANT).eq("key", "test")).first();
            expect(found).not.toBeNull();
        });
    });

    it("brandAssets by_type index works", async () => {
        const t = convexTest(schema, modules);
        await t.run(async (ctx) => {
            await ctx.db.insert("brandAssets", {
                tenantId: TENANT, assetType: "logo", url: "https://cdn.example.com/logo.png",
            });
            const found = await ctx.db.query("brandAssets")
                .withIndex("by_type", (q) => q.eq("tenantId", TENANT).eq("assetType", "logo")).first();
            expect(found).not.toBeNull();
        });
    });
});
