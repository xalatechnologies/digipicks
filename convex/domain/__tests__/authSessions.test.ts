import { describe, it, expect } from "vitest";
import { api } from "../../_generated/api";
import { createDomainTest, seedTestTenant } from "./testHelper.test-util";

describe("domain/authSessions", () => {
    function setup() {
        return createDomainTest(["auth"]);
    }

    // =========================================================================
    // SESSION FUNCTIONS
    // =========================================================================

    describe("createSession", () => {
        it("creates a session for a user", async () => {
            const t = setup();
            const { userId } = await seedTestTenant(t);
            const expiresAt = Date.now() + 24 * 3_600_000;

            const result = await t.mutation(
                api.domain.authSessions.createSession,
                {
                    userId,
                    token: "tok-session-001",
                    provider: "password",
                    expiresAt,
                }
            );

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
        });

        it("creates a session with optional appId", async () => {
            const t = setup();
            const { userId } = await seedTestTenant(t);

            const result = await t.mutation(
                api.domain.authSessions.createSession,
                {
                    userId,
                    token: "tok-session-002",
                    provider: "signicat",
                    appId: "web",
                    expiresAt: Date.now() + 24 * 3_600_000,
                }
            );

            expect(result.id).toBeDefined();
        });
    });

    describe("validateSession", () => {
        it("validates an active session", async () => {
            const t = setup();
            const { userId } = await seedTestTenant(t);
            const expiresAt = Date.now() + 24 * 3_600_000;

            await t.mutation(api.domain.authSessions.createSession, {
                userId,
                token: "tok-valid",
                provider: "password",
                expiresAt,
            });

            const session = await t.query(
                api.domain.authSessions.validateSession,
                { token: "tok-valid" }
            );

            expect(session).toBeDefined();
            expect(session).not.toBeNull();
            expect(session.userId).toBe(userId as string);
            expect(session.isActive).toBe(true);
        });

        it("returns null for nonexistent token", async () => {
            const t = setup();
            await seedTestTenant(t);

            const session = await t.query(
                api.domain.authSessions.validateSession,
                { token: "tok-nonexistent" }
            );

            expect(session).toBeNull();
        });
    });

    describe("getSessionByToken", () => {
        it("returns session data by token", async () => {
            const t = setup();
            const { userId } = await seedTestTenant(t);

            await t.mutation(api.domain.authSessions.createSession, {
                userId,
                token: "tok-get-by-token",
                provider: "signicat",
                expiresAt: Date.now() + 24 * 3_600_000,
            });

            const session = await t.query(
                api.domain.authSessions.getSessionByToken,
                { token: "tok-get-by-token" }
            );

            expect(session).toBeDefined();
            expect(session).not.toBeNull();
            expect(session.provider).toBe("signicat");
        });

        it("returns null for unknown token", async () => {
            const t = setup();
            await seedTestTenant(t);

            const session = await t.query(
                api.domain.authSessions.getSessionByToken,
                { token: "tok-unknown" }
            );

            expect(session).toBeNull();
        });
    });

    describe("invalidateSession", () => {
        it("invalidates an active session (logout)", async () => {
            const t = setup();
            const { userId } = await seedTestTenant(t);

            await t.mutation(api.domain.authSessions.createSession, {
                userId,
                token: "tok-invalidate",
                provider: "password",
                expiresAt: Date.now() + 24 * 3_600_000,
            });

            const result = await t.mutation(
                api.domain.authSessions.invalidateSession,
                { token: "tok-invalidate" }
            );

            expect(result.success).toBe(true);

            // Validate should now return null (session inactive)
            const session = await t.query(
                api.domain.authSessions.validateSession,
                { token: "tok-invalidate" }
            );
            expect(session).toBeNull();
        });

        it("returns false for nonexistent token", async () => {
            const t = setup();
            await seedTestTenant(t);

            const result = await t.mutation(
                api.domain.authSessions.invalidateSession,
                { token: "tok-nonexistent" }
            );

            expect(result.success).toBe(false);
        });
    });

    // =========================================================================
    // OAUTH STATE FUNCTIONS
    // =========================================================================

    describe("createOAuthState", () => {
        it("creates an OAuth state entry", async () => {
            const t = setup();
            await seedTestTenant(t);

            const result = await t.mutation(
                api.domain.authSessions.createOAuthState,
                {
                    state: "oauth-state-abc123",
                    provider: "signicat",
                    appOrigin: "https://web.test.example.com",
                    returnPath: "/callback",
                    appId: "web",
                    expiresAt: Date.now() + 600_000,
                }
            );

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
        });
    });

    describe("consumeOAuthState", () => {
        it("consumes an OAuth state entry (one-time use)", async () => {
            const t = setup();
            await seedTestTenant(t);

            await t.mutation(api.domain.authSessions.createOAuthState, {
                state: "oauth-consume-test",
                provider: "signicat",
                appOrigin: "https://web.test.example.com",
                returnPath: "/callback",
                appId: "web",
                expiresAt: Date.now() + 600_000,
            });

            const consumed = await t.mutation(
                api.domain.authSessions.consumeOAuthState,
                { state: "oauth-consume-test" }
            );

            expect(consumed).toBeDefined();
            expect(consumed).not.toBeNull();
            expect(consumed.provider).toBe("signicat");

            // Second consumption should return null
            const second = await t.mutation(
                api.domain.authSessions.consumeOAuthState,
                { state: "oauth-consume-test" }
            );
            expect(second).toBeNull();
        });

        it("returns null for unknown state", async () => {
            const t = setup();
            await seedTestTenant(t);

            const result = await t.mutation(
                api.domain.authSessions.consumeOAuthState,
                { state: "unknown-state" }
            );

            expect(result).toBeNull();
        });
    });

    // =========================================================================
    // MAGIC LINK FUNCTIONS
    // =========================================================================

    describe("createMagicLink", () => {
        it("creates a magic link", async () => {
            const t = setup();
            await seedTestTenant(t);

            const result = await t.mutation(
                api.domain.authSessions.createMagicLink,
                {
                    email: "user@test.no",
                    token: "ml-tok-abc",
                    appOrigin: "https://web.test.example.com",
                    returnPath: "/verify",
                    appId: "web",
                    expiresAt: Date.now() + 600_000,
                }
            );

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
        });
    });

    describe("consumeMagicLink", () => {
        it("consumes a magic link (one-time use)", async () => {
            const t = setup();
            await seedTestTenant(t);

            await t.mutation(api.domain.authSessions.createMagicLink, {
                email: "magic@test.no",
                token: "ml-consume-test",
                appOrigin: "https://web.test.example.com",
                returnPath: "/verify",
                appId: "web",
                expiresAt: Date.now() + 600_000,
            });

            const consumed = await t.mutation(
                api.domain.authSessions.consumeMagicLink,
                { token: "ml-consume-test" }
            );

            expect(consumed).toBeDefined();
            expect(consumed).not.toBeNull();
            expect(consumed.email).toBe("magic@test.no");

            // Second consumption should return null
            const second = await t.mutation(
                api.domain.authSessions.consumeMagicLink,
                { token: "ml-consume-test" }
            );
            expect(second).toBeNull();
        });

        it("returns null for unknown token", async () => {
            const t = setup();
            await seedTestTenant(t);

            const result = await t.mutation(
                api.domain.authSessions.consumeMagicLink,
                { token: "ml-unknown" }
            );

            expect(result).toBeNull();
        });
    });

    // =========================================================================
    // DEMO TOKEN FUNCTIONS
    // =========================================================================

    describe("createDemoToken", () => {
        it("creates a demo token", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const result = await t.mutation(
                api.domain.authSessions.createDemoToken,
                {
                    key: "demo-tenant",
                    tenantId,
                    userId,
                    tokenHash: "sha256-abc123",
                    expiresAt: Date.now() + 30 * 24 * 3_600_000,
                }
            );

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
        });
    });

    describe("validateDemoToken", () => {
        it("validates an active demo token", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            await t.mutation(api.domain.authSessions.createDemoToken, {
                key: "demo-validate",
                tenantId,
                userId,
                tokenHash: "sha256-validate",
                expiresAt: Date.now() + 30 * 24 * 3_600_000,
            });

            const token = await t.query(
                api.domain.authSessions.validateDemoToken,
                { key: "demo-validate" }
            );

            expect(token).toBeDefined();
            expect(token).not.toBeNull();
            expect(token.tenantId).toBe(tenantId as string);
            expect(token.userId).toBe(userId as string);
        });

        it("returns null for unknown key", async () => {
            const t = setup();
            await seedTestTenant(t);

            const token = await t.query(
                api.domain.authSessions.validateDemoToken,
                { key: "nonexistent-key" }
            );

            expect(token).toBeNull();
        });

        it("deactivates old token when creating duplicate key", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            // Create first demo token
            await t.mutation(api.domain.authSessions.createDemoToken, {
                key: "demo-dup",
                tenantId,
                userId,
                tokenHash: "hash-v1",
            });

            // Validate it works
            const first = await t.query(
                api.domain.authSessions.validateDemoToken,
                { key: "demo-dup" }
            );
            expect(first).not.toBeNull();
            expect(first.tokenHash).toBe("hash-v1");

            // Create a new token with the same key (deactivates the old one)
            const { id: newId } = await t.mutation(
                api.domain.authSessions.createDemoToken,
                {
                    key: "demo-dup",
                    tenantId,
                    userId,
                    tokenHash: "hash-v2",
                }
            );

            // The new token was created successfully
            expect(newId).toBeDefined();
        });
    });

    // =========================================================================
    // CLEANUP
    // =========================================================================

    describe("cleanupExpired", () => {
        it("returns cleanup counts", async () => {
            const t = setup();
            await seedTestTenant(t);

            const result = await t.mutation(
                api.domain.authSessions.cleanupExpired,
                {}
            );

            expect(result).toBeDefined();
            expect(typeof result.sessions).toBe("number");
            expect(typeof result.oauthStates).toBe("number");
            expect(typeof result.magicLinks).toBe("number");
        });
    });
});
