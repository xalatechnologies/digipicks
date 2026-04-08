/**
 * Multi-Tenant SaaS Integration Tests
 *
 * Comprehensive tests for the multi-tenant SaaS infrastructure:
 *   1. platformAdmin queries (platformStats, listAllUsers, recentActivity)
 *   2. tenantOnboarding (createTenant, slugValidation, listAllTenants)
 *   3. Password hashing (PBKDF2-SHA512)
 *   4. Signup flow (checkEmailAvailable, signUp)
 *   5. Cross-tenant data isolation
 *   6. Owner role authorization
 */

import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../schema";
import { modules } from "../../testSetup.test-util";
import { api } from "../../_generated/api";
import {
    createDomainTest,
    seedTestTenant,
    seedSecondTenant,
} from "./testHelper.test-util";

// =============================================================================
// HELPERS
// =============================================================================

function createMultiTenantTest() {
    return createDomainTest(["audit", "resources", "tenantConfig"]);
}

/**
 * Seed multiple tenants with distinct statuses for platform-level query tests.
 */
async function seedPlatformData(t: ReturnType<typeof convexTest>) {
    return t.run(async (ctx) => {
        // Tenant 1: Active
        const tenant1 = await ctx.db.insert("tenants", {
            name: "Test Municipality",
            slug: "test-city",
            status: "active",
            settings: {},
            seatLimits: { max: 100 },
            featureFlags: {},
            enabledCategories: ["ALLE"],
        });

        // Tenant 2: Active
        const tenant2 = await ctx.db.insert("tenants", {
            name: "Demo Venue",
            slug: "demo-city",
            status: "active",
            settings: {},
            seatLimits: { max: 200 },
            featureFlags: {},
            enabledCategories: ["ALLE", "ARRANGEMENTER"],
        });

        // Tenant 3: Pending
        const tenant3 = await ctx.db.insert("tenants", {
            name: "Demo Tenant",
            slug: "demo",
            status: "pending",
            settings: {},
            seatLimits: { max: 10 },
            featureFlags: {},
            enabledCategories: ["ALLE"],
        });

        // Users across tenants
        const superAdmin = await ctx.db.insert("users", {
            email: "super@platform-saas.no",
            name: "Super Admin",
            role: "super_admin",
            status: "active",
            metadata: {},
        });

        const admin1 = await ctx.db.insert("users", {
            email: "admin@test-city.no",
            name: "Test City Admin",
            role: "admin",
            status: "active",
            tenantId: tenant1,
            metadata: {},
        });

        const owner1 = await ctx.db.insert("users", {
            email: "owner@test-city.no",
            name: "Test City Owner",
            role: "owner",
            status: "active",
            tenantId: tenant1,
            metadata: {},
        });

        const user1 = await ctx.db.insert("users", {
            email: "user@test-city.no",
            name: "Test City User",
            role: "user",
            status: "active",
            tenantId: tenant1,
            metadata: {},
        });

        const admin2 = await ctx.db.insert("users", {
            email: "admin@demo-city.no",
            name: "Demo City Admin",
            role: "admin",
            status: "active",
            tenantId: tenant2,
            metadata: {},
        });

        const inactiveUser = await ctx.db.insert("users", {
            email: "inactive@demo.no",
            name: "Inactive User",
            role: "user",
            status: "inactive",
            tenantId: tenant3,
            metadata: {},
        });

        // TenantUser memberships
        const now = Date.now();
        await ctx.db.insert("tenantUsers", { tenantId: tenant1, userId: admin1, status: "active", joinedAt: now });
        await ctx.db.insert("tenantUsers", { tenantId: tenant1, userId: owner1, status: "active", joinedAt: now });
        await ctx.db.insert("tenantUsers", { tenantId: tenant1, userId: user1, status: "active", joinedAt: now });
        await ctx.db.insert("tenantUsers", { tenantId: tenant2, userId: admin2, status: "active", joinedAt: now });
        await ctx.db.insert("tenantUsers", { tenantId: tenant3, userId: inactiveUser, status: "active", joinedAt: now });

        return {
            tenant1, tenant2, tenant3,
            superAdmin, admin1, owner1, user1, admin2, inactiveUser,
        };
    });
}

// =============================================================================
// 1. PLATFORM ADMIN QUERIES
// =============================================================================

