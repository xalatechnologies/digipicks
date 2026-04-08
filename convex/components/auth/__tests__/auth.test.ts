/**
 * Auth Component — convex-test Integration Tests
 *
 * Tests sessions, OAuth states, magic links, demo tokens, and cleanup.
 * Run: npx vitest --config convex/vitest.config.ts components/auth/auth.test.ts
 */

import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../schema";
import { modules } from "../testSetup.test-util";
import { api } from "../_generated/api";

const USER = "user-001";
const TENANT = "tenant-001";
const HOUR = 3_600_000;
const FUTURE = Date.now() + 24 * HOUR;

// ---------------------------------------------------------------------------
// Session mutations
// ---------------------------------------------------------------------------

describe("auth/mutations — createSession", () => {
    it("creates an active session with required fields", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createSession, {
            userId: USER,
            token: "tok-abc123",
            provider: "password",
            expiresAt: FUTURE,
        });
        expect(id).toBeDefined();
        const session = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(session?.isActive).toBe(true);
        expect(session?.userId).toBe(USER);
        expect(session?.provider).toBe("password");
        expect(session?.lastActiveAt).toBeGreaterThan(0);
    });

    it("stores optional appId", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createSession, {
            userId: USER,
            token: "tok-app",
            provider: "oauth",
            expiresAt: FUTURE,
            appId: "web",
        });
        const session = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(session?.appId).toBe("web");
    });
});

describe("auth/mutations — invalidateSession", () => {
    it("deactivates an existing session", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createSession, {
            userId: USER, token: "tok-inv", provider: "password", expiresAt: FUTURE,
        });
        const { success } = await t.mutation(api.mutations.invalidateSession, { token: "tok-inv" });
        expect(success).toBe(true);
        const session = await t.run(async (ctx) =>
            ctx.db.query("sessions").withIndex("by_token", (q) => q.eq("token", "tok-inv")).first()
        );
        expect(session?.isActive).toBe(false);
    });

    it("returns false for non-existent token", async () => {
        const t = convexTest(schema, modules);
        const { success } = await t.mutation(api.mutations.invalidateSession, { token: "nonexistent" });
        expect(success).toBe(false);
    });
});

describe("auth/mutations — touchSession", () => {
    it("updates lastActiveAt timestamp", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createSession, {
            userId: USER, token: "tok-touch", provider: "password", expiresAt: FUTURE,
        });
        const before = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        await t.mutation(api.mutations.touchSession, { sessionId: id as any });
        const after = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(after?.lastActiveAt).toBeGreaterThanOrEqual(before?.lastActiveAt ?? 0);
    });
});

// ---------------------------------------------------------------------------
// OAuth State mutations
// ---------------------------------------------------------------------------

describe("auth/mutations — createOAuthState", () => {
    it("creates an unconsumed OAuth state entry", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createOAuthState, {
            state: "oauth-state-abc",
            provider: "google",
            appOrigin: "https://app.example.com",
            returnPath: "/callback",
            appId: "web",
            expiresAt: FUTURE,
        });
        expect(id).toBeDefined();
        const entry = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(entry?.consumed).toBe(false);
        expect(entry?.provider).toBe("google");
    });

    it("stores optional signicatSessionId", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createOAuthState, {
            state: "oauth-signicat",
            provider: "signicat",
            appOrigin: "https://app.example.com",
            returnPath: "/callback",
            appId: "web",
            expiresAt: FUTURE,
            signicatSessionId: "sig-session-123",
        });
        const entry = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(entry?.signicatSessionId).toBe("sig-session-123");
    });
});

