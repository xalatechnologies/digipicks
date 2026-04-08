/**
 * Licensing Facade — Per-Object License Pricing
 *
 * Manages license fees for tenant resources (utleieobjekter).
 * Pricing: per resource per month, with optional trial period.
 *
 * Comparable to BookUp's 100 kr/utleieobjekt/måned model.
 */

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

const DEFAULT_PRICE_PER_OBJECT_NOK = 100; // kr per month per object
const TRIAL_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get license status for a tenant.
 * Returns: active object count, monthly cost, trial info.
 */
export const getStatus = query({
    args: {
        tenantId: v.id("tenants"),
    },
    handler: async (ctx, { tenantId }) => {
        const tenant = await ctx.db.get(tenantId);
        if (!tenant) return null;

        const tenantData = tenant as Record<string, any>;

        // Count active published resources (may fail in test env where component isn't registered)
        let activeCount = 0;
        let totalCount = 0;
        try {
            const resources = await ctx.db
                .query("resources" as any)
                .withIndex("by_tenant" as any, (q: any) => q.eq("tenantId", tenantId))
                .collect();
            activeCount = (resources as any[]).filter((r: any) => r.status === "published").length;
            totalCount = resources.length;
        } catch {
            // Resources component not available — return 0 counts
        }

        // Trial info
        const trialStartedAt = tenantData.trialStartedAt as number | undefined;
        const trialEndsAt = trialStartedAt
            ? trialStartedAt + TRIAL_DURATION_MS
            : undefined;
        const isInTrial = trialEndsAt ? Date.now() < trialEndsAt : false;
        const trialDaysRemaining = trialEndsAt
            ? Math.max(0, Math.ceil((trialEndsAt - Date.now()) / (24 * 60 * 60 * 1000)))
            : 0;

        // Pricing
        const pricePerObject = tenantData.pricePerObject ?? DEFAULT_PRICE_PER_OBJECT_NOK;
        const monthlyCost = isInTrial ? 0 : activeCount * pricePerObject;
        const licenseStatus = tenantData.licenseStatus ?? (isInTrial ? "trial" : "active");

        return {
            tenantId,
            activeCount,
            totalCount,
            pricePerObject,
            monthlyCost,
            currency: "NOK",
            licenseStatus,
            isInTrial,
            trialDaysRemaining,
            trialStartedAt: trialStartedAt ?? null,
            trialEndsAt: trialEndsAt ?? null,
        };
    },
});

/**
 * List license billing history for a tenant.
 */
export const listBillingHistory = query({
    args: {
        tenantId: v.id("tenants"),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, limit }) => {
        let records = await ctx.db
            .query("licenseBilling")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .order("desc")
            .collect();

        if (limit) {
            records = records.slice(0, limit);
        }

        return records;
    },
});

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Activate trial period for a tenant.
 * Sets trialStartedAt on the tenant.
 */
export const activateTrial = mutation({
    args: {
        tenantId: v.id("tenants"),
    },
    handler: async (ctx, { tenantId }) => {
        const tenant = await ctx.db.get(tenantId);
        if (!tenant) return { success: false, error: "Tenant not found" };

        const data = tenant as Record<string, any>;
        if (data.trialStartedAt) {
            return { success: false, error: "Trial already activated" };
        }

        await ctx.db.patch(tenantId, {
            trialStartedAt: Date.now(),
            licenseStatus: "trial",
        } as any);

        return {
            success: true as const,
            trialEndsAt: Date.now() + TRIAL_DURATION_MS,
        };
    },
});

/**
 * Record a monthly license billing event.
 * Called by a cron job or manual trigger.
 */
export const recordBilling = mutation({
    args: {
        tenantId: v.id("tenants"),
        objectCount: v.number(),
        amount: v.number(),
        period: v.string(), // e.g. "2026-03"
    },
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("licenseBilling", {
            tenantId: args.tenantId,
            objectCount: args.objectCount,
            amount: args.amount,
            currency: "NOK",
            period: args.period,
            status: "pending",
            billedAt: Date.now(),
        });

        return { success: true, billingId: id };
    },
});

/**
 * Update license billing status.
 */
