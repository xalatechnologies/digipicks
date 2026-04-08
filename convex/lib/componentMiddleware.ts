/**
 * Component Middleware — Module Enablement + Rate Limiting
 *
 * Provides helpers to check whether a component/module is enabled for a tenant,
 * and rate-limit enforcement for facade mutations.
 */

import { rateLimit, RATE_LIMITS } from "./rateLimits";
import type { GenericDatabaseWriter } from "convex/server";
import type { RateLimitDataModel } from "convex-helpers/server/rateLimit";

/**
 * Enforce a rate limit in a facade mutation handler.
 * Throws an RFC7807-style error when the limit is exceeded.
 *
 * @example
 *   await withRateLimit(ctx, "createBooking", rateLimitKeys.tenant(tenantId));
 */
export async function withRateLimit(
    ctx: { db: GenericDatabaseWriter<RateLimitDataModel> },
    name: keyof typeof RATE_LIMITS,
    key: string
): Promise<void> {
    await rateLimit(ctx, { name, key, throws: true });
}

/**
 * Check if a component/module is enabled for a tenant.
 * Implements the hasModuleEnabled() helper documented in DOMAIN_BUNDLE_SPEC.md.
 *
 * Resolution order:
 * 1. platformConfig.featureFlags[moduleId] (if false, overrides all)
 * 2. componentRegistry (isEnabled && isInstalled)
 * 3. tenant.featureFlags[moduleId] (explicit true/false)
 * 4. Default: true (enabled if not explicitly disabled)
 */
export async function hasModuleEnabled(
    ctx: { db: { query: (table: string) => any; get: (id: any) => Promise<any> } },
    tenantId: string,
    moduleId: string
): Promise<boolean> {
    // 1. Check platform-level global overrides (highest precedence)
    const platformConfig = await ctx.db.query("platformConfig").first();
    if (platformConfig?.featureFlags) {
        if (platformConfig.featureFlags[moduleId] === false) {
            return false;
        }
    }

    // 2. Check component registry (seeded by seedComponents)
    const registration = await ctx.db
        .query("componentRegistry")
        .withIndex("by_component", (q: any) =>
            q.eq("tenantId", tenantId).eq("componentId", moduleId)
        )
        .first();

    if (registration) {
        return registration.isEnabled && registration.isInstalled;
    }

    // 3. Fallback: tenant.featureFlags (module IDs: booking, seasonal-leases, messaging, analytics, integrations, gdpr)
    const tenant = await ctx.db.get(tenantId as any);
    if (tenant?.featureFlags && typeof tenant.featureFlags === "object") {
        const flags = tenant.featureFlags as Record<string, boolean | undefined>;
        if (flags[moduleId] === false) return false;
        if (flags[moduleId] === true) return true;
        // Legacy: seasonal_leases, approval_workflow map to seasonal-leases, booking
        if (moduleId === "seasonal-leases" && flags.seasonal_leases === false) return false;
        if (moduleId === "seasonal-leases" && flags.seasonal_leases === true) return true;
    }

    return true; // Default: enabled if not explicitly disabled
}
