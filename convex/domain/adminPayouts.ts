/**
 * Admin Payouts Facade — Platform Fee Configuration, Creator Earnings & Stripe Transfers
 *
 * Provides the backend queries/mutations for the admin payouts dashboard:
 * - Platform fee configuration (CRUD)
 * - Creator earnings overview with filtering
 * - Creator payout (Stripe transfer) initiation and status tracking
 * - Payout history and audit log
 *
 * Uses core schema tables: platformFeeConfig, creatorPayouts, creatorEarnings
 */

import { mutation, query, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { emitEvent } from "../lib/eventBus";
import { withAudit } from "../lib/auditHelpers";
import { requireAdmin } from "../lib/auth";

// =============================================================================
// PLATFORM FEE CONFIGURATION — Queries
// =============================================================================

/**
 * Get the active fee configuration for a tenant.
 */
export const getFeeConfig = query({
    args: {
        tenantId: v.id("tenants"),
    },
    handler: async (ctx, { tenantId }) => {
        const configs = await ctx.db
            .query("platformFeeConfig")
            .withIndex("by_active", (q) => q.eq("tenantId", tenantId).eq("isActive", true))
            .collect();

        return configs[0] ?? null;
    },
});

/**
 * List all fee configurations for a tenant (active and historical).
 */
export const listFeeConfigs = query({
    args: {
        tenantId: v.id("tenants"),
    },
    handler: async (ctx, { tenantId }) => {
        return ctx.db
            .query("platformFeeConfig")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .order("desc")
            .collect();
    },
});

// =============================================================================
// PLATFORM FEE CONFIGURATION — Mutations
// =============================================================================

/**
 * Create or update the platform fee configuration.
 * Deactivates any existing active config for the tenant.
 */
export const setFeeConfig = mutation({
    args: {
        tenantId: v.id("tenants"),
        feeType: v.union(
            v.literal("percentage"),
            v.literal("flat"),
            v.literal("percentage_plus_flat"),
        ),
        percentageFee: v.optional(v.number()),
        flatFee: v.optional(v.number()),
        currency: v.optional(v.string()),
        updatedBy: v.id("users"),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx, args.updatedBy);
        const now = Date.now();

        // Deactivate existing active configs
        const existing = await ctx.db
            .query("platformFeeConfig")
            .withIndex("by_active", (q) => q.eq("tenantId", args.tenantId).eq("isActive", true))
            .collect();

        for (const config of existing) {
            await ctx.db.patch(config._id, { isActive: false, updatedAt: now });
        }

        // Create new active config
        const id = await ctx.db.insert("platformFeeConfig", {
            tenantId: args.tenantId,
            feeType: args.feeType,
            percentageFee: args.percentageFee,
            flatFee: args.flatFee,
            currency: args.currency ?? "NOK",
            isActive: true,
            effectiveFrom: now,
            updatedBy: args.updatedBy,
            updatedAt: now,
        });

        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: args.updatedBy as string,
            entityType: "platformFeeConfig",
            entityId: id as string,
            action: "created",
            newState: {
                feeType: args.feeType,
                percentageFee: args.percentageFee,
                flatFee: args.flatFee,
            },
            sourceComponent: "payouts",
        });

        return { id };
    },
});

// =============================================================================
// CREATOR EARNINGS — Queries
// =============================================================================

/**
 * List creator earnings with filtering.
 * Admin overview of all creators' earnings for a given period.
 */