describe("auth/mutations — consumeOAuthState", () => {
    it("consumes a valid state and returns entry data", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createOAuthState, {
            state: "consume-me",
            provider: "google",
            appOrigin: "https://app.example.com",
            returnPath: "/callback",
            appId: "web",
            expiresAt: FUTURE,
        });
        const result = await t.mutation(api.mutations.consumeOAuthState, { state: "consume-me" });
        expect(result).not.toBeNull();
        expect(result!.state).toBe("consume-me");
    });

    it("returns null for already consumed state", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createOAuthState, {
            state: "double-consume",
            provider: "google",
            appOrigin: "https://app.example.com",
            returnPath: "/callback",
            appId: "web",
            expiresAt: FUTURE,
        });
        await t.mutation(api.mutations.consumeOAuthState, { state: "double-consume" });
        const result = await t.mutation(api.mutations.consumeOAuthState, { state: "double-consume" });
        expect(result).toBeNull();
    });

    it("returns null for non-existent state", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.mutations.consumeOAuthState, { state: "no-such-state" });
        expect(result).toBeNull();
    });

    it("returns null for expired state", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createOAuthState, {
            state: "expired-state",
            provider: "google",
            appOrigin: "https://app.example.com",
            returnPath: "/callback",
            appId: "web",
            expiresAt: Date.now() - 1000,
        });
        const result = await t.mutation(api.mutations.consumeOAuthState, { state: "expired-state" });
        expect(result).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Magic Link mutations
// ---------------------------------------------------------------------------

describe("auth/mutations — createMagicLink", () => {
    it("creates an unconsumed magic link", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createMagicLink, {
            email: "user@example.com",
            token: "magic-tok-123",
            appOrigin: "https://app.example.com",
            returnPath: "/verify",
            appId: "minside",
            expiresAt: FUTURE,
        });
        expect(id).toBeDefined();
        const link = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(link?.consumed).toBe(false);
        expect(link?.email).toBe("user@example.com");
    });
});

describe("auth/mutations — consumeMagicLink", () => {
    it("consumes a valid magic link and returns data", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createMagicLink, {
            email: "user@example.com",
            token: "consume-magic",
            appOrigin: "https://app.example.com",
            returnPath: "/verify",
            appId: "web",
            expiresAt: FUTURE,
        });
        const result = await t.mutation(api.mutations.consumeMagicLink, { token: "consume-magic" });
        expect(result).not.toBeNull();
        expect(result!.email).toBe("user@example.com");
    });

    it("returns null for already consumed link", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createMagicLink, {
            email: "user@example.com",
            token: "double-magic",
            appOrigin: "https://app.example.com",
            returnPath: "/verify",
            appId: "web",
            expiresAt: FUTURE,
        });
        await t.mutation(api.mutations.consumeMagicLink, { token: "double-magic" });
        const result = await t.mutation(api.mutations.consumeMagicLink, { token: "double-magic" });
        expect(result).toBeNull();
    });

    it("returns null for expired link", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createMagicLink, {
            email: "user@example.com",
            token: "expired-magic",
            appOrigin: "https://app.example.com",
            returnPath: "/verify",
            appId: "web",
            expiresAt: Date.now() - 1000,
        });
        const result = await t.mutation(api.mutations.consumeMagicLink, { token: "expired-magic" });
        expect(result).toBeNull();
    });

    it("returns null for non-existent token", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.mutations.consumeMagicLink, { token: "no-such-link" });
        expect(result).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Demo Token mutations
// ---------------------------------------------------------------------------

describe("auth/mutations — createDemoToken", () => {
    it("creates an active demo token", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createDemoToken, {
            key: "demo-admin",
            tenantId: TENANT,
            userId: USER,
            tokenHash: "hash-abc123",
        });
        expect(id).toBeDefined();
        const token = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(token?.isActive).toBe(true);
        expect(token?.tenantId).toBe(TENANT);
    });

    it("deactivates existing token with same key", async () => {
        const t = convexTest(schema, modules);
        const { id: first } = await t.mutation(api.mutations.createDemoToken, {
            key: "demo-replace",
            tenantId: TENANT,
            userId: USER,
            tokenHash: "hash-1",
        });
        await t.mutation(api.mutations.createDemoToken, {
            key: "demo-replace",
            tenantId: TENANT,
            userId: USER,
            tokenHash: "hash-2",
        });
        const oldToken = await t.run(async (ctx) => ctx.db.get(first as any)) as any;
        expect(oldToken?.isActive).toBe(false);
    });

    it("stores optional organizationId and expiresAt", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createDemoToken, {
            key: "demo-org",
            tenantId: TENANT,
            userId: USER,
            tokenHash: "hash-org",
            organizationId: "org-001",
            expiresAt: FUTURE,
        });
        const token = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(token?.organizationId).toBe("org-001");
        expect(token?.expiresAt).toBe(FUTURE);
    });
});

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