export const updateBillingStatus = mutation({
    args: {
        billingId: v.id("licenseBilling"),
        status: v.union(v.literal("pending"), v.literal("paid"), v.literal("failed")),
        paidAt: v.optional(v.number()),
    },
    handler: async (ctx, { billingId, status, paidAt }) => {
        const updates: Record<string, any> = { status };
        if (paidAt) updates.paidAt = paidAt;

        await ctx.db.patch(billingId, updates);
        return { success: true };
    },
});

// =============================================================================
// LICENSE PURCHASE (Stripe / Vipps integration)
// =============================================================================

/**
 * Initiate a license purchase for a tenant.
 * Creates a licenseBilling record in "pending" status and returns metadata
 * for the frontend to redirect to Stripe Checkout or Vipps ePayment.
 *
 * Flow:
 *   1. Frontend calls initiatePurchase → gets billingId + payment metadata
 *   2. Frontend calls billing.stripe.createPayment or billing.vipps.createPayment
 *      with reference = `license_${billingId}` and the computed amount
 *   3. Payment provider redirects back → frontend calls handlePurchaseCallback
 *   4. License billing record updated to "paid", tenant licenseStatus → "active"
 */
export const initiatePurchase = mutation({
    args: {
        tenantId: v.id("tenants"),
        period: v.string(), // e.g. "2026-03"
        paymentProvider: v.union(v.literal("stripe"), v.literal("vipps")),
    },
    handler: async (ctx, { tenantId, period, paymentProvider }) => {
        const tenant = await ctx.db.get(tenantId);
        if (!tenant) return { success: false, error: "Tenant not found" };

        const tenantData = tenant as Record<string, any>;

        // Count published resources to calculate amount
        const resources = await ctx.db
            .query("resources" as any)
            .withIndex("by_tenant" as any, (q: any) => q.eq("tenantId", tenantId))
            .collect();

        const activeCount = (resources as any[]).filter((r: any) => r.status === "published").length;
        if (activeCount === 0) {
            return { success: false, error: "No active listings to bill" };
        }

        const pricePerObject = tenantData.pricePerObject ?? DEFAULT_PRICE_PER_OBJECT_NOK;
        const amount = activeCount * pricePerObject;
        const amountMinorUnits = amount * 100; // øre for Vipps / Stripe

        // Check for existing billing for this period
        const existing = await ctx.db
            .query("licenseBilling")
            .withIndex("by_period", (q) => q.eq("tenantId", tenantId).eq("period", period))
            .first();

        if (existing && existing.status === "paid") {
            return { success: false, error: "Already paid for this period" };
        }

        // Create or reuse billing record
        let billingId;
        if (existing && existing.status === "pending") {
            billingId = existing._id;
            // Update amount in case object count changed
            await ctx.db.patch(billingId, {
                objectCount: activeCount,
                amount,
            });
        } else {
            billingId = await ctx.db.insert("licenseBilling", {
                tenantId,
                objectCount: activeCount,
                amount,
                currency: "NOK",
                period,
                status: "pending",
                billedAt: Date.now(),
            });
        }

        // Return metadata for frontend payment initiation
        return {
            success: true as const,
            billingId,
            reference: `license_${billingId}`,
            amount: amountMinorUnits,
            currency: "NOK",
            description: `Lisens: ${activeCount} objekt(er) — ${period}`,
            paymentProvider,
            objectCount: activeCount,
            pricePerObject,
            totalNOK: amount,
        };
    },
});

/**
 * Handle license payment confirmation callback.
 * Called after Stripe/Vipps payment is completed — marks billing as paid
 * and ensures tenant license status is active.
 */
export const handlePurchaseCallback = mutation({
    args: {
        billingId: v.id("licenseBilling"),
        paymentReference: v.string(),
        paymentProvider: v.string(),
    },
    handler: async (ctx, { billingId, paymentReference, paymentProvider }) => {
        const billing = await ctx.db.get(billingId);
        if (!billing) return { success: false, error: "Billing record not found" };
        if (billing.status === "paid") return { success: true, alreadyPaid: true };

        // Mark as paid
        await ctx.db.patch(billingId, {
            status: "paid",
            paidAt: Date.now(),
        } as any);

        // Ensure tenant license status is active
        await ctx.db.patch(billing.tenantId, {
            licenseStatus: "active",
        } as any);

        return {
            success: true as const,
            paymentReference,
            paymentProvider,
        };
    },
});