export const listCreatorEarnings = query({
    args: {
        tenantId: v.id("tenants"),
        period: v.optional(v.string()), // e.g. "2026-04"
        creatorId: v.optional(v.id("users")),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, period, creatorId, limit = 50 }) => {
        let earnings;

        if (creatorId && period) {
            earnings = await ctx.db
                .query("creatorEarnings")
                .withIndex("by_creator_period", (q) =>
                    q.eq("tenantId", tenantId).eq("creatorId", creatorId).eq("period", period)
                )
                .take(limit);
        } else if (period) {
            earnings = await ctx.db
                .query("creatorEarnings")
                .withIndex("by_period", (q) => q.eq("tenantId", tenantId).eq("period", period))
                .take(limit);
        } else if (creatorId) {
            earnings = await ctx.db
                .query("creatorEarnings")
                .withIndex("by_creator", (q) => q.eq("tenantId", tenantId).eq("creatorId", creatorId))
                .order("desc")
                .take(limit);
        } else {
            earnings = await ctx.db
                .query("creatorEarnings")
                .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
                .order("desc")
                .take(limit);
        }

        return earnings;
    },
});

/**
 * Get earnings summary for a specific creator.
 * Aggregates across all periods.
 */
export const getCreatorEarningsSummary = query({
    args: {
        tenantId: v.id("tenants"),
        creatorId: v.id("users"),
    },
    handler: async (ctx, { tenantId, creatorId }) => {
        const earnings = await ctx.db
            .query("creatorEarnings")
            .withIndex("by_creator", (q) => q.eq("tenantId", tenantId).eq("creatorId", creatorId))
            .collect();

        const totalGross = earnings.reduce((sum, e) => sum + e.grossRevenue, 0);
        const totalFees = earnings.reduce((sum, e) => sum + e.platformFees, 0);
        const totalNet = earnings.reduce((sum, e) => sum + e.netEarnings, 0);
        const totalPaidOut = earnings.reduce((sum, e) => sum + e.paidOutAmount, 0);

        return {
            creatorId,
            totalGrossRevenue: totalGross,
            totalPlatformFees: totalFees,
            totalNetEarnings: totalNet,
            totalPaidOut,
            pendingPayout: totalNet - totalPaidOut,
            currency: earnings[0]?.currency ?? "NOK",
            periodCount: earnings.length,
        };
    },
});

/**
 * Get platform-wide earnings dashboard stats.
 * Aggregates all creators' earnings for admin overview.
 */
export const getDashboardStats = query({
    args: {
        tenantId: v.id("tenants"),
        period: v.optional(v.string()),
    },
    handler: async (ctx, { tenantId, period }) => {
        let earnings;
        if (period) {
            earnings = await ctx.db
                .query("creatorEarnings")
                .withIndex("by_period", (q) => q.eq("tenantId", tenantId).eq("period", period))
                .collect();
        } else {
            earnings = await ctx.db
                .query("creatorEarnings")
                .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
                .collect();
        }

        const totalGross = earnings.reduce((sum, e) => sum + e.grossRevenue, 0);
        const totalFees = earnings.reduce((sum, e) => sum + e.platformFees, 0);
        const totalNet = earnings.reduce((sum, e) => sum + e.netEarnings, 0);
        const totalPaidOut = earnings.reduce((sum, e) => sum + e.paidOutAmount, 0);
        const totalSubscribers = earnings.reduce((sum, e) => sum + e.subscriberCount, 0);

        // Count unique creators
        const creatorIds = new Set(earnings.map((e) => e.creatorId));

        // Payouts stats
        const payouts = await ctx.db
            .query("creatorPayouts")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .collect();

        const pendingPayouts = payouts.filter((p) => p.status === "pending" || p.status === "processing");
        const completedPayouts = payouts.filter((p) => p.status === "completed");
        const failedPayouts = payouts.filter((p) => p.status === "failed");

        return {
            totalGrossRevenue: totalGross,
            totalPlatformFees: totalFees,
            totalCreatorEarnings: totalNet,
            totalPaidOut,
            pendingPayoutAmount: totalNet - totalPaidOut,
            activeCreators: creatorIds.size,
            totalSubscribers,
            payoutStats: {
                pending: pendingPayouts.length,
                completed: completedPayouts.length,
                failed: failedPayouts.length,
                totalCompleted: completedPayouts.reduce((sum, p) => sum + p.netAmount, 0),
            },
            currency: "NOK",
            period: period ?? "all-time",
        };
    },
});

