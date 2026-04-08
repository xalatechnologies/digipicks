/**
 * Tenant Config Component — Query Functions
 *
 * Read-only operations for feature flags, branding, and theme overrides.
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// FEATURE FLAG QUERIES
// =============================================================================

export const listFlags = query({
    args: { tenantId: v.string(), limit: v.optional(v.number()) },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, limit = 100 }) => {
        return ctx.db
            .query("flagDefinitions")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .take(limit);
    },
});

export const getFlag = query({
    args: { tenantId: v.string(), key: v.string() },
    returns: v.any(),
    handler: async (ctx, { tenantId, key }) => {
        const flag = await ctx.db
            .query("flagDefinitions")
            .withIndex("by_key", (q) => q.eq("tenantId", tenantId).eq("key", key))
            .first();
        if (!flag) throw new Error(`Flag "${key}" not found`);
        return flag;
    },
});

export const evaluateFlag = query({
    args: {
        tenantId: v.string(),
        key: v.string(),
        targetType: v.optional(v.string()),
        targetId: v.optional(v.string()),
    },
    returns: v.any(),
    handler: async (ctx, { tenantId, key, targetType, targetId }) => {
        const flag = await ctx.db
            .query("flagDefinitions")
            .withIndex("by_key", (q) => q.eq("tenantId", tenantId).eq("key", key))
            .first();

        if (!flag) throw new Error(`Flag "${key}" not found`);
        if (!flag.isActive) return { key, value: flag.defaultValue, source: "default" };

        // If targeting info provided, look for matching rules
        if (targetType && targetId) {
            const rules = await ctx.db
                .query("flagRules")
                .withIndex("by_flag", (q) => q.eq("flagId", flag._id))
                .collect();

            // Filter rules matching the target, sort by priority descending (higher = wins)
            const matchingRules = rules
                .filter((r) => r.targetType === targetType && r.targetId === targetId)
                .sort((a, b) => b.priority - a.priority);

            if (matchingRules.length > 0) {
                return { key, value: matchingRules[0].value, source: "rule", ruleId: matchingRules[0]._id };
            }
        }

        return { key, value: flag.defaultValue, source: "default" };
    },
});

export const evaluateAllFlags = query({
    args: {
        tenantId: v.string(),
        targetType: v.optional(v.string()),
        targetId: v.optional(v.string()),
    },
    returns: v.any(),
    handler: async (ctx, { tenantId, targetType, targetId }) => {
        const flags = await ctx.db
            .query("flagDefinitions")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .collect();

        const results: Record<string, unknown> = {};

        for (const flag of flags) {
            if (!flag.isActive) {
                results[flag.key] = { key: flag.key, value: flag.defaultValue, source: "default" };
                continue;
            }

            if (targetType && targetId) {
                const rules = await ctx.db
                    .query("flagRules")
                    .withIndex("by_flag", (q) => q.eq("flagId", flag._id))
                    .collect();

                const matchingRules = rules
                    .filter((r) => r.targetType === targetType && r.targetId === targetId)
                    .sort((a, b) => b.priority - a.priority);

                if (matchingRules.length > 0) {
                    results[flag.key] = { key: flag.key, value: matchingRules[0].value, source: "rule", ruleId: matchingRules[0]._id };
                    continue;
                }
            }

            results[flag.key] = { key: flag.key, value: flag.defaultValue, source: "default" };
        }

        return results;
    },
});

// =============================================================================
// BRANDING QUERIES
// =============================================================================

export const getBranding = query({
    args: { tenantId: v.string() },
    returns: v.any(),
    handler: async (ctx, { tenantId }) => {
        const config = await ctx.db
            .query("brandConfigs")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .first();

        return config ?? null;
    },
});

export const listBrandAssets = query({
    args: { tenantId: v.string(), limit: v.optional(v.number()) },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, limit = 100 }) => {
        return ctx.db
            .query("brandAssets")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .take(limit);
    },
});

// =============================================================================
// THEME OVERRIDE QUERIES
// =============================================================================

export const listThemeOverrides = query({
    args: { tenantId: v.string(), limit: v.optional(v.number()) },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, limit = 100 }) => {
        return ctx.db
            .query("themeOverrides")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .take(limit);
    },
});

export const getThemeCSS = query({
    args: { tenantId: v.string() },
    returns: v.string(),
    handler: async (ctx, { tenantId }) => {
        // Gather branding config
        const branding = await ctx.db
            .query("brandConfigs")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .first();

        // Gather theme overrides
        const overrides = await ctx.db
            .query("themeOverrides")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .collect();

        const lines: string[] = [":root {"];

        // Branding CSS custom properties
        if (branding) {
            if (branding.primaryColor) lines.push(`  --brand-primary: ${branding.primaryColor};`);
            if (branding.secondaryColor) lines.push(`  --brand-secondary: ${branding.secondaryColor};`);
            if (branding.accentColor) lines.push(`  --brand-accent: ${branding.accentColor};`);
            if (branding.fontFamily) lines.push(`  --brand-font-family: ${branding.fontFamily};`);
            if (branding.borderRadius) lines.push(`  --brand-border-radius: ${branding.borderRadius};`);
        }

        // Theme override CSS custom properties
        for (const override of overrides) {
            lines.push(`  --${override.componentKey}-${override.property}: ${override.value};`);
        }

        lines.push("}");

        // Append custom CSS if present
        if (branding?.customCSS) {
            lines.push("");
            lines.push(branding.customCSS);
        }

        return lines.join("\n");
    },
});
