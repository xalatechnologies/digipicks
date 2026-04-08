/**
 * Rate Limits — Per-tenant and per-user API rate limiting
 *
 * Uses convex-helpers/server/rateLimit for token bucket and fixed window patterns.
 * Integrated into the facade middleware chain.
 *
 * @see https://github.com/get-convex/convex-helpers#rate-limiting
 */

import { defineRateLimits } from "convex-helpers/server/rateLimit";

// =============================================================================
// RATE LIMIT DEFINITIONS
// =============================================================================

/**
 * Rate limit configuration.
 * Each entry defines a named rate limit with its algorithm and parameters.
 *
 * Usage in facade mutations:
 *   await rateLimit(ctx, { name: "createBooking", key: rateLimitKeys.tenant(tenantId) });
 */
export const RATE_LIMITS = {
    // -------------------------------------------------------------------------
    // Booking operations (per-tenant)
    // -------------------------------------------------------------------------
    createBooking: {
        kind: "token bucket" as const,
        rate: 100,       // 100 tokens per period
        period: 60_000,  // 1 minute
        capacity: 200,   // Burst capacity of 200
    },
    cancelBooking: {
        kind: "token bucket" as const,
        rate: 5,
        period: 60_000,
        capacity: 10,
    },

    // -------------------------------------------------------------------------
    // Review operations (per-user)
    // -------------------------------------------------------------------------
    createReview: {
        kind: "token bucket" as const,
        rate: 5,
        period: 60_000,
        capacity: 10,
    },
    moderateReview: {
        kind: "token bucket" as const,
        rate: 20,
        period: 60_000,
        capacity: 50,
    },
    markHelpful: {
        kind: "token bucket" as const,
        rate: 10,
        period: 60_000,
        capacity: 20,
    },

    // -------------------------------------------------------------------------
    // Messaging (per-user)
    // -------------------------------------------------------------------------
    sendMessage: {
        kind: "token bucket" as const,
        rate: 20,
        period: 60_000,
        capacity: 50,
    },

    // -------------------------------------------------------------------------
    // Auth operations (per-IP or per-user — fixed window)
    // -------------------------------------------------------------------------
    loginAttempt: {
        kind: "fixed window" as const,
        rate: 5,
        period: 300_000,  // 5 minutes
    },
    passwordReset: {
        kind: "fixed window" as const,
        rate: 3,
        period: 3_600_000, // 1 hour
    },
    magicLinkRequest: {
        kind: "fixed window" as const,
        rate: 5,
        period: 600_000,  // 10 minutes
    },

    // -------------------------------------------------------------------------
    // Resource operations (per-tenant)
    // -------------------------------------------------------------------------
    mutateResource: {
        kind: "token bucket" as const,
        rate: 15,
        period: 60_000,
        capacity: 30,
    },

    // -------------------------------------------------------------------------
    // Pricing operations (per-tenant)
    // -------------------------------------------------------------------------
    mutatePricing: {
        kind: "token bucket" as const,
        rate: 20,
        period: 60_000,
        capacity: 40,
    },

    // -------------------------------------------------------------------------
    // Billing operations (per-tenant)
    // -------------------------------------------------------------------------
    mutateBilling: {
        kind: "token bucket" as const,
        rate: 10,
        period: 60_000,
        capacity: 20,
    },

    // -------------------------------------------------------------------------
    // RBAC operations (per-tenant)
    // -------------------------------------------------------------------------
    mutateRbac: {
        kind: "token bucket" as const,
        rate: 10,
        period: 60_000,
        capacity: 20,
    },

    // -------------------------------------------------------------------------
    // Notification operations (per-user)
    // -------------------------------------------------------------------------
    createNotification: {
        kind: "token bucket" as const,
        rate: 30,
        period: 60_000,
        capacity: 60,
    },
    mutateNotification: {
        kind: "token bucket" as const,
        rate: 30,
        period: 60_000,
        capacity: 60,
    },

    // -------------------------------------------------------------------------
    // Addon operations (per-tenant)
    // -------------------------------------------------------------------------
    mutateAddon: {
        kind: "token bucket" as const,
        rate: 15,
        period: 60_000,
        capacity: 30,
    },

    // -------------------------------------------------------------------------
    // Category & amenity operations (per-tenant)
    // -------------------------------------------------------------------------
    mutateCatalog: {
        kind: "token bucket" as const,
        rate: 10,
        period: 60_000,
        capacity: 20,
    },

    // -------------------------------------------------------------------------
    // Integration operations (per-tenant)
    // -------------------------------------------------------------------------
    mutateIntegration: {
        kind: "token bucket" as const,
        rate: 10,
        period: 60_000,
        capacity: 20,
    },

    // -------------------------------------------------------------------------
    // Favorites operations (per-user)
    // -------------------------------------------------------------------------
    mutateFavorite: {
        kind: "token bucket" as const,
        rate: 30,
        period: 60_000,
        capacity: 60,
    },

    // -------------------------------------------------------------------------
    // Block operations (per-tenant)
    // -------------------------------------------------------------------------
    mutateBlock: {
        kind: "token bucket" as const,
        rate: 15,
        period: 60_000,
        capacity: 30,
    },

    // -------------------------------------------------------------------------
    // Season operations (per-tenant)
    // -------------------------------------------------------------------------
    mutateSeason: {
        kind: "token bucket" as const,
        rate: 10,
        period: 60_000,
        capacity: 20,
    },

    // -------------------------------------------------------------------------
    // Content template operations (per-tenant)
    // -------------------------------------------------------------------------
    mutateContentTemplate: {
        kind: "token bucket" as const,
        rate: 10,
        period: 60_000,
        capacity: 20,
    },

    // -------------------------------------------------------------------------
    // Allocation operations (per-tenant)
    // -------------------------------------------------------------------------
    mutateAllocation: {
        kind: "token bucket" as const,
        rate: 10,
        period: 60_000,
        capacity: 20,
    },

    // -------------------------------------------------------------------------
    // Admin operations (per-tenant)
    // -------------------------------------------------------------------------
    bulkExport: {
        kind: "token bucket" as const,
        rate: 1,
        period: 60_000,
        capacity: 3,
    },
    bulkImport: {
        kind: "token bucket" as const,
        rate: 1,
        period: 60_000,
        capacity: 2,
    },

    // -------------------------------------------------------------------------
    // Support operations (per-user)
    // -------------------------------------------------------------------------
    createSupportTicket: {
        kind: "token bucket" as const,
        rate: 5,
        period: 60_000,
        capacity: 10,
    },
    addSupportMessage: {
        kind: "token bucket" as const,
        rate: 20,
        period: 60_000,
        capacity: 50,
    },
    escalateSupportTicket: {
        kind: "token bucket" as const,
        rate: 3,
        period: 60_000,
        capacity: 5,
    },

    // -------------------------------------------------------------------------
    // General API (per-tenant)
    // -------------------------------------------------------------------------
    apiGeneral: {
        kind: "token bucket" as const,
        rate: 100,
        period: 60_000,
        capacity: 200,
    },

    // -------------------------------------------------------------------------
    // Search operations (per-tenant)
    // -------------------------------------------------------------------------
    searchQuery: {
        kind: "token bucket" as const,
        rate: 30,
        period: 60_000,
        capacity: 60,
    },

    // -------------------------------------------------------------------------
    // Guide operations (per-user)
    // -------------------------------------------------------------------------
    mutateGuide: {
        kind: "token bucket" as const,
        rate: 20,
        period: 60_000,
        capacity: 40,
    },

    // -------------------------------------------------------------------------
    // Ticketing operations (per-tenant)
    // -------------------------------------------------------------------------
    createPerformance: {
        kind: "token bucket" as const,
        rate: 10,
        period: 60_000,
        capacity: 20,
    },
    mutatePerformance: {
        kind: "token bucket" as const,
        rate: 15,
        period: 60_000,
        capacity: 30,
    },

    // -------------------------------------------------------------------------
    // Order operations (per-user)
    // -------------------------------------------------------------------------
    createOrder: {
        kind: "token bucket" as const,
        rate: 10,
        period: 60_000,
        capacity: 20,
    },
    submitOrder: {
        kind: "token bucket" as const,
        rate: 5,
        period: 60_000,
        capacity: 10,
    },
    mutateOrder: {
        kind: "token bucket" as const,
        rate: 20,
        period: 60_000,
        capacity: 40,
    },

    // -------------------------------------------------------------------------
    // Device operations (per-tenant)
    // -------------------------------------------------------------------------
    mutateDevice: {
        kind: "token bucket" as const,
        rate: 20,
        period: 60_000,
        capacity: 40,
    },

    // -------------------------------------------------------------------------
    // Ticket operations (per-user)
    // -------------------------------------------------------------------------
    checkInTicket: {
        kind: "token bucket" as const,
        rate: 60,       // Scanners need fast throughput
        period: 60_000,
        capacity: 120,
    },
    transferTicket: {
        kind: "token bucket" as const,
        rate: 5,
        period: 60_000,
        capacity: 10,
    },

    // -------------------------------------------------------------------------
    // Gift card operations (per-user)
    // -------------------------------------------------------------------------
    createGiftCard: {
        kind: "token bucket" as const,
        rate: 5,
        period: 60_000,
        capacity: 10,
    },
    redeemGiftCard: {
        kind: "token bucket" as const,
        rate: 10,
        period: 60_000,
        capacity: 20,
    },
    mutateGiftCard: {
        kind: "token bucket" as const,
        rate: 10,
        period: 60_000,
        capacity: 20,
    },

    // -------------------------------------------------------------------------
    // Subscription operations (per-user)
    // -------------------------------------------------------------------------
    subscribeMembership: {
        kind: "token bucket" as const,
        rate: 3,
        period: 60_000,
        capacity: 5,
    },
    mutateMembership: {
        kind: "token bucket" as const,
        rate: 10,
        period: 60_000,
        capacity: 20,
    },

    // -------------------------------------------------------------------------
    // Resale operations (per-user)
    // -------------------------------------------------------------------------
    createResaleListing: {
        kind: "token bucket" as const,
        rate: 5,
        period: 60_000,
        capacity: 10,
    },
    mutateResale: {
        kind: "token bucket" as const,
        rate: 10,
        period: 60_000,
        capacity: 20,
    },

    // -------------------------------------------------------------------------
    // Picks operations (per-user)
    // -------------------------------------------------------------------------
    createPick: {
        kind: "fixed window" as const,
        rate: 20,
        period: 3_600_000, // 1 hour — PRD: max 20 picks/hour per creator
    },
    gradePick: {
        kind: "token bucket" as const,
        rate: 30,
        period: 60_000,
        capacity: 60,
    },
    mutatePick: {
        kind: "token bucket" as const,
        rate: 30,
        period: 60_000,
        capacity: 60,
    },

    // -------------------------------------------------------------------------
    // GDPR operations (per-tenant)
    // -------------------------------------------------------------------------
    gdprPurge: {
        kind: "token bucket" as const,
        rate: 2,
        period: 60_000,
        capacity: 5,
    },
} as const;

// =============================================================================
// TYPED RATE LIMIT FUNCTIONS
// =============================================================================

/**
 * Typed rate limit functions derived from RATE_LIMITS definitions.
 *
 * - rateLimit(ctx, { name, key, throws? }) — Consume a token, throw or return { ok, retryAt }
 * - checkRateLimit(ctx, { name, key }) — Check without consuming (read-only)
 * - resetRateLimit(ctx, { name, key }) — Reset a rate limit bucket
 */
export const { rateLimit, checkRateLimit, resetRateLimit } =
    defineRateLimits(RATE_LIMITS);

// =============================================================================
// KEY BUILDERS
// =============================================================================

/**
 * Rate limit key builder helpers.
 * Use these to construct the rate limit key for each request.
 */
export const rateLimitKeys = {
    /** Key scoped to a tenant */
    tenant: (tenantId: string) => `tenant:${tenantId}`,
    /** Key scoped to a user */
    user: (userId: string) => `user:${userId}`,
    /** Key scoped to a tenant + user */
    tenantUser: (tenantId: string, userId: string) => `tenant:${tenantId}:user:${userId}`,
    /** Key scoped to an IP address */
    ip: (ipAddress: string) => `ip:${ipAddress}`,
};
