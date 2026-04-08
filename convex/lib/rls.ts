/**
 * Row-Level Security (RLS) Rules
 * 
 * Multi-tenant data isolation enforced at the database layer.
 * Wrap db with these rules to ensure users only access their tenant's data.
 * 
 * NOTE: Only rules for app-level tables (defined in convex/schema.ts) are
 * included here. Tables that moved to components (resources, bookings,
 * categories) handle their own tenant isolation via tenantId in function args.
 * 
 * @see https://stack.convex.dev/row-level-security
 */

import { QueryCtx, MutationCtx } from "../_generated/server";
import { DataModel } from "../_generated/dataModel";
import {
    Rules,
    RLSConfig,
    wrapDatabaseReader,
    wrapDatabaseWriter,
} from "convex-helpers/server/rowLevelSecurity";
import { getTenantFromAuth } from "./functions";

// =============================================================================
// RLS CONFIGURATION
// =============================================================================

/**
 * Default RLS policy: deny access unless explicitly allowed.
 * This is the safest default for multi-tenant applications.
 */
export const rlsConfig: RLSConfig = { defaultPolicy: "deny" };

// =============================================================================
// RLS RULES
// =============================================================================

/**
 * Build RLS rules based on the authenticated user's tenant.
 * Call this at the start of each query/mutation to get scoped rules.
 * 
 * Only covers core app-level tables:
 * - tenants, users, organizations, tenantUsers
 * - custodyGrants, custodySubgrants
 * 
 * Component tables (resources, bookings, categories, etc.) enforce
 * tenant isolation at the function level via v.string() tenantId args.
 */
export async function tenantRules(ctx: QueryCtx | MutationCtx): Promise<Rules<QueryCtx, DataModel>> {
    const identity = await ctx.auth.getUserIdentity();
    const tenantId = await getTenantFromAuth(ctx);

    return {
        // TENANTS: Only read own tenant, no modifications allowed via RLS
        tenants: {
            read: async (_, tenant) => tenant._id === tenantId,
            insert: async () => false,
            modify: async () => false,
        },

        // USERS: Read own tenant's users, modify only self
        users: {
            read: async (_, user) => {
                // Users can read users in their tenant
                if (user.tenantId === tenantId) return true;
                // Or read their own profile
                if (identity && user.authUserId === identity.subject) return true;
                return false;
            },
            insert: async () => !!tenantId, // Must have a tenant to create users
            modify: async (_, user) => {
                // Can only modify own profile
                return identity?.subject === user.authUserId;
            },
        },

        // ORGANIZATIONS: Read/modify within tenant
        organizations: {
            read: async (_, org) => org.tenantId === tenantId,
            insert: async () => !!tenantId,
            modify: async (_, org) => org.tenantId === tenantId,
        },

        // TENANT USERS: Read/modify within tenant
        tenantUsers: {
            read: async (_, tu) => tu.tenantId === tenantId,
            insert: async () => !!tenantId,
            modify: async (_, tu) => tu.tenantId === tenantId,
        },

        // CUSTODY GRANTS: Read/modify within tenant
        custodyGrants: {
            read: async (_, grant) => grant.tenantId === tenantId,
            insert: async () => !!tenantId,
            modify: async (_, grant) => grant.tenantId === tenantId,
        },

        // CUSTODY SUBGRANTS: Read/modify within tenant
        custodySubgrants: {
            read: async (_, subgrant) => subgrant.tenantId === tenantId,
            insert: async () => !!tenantId,
            modify: async (_, subgrant) => subgrant.tenantId === tenantId,
        },
    };
}

// =============================================================================
// RLS-WRAPPED DATABASE HELPERS
// =============================================================================

/**
 * Wrap database reader with RLS rules for queries.
 */
export async function getSecureDbReader(ctx: QueryCtx) {
    const rules = await tenantRules(ctx);
    return wrapDatabaseReader(ctx, ctx.db, rules, rlsConfig);
}

/**
 * Wrap database writer with RLS rules for mutations.
 */
export async function getSecureDbWriter(ctx: MutationCtx) {
    const rules = await tenantRules(ctx);
    return wrapDatabaseWriter(ctx, ctx.db, rules, rlsConfig);
}
