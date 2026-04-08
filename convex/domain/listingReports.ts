/**
 * Listing Reports — Domain Facade
 *
 * User-facing and admin-facing listing reporting system.
 * Users can report listings for various reasons.
 * Super admins review and resolve reports.
 *
 * Uses outboxEvents table to store reports (leveraging existing event infrastructure).
 * Event topic convention: "listing.reported" / "listing.report_resolved"
 *
 * State machine:
 *   pending → processed (resolved by admin)
 */

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

// =============================================================================
// USER: Report a Listing
// =============================================================================

/**
 * Submit a report for a listing.
 * Creates an outboxEvent with topic "listing.reported".
 */
export const reportListing = mutation({
    args: {
        resourceId: v.string(),
        tenantId: v.string(),
        reporterId: v.string(),
        reason: v.union(
            v.literal("fraud"),
            v.literal("wrong_category"),
            v.literal("spam"),
            v.literal("illegal"),
            v.literal("duplicate"),
            v.literal("misleading"),
            v.literal("other"),
        ),
        details: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Create audit entry for the report
        await ctx.db.insert("outboxEvents", {
            topic: "listing.reported",
            tenantId: args.tenantId,
            sourceComponent: "listingReports",
            payload: {
                resourceId: args.resourceId,
                reporterId: args.reporterId,
                reason: args.reason,
                details: args.details || "",
                reportedAt: Date.now(),
            },
            status: "pending",
            retryCount: 0,
            createdAt: Date.now(),
        });

        return { success: true };
    },
});

// =============================================================================
// SUPER ADMIN: List Reports
// =============================================================================

/**
 * List all pending listing reports (super admin view).
 */
export const listReports = query({
    args: {
        status: v.optional(v.string()),
    },
    handler: async (ctx, { status }) => {
        const filterStatus = status || "pending";
        const events = await ctx.db
            .query("outboxEvents")
            .withIndex("by_topic", (q) =>
                q.eq("topic", "listing.reported").eq("status", filterStatus as any)
            )
            .order("desc")
            .take(100);

        return events.map((e: any) => ({
            id: e._id,
            resourceId: (e.payload as any)?.resourceId,
            tenantId: e.tenantId,
            reason: (e.payload as any)?.reason,
            details: (e.payload as any)?.details,
            reporterId: (e.payload as any)?.reporterId,
            reportedAt: (e.payload as any)?.reportedAt,
            status: e.status,
        }));
    },
});

// =============================================================================
// SUPER ADMIN: Resolve Report
// =============================================================================

/**
 * Resolve a listing report (super admin action).
 */
export const resolveReport = mutation({
    args: {
        reportId: v.id("outboxEvents"),
        resolution: v.union(
            v.literal("dismissed"),
            v.literal("listing_hidden"),
            v.literal("user_warned"),
            v.literal("user_banned"),
        ),
        adminId: v.string(),
        note: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.reportId, {
            status: "processed",
            processedAt: Date.now(),
        } as any);

        // Create audit trail for the resolution
        const report = await ctx.db.get(args.reportId);
        if (report) {
            await ctx.db.insert("outboxEvents", {
                topic: "listing.report_resolved",
                tenantId: report.tenantId,
                sourceComponent: "listingReports",
                payload: {
                    reportId: args.reportId,
                    resolution: args.resolution,
                    adminId: args.adminId,
                    note: args.note || "",
                    resourceId: (report.payload as any)?.resourceId || "",
                    resolvedAt: Date.now(),
                },
                status: "processed",
                retryCount: 0,
                createdAt: Date.now(),
            });
        }

        return { success: true };
    },
});
