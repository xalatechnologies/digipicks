/**
 * Subscriptions Component Functions
 *
 * Pure component implementation — operates only on its own tables.
 * Uses v.string() for all external references (tenantId, userId, etc.).
 * Data enrichment (user names, tier names) happens in the facade layer.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// MEMBERSHIP TIER QUERIES
// =============================================================================

/**
 * List membership tiers for a tenant, optionally filtered by public/active.
 */
export const listTiers = query({
    args: {
        tenantId: v.string(),
        publicOnly: v.optional(v.boolean()),
        activeOnly: v.optional(v.boolean()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, publicOnly, activeOnly }) => {
        let tiers;

        if (activeOnly) {
            tiers = await ctx.db
                .query("membershipTiers")
                .withIndex("by_active", (q) =>
                    q.eq("tenantId", tenantId).eq("isActive", true)
                )
                .collect();
        } else {
            tiers = await ctx.db
                .query("membershipTiers")
                .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
                .collect();
        }

        if (publicOnly) {
            tiers = tiers.filter((t) => t.isPublic);
        }

        // Sort by sortOrder ascending
        tiers.sort((a, b) => a.sortOrder - b.sortOrder);

        return tiers;
    },
});

/**
 * Get a single membership tier by ID.
 */
export const getTier = query({
    args: {
        id: v.id("membershipTiers"),
    },
    returns: v.any(),
    handler: async (ctx, { id }) => {
        const tier = await ctx.db.get(id);
        if (!tier) {
            throw new Error("Membership tier not found");
        }
        return tier;
    },
});

/**
 * Get a membership tier by slug within a tenant.
 */
export const getTierBySlug = query({
    args: {
        tenantId: v.string(),
        slug: v.string(),
    },
    returns: v.any(),
    handler: async (ctx, { tenantId, slug }) => {
        const tier = await ctx.db
            .query("membershipTiers")
            .withIndex("by_slug", (q) =>
                q.eq("tenantId", tenantId).eq("slug", slug)
            )
            .first();

        if (!tier) {
            throw new Error("Membership tier not found");
        }
        return tier;
    },
});

// =============================================================================
// MEMBERSHIP TIER MUTATIONS
// =============================================================================

/**
 * Create a new membership tier.
 */
export const createTier = mutation({
    args: {
        tenantId: v.string(),
        name: v.string(),
        slug: v.string(),
        description: v.optional(v.string()),
        shortDescription: v.optional(v.string()),
        price: v.number(),
        currency: v.string(),
        billingInterval: v.string(),
        trialDays: v.optional(v.number()),
        benefits: v.array(
            v.object({
                id: v.string(),
                type: v.string(),
                label: v.string(),
                config: v.any(),
            })
        ),
        pricingGroupId: v.optional(v.string()),
        earlyAccessDays: v.optional(v.number()),
        maxMembers: v.optional(v.number()),
        isWaitlistEnabled: v.optional(v.boolean()),
        iconStorageId: v.optional(v.string()),
        color: v.optional(v.string()),
        sortOrder: v.optional(v.number()),
        isActive: v.optional(v.boolean()),
        isPublic: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        // Check for duplicate slug within tenant
        const existing = await ctx.db
            .query("membershipTiers")
            .withIndex("by_slug", (q) =>
                q.eq("tenantId", args.tenantId).eq("slug", args.slug)
            )
            .first();

        if (existing) {
            throw new Error(`Tier with slug "${args.slug}" already exists for this tenant`);
        }

        const id = await ctx.db.insert("membershipTiers", {
            tenantId: args.tenantId,
            name: args.name,
            slug: args.slug,
            description: args.description,
            shortDescription: args.shortDescription,
            price: args.price,
            currency: args.currency,
            billingInterval: args.billingInterval,
            trialDays: args.trialDays,
            benefits: args.benefits,
            pricingGroupId: args.pricingGroupId,
            earlyAccessDays: args.earlyAccessDays,
            maxMembers: args.maxMembers,
            currentMemberCount: 0,
            isWaitlistEnabled: args.isWaitlistEnabled ?? false,
            iconStorageId: args.iconStorageId,
            color: args.color,
            sortOrder: args.sortOrder ?? 0,
            isActive: args.isActive ?? true,
            isPublic: args.isPublic ?? true,
            metadata: args.metadata,
        });

        return { id: id as string };
    },
});

/**
 * Update a membership tier.
 */