// =============================================================================
// CREATOR EARNINGS — Mutations (internal, called by event handlers / cron)
// =============================================================================

/**
 * Record or update earnings for a creator in a specific period.
 * Called when subscription payments are processed.
 */
export const recordEarnings = internalMutation({
    args: {
        tenantId: v.id("tenants"),
        creatorId: v.id("users"),
        period: v.string(),
        grossAmount: v.number(),
        platformFeeAmount: v.number(),
        currency: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const netAmount = args.grossAmount - args.platformFeeAmount;

        // Check if record exists for this creator+period
        const existing = await ctx.db
            .query("creatorEarnings")
            .withIndex("by_creator_period", (q) =>
                q.eq("tenantId", args.tenantId).eq("creatorId", args.creatorId).eq("period", args.period)
            )
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                grossRevenue: existing.grossRevenue + args.grossAmount,
                platformFees: existing.platformFees + args.platformFeeAmount,
                netEarnings: existing.netEarnings + netAmount,
                subscriberCount: existing.subscriberCount + 1,
                updatedAt: now,
            });
            return { id: existing._id, updated: true };
        }

        const id = await ctx.db.insert("creatorEarnings", {
            tenantId: args.tenantId,
            creatorId: args.creatorId,
            period: args.period,
            grossRevenue: args.grossAmount,
            platformFees: args.platformFeeAmount,
            netEarnings: netAmount,
            subscriberCount: 1,
            paidOutAmount: 0,
            currency: args.currency ?? "NOK",
            updatedAt: now,
        });

        return { id, updated: false };
    },
});

// =============================================================================
// CREATOR PAYOUTS (STRIPE TRANSFERS) — Queries
// =============================================================================

/**
 * List creator payouts with filtering.
 */
export const listCreatorPayouts = query({
    args: {
        tenantId: v.id("tenants"),
        creatorId: v.optional(v.id("users")),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, creatorId, status, limit = 50 }) => {
        let payouts;

        if (creatorId) {
            payouts = await ctx.db
                .query("creatorPayouts")
                .withIndex("by_creator", (q) => q.eq("tenantId", tenantId).eq("creatorId", creatorId))
                .order("desc")
                .take(limit);
        } else if (status) {
            payouts = await ctx.db
                .query("creatorPayouts")
                .withIndex("by_status", (q) =>
                    q.eq("tenantId", tenantId).eq("status", status as any)
                )
                .order("desc")
                .take(limit);
        } else {
            payouts = await ctx.db
                .query("creatorPayouts")
                .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
                .order("desc")
                .take(limit);
        }

        if (creatorId && status) {
            payouts = payouts.filter((p) => p.status === status);
        }

        return payouts;
    },
});

/**
 * Get a single creator payout by ID.
 */
export const getCreatorPayout = query({
    args: {
        payoutId: v.id("creatorPayouts"),
    },
    handler: async (ctx, { payoutId }) => {
        const payout = await ctx.db.get(payoutId);
        if (!payout) throw new Error("Creator payout not found");
        return payout;
    },
});

// =============================================================================
// CREATOR PAYOUTS — Mutations
// =============================================================================

/**
 * Request a payout for a creator (admin action).
 * Creates a pending payout record. The actual Stripe transfer
 * is handled by the stripeTransfers action.
 */
