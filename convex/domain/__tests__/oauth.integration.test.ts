import { describe, it, expect } from "vitest";
import { api, components } from "../../_generated/api";
import { createDomainTest, seedTestTenant } from "./testHelper.test-util";

describe("domain/authSessions — integration", () => {
    function setup() {
        return createDomainTest(["auth", "rbac"]);
    }

    // =========================================================================
    // SESSION CRUD
    // =========================================================================

    describe("Session CRUD", () => {
        it("creates a session and retrieves it by ID-bearing token", async () => {
            const t = setup();
            const { userId } = await seedTestTenant(t);
            const token = `tok-crud-${Date.now()}`;

            const { id } = await t.mutation(
                api.domain.authSessions.createSession,
                {
                    userId,
                    token,
                    provider: "password",
                    expiresAt: Date.now() + 24 * 3_600_000,
                }
            );

            expect(id).toBeDefined();

            const session = await t.query(
                api.domain.authSessions.getSessionByToken,
                { token }
            );

            expect(session).not.toBeNull();
            expect(session.userId).toBe(userId as string);
            expect(session.provider).toBe("password");
        });

        it("getSessionByToken returns raw session regardless of expiry", async () => {
            const t = setup();
            const { userId } = await seedTestTenant(t);
            const token = "tok-expired-raw";

            // Create an already-expired session
            await t.mutation(api.domain.authSessions.createSession, {
                userId,
                token,
                provider: "password",
                expiresAt: Date.now() - 1000, // already expired
            });

            // getSessionByToken returns raw data (no validation checks)
            const session = await t.query(
                api.domain.authSessions.getSessionByToken,
                { token }
            );

            expect(session).not.toBeNull();
            expect(session.userId).toBe(userId as string);
        });

        it("validateSession returns session data for active, non-expired session", async () => {
            const t = setup();
            const { userId } = await seedTestTenant(t);
            const token = "tok-validate-active";

            await t.mutation(api.domain.authSessions.createSession, {
                userId,
                token,
                provider: "signicat",
                expiresAt: Date.now() + 24 * 3_600_000,
            });

            const session = await t.query(
                api.domain.authSessions.validateSession,
                { token }
            );

            expect(session).not.toBeNull();
            expect(session.isActive).toBe(true);
            expect(session.provider).toBe("signicat");
        });

        it("deactivates a session via invalidateSession", async () => {
            const t = setup();
            const { userId } = await seedTestTenant(t);
            const token = "tok-deactivate-int";

            await t.mutation(api.domain.authSessions.createSession, {
                userId,
                token,
                provider: "password",
                expiresAt: Date.now() + 24 * 3_600_000,
            });

            const result = await t.mutation(
                api.domain.authSessions.invalidateSession,
                { token }
            );
            expect(result.success).toBe(true);

            // Session should still exist via getSessionByToken but be inactive
            const raw = await t.query(
                api.domain.authSessions.getSessionByToken,
                { token }
            );
            expect(raw).not.toBeNull();
            expect(raw.isActive).toBe(false);
        });

        it("validateSession rejects expired session", async () => {
            const t = setup();
            const { userId } = await seedTestTenant(t);
            const token = "tok-expired-validate";

            await t.mutation(api.domain.authSessions.createSession, {
                userId,
                token,
                provider: "password",
                expiresAt: Date.now() - 5000, // 5 seconds in the past
            });

            const session = await t.query(
                api.domain.authSessions.validateSession,
                { token }
            );

            expect(session).toBeNull();
        });

        it("validateSession rejects deactivated session", async () => {
            const t = setup();
            const { userId } = await seedTestTenant(t);
            const token = "tok-deactivated-reject";

            await t.mutation(api.domain.authSessions.createSession, {
                userId,
                token,
                provider: "password",
                expiresAt: Date.now() + 24 * 3_600_000,
            });

            await t.mutation(api.domain.authSessions.invalidateSession, {
                token,
            });

            const session = await t.query(
                api.domain.authSessions.validateSession,
                { token }
            );

            expect(session).toBeNull();
        });
    });

    // =========================================================================
    // OAUTH STATE
    // =========================================================================

    describe("OAuth State", () => {
        it("creates OAuth state and returns an id", async () => {
            const t = setup();
            await seedTestTenant(t);

            const result = await t.mutation(
                api.domain.authSessions.createOAuthState,
                {
                    state: "oauth-int-create",
                    provider: "signicat",
                    appOrigin: "https://web.test.example.com",
                    returnPath: "/callback",
                    appId: "web",
                    expiresAt: Date.now() + 600_000,
                }
            );

            expect(result.id).toBeDefined();
            expect(typeof result.id).toBe("string");
        });

        it("consumeOAuthState returns provider and redirectUrl fields", async () => {
            const t = setup();
            await seedTestTenant(t);

            await t.mutation(api.domain.authSessions.createOAuthState, {
                state: "oauth-fields-check",
                provider: "signicat",
                appOrigin: "https://dashboard.test.example.com",
                returnPath: "/admin/callback",
                appId: "dashboard",
                expiresAt: Date.now() + 600_000,
            });

            const consumed = await t.mutation(
                api.domain.authSessions.consumeOAuthState,
                { state: "oauth-fields-check" }
            );

            expect(consumed).not.toBeNull();
            expect(consumed.provider).toBe("signicat");
            expect(consumed.appOrigin).toBe("https://dashboard.test.example.com");
            expect(consumed.returnPath).toBe("/admin/callback");
            expect(consumed.appId).toBe("dashboard");
        });

        it("rejects already-consumed OAuth state", async () => {
            const t = setup();
            await seedTestTenant(t);

            await t.mutation(api.domain.authSessions.createOAuthState, {
                state: "oauth-double-consume",
                provider: "signicat",
                appOrigin: "https://web.test.example.com",
                returnPath: "/cb",
                appId: "web",
                expiresAt: Date.now() + 600_000,
            });

            // First consume succeeds
            const first = await t.mutation(
                api.domain.authSessions.consumeOAuthState,
                { state: "oauth-double-consume" }
            );
            expect(first).not.toBeNull();

            // Second consume returns null
            const second = await t.mutation(
                api.domain.authSessions.consumeOAuthState,
                { state: "oauth-double-consume" }
            );
            expect(second).toBeNull();
        });

        it("rejects expired OAuth state", async () => {
            const t = setup();
            await seedTestTenant(t);

            // Seed an already-expired OAuth state via component import
            await t.mutation(components.auth.mutations.importOAuthState, {
                state: "oauth-expired-state",
                provider: "signicat",
                appOrigin: "https://web.test.example.com",
                returnPath: "/cb",
                appId: "web",
                createdAt: Date.now() - 700_000,
                expiresAt: Date.now() - 100_000, // expired
                consumed: false,
            });

            const result = await t.mutation(
                api.domain.authSessions.consumeOAuthState,
                { state: "oauth-expired-state" }
            );

            expect(result).toBeNull();
        });

        it("OAuth state includes signicatSessionId when provided", async () => {
            const t = setup();
            await seedTestTenant(t);

            await t.mutation(api.domain.authSessions.createOAuthState, {
                state: "oauth-signicat-sid",
                provider: "signicat",
                appOrigin: "https://web.test.example.com",
                returnPath: "/cb",
                appId: "web",
                signicatSessionId: "sig-session-xyz",
                expiresAt: Date.now() + 600_000,
            });

            const consumed = await t.mutation(
                api.domain.authSessions.consumeOAuthState,
                { state: "oauth-signicat-sid" }
            );

            expect(consumed).not.toBeNull();
            expect(consumed.signicatSessionId).toBe("sig-session-xyz");
        });
    });

    // =========================================================================
    // SESSION LIFECYCLE
    // =========================================================================

    describe("Session Lifecycle", () => {
        it("full lifecycle: create -> validate -> deactivate -> reject", async () => {
            const t = setup();
            const { userId } = await seedTestTenant(t);
            const token = "tok-lifecycle-full";

            // 1. Create
            const { id } = await t.mutation(
                api.domain.authSessions.createSession,
                {
                    userId,
                    token,
                    provider: "password",
                    expiresAt: Date.now() + 24 * 3_600_000,
                }
            );
            expect(id).toBeDefined();

            // 2. Validate — active
            const active = await t.query(
                api.domain.authSessions.validateSession,
                { token }
            );
            expect(active).not.toBeNull();
            expect(active.isActive).toBe(true);

            // 3. Deactivate (logout)
            const logout = await t.mutation(
                api.domain.authSessions.invalidateSession,
                { token }
            );
            expect(logout.success).toBe(true);

            // 4. Reject validation
            const rejected = await t.query(
                api.domain.authSessions.validateSession,
                { token }
            );
            expect(rejected).toBeNull();
        });

        it("multiple sessions per user have unique tokens", async () => {
            const t = setup();
            const { userId } = await seedTestTenant(t);

            const tokens = ["tok-multi-1", "tok-multi-2", "tok-multi-3"];

            for (const token of tokens) {
                await t.mutation(api.domain.authSessions.createSession, {
                    userId,
                    token,
                    provider: "password",
                    expiresAt: Date.now() + 24 * 3_600_000,
                });
            }

            // All three sessions should be individually retrievable
            for (const token of tokens) {
                const session = await t.query(
                    api.domain.authSessions.getSessionByToken,
                    { token }
                );
                expect(session).not.toBeNull();
                expect(session.userId).toBe(userId as string);
            }
        });

        it("invalidating one session does not affect others for same user", async () => {
            const t = setup();
            const { userId } = await seedTestTenant(t);

            await t.mutation(api.domain.authSessions.createSession, {
                userId,
                token: "tok-keep-active",
                provider: "password",
                expiresAt: Date.now() + 24 * 3_600_000,
            });

            await t.mutation(api.domain.authSessions.createSession, {
                userId,
                token: "tok-to-invalidate",
                provider: "password",
                expiresAt: Date.now() + 24 * 3_600_000,
            });

            // Invalidate only one
            await t.mutation(api.domain.authSessions.invalidateSession, {
                token: "tok-to-invalidate",
            });

            // Other session remains valid
            const kept = await t.query(
                api.domain.authSessions.validateSession,
                { token: "tok-keep-active" }
            );
            expect(kept).not.toBeNull();
            expect(kept.isActive).toBe(true);

            // Invalidated one is gone
            const gone = await t.query(
                api.domain.authSessions.validateSession,
                { token: "tok-to-invalidate" }
            );
            expect(gone).toBeNull();
        });

        it("cleanup removes expired and deactivated sessions", async () => {
            const t = setup();
            const { userId } = await seedTestTenant(t);

            // Seed an already-expired session via component import
            await t.mutation(components.auth.mutations.importSession, {
                userId: userId as string,
                token: "tok-cleanup-expired",
                provider: "password",
                expiresAt: Date.now() - 10_000,
                lastActiveAt: Date.now() - 20_000,
                isActive: true,
            });

            // Seed an inactive session via component import
            await t.mutation(components.auth.mutations.importSession, {
                userId: userId as string,
                token: "tok-cleanup-inactive",
                provider: "password",
                expiresAt: Date.now() + 24 * 3_600_000,
                lastActiveAt: Date.now() - 10_000,
                isActive: false,
            });

            const result = await t.mutation(
                api.domain.authSessions.cleanupExpired,
                {}
            );

            expect(result.sessions).toBeGreaterThanOrEqual(2);

            // Verify they are actually removed
            const expired = await t.query(
                api.domain.authSessions.getSessionByToken,
                { token: "tok-cleanup-expired" }
            );
            expect(expired).toBeNull();

            const inactive = await t.query(
                api.domain.authSessions.getSessionByToken,
                { token: "tok-cleanup-inactive" }
            );
            expect(inactive).toBeNull();
        });
    });
});