describe("multi-tenant/platformStats", () => {
    it("returns correct tenant and user counts", async () => {
        const t = createMultiTenantTest();
        await seedPlatformData(t);

        const stats = await t.query(api.domain.platformAdmin.platformStats);

        expect(stats).toBeDefined();
        expect(stats.tenants.total).toBe(3);
        expect(stats.tenants.active).toBe(2);
        expect(stats.tenants.pending).toBe(1);
        expect(stats.users.total).toBe(6);
        expect(stats.users.active).toBeGreaterThanOrEqual(4);
    });

    it("returns zero counts on empty database", async () => {
        const t = createMultiTenantTest();

        const stats = await t.query(api.domain.platformAdmin.platformStats);

        expect(stats.tenants.total).toBe(0);
        expect(stats.users.total).toBe(0);
    });
});

describe("multi-tenant/listAllUsers", () => {
    it("returns all users with tenant names", async () => {
        const t = createMultiTenantTest();
        await seedPlatformData(t);

        const users = await t.query(api.domain.platformAdmin.listAllUsers, {});

        expect(users).toBeDefined();
        expect(users.length).toBe(6);

        // Check tenant enrichment
        const testCityUsers = users.filter((u: any) => u.tenantName === "Test Municipality");
        expect(testCityUsers.length).toBe(3);

        const demoCityUsers = users.filter((u: any) => u.tenantName === "Demo Venue");
        expect(demoCityUsers.length).toBe(1);

        // Super admin has no tenant
        const platformUsers = users.filter((u: any) => u.tenantName === "Platform");
        expect(platformUsers.length).toBe(1);
        expect(platformUsers[0].role).toBe("super_admin");
    });

    it("returns empty array on empty database", async () => {
        const t = createMultiTenantTest();

        const users = await t.query(api.domain.platformAdmin.listAllUsers, {});
        expect(users).toEqual([]);
    });
});

describe("multi-tenant/recentActivity", () => {
    it("returns activity with limit parameter", async () => {
        const t = createMultiTenantTest();
        await seedPlatformData(t);

        // recentActivity queries audit component — may return empty if no audit entries
        const activity = await t.query(api.domain.platformAdmin.recentActivity, { limit: 5 });

        expect(activity).toBeDefined();
        expect(Array.isArray(activity)).toBe(true);
        expect(activity.length).toBeLessThanOrEqual(5);
    });

    it("uses default limit of 10", async () => {
        const t = createMultiTenantTest();
        await seedPlatformData(t);

        const activity = await t.query(api.domain.platformAdmin.recentActivity, {});

        expect(activity).toBeDefined();
        expect(Array.isArray(activity)).toBe(true);
        expect(activity.length).toBeLessThanOrEqual(10);
    });
});

// =============================================================================
// 2. TENANT ONBOARDING
// =============================================================================

