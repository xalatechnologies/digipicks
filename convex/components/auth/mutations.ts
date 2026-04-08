/**
 * Auth Component — Mutation Functions
 *
 * Write operations for sessions, OAuth states, magic links, demo tokens, and cleanup.
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// SESSION MUTATIONS
// =============================================================================

/**
 * Create a new session for a user.
 */
export const createSession = mutation({
    args: {
        userId: v.string(),
        token: v.string(),
        appId: v.optional(v.string()),
        provider: v.string(),
        expiresAt: v.number(),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const now = Date.now();
        const id = await ctx.db.insert("sessions", {
            userId: args.userId,
            token: args.token,
            appId: args.appId,
            provider: args.provider,
            expiresAt: args.expiresAt,
            lastActiveAt: now,
            isActive: true,
        });

        return { id: id as string };
    },
});

/**
 * Invalidate a session (logout).
 */
export const invalidateSession = mutation({
    args: {
        token: v.string(),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { token }) => {
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", token))
            .first();

        if (!session) return { success: false };

        await ctx.db.patch(session._id, { isActive: false });
        return { success: true };
    },
});

/**
 * Touch a session to update its last activity timestamp.
 * Used to keep sessions alive during active use.
 */
export const touchSession = mutation({
    args: {
        sessionId: v.id("sessions"),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { sessionId }) => {
        await ctx.db.patch(sessionId, {
            lastActiveAt: Date.now(),
        });
        return { success: true };
    },
});


// =============================================================================
// OAUTH STATE MUTATIONS
// =============================================================================

/**
 * Create an OAuth state entry for CSRF protection.
 */
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
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("oauthStates", {
            state: args.state,
            provider: args.provider,
            appOrigin: args.appOrigin,
            returnPath: args.returnPath,
            appId: args.appId,
            signicatSessionId: args.signicatSessionId,
            createdAt: Date.now(),
            expiresAt: args.expiresAt,
            consumed: false,
        });

        return { id: id as string };
    },
});

/**
 * Consume an OAuth state (one-time use). Returns the state data or null.
 */
export const consumeOAuthState = mutation({
    args: {
        state: v.string(),
    },
    returns: v.any(),
    handler: async (ctx, { state }) => {
        const entry = await ctx.db
            .query("oauthStates")
            .withIndex("by_state", (q) => q.eq("state", state))
            .first();

        if (!entry) return null;
        if (entry.consumed) return null;
        if (entry.expiresAt < Date.now()) return null;

        await ctx.db.patch(entry._id, { consumed: true });
        return entry;
    },
});

// =============================================================================
// MAGIC LINK MUTATIONS
// =============================================================================

/**
 * Create a magic link token for passwordless authentication.
 */
export const createMagicLink = mutation({
    args: {
        email: v.string(),
        token: v.string(),
        appOrigin: v.string(),
        returnPath: v.string(),
        appId: v.string(),
        expiresAt: v.number(),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("magicLinks", {
            email: args.email,
            token: args.token,
            appOrigin: args.appOrigin,
            returnPath: args.returnPath,
            appId: args.appId,
            createdAt: Date.now(),
            expiresAt: args.expiresAt,
            consumed: false,
        });

        return { id: id as string };
    },
});

/**
 * Consume a magic link token (one-time use). Returns the link data or null.
 */
export const consumeMagicLink = mutation({
    args: {
        token: v.string(),
    },
    returns: v.any(),
    handler: async (ctx, { token }) => {
        const link = await ctx.db
            .query("magicLinks")
            .withIndex("by_token", (q) => q.eq("token", token))
            .first();

        if (!link) return null;
        if (link.consumed) return null;
        if (link.expiresAt < Date.now()) return null;

        await ctx.db.patch(link._id, {
            consumed: true,
            consumedAt: Date.now(),
        });
        return link;
    },
});

// =============================================================================
// DEMO TOKEN MUTATIONS
// =============================================================================

/**
 * Create a demo token for development/testing authentication.
 */
export const createDemoToken = mutation({
    args: {
        key: v.string(),
        tenantId: v.string(),
        organizationId: v.optional(v.string()),
        userId: v.string(),
        tokenHash: v.string(),
        expiresAt: v.optional(v.number()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        // Deactivate any existing token with the same key
        const existing = await ctx.db
            .query("authDemoTokens")
            .withIndex("by_key", (q) => q.eq("key", args.key))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, { isActive: false });
        }

        const id = await ctx.db.insert("authDemoTokens", {
            key: args.key,
            tenantId: args.tenantId,
            organizationId: args.organizationId,
            userId: args.userId,
            tokenHash: args.tokenHash,
            isActive: true,
            expiresAt: args.expiresAt,
        });

        return { id: id as string };
    },
});

// =============================================================================
// VERIFICATION MUTATIONS (OTP / MFA)
// =============================================================================

/**
 * Create a verification record for OTP-based flows.
 */
export const createVerification = mutation({
    args: {
        userId: v.optional(v.string()),
        target: v.string(),
        channel: v.string(),
        purpose: v.string(),
        maxAttempts: v.optional(v.number()),
        expiresAt: v.number(),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        // Expire any existing pending verifications for same target+purpose
        const existing = await ctx.db
            .query("verifications")
            .withIndex("by_target", (q) =>
                q.eq("target", args.target).eq("purpose", args.purpose).eq("status", "pending")
            )
            .collect();

        for (const v of existing) {
            await ctx.db.patch(v._id, { status: "expired" });
        }

        const id = await ctx.db.insert("verifications", {
            userId: args.userId,
            target: args.target,
            channel: args.channel,
            purpose: args.purpose,
            status: "pending",
            attempts: 0,
            maxAttempts: args.maxAttempts ?? 5,
            createdAt: Date.now(),
            expiresAt: args.expiresAt,
        });

        return { id: id as string };
    },
});