export const updateTier = mutation({
    args: {
        id: v.id("membershipTiers"),
        name: v.optional(v.string()),
        slug: v.optional(v.string()),
        description: v.optional(v.string()),
        shortDescription: v.optional(v.string()),
        price: v.optional(v.number()),
        currency: v.optional(v.string()),
        billingInterval: v.optional(v.string()),
        trialDays: v.optional(v.number()),
        benefits: v.optional(
            v.array(
                v.object({
                    id: v.string(),
                    type: v.string(),
                    label: v.string(),
                    config: v.any(),
                })
            )
        ),
        pricingGroupId: v.optional(v.string()),
        earlyAccessDays: v.optional(v.number()),
        maxMembers: v.optional(v.number()),
        isWaitlistEnabled: v.optional(v.boolean()),
        iconStorageId: v.optional(v.string()),
        color: v.optional(v.string()),
        sortOrder: v.optional(v.number()),
        isActive: v.optional(v.boolean()),
        isPublic: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, ...updates }) => {
        const tier = await ctx.db.get(id);
        if (!tier) {
            throw new Error("Membership tier not found");
        }

        // If slug is changing, check for duplicates
        if (updates.slug && updates.slug !== tier.slug) {
            const existing = await ctx.db
                .query("membershipTiers")
                .withIndex("by_slug", (q) =>
                    q.eq("tenantId", tier.tenantId).eq("slug", updates.slug!)
                )
                .first();

            if (existing) {
                throw new Error(`Tier with slug "${updates.slug}" already exists for this tenant`);
            }
        }

        const filteredUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );

        await ctx.db.patch(id, filteredUpdates);
        return { success: true };
    },
});

/**
 * Atomic increment/decrement of currentMemberCount on a tier.
 */
export const updateTierMemberCount = mutation({
    args: {
        id: v.id("membershipTiers"),
        delta: v.number(),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, delta }) => {
        const tier = await ctx.db.get(id);
        if (!tier) {
            throw new Error("Membership tier not found");
        }

        const newCount = Math.max(0, tier.currentMemberCount + delta);
        await ctx.db.patch(id, { currentMemberCount: newCount });

        return { success: true };
    },
});

// =============================================================================
// MEMBERSHIP QUERIES
// =============================================================================

/**
 * List memberships for a tenant, optionally filtered by tier or status.
 */
export const listMemberships = query({
    args: {
        tenantId: v.string(),
        tierId: v.optional(v.string()),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
        cursor: v.optional(v.string()),
    },
    returns: v.any(),
    handler: async (ctx, { tenantId, tierId, status, limit }) => {
        let memberships;

        if (status) {
            memberships = await ctx.db
                .query("memberships")
                .withIndex("by_status", (q) =>
                    q.eq("tenantId", tenantId).eq("status", status)
                )
                .collect();
        } else {
            memberships = await ctx.db
                .query("memberships")
                .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
                .collect();
        }

        if (tierId) {
            memberships = memberships.filter((m) => m.tierId === tierId);
        }

        // Sort newest first
        memberships.sort((a, b) => b._creationTime - a._creationTime);

        if (limit) {
            memberships = memberships.slice(0, limit);
        }

        return memberships;
    },
});

/**
 * Get a single membership by ID.
 */
export const getMembership = query({
    args: {
        id: v.id("memberships"),
    },
    returns: v.any(),
    handler: async (ctx, { id }) => {
        const membership = await ctx.db.get(id);
        if (!membership) {
            throw new Error("Membership not found");
        }
        return membership;
    },
});

/**
 * Get active membership for a user.
 */
export const getMembershipByUser = query({
    args: {
        userId: v.string(),
    },
    returns: v.any(),
    handler: async (ctx, { userId }) => {
        const memberships = await ctx.db
            .query("memberships")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        // Return the active membership (prefer active, then pending, then paused)
        const active = memberships.find((m) => m.status === "active");
        if (active) return active;

        const pending = memberships.find((m) => m.status === "pending");
        if (pending) return pending;

        const paused = memberships.find((m) => m.status === "paused");
        if (paused) return paused;

        return null;
    },
});

/**
 * List memberships due for renewal before a given date.
 */
export const listDueForRenewal = query({
    args: {
        beforeDate: v.number(),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { beforeDate }) => {
        const memberships = await ctx.db
            .query("memberships")
            .withIndex("by_next_billing")
            .collect();

        return memberships.filter(
            (m) =>
                m.nextBillingDate !== undefined &&
                m.nextBillingDate <= beforeDate &&
                m.autoRenew &&
                m.status === "active"
        );
    },
});

/**
 * Get aggregate membership stats for a tenant.
 */
export const getMembershipStats = query({
    args: {
        tenantId: v.string(),
    },
    returns: v.any(),
    handler: async (ctx, { tenantId }) => {
        const memberships = await ctx.db
            .query("memberships")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .collect();

        const byStatus: Record<string, number> = {};
        const byTier: Record<string, number> = {};

        for (const m of memberships) {
            byStatus[m.status] = (byStatus[m.status] || 0) + 1;
            byTier[m.tierId] = (byTier[m.tierId] || 0) + 1;
        }

        return {
            total: memberships.length,
            byStatus,
            byTier,
        };
    },
});

// =============================================================================
// MEMBERSHIP MUTATIONS
// =============================================================================

/**
 * Create a new membership.
 */
