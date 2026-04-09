/**
 * Cron Function Handlers
 *
 * Internal mutations called by the cron scheduler in crons.ts.
 * Each function delegates to component functions and/or facade mutations.
 */

import { internalMutation } from "./_generated/server";
import { components } from "./_generated/api";
import { emitEvent } from "./lib/eventBus";



// =============================================================================
// AUTH — Session Cleanup
// =============================================================================

/**
 * Clean up expired auth sessions.
 */
export const cleanupExpiredSessions = internalMutation({
    args: {},
    handler: async (ctx) => {
        const result = await ctx.runMutation(
            components.auth.mutations.cleanupExpired,
            {}
        );

        const { sessions, oauthStates, magicLinks } = result as {
            sessions: number;
            oauthStates: number;
            magicLinks: number;
        };
        const deleted = sessions + oauthStates + magicLinks;
        if (deleted > 0) {
            console.log(
                `Cron: cleaned up ${deleted} expired auth records (${sessions} sessions, ${oauthStates} oauth states, ${magicLinks} magic links)`
            );
        }
    },
});



// =============================================================================
// SCHEDULED PUBLISHING — Auto-publish & Auto-unpublish
// =============================================================================

/**
 * Auto-publish resources/products whose publishAt has been reached,
 * and auto-archive those whose unpublishAt has passed.
 *
 * Runs every minute via crons.ts.
 */
export const processScheduledPublishing = internalMutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();
        let published = 0;
        let unpublished = 0;

        // ─── Resources (component) — scan all for scheduled/expired ───
        const allResources = (await ctx.runQuery(
            components.resources.queries.scanAll,
            { limit: 1000 }
        )) as any[];

        for (const resource of allResources) {
            // Auto-publish: scheduled + publishAt reached
            if (resource.status === "scheduled" && resource.publishAt && resource.publishAt <= now) {
                await ctx.runMutation(
                    components.resources.mutations.update,
                    {
                        id: resource._id,
                        status: "published",
                        publishedAt: now,
                    }
                );
                published++;
                console.log(`Cron: auto-published resource "${resource.name}" (${resource._id})`);
            }

            // Auto-unpublish: published + unpublishAt reached
            if (resource.status === "published" && resource.unpublishAt && resource.unpublishAt <= now) {
                await ctx.runMutation(
                    components.resources.mutations.update,
                    {
                        id: resource._id,
                        status: "archived",
                    }
                );
                unpublished++;
                console.log(`Cron: auto-archived resource "${resource.name}" (${resource._id})`);
            }
        }



        if (published > 0 || unpublished > 0) {
            console.log(`Cron: scheduled publishing — ${published} published, ${unpublished} archived`);
        }
    },
});

// =============================================================================
// SCHEDULED PICK PUBLISHING — Auto-publish draft picks
// =============================================================================

/**
 * Auto-publish draft picks whose scheduledPublishAt has been reached.
 * Emits picks.pick.created event for each auto-published pick so
 * subscriber notifications fire as if the creator published manually.
 *
 * Runs every minute via crons.ts.
 */
export const processScheduledPickPublishing = internalMutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();

        const scheduledPicks = (await ctx.runQuery(
            components.picks.functions.scanScheduledForPublishing,
            { now }
        )) as any[];

        let published = 0;
        for (const pick of scheduledPicks) {
            await ctx.runMutation(
                components.picks.functions.update,
                {
                    id: pick._id,
                    status: "published",
                    publishedAt: now,
                    scheduledPublishAt: undefined,
                }
            );
            published++;

            // Emit event so subscriber notifications fire
            await emitEvent(ctx, "picks.pick.created", pick.tenantId, "picks", {
                pickId: pick._id as string,
                creatorId: pick.creatorId,
                event: pick.event,
                sport: pick.sport,
                selection: pick.selection,
                scheduledPublish: true,
            });

            console.log(`Cron: auto-published scheduled pick "${pick.event}" (${pick._id})`);
        }

        if (published > 0) {
            console.log(`Cron: scheduled pick publishing — ${published} picks published`);
        }
    },
});

// =============================================================================
// LISTING LIFECYCLE — Expiration
// =============================================================================

/**
 * Expire published listings that have passed their expiresAt.
 * Sets listingStatus to "expired" and status to "archived".
 *
 * Runs daily via crons.ts.
 */
export const expireListings = internalMutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();

        // Scan published resources with an expiresAt
        const allResources = (await ctx.runQuery(
            components.resources.queries.scanAll,
            { limit: 1000 }
        )) as any[];

        let expired = 0;
        for (const resource of allResources) {
            if (
                resource.listingStatus === "published" &&
                resource.expiresAt &&
                resource.expiresAt <= now
            ) {
                await ctx.runMutation(
                    components.resources.mutations.update,
                    {
                        id: resource._id,
                        listingStatus: "expired",
                        status: "archived",
                    } as any
                );
                expired++;
                console.log(`Cron: expired listing "${resource.name}" (${resource._id})`);
            }
        }

        if (expired > 0) {
            console.log(`Cron: expired ${expired} listings past their expiresAt`);
        }
    },
});