/**
 * Update a verification record status and increment attempts.
 */
export const updateVerification = mutation({
    args: {
        id: v.id("verifications"),
        status: v.optional(v.string()),
        incrementAttempts: v.optional(v.boolean()),
    },
    returns: v.object({ success: v.boolean(), exceeded: v.optional(v.boolean()) }),
    handler: async (ctx, { id, status, incrementAttempts }) => {
        const record = await ctx.db.get(id);
        if (!record) return { success: false };

        const patch: Record<string, unknown> = {};

        if (incrementAttempts) {
            const newAttempts = record.attempts + 1;
            patch.attempts = newAttempts;
            if (newAttempts >= record.maxAttempts) {
                patch.status = "failed";
                await ctx.db.patch(id, patch);
                return { success: true, exceeded: true };
            }
        }

        if (status) {
            patch.status = status;
            if (status === "verified") {
                patch.verifiedAt = Date.now();
            }
        }

        if (Object.keys(patch).length > 0) {
            await ctx.db.patch(id, patch);
        }

        return { success: true };
    },
});

// =============================================================================
// CLEANUP
// =============================================================================

/**
 * Clean up expired sessions, OAuth states, and magic links.
 * Should be called periodically via a scheduled function.
 */
export const cleanupExpired = mutation({
    args: {},
    returns: v.object({
        sessions: v.number(),
        oauthStates: v.number(),
        magicLinks: v.number(),
        verifications: v.number(),
    }),
    handler: async (ctx) => {
        const now = Date.now();
        let sessionsRemoved = 0;
        let oauthStatesRemoved = 0;
        let magicLinksRemoved = 0;

        // Clean up expired sessions (inactive or expired)
        const expiredSessions = await ctx.db
            .query("sessions")
            .filter((q) =>
                q.or(
                    q.lt(q.field("expiresAt"), now),
                    q.eq(q.field("isActive"), false)
                )
            )
            .take(100);

        for (const session of expiredSessions) {
            await ctx.db.delete(session._id);
            sessionsRemoved++;
        }

        // Clean up expired/consumed OAuth states
        const expiredStates = await ctx.db
            .query("oauthStates")
            .filter((q) =>
                q.or(
                    q.lt(q.field("expiresAt"), now),
                    q.eq(q.field("consumed"), true)
                )
            )
            .take(100);

        for (const state of expiredStates) {
            await ctx.db.delete(state._id);
            oauthStatesRemoved++;
        }

        // Clean up expired/consumed magic links
        const expiredLinks = await ctx.db
            .query("magicLinks")
            .filter((q) =>
                q.or(
                    q.lt(q.field("expiresAt"), now),
                    q.eq(q.field("consumed"), true)
                )
            )
            .take(100);

        for (const link of expiredLinks) {
            await ctx.db.delete(link._id);
            magicLinksRemoved++;
        }

        // Clean up expired/used verifications
        let verificationsRemoved = 0;
        const expiredVerifications = await ctx.db
            .query("verifications")
            .filter((q) =>
                q.or(
                    q.lt(q.field("expiresAt"), now),
                    q.eq(q.field("status"), "verified"),
                    q.eq(q.field("status"), "failed")
                )
            )
            .take(100);

        for (const v of expiredVerifications) {
            await ctx.db.delete(v._id);
            verificationsRemoved++;
        }

        return {
            sessions: sessionsRemoved,
            oauthStates: oauthStatesRemoved,
            magicLinks: magicLinksRemoved,
            verifications: verificationsRemoved,
        };
    },
});

// =============================================================================
// IMPORT FUNCTIONS (data migration)
// =============================================================================

/**
 * Import a session record from the legacy table.
 * Used during data migration.
 */
export const importSession = mutation({
    args: {
        userId: v.string(),
        token: v.string(),
        appId: v.optional(v.string()),
        provider: v.string(),
        expiresAt: v.number(),
        lastActiveAt: v.number(),
        isActive: v.boolean(),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("sessions", { ...args });
        return { id: id as string };
    },
});

/**
 * Import an OAuth state record from the legacy table.
 * Used during data migration.
 */
export const importOAuthState = mutation({
    args: {
        state: v.string(),
        provider: v.string(),
        appOrigin: v.string(),
        returnPath: v.string(),
        appId: v.string(),
        signicatSessionId: v.optional(v.string()),
        createdAt: v.number(),
        expiresAt: v.number(),
        consumed: v.boolean(),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("oauthStates", { ...args });
        return { id: id as string };
    },
});

/**
 * Import a magic link record from the legacy table.
 * Used during data migration.
 */
export const importMagicLink = mutation({
    args: {
        email: v.string(),
        token: v.string(),
        appOrigin: v.string(),
        returnPath: v.string(),
        appId: v.string(),
        createdAt: v.number(),
        expiresAt: v.number(),
        consumed: v.boolean(),
        consumedAt: v.optional(v.number()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("magicLinks", { ...args });
        return { id: id as string };
    },
});

/**
 * Import a demo token record from the legacy table.
 * Used during data migration.
 */
export const importDemoToken = mutation({
    args: {
        key: v.string(),
        tenantId: v.string(),
        organizationId: v.optional(v.string()),
        userId: v.string(),
        tokenHash: v.string(),
        isActive: v.boolean(),
        expiresAt: v.optional(v.number()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("authDemoTokens", { ...args });
        return { id: id as string };
    },
});
