import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Module Management Functions
 * Migrated from: packages/platform/functions/modules-*
 */

// Available modules catalog
const MODULE_CATALOG = [
    {
        id: "booking",
        name: "Booking System",
        description: "Core booking and reservation management",
        category: "core",
        version: "1.0.0",
        isCore: true,
        features: ["calendar", "conflicts", "approvals"],
    },
    {
        id: "seasonal-leases",
        name: "Seasonal Leases",
        description: "Long-term seasonal booking management",
        category: "booking",
        version: "1.0.0",
        isCore: false,
        features: ["recurring", "contracts", "renewals"],
    },
    {
        id: "messaging",
        name: "Messaging",
        description: "In-app messaging between users and admins",
        category: "communication",
        version: "1.0.0",
        isCore: false,
        features: ["conversations", "notifications", "templates"],
    },
    {
        id: "analytics",
        name: "Analytics",
        description: "Usage analytics and reports",
        category: "reporting",
        version: "1.0.0",
        isCore: false,
        features: ["dashboards", "exports", "scheduled-reports"],
    },
    {
        id: "integrations",
        name: "Integrations",
        description: "Third-party integrations (ERP, payment, etc.)",
        category: "integration",
        version: "1.0.0",
        isCore: false,
        features: ["vipps", "stripe", "erp-sync"],
    },
    {
        id: "gdpr",
        name: "GDPR Compliance",
        description: "Data privacy and compliance tools",
        category: "compliance",
        version: "1.0.0",
        isCore: true,
        features: ["consent", "dsar", "data-export"],
    },
    {
        id: "reviews",
        name: "Reviews & Ratings",
        description: "Resource reviews with moderation",
        category: "engagement",
        version: "1.0.0",
        isCore: false,
        features: ["ratings", "moderation", "helpful-votes"],
    },
    {
        id: "mfa",
        name: "Multi-Factor Authentication",
        description: "TOTP authenticator app and backup codes for enhanced security",
        category: "auth",
        version: "1.0.0",
        isCore: false,
        features: ["totp", "backup-codes", "per-user-opt-in", "per-tenant-enforcement"],
    },
    {
        id: "sso",
        name: "Single Sign-On",
        description: "Shared session across web, minside, and backoffice via OAuth (IdPorten, Microsoft, etc.)",
        category: "auth",
        version: "1.0.0",
        isCore: false,
        features: ["shared-session", "oauth", "idporten", "microsoft", "vipps", "google"],
    },
    {
        id: "promo-hero",
        name: "Promo Hero Banner",
        description: "Promotional banner displaying gift cards, resale, and memberships on the landing page.",
        category: "engagement",
        version: "1.0.0",
        isCore: false,
        features: ["promotions", "banner"],
    },
];

// Get module catalog
export const catalog = query({
    args: {},
    handler: async () => {
        return MODULE_CATALOG;
    },
});

// List installed modules for a tenant
export const list = query({
    args: {
        tenantId: v.id("tenants"),
    },
    handler: async (ctx, { tenantId }) => {
        const tenant = await ctx.db.get(tenantId);
        if (!tenant) {
            throw new Error("Tenant not found");
        }

        // Get installed modules from tenant metadata
        const installedModuleIds = tenant.settings?.installedModules || [
            "booking",
            "gdpr",
        ];

        return MODULE_CATALOG.filter((m) => installedModuleIds.includes(m.id)).map(
            (m) => ({
                ...m,
                enabled: tenant.featureFlags?.[m.id] !== false,
            })
        );
    },
});

// Install a module
export const install = mutation({
    args: {
        tenantId: v.id("tenants"),
        moduleId: v.string(),
    },
    handler: async (ctx, { tenantId, moduleId }) => {
        const tenant = await ctx.db.get(tenantId);
        if (!tenant) {
            throw new Error("Tenant not found");
        }

        const module = MODULE_CATALOG.find((m) => m.id === moduleId);
        if (!module) {
            throw new Error(`Module "${moduleId}" not found`);
        }

        const installedModules = tenant.settings?.installedModules || [];
        if (installedModules.includes(moduleId)) {
            throw new Error(`Module "${moduleId}" is already installed`);
        }

        await ctx.db.patch(tenantId, {
            settings: {
                ...tenant.settings,
                installedModules: [...installedModules, moduleId],
            },
            featureFlags: {
                ...tenant.featureFlags,
                [moduleId]: true,
            },
        });

        return {
            success: true,
            module: { id: moduleId, name: module.name },
        };
    },
});

// Uninstall a module
export const uninstall = mutation({
    args: {
        tenantId: v.id("tenants"),
        moduleId: v.string(),
    },
    handler: async (ctx, { tenantId, moduleId }) => {
        const tenant = await ctx.db.get(tenantId);
        if (!tenant) {
            throw new Error("Tenant not found");
        }

        const module = MODULE_CATALOG.find((m) => m.id === moduleId);
        if (module?.isCore) {
            throw new Error(`Cannot uninstall core module "${moduleId}"`);
        }

        const installedModules = tenant.settings?.installedModules || [];
        if (!installedModules.includes(moduleId)) {
            throw new Error(`Module "${moduleId}" is not installed`);
        }

        const featureFlags = { ...tenant.featureFlags };
        delete featureFlags[moduleId];

        await ctx.db.patch(tenantId, {
            settings: {
                ...tenant.settings,
                installedModules: installedModules.filter(
                    (id: string) => id !== moduleId
                ),
            },
            featureFlags,
        });

        return { success: true };
    },
});

// Enable a module
export const enable = mutation({
    args: {
        tenantId: v.id("tenants"),
        moduleId: v.string(),
    },
    handler: async (ctx, { tenantId, moduleId }) => {
        const tenant = await ctx.db.get(tenantId);
        if (!tenant) {
            throw new Error("Tenant not found");
        }

        await ctx.db.patch(tenantId, {
            featureFlags: {
                ...tenant.featureFlags,
                [moduleId]: true,
            },
        });

        return { success: true };
    },
});

// Disable a module
export const disable = mutation({
    args: {
        tenantId: v.id("tenants"),
        moduleId: v.string(),
    },
    handler: async (ctx, { tenantId, moduleId }) => {
        const tenant = await ctx.db.get(tenantId);
        if (!tenant) {
            throw new Error("Tenant not found");
        }

        const module = MODULE_CATALOG.find((m) => m.id === moduleId);
        if (module?.isCore) {
            throw new Error(`Cannot disable core module "${moduleId}"`);
        }

        await ctx.db.patch(tenantId, {
            featureFlags: {
                ...tenant.featureFlags,
                [moduleId]: false,
            },
        });

        return { success: true };
    },
});
