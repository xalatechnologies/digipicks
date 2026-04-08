/**
 * Subscriptions Facade — Public tier listing
 *
 * Thin facade over the subscriptions component.
 * Exposes public membership tiers for the pricing page.
 */

import { query } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";

/**
 * List publicly visible, active membership tiers for a tenant.
 * Used by the web pricing page — no auth required.
 */
export const listPublicTiers = query({
    args: { tenantId: v.optional(v.string()) },
    handler: async (ctx, { tenantId }) => {
        if (!tenantId) return [];

        const tiers = await ctx.runQuery(components.subscriptions.functions.listTiers, {
            tenantId,
            publicOnly: true,
            activeOnly: true,
        });

        return tiers;
    },
});
