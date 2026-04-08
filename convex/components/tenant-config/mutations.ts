/**
 * Tenant Config Component — Mutation Functions
 *
 * Write operations for feature flags, branding, and theme overrides.
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// FEATURE FLAG MUTATIONS
// =============================================================================

export const createFlag = mutation({
    args: {
        tenantId: v.string(),
        key: v.string(),
        name: v.string(),
        type: v.string(),
        defaultValue: v.any(),
        description: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("flagDefinitions")
            .withIndex("by_key", (q) => q.eq("tenantId", args.tenantId).eq("key", args.key))
            .first();

        if (existing) throw new Error(`Flag with key "${args.key}" already exists`);

        const id = await ctx.db.insert("flagDefinitions", {
            tenantId: args.tenantId,
            key: args.key,
            name: args.name,
            description: args.description,
            type: args.type,
            defaultValue: args.defaultValue,
            isActive: true,
            metadata: args.metadata,
        });

        return { id: id as string };
    },
});

export const updateFlag = mutation({
    args: {
        id: v.id("flagDefinitions"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        defaultValue: v.optional(v.any()),
        isActive: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, ...updates }) => {
        if (!await ctx.db.get(id)) throw new Error("Flag not found");

        const filteredUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );

        await ctx.db.patch(id, filteredUpdates);
        return { success: true };
    },
});

export const deleteFlag = mutation({
    args: { id: v.id("flagDefinitions") },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        if (!await ctx.db.get(id)) throw new Error("Flag not found");

        // Delete associated rules
        const rules = await ctx.db
            .query("flagRules")
            .withIndex("by_flag", (q) => q.eq("flagId", id))
            .collect();

        for (const rule of rules) {
            await ctx.db.delete(rule._id);
        }

        await ctx.db.delete(id);
        return { success: true };
    },
});

// =============================================================================
// FLAG RULE MUTATIONS
// =============================================================================

export const createFlagRule = mutation({
    args: {
        tenantId: v.string(),
        flagId: v.id("flagDefinitions"),
        targetType: v.string(),
        targetId: v.string(),
        value: v.any(),
        priority: v.number(),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const flag = await ctx.db.get(args.flagId);
        if (!flag) throw new Error("Flag not found");

        const id = await ctx.db.insert("flagRules", {
            tenantId: args.tenantId,
            flagId: args.flagId,
            targetType: args.targetType,
            targetId: args.targetId,
            value: args.value,
            priority: args.priority,
        });

        return { id: id as string };
    },
});

export const deleteFlagRule = mutation({
    args: { id: v.id("flagRules") },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        if (!await ctx.db.get(id)) throw new Error("Flag rule not found");
        await ctx.db.delete(id);
        return { success: true };
    },
});

// =============================================================================
// BRANDING MUTATIONS
// =============================================================================

export const updateBranding = mutation({
    args: {
        tenantId: v.string(),
        primaryColor: v.optional(v.string()),
        secondaryColor: v.optional(v.string()),
        accentColor: v.optional(v.string()),
        fontFamily: v.optional(v.string()),
        borderRadius: v.optional(v.string()),
        darkMode: v.optional(v.boolean()),
        customCSS: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, { tenantId, ...updates }) => {
        const existing = await ctx.db
            .query("brandConfigs")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .first();

        const filteredUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );

        if (existing) {
            await ctx.db.patch(existing._id, filteredUpdates);
            return { id: existing._id as string };
        }

        const id = await ctx.db.insert("brandConfigs", {
            tenantId,
            ...filteredUpdates,
        });

        return { id: id as string };
    },
});

export const uploadBrandAsset = mutation({
    args: {
        tenantId: v.string(),
        assetType: v.string(),
        url: v.string(),
        alt: v.optional(v.string()),
        storageId: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        // Replace existing asset of same type (one per type per tenant)
        const existing = await ctx.db
            .query("brandAssets")
            .withIndex("by_type", (q) =>
                q.eq("tenantId", args.tenantId).eq("assetType", args.assetType)
            )
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                url: args.url,
                alt: args.alt,
                storageId: args.storageId,
                metadata: args.metadata,
            });
            return { id: existing._id as string };
        }

        const id = await ctx.db.insert("brandAssets", {
            tenantId: args.tenantId,
            assetType: args.assetType,
            url: args.url,
            alt: args.alt,
            storageId: args.storageId,
            metadata: args.metadata,
        });

        return { id: id as string };
    },
});

export const removeBrandAsset = mutation({
    args: { id: v.id("brandAssets") },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        if (!await ctx.db.get(id)) throw new Error("Brand asset not found");
        await ctx.db.delete(id);
        return { success: true };
    },
});

// =============================================================================
// THEME OVERRIDE MUTATIONS
// =============================================================================

export const setThemeOverride = mutation({
    args: {
        tenantId: v.string(),
        componentKey: v.string(),
        property: v.string(),
        value: v.string(),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        // Upsert: replace existing override for same component+property
        const existing = await ctx.db
            .query("themeOverrides")
            .withIndex("by_component", (q) =>
                q.eq("tenantId", args.tenantId).eq("componentKey", args.componentKey)
            )
            .filter((q) => q.eq(q.field("property"), args.property))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, { value: args.value });
            return { id: existing._id as string };
        }

        const id = await ctx.db.insert("themeOverrides", {
            tenantId: args.tenantId,
            componentKey: args.componentKey,
            property: args.property,
            value: args.value,
        });

        return { id: id as string };
    },
});

export const removeThemeOverride = mutation({
    args: { id: v.id("themeOverrides") },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        if (!await ctx.db.get(id)) throw new Error("Theme override not found");
        await ctx.db.delete(id);
        return { success: true };
    },
});
