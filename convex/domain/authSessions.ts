/**
 * Auth Sessions Facade — delegates to auth component.
 * Preserves api.domain.authSessions.* for SDK compatibility.
 */

import { mutation, query } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";
import { rateLimit, rateLimitKeys } from "../lib/rateLimits";
import { withAudit } from "../lib/auditHelpers";
import { emitEvent } from "../lib/eventBus";

// =============================================================================
// SESSION FUNCTIONS
// =============================================================================

export const createSession = mutation({
    args: {
        userId: v.id("users"),
        token: v.string(),
        appId: v.optional(v.string()),
        provider: v.string(),
        expiresAt: v.number(),
    },
    handler: async (ctx, args) => {
        // Rate limit: per-user login attempts
        await rateLimit(ctx, {
            name: "loginAttempt",
            key: rateLimitKeys.user(args.userId as string),
            throws: true,
        });

        const result = await ctx.runMutation(components.auth.mutations.createSession, {
            ...args,
            userId: args.userId as string,
        });

        await withAudit(ctx, {
            tenantId: "auth",
            userId: args.userId as string,
            entityType: "session",
            entityId: (result as any).id ?? (result as any)._id ?? "unknown",
            action: "session_created",
            sourceComponent: "authSessions",
            newState: { provider: args.provider, appId: args.appId },
        });

        await emitEvent(ctx, "auth.session.created", "auth", "auth", {
            sessionId: (result as any).id ?? (result as any)._id ?? "unknown", userId: args.userId as string, provider: args.provider,
        });

        return result;
    },
});

export const validateSession = query({
    args: { token: v.string() },
    handler: async (ctx, { token }) => {
        return ctx.runQuery(components.auth.queries.validateSession, { token });
    },
});

export const invalidateSession = mutation({
    args: { token: v.string() },
    handler: async (ctx, { token }) => {
        const result = await ctx.runMutation(components.auth.mutations.invalidateSession, { token });

        await withAudit(ctx, {
            tenantId: "auth",
            entityType: "session",
            entityId: token.substring(0, 8),
            action: "session_invalidated",
            sourceComponent: "authSessions",
        });

        await emitEvent(ctx, "auth.session.invalidated", "auth", "auth", {
            tokenPrefix: token.substring(0, 8),
        });

        return result;
    },
});

export const getSessionByToken = query({
    args: { token: v.string() },
    handler: async (ctx, { token }) => {
        return ctx.runQuery(components.auth.queries.getSessionByToken, { token });
    },
});

// =============================================================================
// OAUTH STATE FUNCTIONS
// =============================================================================

export const createOAuthState = mutation({
    args: {
        state: v.string(),
        provider: v.string(),
        appOrigin: v.string(),
        returnPath: v.string(),
        appId: v.string(),
        signicatSessionId: v.optional(v.string()),
        expiresAt: v.number(),
    },
    handler: async (ctx, args) => {
        return ctx.runMutation(components.auth.mutations.createOAuthState, args);
    },
});

export const consumeOAuthState = mutation({
    args: { state: v.string() },
    handler: async (ctx, { state }) => {
        return ctx.runMutation(components.auth.mutations.consumeOAuthState, { state });
    },
});

// =============================================================================
// MAGIC LINK FUNCTIONS
// =============================================================================

export const createMagicLink = mutation({
    args: {
        email: v.string(),
        token: v.string(),
        appOrigin: v.string(),
        returnPath: v.string(),
        appId: v.string(),
        expiresAt: v.number(),
    },
    handler: async (ctx, args) => {
        // Rate limit: per-email magic link requests
        await rateLimit(ctx, {
            name: "magicLinkRequest",
            key: rateLimitKeys.user(args.email),
            throws: true,
        });

        return ctx.runMutation(components.auth.mutations.createMagicLink, args);
    },
});

export const consumeMagicLink = mutation({
    args: { token: v.string() },
    handler: async (ctx, { token }) => {
        return ctx.runMutation(components.auth.mutations.consumeMagicLink, { token });
    },
});

// =============================================================================
// DEMO TOKEN FUNCTIONS
// =============================================================================

export const createDemoToken = mutation({
    args: {
        key: v.string(),
        tenantId: v.id("tenants"),
        organizationId: v.optional(v.id("organizations")),
        userId: v.id("users"),
        tokenHash: v.string(),
        expiresAt: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        return ctx.runMutation(components.auth.mutations.createDemoToken, {
            ...args,
            tenantId: args.tenantId as string,
            organizationId: args.organizationId ? (args.organizationId as string) : undefined,
            userId: args.userId as string,
        });
    },
});

export const validateDemoToken = query({
    args: { key: v.string() },
    handler: async (ctx, { key }) => {
        return ctx.runQuery(components.auth.queries.validateDemoToken, { key });
    },
});

// =============================================================================
// CLEANUP
// =============================================================================

export const cleanupExpired = mutation({
    args: {},
    handler: async (ctx) => {
        return ctx.runMutation(components.auth.mutations.cleanupExpired, {});
    },
});
