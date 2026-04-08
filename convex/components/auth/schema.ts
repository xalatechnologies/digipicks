/**
 * Auth Component Schema
 *
 * Sessions, OAuth states, magic links, and demo tokens for authentication.
 * External references (userId, tenantId, organizationId) use v.string()
 * because component tables cannot reference app-level tables via v.id().
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    sessions: defineTable({
        userId: v.string(),
        token: v.string(),
        appId: v.optional(v.string()),
        provider: v.string(),
        expiresAt: v.number(),
        lastActiveAt: v.number(),
        isActive: v.boolean(),
    })
        .index("by_token", ["token"])
        .index("by_user", ["userId"]),

    oauthStates: defineTable({
        state: v.string(),
        provider: v.string(),
        appOrigin: v.string(),
        returnPath: v.string(),
        appId: v.string(),
        signicatSessionId: v.optional(v.string()),
        createdAt: v.number(),
        expiresAt: v.number(),
        consumed: v.boolean(),
    }).index("by_state", ["state"]),

    magicLinks: defineTable({
        email: v.string(),
        token: v.string(),
        appOrigin: v.string(),
        returnPath: v.string(),
        appId: v.string(),
        createdAt: v.number(),
        expiresAt: v.number(),
        consumed: v.boolean(),
        consumedAt: v.optional(v.number()),
    })
        .index("by_token", ["token"])
        .index("by_email", ["email"]),

    authDemoTokens: defineTable({
        key: v.string(),
        tenantId: v.string(),
        organizationId: v.optional(v.string()),
        userId: v.string(),
        tokenHash: v.string(),
        isActive: v.boolean(),
        expiresAt: v.optional(v.number()),
    })
        .index("by_key", ["key"])
        .index("by_user", ["userId"]),

    verifications: defineTable({
        userId: v.optional(v.string()),
        target: v.string(),
        channel: v.string(),
        purpose: v.string(),
        status: v.string(),
        attempts: v.number(),
        maxAttempts: v.number(),
        createdAt: v.number(),
        expiresAt: v.number(),
        verifiedAt: v.optional(v.number()),
    })
        .index("by_target", ["target", "purpose", "status"])
        .index("by_user", ["userId", "purpose"]),
});
