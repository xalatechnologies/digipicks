/**
 * Tenant-Aware Custom Functions
 * 
 * Custom query/mutation/action builders that automatically inject tenant context.
 * Use these instead of raw query/mutation/action for tenant-scoped operations.
 */

import { query, mutation, internalQuery, internalMutation } from "../_generated/server";
import { QueryCtx, MutationCtx } from "../_generated/server";
import { customQuery, customMutation, customCtx, NoOp } from "convex-helpers/server/customFunctions";
import { Id } from "../_generated/dataModel";

// =============================================================================
// TENANT CONTEXT EXTRACTION
// =============================================================================

/**
 * Extract tenant ID from authenticated user context.
 * Returns undefined if user is not authenticated or has no tenant.
 *
 * @deprecated Uses ctx.auth.getUserIdentity() which always returns null
 * because the app uses a custom session system, not Convex built-in auth.
 * Facade functions should accept tenantId as an explicit arg instead.
 */
export async function getTenantFromAuth(ctx: QueryCtx | MutationCtx): Promise<Id<"tenants"> | undefined> {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return undefined;

    // Look up user by auth ID
    const user = await ctx.db
        .query("users")
        .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
        .first();

    return user?.tenantId;
}

/**
 * Extract tenant ID or throw if not available.
 * Use for operations that require an authenticated tenant.
 *
 * @deprecated Uses ctx.auth.getUserIdentity() which always returns null
 * because the app uses a custom session system, not Convex built-in auth.
 * Facade functions should accept tenantId as an explicit arg instead.
 */
export async function getTenantFromAuthOrThrow(ctx: QueryCtx | MutationCtx): Promise<Id<"tenants">> {
    const tenantId = await getTenantFromAuth(ctx);
    if (!tenantId) {
        throw new Error("Unauthenticated or no tenant associated with user");
    }
    return tenantId;
}

// =============================================================================
// TENANT-AWARE CUSTOM FUNCTION BUILDERS
// =============================================================================

/**
 * Query builder that injects tenant context.
 * Use for queries that need tenant scoping.
 */
export const tenantQuery = customQuery(
    query,
    customCtx(async (ctx) => ({
        tenantId: await getTenantFromAuth(ctx),
    }))
);

/**
 * Mutation builder that injects tenant context.
 * Use for mutations that need tenant scoping.
 */
export const tenantMutation = customMutation(
    mutation,
    customCtx(async (ctx) => ({
        tenantId: await getTenantFromAuth(ctx),
    }))
);

/**
 * Internal query with tenant context (for scheduled jobs, etc.)
 */
export const tenantInternalQuery = customQuery(
    internalQuery,
    customCtx(async (ctx) => ({
        tenantId: await getTenantFromAuth(ctx),
    }))
);

/**
 * Internal mutation with tenant context (for scheduled jobs, etc.)
 */
export const tenantInternalMutation = customMutation(
    internalMutation,
    customCtx(async (ctx) => ({
        tenantId: await getTenantFromAuth(ctx),
    }))
);

// =============================================================================
// PUBLIC (NO-AUTH) FUNCTIONS
// =============================================================================

/**
 * Public query - no authentication required.
 * Use for public-facing endpoints like listing search.
 */
export const publicQuery = customQuery(query, NoOp);

/**
 * Public mutation - no authentication required.
 * Use sparingly - most mutations should require auth.
 */
export const publicMutation = customMutation(mutation, NoOp);
