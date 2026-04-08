/**
 * Payouts Facade — Owner Revenue Settlement
 *
 * Manages the flow of booking revenue to tenant/owner bank accounts.
 * Flow: Confirmed Booking → Revenue Accrued → Payout Requested → Payout Processed
 *
 * Uses the payouts and tenantBankAccounts tables defined in schema.
 */

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get payout balance for a tenant.
 * Calculates: total confirmed booking revenue - total paid out - platform fees.
 */
export const getBalance = query({
    args: {
        tenantId: v.id("tenants"),
    },
    handler: async (ctx, { tenantId }) => {
        // Sum all confirmed booking payments for this tenant
        const payments = await ctx.db
            .query("payouts")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .collect();

        const totalPaidOut = payments
            .filter((p) => p.status === "completed")
            .reduce((sum, p) => sum + p.amount, 0);

        const totalPending = payments
            .filter((p) => p.status === "pending" || p.status === "processing")
            .reduce((sum, p) => sum + p.amount, 0);

        // Revenue is tracked separately — for now return payout-based balance
        return {
            totalPaidOut,
            totalPending,
            currency: "NOK",
        };
    },
});

/**
 * List payouts for a tenant.
 */
export const list = query({
    args: {
        tenantId: v.id("tenants"),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, status, limit }) => {
        let payouts = await ctx.db
            .query("payouts")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .order("desc")
            .collect();

        if (status) {
            payouts = payouts.filter((p) => p.status === status);
        }

        if (limit) {
            payouts = payouts.slice(0, limit);
        }

        return payouts;
    },
});

/**
 * List bank accounts for a tenant.
 */
export const listBankAccounts = query({
    args: {
        tenantId: v.id("tenants"),
    },
    handler: async (ctx, { tenantId }) => {
        return ctx.db
            .query("tenantBankAccounts")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .collect();
    },
});

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Add a bank account to a tenant.
 */
export const addBankAccount = mutation({
    args: {
        tenantId: v.id("tenants"),
        accountNumber: v.string(),
        accountName: v.string(),
        isDefault: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        // If setting as default, unset all existing defaults
        if (args.isDefault) {
            const existing = await ctx.db
                .query("tenantBankAccounts")
                .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
                .collect();

            for (const acc of existing) {
                if (acc.isDefault) {
                    await ctx.db.patch(acc._id, { isDefault: false });
                }
            }
        }

        const id = await ctx.db.insert("tenantBankAccounts", {
            tenantId: args.tenantId,
            accountNumber: args.accountNumber,
            accountName: args.accountName,
            isDefault: args.isDefault ?? false,
            addedAt: Date.now(),
        });

        return { success: true, id };
    },
});

/**
 * Remove a bank account.
 */
export const removeBankAccount = mutation({
    args: {
        id: v.id("tenantBankAccounts"),
    },
    handler: async (ctx, { id }) => {
        await ctx.db.delete(id);
        return { success: true };
    },
});

/**
 * Request a payout.
 */
export const requestPayout = mutation({
    args: {
        tenantId: v.id("tenants"),
        amount: v.number(),
        bankAccountId: v.id("tenantBankAccounts"),
        requestedBy: v.id("users"),
    },
    handler: async (ctx, args) => {
        // Verify bank account belongs to tenant
        const bankAccount = await ctx.db.get(args.bankAccountId);
        if (!bankAccount || bankAccount.tenantId !== args.tenantId) {
            return { success: false, error: "Invalid bank account" };
        }

        // Validate amount
        if (args.amount <= 0) {
            return { success: false, error: "Amount must be positive" };
        }

        const id = await ctx.db.insert("payouts", {
            tenantId: args.tenantId,
            amount: args.amount,
            currency: "NOK",
            bankAccountId: args.bankAccountId,
            status: "pending",
            requestedAt: Date.now(),
            requestedBy: args.requestedBy,
        });

        return { success: true as const, payoutId: id };
    },
});

/**
 * Update payout status (admin/internal).
 */
export const updatePayoutStatus = mutation({
    args: {
        payoutId: v.id("payouts"),
        status: v.union(
            v.literal("pending"),
            v.literal("processing"),
            v.literal("completed"),
            v.literal("failed"),
        ),
        processedAt: v.optional(v.number()),
        externalRef: v.optional(v.string()),
    },
    handler: async (ctx, { payoutId, status, processedAt, externalRef }) => {
        const updates: Record<string, any> = { status };
        if (processedAt) updates.processedAt = processedAt;
        if (externalRef) updates.externalRef = externalRef;

        await ctx.db.patch(payoutId, updates);
        return { success: true };
    },
});
