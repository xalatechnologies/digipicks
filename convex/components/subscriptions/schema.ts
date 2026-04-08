/**
 * Subscriptions Component Schema
 *
 * Club membership engine — tiers, memberships, benefit tracking.
 * External references (tenantId, userId, pricingGroupId, orderId, performanceId)
 * use v.string() because component tables cannot reference app-level tables.
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    membershipTiers: defineTable({
        tenantId: v.string(),
        name: v.string(),
        slug: v.string(),
        description: v.optional(v.string()),
        shortDescription: v.optional(v.string()),
        price: v.number(),
        currency: v.string(),
        billingInterval: v.string(), // "monthly" | "quarterly" | "yearly" | "one_time" | "lifetime"
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
        currentMemberCount: v.number(),
        isWaitlistEnabled: v.boolean(),
        iconStorageId: v.optional(v.string()),
        color: v.optional(v.string()),
        sortOrder: v.number(),
        isActive: v.boolean(),
        isPublic: v.boolean(),
        // Stripe integration
        stripeProductId: v.optional(v.string()),
        stripePriceId: v.optional(v.string()),
        metadata: v.optional(v.any()),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_slug", ["tenantId", "slug"])
        .index("by_active", ["tenantId", "isActive"]),

    memberships: defineTable({
        tenantId: v.string(),
        userId: v.string(),
        tierId: v.string(),
        creatorId: v.optional(v.string()), // Creator being subscribed to
        memberNumber: v.optional(v.string()),
        status: v.string(), // "pending" | "active" | "paused" | "expired" | "cancelled" | "past_due"
        startDate: v.number(),
        endDate: v.number(),
        originalStartDate: v.number(),
        autoRenew: v.boolean(),
        nextBillingDate: v.optional(v.number()),
        lastPaymentDate: v.optional(v.number()),
        lastPaymentId: v.optional(v.string()),
        failedPaymentCount: v.optional(v.number()),
        cancelledAt: v.optional(v.number()),
        cancelledBy: v.optional(v.string()),
        cancelReason: v.optional(v.string()),
        cancelEffectiveDate: v.optional(v.number()),
        benefitsUsedThisPeriod: v.optional(v.any()),
        presaleAccessGranted: v.boolean(),
        previousTierId: v.optional(v.string()),
        enrollmentChannel: v.optional(v.string()), // "web" | "counter" | "api" | "gift"
        // Stripe integration
        stripeSubscriptionId: v.optional(v.string()),
        stripeCustomerId: v.optional(v.string()),
        metadata: v.optional(v.any()),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_user", ["userId"])
        .index("by_tier", ["tierId"])
        .index("by_status", ["tenantId", "status"])
        .index("by_next_billing", ["nextBillingDate"])
        .index("by_member_number", ["tenantId", "memberNumber"])
        .index("by_stripe_subscription", ["stripeSubscriptionId"])
        .index("by_creator", ["creatorId"]),

    /**
     * Stripe Connect accounts for creators who receive payouts.
     */
    creatorAccounts: defineTable({
        tenantId: v.string(),
        userId: v.string(), // The creator's user ID
        stripeAccountId: v.string(),
        status: v.string(), // "pending" | "onboarding" | "active" | "restricted" | "disabled"
        chargesEnabled: v.boolean(),
        payoutsEnabled: v.boolean(),
        detailsSubmitted: v.boolean(),
        metadata: v.optional(v.any()),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_user", ["userId"])
        .index("by_stripe_account", ["stripeAccountId"]),

    memberBenefitUsage: defineTable({
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
    })
        .index("by_membership", ["membershipId"])
        .index("by_tenant", ["tenantId"])
        .index("by_benefit_type", ["membershipId", "benefitType"]),
});
