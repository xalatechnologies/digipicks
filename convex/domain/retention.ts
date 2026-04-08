/**
 * Retention Policy — Automated Data Cleanup
 *
 * Internal mutation called by the daily cron job. Iterates over active tenants,
 * merges each tenant's retention config with defaults, and delegates cleanup
 * to component-level `cleanupOld` mutations.
 *
 * Coordinates with GDPR purge logic (convex/domain/gdpr.ts) — retention handles
 * routine time-based cleanup, while GDPR handles explicit user/tenant erasure requests.
 */

import { internalMutation } from "../_generated/server";
import { components } from "../_generated/api";
import { mergeRetentionConfig, daysToMs } from "../lib/retentionDefaults";

// =============================================================================
// CRON ENTRY POINT
// =============================================================================

/**
 * Run retention purge across all active tenants.
 * Called daily at 02:00 UTC by crons.ts.
 */
export const runRetentionPurge = internalMutation({
    args: {},
    handler: async (ctx) => {
        const tenants = await ctx.db
            .query("tenants")
            .withIndex("by_status", (q) => q.eq("status", "active"))
            .collect();

        let totalPurged = 0;

        for (const tenant of tenants) {
            const config = mergeRetentionConfig(
                (tenant as any).settings?.retention
            );
            if (!config.enabled) continue;

            const tid = tenant._id as string;
            let tenantPurged = 0;

            // -----------------------------------------------------------------
            // 1. Notifications — purge old read notifications
            // -----------------------------------------------------------------
            try {
                const result = await ctx.runMutation(
                    components.notifications.functions.cleanupOld,
                    { tenantId: tid, olderThanMs: daysToMs(config.notificationDays) }
                );
                tenantPurged += (result as any)?.purged ?? 0;
            } catch {
                // Component may not support cleanupOld yet — skip gracefully
            }

            // -----------------------------------------------------------------
            // 2. Audit log — purge entries older than retention window
            // -----------------------------------------------------------------
            try {
                const result = await ctx.runMutation(
                    components.audit.functions.cleanupOld,
                    { tenantId: tid, olderThanMs: daysToMs(config.auditLogDays) }
                );
                tenantPurged += (result as any)?.purged ?? 0;
            } catch {
                // Component may not support cleanupOld yet — skip gracefully
            }

            // -----------------------------------------------------------------
            // 3. Messaging — purge old resolved/archived conversations + messages
            // -----------------------------------------------------------------
            try {
                const result = await ctx.runMutation(
                    components.messaging.mutations.cleanupOld,
                    { tenantId: tid, olderThanMs: daysToMs(config.messagingDays) }
                );
                tenantPurged += (result as any)?.purged ?? 0;
            } catch {
                // Component may not support cleanupOld yet — skip gracefully
            }

            totalPurged += tenantPurged;
        }

        if (totalPurged > 0) {
            console.log(
                `[retention] Purged ${totalPurged} records across ${tenants.length} active tenants`
            );
        }
    },
});
