import { query, mutation, internalMutation } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Create a new session for a user.
 * Internal mutation — called from password.ts and http.ts callback.
 */
export const createSession = internalMutation({
    args: {
        userId: v.id("users"),
        provider: v.string(),
        appId: v.optional(v.string()),
    },
    handler: async (ctx, { userId, provider, appId }) => {
        const token = crypto.randomUUID();
        const now = Date.now();

        await ctx.runMutation(
            components.auth.mutations.createSession,
            {
                userId: userId as string,
                token,
                appId,
                provider,
                expiresAt: now + SESSION_DURATION_MS,
            }
        );

        return token;
    },
});

/**
 * Validate a session by token.
 * Returns user + tenant data if valid, null otherwise.
 */
export const validateSessionByToken = query({
    args: {
        token: v.string(),
    },
    handler: async (ctx, { token }) => {
        const session = await ctx.runQuery(
            components.auth.queries.validateSession,
            { token }
        );

        if (!session) {
            return null;
        }

        const user = await ctx.db.get(session.userId as any) as any;
        if (!user || user.status !== "active") {
            return null;
        }

        const tenant = user.tenantId ? await ctx.db.get(user.tenantId) as any : null;

        return {
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                displayName: user.displayName,
                role: user.role,
                avatarUrl: user.avatarUrl,
                tenantId: user.tenantId,
                organizationId: user.organizationId,
            },
            tenant: tenant
                ? {
                      id: tenant._id,
                      name: tenant.name,
                      slug: tenant.slug,
                  }
                : null,
            session: {
                expiresAt: session.expiresAt,
                provider: session.provider,
                appId: session.appId,
            },
        };
    },
});

/**
 * Delete (deactivate) a single session.
 */
export const deleteSession = mutation({
    args: {
        token: v.string(),
    },
    handler: async (ctx, { token }) => {
        await ctx.runMutation(
            components.auth.mutations.invalidateSession,
            { token }
        );
    },
});

/**
 * Delete all sessions for a user (sign out everywhere).
 * Fetches active sessions via the auth component and invalidates each one.
 */
export const deleteAllUserSessions = mutation({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, { userId }) => {
        const sessions = await ctx.runQuery(
            components.auth.queries.listSessionsByUser,
            { userId: userId as string }
        );

        await Promise.all(
            (sessions as any[]).map((session: any) =>
                ctx.runMutation(components.auth.mutations.invalidateSession, {
                    token: session.token,
                }).catch(() => null) // best-effort; session may already be expired
            )
        );
    },
});

/**
 * Touch session — update lastActiveAt to keep it alive.
 * Delegates to the auth component's touchSession mutation.
 */
export const touchSession = mutation({
    args: {
        token: v.string(),
    },
    handler: async (ctx, { token }) => {
        const session = await ctx.runQuery(
            components.auth.queries.getSessionByToken,
            { token }
        );

        if (!session || !session.isActive || session.expiresAt < Date.now()) {
            return;
        }

        await ctx.runMutation(components.auth.mutations.touchSession, {
            sessionId: session._id,
        });
    },
});