export const requestCreatorPayout = mutation({
    args: {
        tenantId: v.id("tenants"),
        creatorId: v.id("users"),
        amount: v.number(),
        stripeAccountId: v.string(),
        requestedBy: v.id("users"),
        periodStart: v.optional(v.number()),
        periodEnd: v.optional(v.number()),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx, args.requestedBy);

        if (args.amount <= 0) {
            throw new Error("Payout amount must be positive");
        }

        // Get active fee config
        const feeConfig = await ctx.db
            .query("platformFeeConfig")
            .withIndex("by_active", (q) => q.eq("tenantId", args.tenantId).eq("isActive", true))
            .first();

        // Calculate platform fee
        let platformFee = 0;
        if (feeConfig) {
            if (feeConfig.feeType === "percentage" && feeConfig.percentageFee) {
                platformFee = Math.round(args.amount * feeConfig.percentageFee / 100);
            } else if (feeConfig.feeType === "flat" && feeConfig.flatFee) {
                platformFee = feeConfig.flatFee;
            } else if (feeConfig.feeType === "percentage_plus_flat") {
                const pctFee = feeConfig.percentageFee
                    ? Math.round(args.amount * feeConfig.percentageFee / 100)
                    : 0;
                platformFee = pctFee + (feeConfig.flatFee ?? 0);
            }
        }

        const netAmount = args.amount - platformFee;
        if (netAmount <= 0) {
            throw new Error("Net payout amount must be positive after fees");
        }

        const now = Date.now();
        const id = await ctx.db.insert("creatorPayouts", {
            tenantId: args.tenantId,
            creatorId: args.creatorId,
            amount: args.amount,
            platformFee,
            netAmount,
            currency: feeConfig?.currency ?? "NOK",
            stripeAccountId: args.stripeAccountId,
            status: "pending",
            periodStart: args.periodStart,
            periodEnd: args.periodEnd,
            requestedAt: now,
            requestedBy: args.requestedBy,
            notes: args.notes,
        });

        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: args.requestedBy as string,
            entityType: "creatorPayout",
            entityId: id as string,
            action: "requested",
            newState: {
                creatorId: args.creatorId,
                amount: args.amount,
                platformFee,
                netAmount,
                stripeAccountId: args.stripeAccountId,
            },
            sourceComponent: "payouts",
        });

        await emitEvent(ctx, "payouts.creator-payout.requested", args.tenantId as string, "payouts", {
            payoutId: id,
            creatorId: args.creatorId,
            amount: args.amount,
            netAmount,
        });

        return { id, platformFee, netAmount };
    },
});

/**
 * Update creator payout status (called after Stripe transfer).
 */
export const updateCreatorPayoutStatus = mutation({
    args: {
        payoutId: v.id("creatorPayouts"),
        status: v.union(
            v.literal("pending"),
            v.literal("processing"),
            v.literal("completed"),
            v.literal("failed"),
        ),
        stripeTransferId: v.optional(v.string()),
        failureReason: v.optional(v.string()),
        updatedBy: v.id("users"),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx, args.updatedBy);

        const payout = await ctx.db.get(args.payoutId);
        if (!payout) throw new Error("Creator payout not found");

        const now = Date.now();
        const previousStatus = payout.status;

        const updates: Record<string, unknown> = { status: args.status };
        if (args.stripeTransferId) updates.stripeTransferId = args.stripeTransferId;
        if (args.failureReason) updates.failureReason = args.failureReason;
        if (args.status === "completed") updates.processedAt = now;

        await ctx.db.patch(args.payoutId, updates);

        // Update creator earnings paidOutAmount when completed
        if (args.status === "completed") {
            const currentPeriod = new Date().toISOString().slice(0, 7);
            const earningsRecord = await ctx.db
                .query("creatorEarnings")
                .withIndex("by_creator_period", (q) =>
                    q.eq("tenantId", payout.tenantId).eq("creatorId", payout.creatorId).eq("period", currentPeriod)
                )
                .first();

            if (earningsRecord) {
                await ctx.db.patch(earningsRecord._id, {
                    paidOutAmount: earningsRecord.paidOutAmount + payout.netAmount,
                    updatedAt: now,
                });
            }
        }

        await withAudit(ctx, {
            tenantId: payout.tenantId as string,
            userId: args.updatedBy as string,
            entityType: "creatorPayout",
            entityId: args.payoutId as string,
            action: "status_updated",
            previousState: { status: previousStatus },
            newState: { status: args.status, stripeTransferId: args.stripeTransferId },
            sourceComponent: "payouts",
        });

        const eventAction = args.status === "completed" ? "completed" : args.status === "failed" ? "failed" : "updated";
        await emitEvent(ctx, `payouts.creator-payout.${eventAction}`, payout.tenantId as string, "payouts", {
            payoutId: args.payoutId,
            creatorId: payout.creatorId,
            status: args.status,
            netAmount: payout.netAmount,
            stripeTransferId: args.stripeTransferId,
        });

        return { success: true };
    },
});