describe("multi-tenant/tenantOnboarding", () => {
    it("lists all tenants with owner info", async () => {
        const t = createMultiTenantTest();
        await seedPlatformData(t);

        const tenants = await t.query(api.domain.tenantOnboarding.listAllTenants, {});

        expect(tenants).toBeDefined();
        expect(tenants.length).toBe(3);

        // Check structure
        for (const tenant of tenants) {
            expect(tenant).toHaveProperty("id");
            expect(tenant).toHaveProperty("name");
            expect(tenant).toHaveProperty("slug");
            expect(tenant).toHaveProperty("status");
            expect(tenant).toHaveProperty("createdAt");
        }

        // Verify tenant names
        const names = tenants.map((t: any) => t.name).sort();
        expect(names).toEqual(["Demo Tenant", "Demo Venue", "Test Municipality"]);
    });

    it("validates slug availability", async () => {
        const t = createMultiTenantTest();
        await seedPlatformData(t);

        // Existing slug should be taken
        const taken = await t.query(api.domain.tenantOnboarding.checkSlugAvailable, {
            slug: "test-city",
        });
        expect(taken.available).toBe(false);

        // New slug should be available
        const available = await t.query(api.domain.tenantOnboarding.checkSlugAvailable, {
            slug: "new-tenant-slug",
        });
        expect(available.available).toBe(true);
    });

    it("creates a tenant with owner", async () => {
        const t = createMultiTenantTest();

        // Need a user first
        const userId = await t.run(async (ctx) => {
            return await ctx.db.insert("users", {
                email: "newowner@test.no",
                name: "New Owner",
                role: "user",
                status: "active",
                metadata: {},
            });
        });

        const result = await t.mutation(api.domain.tenantOnboarding.createTenantForOwner, {
            name: "My New Venue",
            slug: "my-new-venue",
            userId: userId,
        });

        expect(result.success).toBe(true);
        expect(result.tenantId).toBeDefined();

        // Verify upgrade to owner
        const user = await t.run(async (ctx) => {
            return await ctx.db.get(userId);
        });
        expect(user?.role).toBe("owner");
        expect(user?.tenantId).toBe(result.tenantId);

        // Verify tenant in DB
        const tenants = await t.query(api.domain.tenantOnboarding.listAllTenants, {});
        const newTenant = tenants.find((t: any) => t.slug === "my-new-venue");
        expect(newTenant).toBeDefined();
        expect(newTenant!.name).toBe("My New Venue");
    });

    it("rejects duplicate slug in createTenant", async () => {
        const t = createMultiTenantTest();

        // Create first tenant
        const userId1 = await t.run(async (ctx) => {
            return await ctx.db.insert("users", {
                email: "owner1@test.no",
                name: "Owner 1",
                role: "user",
                status: "active",
                metadata: {},
            });
        });

        await t.mutation(api.domain.tenantOnboarding.createTenantForOwner, {
            name: "First Venue",
            slug: "first-venue",
            userId: userId1,
        });

        // Try creating second tenant with same slug
        const userId2 = await t.run(async (ctx) => {
            return await ctx.db.insert("users", {
                email: "owner2@test.no",
                name: "Owner 2",
                role: "user",
                status: "active",
                metadata: {},
            });
        });

        const result = await t.mutation(api.domain.tenantOnboarding.createTenantForOwner, {
            name: "Second Venue",
            slug: "first-venue",
            userId: userId2,
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("Slug");
    });
});

// =============================================================================
// 3. PASSWORD HASHING
// =============================================================================

describe("multi-tenant/passwordHashing", () => {
    it("hashPassword produces valid PBKDF2 hash format", async () => {
        // Import the password hash module
        const { hashPassword, verifyPassword } = await import("../../lib/passwordHash");

        const password = "MySecureP@ssw0rd!";
        const hash = await hashPassword(password);

        // Format: iterations:salt:hash (all base64)
        expect(hash).toBeDefined();
        const parts = hash.split(":");
        expect(parts.length).toBe(3);

        // Iterations should be a number
        expect(parseInt(parts[0])).toBeGreaterThan(0);

        // Salt and hash should be non-empty base64
        expect(parts[1].length).toBeGreaterThan(0);
        expect(parts[2].length).toBeGreaterThan(0);
    });

    it("verifyPassword succeeds with correct password", async () => {
        const { hashPassword, verifyPassword } = await import("../../lib/passwordHash");

        const password = "CorrectHorse!Battery42";
        const hash = await hashPassword(password);

        const result = await verifyPassword(password, hash);
        expect(result).toBe(true);
    });

    it("verifyPassword fails with wrong password", async () => {
        const { hashPassword, verifyPassword } = await import("../../lib/passwordHash");

        const password = "CorrectHorse!Battery42";
        const hash = await hashPassword(password);

        const result = await verifyPassword("WrongPassword123!", hash);
        expect(result).toBe(false);
    });

    it("different passwords produce different hashes", async () => {
        const { hashPassword } = await import("../../lib/passwordHash");

        const hash1 = await hashPassword("Password1!");
        const hash2 = await hashPassword("Password2!");

        expect(hash1).not.toEqual(hash2);
    });

    it("same password produces different hashes (unique salt)", async () => {
        const { hashPassword } = await import("../../lib/passwordHash");

        const hash1 = await hashPassword("SamePassword!");
        const hash2 = await hashPassword("SamePassword!");

        // Hashes should differ because of unique salts
        expect(hash1).not.toEqual(hash2);

        // But both should verify against the same password
        const { verifyPassword } = await import("../../lib/passwordHash");
        expect(await verifyPassword("SamePassword!", hash1)).toBe(true);
        expect(await verifyPassword("SamePassword!", hash2)).toBe(true);
    });
});

// =============================================================================
// 4. SIGNUP FLOW
// =============================================================================

describe("multi-tenant/signup", () => {
    it("checkEmailAvailable returns true for new email", async () => {
        const t = createMultiTenantTest();

        const result = await t.query(api.auth.signup.checkEmailAvailable, {
            email: "brand-new@test.no",
        });

        expect(result.available).toBe(true);
    });

    it("checkEmailAvailable returns false for existing email", async () => {
        const t = createMultiTenantTest();
        await seedPlatformData(t);

        const result = await t.query(api.auth.signup.checkEmailAvailable, {
            email: "admin@test-city.no",
        });

        expect(result.available).toBe(false);
    });

    it("checkEmailAvailable is case-insensitive", async () => {
        const t = createMultiTenantTest();
        await seedPlatformData(t);

        const result = await t.query(api.auth.signup.checkEmailAvailable, {
            email: "ADMIN@TEST-CITY.NO",
        });

        expect(result.available).toBe(false);
    });
});

// =============================================================================
// 5. CROSS-TENANT DATA ISOLATION
// =============================================================================

describe("multi-tenant/isolation", () => {
    it("platformStats counts tenants independently", async () => {
        const t = createMultiTenantTest();
        await seedPlatformData(t);

        const stats = await t.query(api.domain.platformAdmin.platformStats);

        // Each tenant's users should only count in their own tenant
        // Total users = 6 (super_admin + 3 test-city + 1 demo-city + 1 demo)
        expect(stats.users.total).toBe(6);
    });

    it("listAllUsers enriches with correct tenant names", async () => {
        const t = createMultiTenantTest();
        await seedPlatformData(t);

        const users = await t.query(api.domain.platformAdmin.listAllUsers, {});

        // Each user should have the correct tenant name
        const testCityAdmin = users.find((u: any) => u.email === "admin@test-city.no");
        expect(testCityAdmin?.tenantName).toBe("Test Municipality");

        const demoCityAdmin = users.find((u: any) => u.email === "admin@demo-city.no");
        expect(demoCityAdmin?.tenantName).toBe("Demo Venue");

        const inactiveUser = users.find((u: any) => u.email === "inactive@demo.no");
        expect(inactiveUser?.tenantName).toBe("Demo Tenant");
    });

    it("tenants with different statuses are counted correctly", async () => {
        const t = createMultiTenantTest();
        await seedPlatformData(t);

        const stats = await t.query(api.domain.platformAdmin.platformStats);

        // 2 active, 1 pending
        expect(stats.tenants.active).toBe(2);
        expect(stats.tenants.pending).toBe(1);
    });

    it("new tenant creation does not affect existing tenants", async () => {
        const t = createMultiTenantTest();
        await seedPlatformData(t);

        // Count before
        const before = await t.query(api.domain.platformAdmin.platformStats);

        // Create new tenant
        const userId = await t.run(async (ctx) => {
            return await ctx.db.insert("users", {
                email: "new@test.no",
                name: "New",
                role: "user",
                status: "active",
                metadata: {},
            });
        });
        await t.mutation(api.domain.tenantOnboarding.createTenantForOwner, {
            name: "Brand New",
            slug: "brand-new",
            userId: userId,
        });

        // Count after
        const after = await t.query(api.domain.platformAdmin.platformStats);

        expect(after.tenants.total).toBe(before.tenants.total + 1);
        expect(after.tenants.active).toBe(before.tenants.active + 1);
    });
});

// =============================================================================
// 6. OWNER ROLE
// =============================================================================

describe("multi-tenant/ownerRole", () => {
    it("createTenant upgrades user role to owner", async () => {
        const t = createMultiTenantTest();

        const userId = await t.run(async (ctx) => {
            return await ctx.db.insert("users", {
                email: "become-owner@test.no",
                name: "Future Owner",
                role: "user",
                status: "active",
                metadata: {},
            });
        });

        // Before
        const before = await t.run(async (ctx) => ctx.db.get(userId));
        expect(before?.role).toBe("user");

        // Create tenant
        await t.mutation(api.domain.tenantOnboarding.createTenantForOwner, {
            name: "Owner Test Venue",
            slug: "owner-test",
            userId: userId,
        });

        // After
        const after = await t.run(async (ctx) => ctx.db.get(userId));
        expect(after?.role).toBe("owner");
    });

    it("owner user gets tenantId assigned", async () => {
        const t = createMultiTenantTest();

        const userId = await t.run(async (ctx) => {
            return await ctx.db.insert("users", {
                email: "tenant-assign@test.no",
                name: "Tenant Assign",
                role: "user",
                status: "active",
                metadata: {},
            });
        });

        const result = await t.mutation(api.domain.tenantOnboarding.createTenantForOwner, {
            name: "Assign Test",
            slug: "assign-test",
            userId: userId,
        });

        const user = await t.run(async (ctx) => ctx.db.get(userId));
        expect(user?.tenantId).toBe(result.tenantId);
    });

    it("owner role appears correctly in listAllUsers", async () => {
        const t = createMultiTenantTest();
        await seedPlatformData(t);

        const users = await t.query(api.domain.platformAdmin.listAllUsers, {});
        const owners = users.filter((u: any) => u.role === "owner");

        expect(owners.length).toBe(1);
        expect(owners[0].email).toBe("owner@test-city.no");
        expect(owners[0].tenantName).toBe("Test Municipality");
    });
});
