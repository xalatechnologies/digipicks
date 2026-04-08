import { mutation, query } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";
import { sanitizeFeatureFlags } from "../lib/featureFlagValidators";

/**
 * Tenant Functions
 * Migrated from: packages/platform/functions/tenant-onboard, tenant-settings
 */

// Onboard a new tenant
export const onboard = mutation({
    args: {
        name: v.string(),
        slug: v.string(),
        domain: v.optional(v.string()),
        adminEmail: v.string(),
        adminName: v.optional(v.string()),
        settings: v.optional(v.any()),
        featureFlags: v.optional(v.any()),
    },
    handler: async (
        ctx,
        { name, slug, domain, adminEmail, adminName, settings, featureFlags }
    ) => {
        // Check if slug is available
        const existing = await ctx.db
            .query("tenants")
            .withIndex("by_slug", (q) => q.eq("slug", slug))
            .first();

        if (existing) {
            throw new Error(`Tenant with slug "${slug}" already exists`);
        }

        // Create tenant
        const tenantId = await ctx.db.insert("tenants", {
            name,
            slug,
            domain,
            status: "active",
            settings: settings || {
                locale: "nb-NO",
                timezone: "Europe/Oslo",
                currency: "NOK",
                theme: "platform",
                installedModules: ["booking", "seasonal-leases", "messaging", "analytics", "integrations", "gdpr", "reviews"],
            },
            seatLimits: {
                maxUsers: 10,
                maxListings: 50,
                maxStorageMb: 1000,
            },
            featureFlags: featureFlags ? sanitizeFeatureFlags(featureFlags) : {
                booking: true,
                "seasonal-leases": true,
                messaging: true,
                analytics: true,
                integrations: true,
                gdpr: true,
                reviews: true,
            },
            enabledCategories: ["LOKALER", "SPORT", "ARRANGEMENTER", "TORGET"],
        });

        // Create admin user
        const userId = await ctx.db.insert("users", {
            tenantId,
            email: adminEmail,
            name: adminName,
            role: "admin",
            status: "active",
            metadata: { isFounder: true },
        });

        // Link user to tenant
        await ctx.db.insert("tenantUsers", {
            tenantId,
            userId,
            status: "active",
            joinedAt: Date.now(),
        });

        // Create default organization
        const orgId = await ctx.db.insert("organizations", {
            tenantId,
            name: `${name} Default`,
            slug: "default",
            type: "default",
            status: "active",
            settings: {},
            metadata: {},
        });

        // Update user with organization
        await ctx.db.patch(userId, { organizationId: orgId });

        return {
            success: true,
            tenant: { id: tenantId, name, slug },
            admin: { id: userId, email: adminEmail },
            organization: { id: orgId },
        };
    },
});

// Get tenant settings
export const getSettings = query({
    args: {
        tenantId: v.id("tenants"),
    },
    handler: async (ctx, { tenantId }) => {
        const tenant = await ctx.db.get(tenantId);
        if (!tenant) {
            throw new Error("Tenant not found");
        }

        return {
            settings: tenant.settings,
            seatLimits: tenant.seatLimits,
            featureFlags: tenant.featureFlags,
            enabledCategories: tenant.enabledCategories,
            enabledSubcategories: tenant.enabledSubcategories,
            defaultCategory: tenant.defaultCategory,
        };
    },
});

// Update tenant settings
export const updateSettings = mutation({
    args: {
        tenantId: v.id("tenants"),
        settings: v.optional(v.any()),
        seatLimits: v.optional(v.any()),
        featureFlags: v.optional(v.any()),
        enabledCategories: v.optional(v.array(v.string())),
        defaultCategory: v.optional(v.string()),
    },
    handler: async (
        ctx,
        { tenantId, settings, seatLimits, featureFlags, enabledCategories, defaultCategory }
    ) => {
        const tenant = await ctx.db.get(tenantId);
        if (!tenant) {
            throw new Error("Tenant not found");
        }

        const updates: any = {};

        if (settings) {
            updates.settings = { ...tenant.settings, ...settings };
        }
        if (seatLimits) {
            updates.seatLimits = { ...tenant.seatLimits, ...seatLimits };
        }
        if (featureFlags) {
            const sanitized = sanitizeFeatureFlags(featureFlags);
            updates.featureFlags = { ...tenant.featureFlags, ...sanitized };
        }
        if (enabledCategories) {
            updates.enabledCategories = enabledCategories;
        }
        if (defaultCategory !== undefined) {
            updates.defaultCategory = defaultCategory;
        }

        await ctx.db.patch(tenantId, updates);

        return { success: true };
    },
});

// Get tenant by slug
export const getBySlug = query({
    args: {
        slug: v.string(),
    },
    handler: async (ctx, { slug }) => {
        const tenant = await ctx.db
            .query("tenants")
            .withIndex("by_slug", (q) => q.eq("slug", slug))
            .first();

        return tenant;
    },
});

// Get tenant by domain
export const getByDomain = query({
    args: {
        domain: v.string(),
    },
    handler: async (ctx, { domain }) => {
        const tenant = await ctx.db
            .query("tenants")
            .withIndex("by_domain", (q) => q.eq("domain", domain))
            .first();

        return tenant;
    },
});

// Get tenant brand CSS as CSS custom properties
// Wraps the internal tenant-config component query for public SDK access
export const getThemeCSS = query({
    args: {
        tenantId: v.string(),
    },
    handler: async (ctx, { tenantId }) => {
        return await ctx.runQuery(
            components.tenantConfig.queries.getThemeCSS,
            { tenantId }
        );
    },
});

// Get creator brand CSS for white-label creator pages
export const getCreatorThemeCSS = query({
    args: {
        tenantId: v.string(),
        creatorId: v.string(),
    },
    handler: async (ctx, { tenantId, creatorId }) => {
        return await ctx.runQuery(
            components.tenantConfig.queries.getCreatorThemeCSS,
            { tenantId, creatorId }
        );
    },
});

// Resolve creator from custom domain for white-label routing
export const getCreatorByCustomDomain = query({
    args: {
        domain: v.string(),
    },
    handler: async (ctx, { domain }) => {
        return await ctx.runQuery(
            components.tenantConfig.queries.getCreatorByCustomDomain,
            { domain }
        );
    },
});