describe("auth/mutations — cleanupExpired", () => {
    it("removes expired sessions and consumed states/links", async () => {
        const t = convexTest(schema, modules);
        const PAST = Date.now() - HOUR;

        await t.run(async (ctx) => {
            await ctx.db.insert("sessions", {
                userId: USER, token: "expired-session", provider: "password",
                expiresAt: PAST, lastActiveAt: PAST, isActive: true,
            });
            await ctx.db.insert("oauthStates", {
                state: "consumed-state", provider: "google",
                appOrigin: "https://app.example.com", returnPath: "/cb",
                appId: "web", createdAt: PAST, expiresAt: FUTURE, consumed: true,
            });
            await ctx.db.insert("magicLinks", {
                email: "user@example.com", token: "consumed-link",
                appOrigin: "https://app.example.com", returnPath: "/verify",
                appId: "web", createdAt: PAST, expiresAt: FUTURE, consumed: true,
            });
        });

        const result = await t.mutation(api.mutations.cleanupExpired, {});
        expect(result.sessions).toBeGreaterThanOrEqual(1);
        expect(result.oauthStates).toBeGreaterThanOrEqual(1);
        expect(result.magicLinks).toBeGreaterThanOrEqual(1);
    });

    it("returns zeros when nothing to clean", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.mutations.cleanupExpired, {});
        expect(result.sessions).toBe(0);
        expect(result.oauthStates).toBe(0);
        expect(result.magicLinks).toBe(0);
    });

    it("does NOT remove active sessions with future expiry", async () => {
        const t = convexTest(schema, modules);
        const PAST = Date.now() - HOUR;

        // Active session with future expiry — must survive
        const activeId = await t.run(async (ctx) =>
            ctx.db.insert("sessions", {
                userId: USER, token: "active-session", provider: "password",
                expiresAt: FUTURE, lastActiveAt: Date.now(), isActive: true,
            })
        );

        // Expired session — should be removed
        await t.run(async (ctx) =>
            ctx.db.insert("sessions", {
                userId: USER, token: "old-session", provider: "password",
                expiresAt: PAST, lastActiveAt: PAST, isActive: true,
            })
        );

        const result = await t.mutation(api.mutations.cleanupExpired, {});
        expect(result.sessions).toBe(1);

        // Active session must still exist
        const active = await t.run(async (ctx) => ctx.db.get(activeId));
        expect(active).not.toBeNull();
        expect(active?.isActive).toBe(true);
    });

    it("removes inactive (logged-out) sessions even if not yet expired", async () => {
        const t = convexTest(schema, modules);

        // Inactive session with future expiry — should still be cleaned
        await t.run(async (ctx) =>
            ctx.db.insert("sessions", {
                userId: USER, token: "logged-out-session", provider: "password",
                expiresAt: FUTURE, lastActiveAt: Date.now(), isActive: false,
            })
        );

        const result = await t.mutation(api.mutations.cleanupExpired, {});
        expect(result.sessions).toBe(1);

        const remaining = await t.run(async (ctx) =>
            ctx.db.query("sessions").collect()
        );
        expect(remaining.length).toBe(0);
    });

    it("respects batch limit of 100 per category", async () => {
        const t = convexTest(schema, modules);
        const PAST = Date.now() - HOUR;

        // Insert 110 expired sessions
        await t.run(async (ctx) => {
            for (let i = 0; i < 110; i++) {
                await ctx.db.insert("sessions", {
                    userId: USER, token: `batch-session-${i}`, provider: "password",
                    expiresAt: PAST, lastActiveAt: PAST, isActive: true,
                });
            }
        });

        // First run: removes up to 100
        const result1 = await t.mutation(api.mutations.cleanupExpired, {});
        expect(result1.sessions).toBe(100);

        // Second run: removes remaining 10
        const result2 = await t.mutation(api.mutations.cleanupExpired, {});
        expect(result2.sessions).toBe(10);

        // All gone now
        const remaining = await t.run(async (ctx) =>
            ctx.db.query("sessions").collect()
        );
        expect(remaining.length).toBe(0);
    });

    it("does NOT remove unconsumed, unexpired OAuth states and magic links", async () => {
        const t = convexTest(schema, modules);

        // Valid OAuth state — must survive
        const oauthId = await t.run(async (ctx) =>
            ctx.db.insert("oauthStates", {
                state: "valid-state", provider: "google",
                appOrigin: "https://app.example.com", returnPath: "/cb",
                appId: "web", createdAt: Date.now(), expiresAt: FUTURE, consumed: false,
            })
        );

        // Valid magic link — must survive
        const linkId = await t.run(async (ctx) =>
            ctx.db.insert("magicLinks", {
                email: "user@example.com", token: "valid-link",
                appOrigin: "https://app.example.com", returnPath: "/verify",
                appId: "web", createdAt: Date.now(), expiresAt: FUTURE, consumed: false,
            })
        );

        const result = await t.mutation(api.mutations.cleanupExpired, {});
        expect(result.oauthStates).toBe(0);
        expect(result.magicLinks).toBe(0);

        const oauth = await t.run(async (ctx) => ctx.db.get(oauthId));
        expect(oauth).not.toBeNull();
        const link = await t.run(async (ctx) => ctx.db.get(linkId));
        expect(link).not.toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Session queries
// ---------------------------------------------------------------------------

describe("auth/queries — validateSession", () => {
    it("returns session data for valid active token", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createSession, {
            userId: USER, token: "valid-tok", provider: "password", expiresAt: FUTURE,
        });
        const result = await t.query(api.queries.validateSession, { token: "valid-tok" });
        expect(result).not.toBeNull();
        expect(result!.userId).toBe(USER);
    });

    it("strips the token from the response", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createSession, {
            userId: USER, token: "stripped-tok", provider: "password", expiresAt: FUTURE,
        });
        const result = await t.query(api.queries.validateSession, { token: "stripped-tok" });
        expect((result as any)?.token).toBeUndefined();
    });

    it("returns null for expired session", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createSession, {
            userId: USER, token: "expired-tok", provider: "password",
            expiresAt: Date.now() - 1000,
        });
        const result = await t.query(api.queries.validateSession, { token: "expired-tok" });
        expect(result).toBeNull();
    });

    it("returns null for invalidated session", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createSession, {
            userId: USER, token: "inv-tok", provider: "password", expiresAt: FUTURE,
        });
        await t.mutation(api.mutations.invalidateSession, { token: "inv-tok" });
        const result = await t.query(api.queries.validateSession, { token: "inv-tok" });
        expect(result).toBeNull();
    });

    it("returns null for non-existent token", async () => {
        const t = convexTest(schema, modules);
        const result = await t.query(api.queries.validateSession, { token: "no-such-token" });
        expect(result).toBeNull();
    });
});