/**
 * Internal mutation to mark payout as processing (called from action).
 */
export const markPayoutProcessing = internalMutation({
    args: {
        payoutId: v.id("creatorPayouts"),
    },
    handler: async (ctx, { payoutId }) => {
        await ctx.db.patch(payoutId, { status: "processing" });
    },
});

/**
 * Internal mutation to complete payout (called from Stripe transfer action).
 */
export const completeCreatorPayout = internalMutation({
    args: {
        payoutId: v.id("creatorPayouts"),
        stripeTransferId: v.string(),
    },
    handler: async (ctx, { payoutId, stripeTransferId }) => {
        const payout = await ctx.db.get(payoutId);
        if (!payout) return;

        const now = Date.now();
        await ctx.db.patch(payoutId, {
            status: "completed",
            stripeTransferId,
            processedAt: now,
        });

        // Update earnings ledger
        const currentPeriod = new Date().toISOString().slice(0, 7);
        const earningsRecord = await ctx.db
            .query("creatorEarnings")
            .withIndex("by_creator_period", (q) =>
                q.eq("tenantId", payout.tenantId).eq("creatorId", payout.creatorId).eq("period", currentPeriod)
            )
            .first();

        if (earningsRecord) {
            await ctx.db.patch(earningsRecord._id, {
                paidOutAmount: earningsRecord.paidOutAmount + payout.netAmount,
                updatedAt: now,
            });
        }
    },
});

/**
 * Internal mutation to fail payout (called from Stripe transfer action).
 */
export const failCreatorPayout = internalMutation({
    args: {
        payoutId: v.id("creatorPayouts"),
        failureReason: v.string(),
    },
    handler: async (ctx, { payoutId, failureReason }) => {
        await ctx.db.patch(payoutId, {
            status: "failed",
            failureReason,
        });
    },
});

// =============================================================================
// FEE CALCULATION HELPER (exported for use in other modules)
// =============================================================================

/**
 * Calculate platform fee for a given amount based on active config.
 */
export const calculateFee = query({
    args: {
        tenantId: v.id("tenants"),
        amount: v.number(),
    },
    handler: async (ctx, { tenantId, amount }) => {
        const feeConfig = await ctx.db
            .query("platformFeeConfig")
            .withIndex("by_active", (q) => q.eq("tenantId", tenantId).eq("isActive", true))
            .first();

        if (!feeConfig) {
            return { platformFee: 0, netAmount: amount, feeConfig: null };
        }

        let platformFee = 0;
        if (feeConfig.feeType === "percentage" && feeConfig.percentageFee) {
            platformFee = Math.round(amount * feeConfig.percentageFee / 100);
        } else if (feeConfig.feeType === "flat" && feeConfig.flatFee) {
            platformFee = feeConfig.flatFee;
        } else if (feeConfig.feeType === "percentage_plus_flat") {
            const pctFee = feeConfig.percentageFee
                ? Math.round(amount * feeConfig.percentageFee / 100)
                : 0;
            platformFee = pctFee + (feeConfig.flatFee ?? 0);
        }

        return {
            platformFee,
            netAmount: amount - platformFee,
            feeConfig: {
                feeType: feeConfig.feeType,
                percentageFee: feeConfig.percentageFee,
                flatFee: feeConfig.flatFee,
            },
        };
    },
});