export const createMembership = mutation({
    args: {
        tenantId: v.string(),
        userId: v.string(),
        tierId: v.string(),
        memberNumber: v.optional(v.string()),
        status: v.optional(v.string()),
        startDate: v.number(),
        endDate: v.number(),
        originalStartDate: v.optional(v.number()),
        autoRenew: v.optional(v.boolean()),
        nextBillingDate: v.optional(v.number()),
        presaleAccessGranted: v.optional(v.boolean()),
        enrollmentChannel: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("memberships", {
            tenantId: args.tenantId,
            userId: args.userId,
            tierId: args.tierId,
            memberNumber: args.memberNumber,
            status: args.status ?? "pending",
            startDate: args.startDate,
            endDate: args.endDate,
            originalStartDate: args.originalStartDate ?? args.startDate,
            autoRenew: args.autoRenew ?? true,
            nextBillingDate: args.nextBillingDate,
            presaleAccessGranted: args.presaleAccessGranted ?? false,
            enrollmentChannel: args.enrollmentChannel,
            metadata: args.metadata,
        });

        return { id: id as string };
    },
});

/**
 * Update a membership.
 */
export const updateMembership = mutation({
    args: {
        id: v.id("memberships"),
        tierId: v.optional(v.string()),
        memberNumber: v.optional(v.string()),
        autoRenew: v.optional(v.boolean()),
        nextBillingDate: v.optional(v.number()),
        lastPaymentDate: v.optional(v.number()),
        lastPaymentId: v.optional(v.string()),
        failedPaymentCount: v.optional(v.number()),
        endDate: v.optional(v.number()),
        benefitsUsedThisPeriod: v.optional(v.any()),
        presaleAccessGranted: v.optional(v.boolean()),
        previousTierId: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, ...updates }) => {
        const membership = await ctx.db.get(id);
        if (!membership) {
            throw new Error("Membership not found");
        }

        const filteredUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );

        await ctx.db.patch(id, filteredUpdates);
        return { success: true };
    },
});

/**
 * Update membership status with optional cancellation fields.
 */
export const updateMembershipStatus = mutation({
    args: {
        id: v.id("memberships"),
        status: v.string(),
        cancelledAt: v.optional(v.number()),
        cancelledBy: v.optional(v.string()),
        cancelReason: v.optional(v.string()),
        cancelEffectiveDate: v.optional(v.number()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, status, ...cancelFields }) => {
        const membership = await ctx.db.get(id);
        if (!membership) {
            throw new Error("Membership not found");
        }

        const patch: Record<string, unknown> = { status };

        if (cancelFields.cancelledAt !== undefined) patch.cancelledAt = cancelFields.cancelledAt;
        if (cancelFields.cancelledBy !== undefined) patch.cancelledBy = cancelFields.cancelledBy;
        if (cancelFields.cancelReason !== undefined) patch.cancelReason = cancelFields.cancelReason;
        if (cancelFields.cancelEffectiveDate !== undefined) patch.cancelEffectiveDate = cancelFields.cancelEffectiveDate;

        await ctx.db.patch(id, patch);
        return { success: true };
    },
});

// =============================================================================
// BENEFIT USAGE QUERIES
// =============================================================================

/**
 * List benefit usage for a membership, optionally filtered by benefit type.
 */
export const listBenefitUsage = query({
    args: {
        membershipId: v.string(),
        benefitType: v.optional(v.string()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { membershipId, benefitType }) => {
        let usage;

        if (benefitType) {
            usage = await ctx.db
                .query("memberBenefitUsage")
                .withIndex("by_benefit_type", (q) =>
                    q.eq("membershipId", membershipId).eq("benefitType", benefitType)
                )
                .collect();
        } else {
            usage = await ctx.db
                .query("memberBenefitUsage")
                .withIndex("by_membership", (q) => q.eq("membershipId", membershipId))
                .collect();
        }

        // Sort by usedAt descending
        usage.sort((a, b) => b.usedAt - a.usedAt);

        return usage;
    },
});

/**
 * Count uses of a specific benefit for a membership.
 */
export const countBenefitUsage = query({
    args: {
        membershipId: v.string(),
        benefitId: v.string(),
    },
    returns: v.number(),
    handler: async (ctx, { membershipId, benefitId }) => {
        const usage = await ctx.db
            .query("memberBenefitUsage")
            .withIndex("by_membership", (q) => q.eq("membershipId", membershipId))
            .collect();

        return usage.filter((u) => u.benefitId === benefitId).length;
    },
});

// =============================================================================
// BENEFIT USAGE MUTATIONS
// =============================================================================

/**
 * Record a benefit usage.
 */
export const createBenefitUsage = mutation({
    args: {
        tenantId: v.string(),
        membershipId: v.string(),
        benefitId: v.string(),
        benefitType: v.string(),
        usedAt: v.number(),
        orderId: v.optional(v.string()),
        performanceId: v.optional(v.string()),
        discountAmount: v.optional(v.number()),
        description: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("memberBenefitUsage", {
            tenantId: args.tenantId,
            membershipId: args.membershipId,
            benefitId: args.benefitId,
            benefitType: args.benefitType,
            usedAt: args.usedAt,
            orderId: args.orderId,
            performanceId: args.performanceId,
            discountAmount: args.discountAmount,
            description: args.description,
            metadata: args.metadata,
        });

        return { id: id as string };
    },
});