describe("auth/queries — getSessionByToken", () => {
    it("returns session without validation checks", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createSession, {
            userId: USER, token: "raw-tok", provider: "password", expiresAt: FUTURE,
        });
        const result = await t.query(api.queries.getSessionByToken, { token: "raw-tok" });
        expect(result).not.toBeNull();
        expect(result!.userId).toBe(USER);
        expect((result as any)?.token).toBeUndefined();
    });

    it("returns null for non-existent token", async () => {
        const t = convexTest(schema, modules);
        const result = await t.query(api.queries.getSessionByToken, { token: "missing" });
        expect(result).toBeNull();
    });
});

describe("auth/queries — validateDemoToken", () => {
    it("returns token data for valid key", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createDemoToken, {
            key: "valid-demo", tenantId: TENANT, userId: USER, tokenHash: "hash-xyz",
        });
        const result = await t.query(api.queries.validateDemoToken, { key: "valid-demo" });
        expect(result).not.toBeNull();
        expect(result!.tenantId).toBe(TENANT);
    });

    it("returns null for expired demo token", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createDemoToken, {
            key: "expired-demo",
            tenantId: TENANT,
            userId: USER,
            tokenHash: "hash-exp",
            expiresAt: Date.now() - 1000,
        });
        const result = await t.query(api.queries.validateDemoToken, { key: "expired-demo" });
        expect(result).toBeNull();
    });

    it("returns null for non-existent key", async () => {
        const t = convexTest(schema, modules);
        const result = await t.query(api.queries.validateDemoToken, { key: "no-such-key" });
        expect(result).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Schema index correctness
// ---------------------------------------------------------------------------

describe("auth schema — index correctness", () => {
    it("by_token on sessions returns matching session", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createSession, {
            userId: USER, token: "idx-tok", provider: "password", expiresAt: FUTURE,
        });
        const result = await t.run(async (ctx) =>
            ctx.db.query("sessions").withIndex("by_token", (q) => q.eq("token", "idx-tok")).first()
        );
        expect(result).not.toBeNull();
        expect(result?.token).toBe("idx-tok");
    });

    it("by_user on sessions returns all sessions for user", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createSession, {
            userId: USER, token: "idx-u1", provider: "password", expiresAt: FUTURE,
        });
        await t.mutation(api.mutations.createSession, {
            userId: USER, token: "idx-u2", provider: "oauth", expiresAt: FUTURE,
        });
        const sessions = await t.run(async (ctx) =>
            ctx.db.query("sessions").withIndex("by_user", (q) => q.eq("userId", USER)).collect()
        );
        expect(sessions.length).toBe(2);
    });

    it("by_state on oauthStates", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createOAuthState, {
            state: "idx-state", provider: "google", appOrigin: "https://app.example.com",
            returnPath: "/cb", appId: "web", expiresAt: FUTURE,
        });
        const result = await t.run(async (ctx) =>
            ctx.db.query("oauthStates").withIndex("by_state", (q) => q.eq("state", "idx-state")).first()
        );
        expect(result).not.toBeNull();
    });

    it("by_token on magicLinks", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createMagicLink, {
            email: "user@example.com", token: "idx-magic",
            appOrigin: "https://app.example.com", returnPath: "/verify",
            appId: "web", expiresAt: FUTURE,
        });
        const result = await t.run(async (ctx) =>
            ctx.db.query("magicLinks").withIndex("by_token", (q) => q.eq("token", "idx-magic")).first()
        );
        expect(result).not.toBeNull();
    });

    it("by_email on magicLinks", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createMagicLink, {
            email: "indexed@example.com", token: "idx-email-1",
            appOrigin: "https://app.example.com", returnPath: "/verify",
            appId: "web", expiresAt: FUTURE,
        });
        const results = await t.run(async (ctx) =>
            ctx.db.query("magicLinks").withIndex("by_email", (q) => q.eq("email", "indexed@example.com")).collect()
        );
        expect(results.length).toBe(1);
    });

    it("by_key on authDemoTokens", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createDemoToken, {
            key: "idx-demo", tenantId: TENANT, userId: USER, tokenHash: "hash-idx",
        });
        const result = await t.run(async (ctx) =>
            ctx.db.query("authDemoTokens").withIndex("by_key", (q) => q.eq("key", "idx-demo")).first()
        );
        expect(result).not.toBeNull();
        expect(result?.key).toBe("idx-demo");
    });
});
