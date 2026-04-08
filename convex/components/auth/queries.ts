/**
 * Auth Component — Query Functions
 *
 * Read-only operations for sessions, OAuth states, magic links, and demo tokens.
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// SESSION QUERIES
// =============================================================================

/**
 * Validate and refresh a session. Returns the session if valid, null otherwise.
 */
export const validateSession = query({
    args: {
        token: v.string(),
    },
    returns: v.any(),
    handler: async (ctx, { token }) => {
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", token))
            .first();

        if (!session) return null;
        if (!session.isActive) return null;
        if (session.expiresAt < Date.now()) return null;

        // Strip the token from the response
        const { token: _token, ...sessionData } = session;
        return sessionData;
    },
});

/**
 * Get a session by token (raw, without validation checks).
 */
export const getSessionByToken = query({
    args: {
        token: v.string(),
    },
    returns: v.any(),
    handler: async (ctx, { token }) => {
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", token))
            .first();

        if (!session) return null;

        // Strip the token from the response
        const { token: _token, ...sessionData } = session;
        return sessionData;
    },
});

/**
 * List all active sessions for a specific user.
 */
export const listSessionsByUser = query({
    args: {
        userId: v.string(),
    },
    returns: v.any(),
    handler: async (ctx, { userId }) => {
        return await ctx.db
            .query("sessions")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("isActive"), true))
            .order("desc")
            .collect();
    },
});


// =============================================================================
// DEMO TOKEN QUERIES
// =============================================================================

/**
 * Validate a demo token. Returns the token data if valid, null otherwise.
 */
export const validateDemoToken = query({
    args: {
        key: v.string(),
    },
    returns: v.any(),
    handler: async (ctx, { key }) => {
        const token = await ctx.db
            .query("authDemoTokens")
            .withIndex("by_key", (q) => q.eq("key", key))
            .first();

        if (!token) return null;
        if (!token.isActive) return null;
        if (token.expiresAt && token.expiresAt < Date.now()) return null;

        return token;
    },
});
