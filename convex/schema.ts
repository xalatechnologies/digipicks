import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { rateLimitTables } from "convex-helpers/server/rateLimit";

// =============================================================================
// CORE SCHEMA — Tables that remain at app level
//
// All domain tables have been migrated to isolated Convex components.
// Only platform-level tables shared across all components remain here.
// =============================================================================

export default defineSchema({
    // ===========================================================================
    // RATE LIMITING (convex-helpers)
    // ===========================================================================
    ...rateLimitTables,

    // ===========================================================================
    // IDENTITY & TENANCY (5 tables)
    // ===========================================================================

    tenants: defineTable({
        name: v.string(),
        slug: v.string(),
        description: v.optional(v.string()),
        domain: v.optional(v.string()),
        settings: v.any(),
        status: v.union(
            v.literal("active"),
            v.literal("suspended"),
            v.literal("pending"),
            v.literal("deleted")
        ),
        seatLimits: v.any(),
        featureFlags: v.any(),
        enabledCategories: v.array(v.string()),
        enabledSubcategories: v.optional(v.array(v.string())),
        defaultCategory: v.optional(v.string()),
        deletedAt: v.optional(v.number()),
        // Multi-tenant SaaS: ownership + onboarding
        ownerId: v.optional(v.id("users")),
        contactEmail: v.optional(v.string()),
        contactPhone: v.optional(v.string()),
        onboardingStep: v.optional(v.string()),
        plan: v.optional(v.string()),
        // Account type: privatperson vs organisasjon
        accountType: v.optional(v.union(v.literal("private"), v.literal("organization"))),
        orgNumber: v.optional(v.string()),
        // Licensing
        trialStartedAt: v.optional(v.number()),
        licenseStatus: v.optional(v.string()), // "trial" | "active" | "suspended" | "expired"
        pricePerObject: v.optional(v.number()),
        // Branding / public profile
        logo: v.optional(v.string()),
    })
        .index("by_slug", ["slug"])
        .index("by_domain", ["domain"])
        .index("by_status", ["status"])
        .index("by_owner", ["ownerId"]),

    organizations: defineTable({
        tenantId: v.id("tenants"),
        name: v.string(),
        slug: v.string(),
        description: v.optional(v.string()),
        type: v.string(),
        parentId: v.optional(v.id("organizations")),
        settings: v.any(),
        metadata: v.any(),
        status: v.union(
            v.literal("active"),
            v.literal("inactive"),
            v.literal("suspended"),
            v.literal("deleted")
        ),
        deletedAt: v.optional(v.number()),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_slug", ["tenantId", "slug"])
        .index("by_parent", ["parentId"]),

    users: defineTable({
        authUserId: v.optional(v.string()),
        tenantId: v.optional(v.id("tenants")),
        organizationId: v.optional(v.id("organizations")),
        email: v.string(),
        name: v.optional(v.string()),
        displayName: v.optional(v.string()),
        avatarUrl: v.optional(v.string()),
        nin: v.optional(v.string()),
        phoneNumber: v.optional(v.string()),
        role: v.string(),
        status: v.union(
            v.literal("active"),
            v.literal("inactive"),
            v.literal("invited"),
            v.literal("suspended"),
            v.literal("deleted")
        ),
        demoToken: v.optional(v.string()),
        phoneVerified: v.optional(v.boolean()),
        emailVerified: v.optional(v.boolean()),
        mfaEnabled: v.optional(v.boolean()),
        mfaMethod: v.optional(v.string()),
        metadata: v.any(),
        deletedAt: v.optional(v.number()),
        lastLoginAt: v.optional(v.number()),
        // Multi-tenant SaaS: password hashing + trust
        passwordHash: v.optional(v.string()),
        emailVerifiedAt: v.optional(v.number()),
        trustScore: v.optional(v.number()),
    })
        .index("by_email", ["email"])
        .index("by_authUserId", ["authUserId"])
        .index("by_nin", ["nin"])
        .index("by_tenant", ["tenantId"])
        .index("by_organization", ["organizationId"])
        .index("by_status", ["status"])
        .index("by_demoToken", ["demoToken"]),

    tenantUsers: defineTable({
        tenantId: v.id("tenants"),
        userId: v.id("users"),
        status: v.union(
            v.literal("active"),
            v.literal("invited"),
            v.literal("suspended"),
            v.literal("removed")
        ),
        invitedByUserId: v.optional(v.id("users")),
        invitedAt: v.optional(v.number()),
        joinedAt: v.optional(v.number()),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_user", ["userId"])
        .index("by_tenant_user", ["tenantId", "userId"]),

    // ===========================================================================
    // RESOURCE CUSTODY (2 tables — stays core, fundamentally about ownership)
    // ===========================================================================

    custodyGrants: defineTable({
        tenantId: v.id("tenants"),
        resourceId: v.string(), // References resources component
        userId: v.id("users"),
        custodyType: v.string(),
        grantedBy: v.optional(v.id("users")),
        grantedAt: v.number(),
        expiresAt: v.optional(v.number()),
        notes: v.optional(v.string()),
        permissions: v.any(),
        isActive: v.boolean(),
        metadata: v.any(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_resource", ["resourceId"])
        .index("by_user", ["userId"]),

    custodySubgrants: defineTable({
        tenantId: v.id("tenants"),
        parentGrantId: v.id("custodyGrants"),
        resourceId: v.string(),
        userId: v.id("users"),
        subgrantType: v.string(),
        grantedBy: v.id("users"),
        grantedAt: v.number(),
        expiresAt: v.optional(v.number()),
        notes: v.optional(v.string()),
        permissions: v.any(),
        isActive: v.boolean(),
        metadata: v.any(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_parent_grant", ["parentGrantId"])
        .index("by_resource", ["resourceId"])
        .index("by_user", ["userId"]),

    // ===========================================================================
    // PLATFORM INFRASTRUCTURE (3 tables)
    // ===========================================================================

    // Platform-Level Configuration (Singleton)
    platformConfig: defineTable({
        featureFlags: v.record(v.string(), v.boolean()),
        updatedAt: v.number(),
        updatedBy: v.optional(v.string()),
    }),

    // Event Bus — Outbox pattern for decoupled component communication
    outboxEvents: defineTable({
        topic: v.string(),
        tenantId: v.string(),
        sourceComponent: v.string(),
        payload: v.any(),
        status: v.union(
            v.literal("pending"),
            v.literal("processing"),
            v.literal("processed"),
            v.literal("failed"),
            v.literal("dead_letter")
        ),
        error: v.optional(v.string()),
        retryCount: v.number(),
        maxRetries: v.optional(v.number()),
        createdAt: v.number(),
        processedAt: v.optional(v.number()),
        lastAttemptAt: v.optional(v.number()),
    })
        .index("by_status", ["status"])
        .index("by_topic", ["topic", "status"])
        .index("by_tenant", ["tenantId", "status"])
        .index("by_created", ["createdAt"]),

    // Component Registry — Maps component slots to implementations
    componentRegistry: defineTable({
        tenantId: v.id("tenants"),
        componentId: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        category: v.string(),
        version: v.string(),
        contractVersion: v.string(),
        isCore: v.boolean(),
        isEnabled: v.boolean(),
        isInstalled: v.boolean(),
        hooks: v.optional(v.object({
            onInstall: v.optional(v.string()),
            onUninstall: v.optional(v.string()),
            onEnable: v.optional(v.string()),
            onDisable: v.optional(v.string()),
        })),
        subscribes: v.optional(v.array(v.string())),
        emits: v.optional(v.array(v.string())),
        requires: v.optional(v.array(v.string())),
        conflicts: v.optional(v.array(v.string())),
        features: v.optional(v.array(v.string())),
        metadata: v.optional(v.any()),
        installedAt: v.optional(v.number()),
        updatedAt: v.optional(v.number()),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_component", ["tenantId", "componentId"])
        .index("by_enabled", ["tenantId", "isEnabled"]),

    // ===========================================================================
    // WEBHOOK SUBSCRIPTIONS (outbound webhooks for CRM / Make)
    // ===========================================================================

    webhookSubscriptions: defineTable({
        tenantId: v.id("tenants"),
        url: v.string(),
        events: v.array(v.string()),
        secret: v.string(),
        isActive: v.boolean(),
        description: v.optional(v.string()),
        lastDeliveredAt: v.optional(v.number()),
        lastDeliveryStatus: v.optional(v.string()),
        failureCount: v.number(),
        createdBy: v.string(),
        createdAt: v.number(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_active", ["tenantId", "isActive"]),

    // ===========================================================================
    // PAYOUTS — Owner Revenue Settlement
    // ===========================================================================

    payouts: defineTable({
        tenantId: v.id("tenants"),
        amount: v.number(),
        currency: v.string(),
        bankAccountId: v.id("tenantBankAccounts"),
        status: v.union(
            v.literal("pending"),
            v.literal("processing"),
            v.literal("completed"),
            v.literal("failed"),
        ),
        requestedAt: v.number(),
        requestedBy: v.id("users"),
        processedAt: v.optional(v.number()),
        externalRef: v.optional(v.string()),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_status", ["tenantId", "status"]),

    tenantBankAccounts: defineTable({
        tenantId: v.id("tenants"),
        accountNumber: v.string(),
        accountName: v.string(),
        isDefault: v.boolean(),
        addedAt: v.number(),
        verifiedAt: v.optional(v.number()),
    })
        .index("by_tenant", ["tenantId"]),

    // ===========================================================================
    // PLATFORM FEE CONFIGURATION — Admin-managed fee settings per tenant
    // ===========================================================================

    platformFeeConfig: defineTable({
        tenantId: v.id("tenants"),
        feeType: v.union(
            v.literal("percentage"),
            v.literal("flat"),
            v.literal("percentage_plus_flat"),
        ),
        percentageFee: v.optional(v.number()), // e.g. 15 = 15%
        flatFee: v.optional(v.number()), // minor units (øre)
        currency: v.string(),
        isActive: v.boolean(),
        effectiveFrom: v.number(),
        updatedBy: v.optional(v.id("users")),
        updatedAt: v.number(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_active", ["tenantId", "isActive"]),

    // ===========================================================================
    // CREATOR PAYOUTS — Stripe transfers to creator Connect accounts
    // ===========================================================================

    creatorPayouts: defineTable({
        tenantId: v.id("tenants"),
        creatorId: v.id("users"),
        amount: v.number(), // gross amount in minor units
        platformFee: v.number(), // platform's cut
        netAmount: v.number(), // amount after fee
        currency: v.string(),
        stripeTransferId: v.optional(v.string()),
        stripeAccountId: v.string(), // creator's Stripe Connect account ID
        status: v.union(
            v.literal("pending"),
            v.literal("processing"),
            v.literal("completed"),
            v.literal("failed"),
        ),
        periodStart: v.optional(v.number()),
        periodEnd: v.optional(v.number()),
        requestedAt: v.number(),
        requestedBy: v.id("users"), // admin who initiated
        processedAt: v.optional(v.number()),
        failureReason: v.optional(v.string()),
        notes: v.optional(v.string()),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_creator", ["tenantId", "creatorId"])
        .index("by_status", ["tenantId", "status"])
        .index("by_requested", ["tenantId", "requestedAt"]),

    // ===========================================================================
    // CREATOR EARNINGS — Revenue ledger per creator per period
    // ===========================================================================

    creatorEarnings: defineTable({
        tenantId: v.id("tenants"),
        creatorId: v.id("users"),
        period: v.string(), // e.g. "2026-04"
        grossRevenue: v.number(),
        platformFees: v.number(),
        netEarnings: v.number(),
        subscriberCount: v.number(),
        paidOutAmount: v.number(),
        currency: v.string(),
        updatedAt: v.number(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_creator", ["tenantId", "creatorId"])
        .index("by_period", ["tenantId", "period"])
        .index("by_creator_period", ["tenantId", "creatorId", "period"]),

    // ===========================================================================
    // EMAIL LOGIN CODES — Vend/FINN-style OTP Login
    // ===========================================================================

    emailCodes: defineTable({
        email: v.string(),
        code: v.string(),
        appId: v.string(),
        status: v.union(
            v.literal("pending"),
            v.literal("verified"),
            v.literal("expired")
        ),
        attempts: v.number(),
        maxAttempts: v.number(),
        createdAt: v.number(),
        expiresAt: v.number(),
    })
        .index("by_email", ["email"])
        .index("by_status", ["status"]),

    // ===========================================================================
    // LICENSE BILLING — Per-Object License Pricing
    // ===========================================================================

    licenseBilling: defineTable({
        tenantId: v.id("tenants"),
        objectCount: v.number(),
        amount: v.number(),
        currency: v.string(),
        period: v.string(), // e.g. "2026-03"
        status: v.union(
            v.literal("pending"),
            v.literal("paid"),
            v.literal("failed"),
        ),
        billedAt: v.number(),
        paidAt: v.optional(v.number()),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_period", ["tenantId", "period"]),
});
