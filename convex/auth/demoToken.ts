import { mutation } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";

/**
 * Exchange a demo token for a session.
 * Migrated from: packages/platform/functions/auth-demo-token/index.ts
 * 
 * Demo tokens are now in the auth component.
 */
export const exchangeDemoToken = mutation({
    args: {
        token: v.string(),
    },
    handler: async (ctx, { token }) => {
        // Validate the demo token via auth component
        const tokenRecord = await ctx.runQuery(
            components.auth.queries.validateDemoToken,
            { key: token }
        );

        if (!tokenRecord) {
            throw new Error("Invalid or expired demo token");
        }

        // Get the associated user (userId is a string from the component)
        const user = await ctx.db.get(tokenRecord.userId as any) as any;
        if (!user) {
            throw new Error("User not found for demo token");
        }

        // Get the tenant (tenantId is a string from the component)
        const tenant = await ctx.db.get(tokenRecord.tenantId as any) as any;
        if (!tenant) {
            throw new Error("Tenant not found for demo token");
        }

        // Update last login
        await ctx.db.patch(user._id, {
            lastLoginAt: Date.now(),
        });

        // Return session data
        return {
            success: true,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                displayName: user.displayName,
                role: user.role,
                avatarUrl: user.avatarUrl,
            },
            tenant: {
                id: tenant._id,
                name: tenant.name,
                slug: tenant.slug,
            },
            organization: tokenRecord.organizationId
                ? await ctx.db.get(tokenRecord.organizationId as any) as any
                : null,
        };
    },
});

/**
 * Verify a demo token is valid (without exchanging it)
 */
export const verifyDemoToken = mutation({
    args: {
        token: v.string(),
    },
    handler: async (ctx, { token }) => {
        const tokenRecord = await ctx.runQuery(
            components.auth.queries.validateDemoToken,
            { key: token }
        );

        if (!tokenRecord) {
            return { valid: false, reason: "Token not found or expired" };
        }

        return { valid: true };
    },
});
