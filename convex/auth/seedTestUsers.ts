import { mutation } from "../_generated/server";

/**
 * Seed test users with NIN and phone numbers for Vipps/BankID testing.
 *
 * Run via Convex dashboard or CLI:
 *   npx convex run --no-push auth/seedTestUsers:seedNinData
 *
 * This patches existing users (matched by email) with NIN values
 * from the Signicat/Vipps test environments.
 */

/**
 * Test users for Vipps and BankID authentication testing.
 * 
 * Vipps Login: Use phone number to authenticate
 * BankID Login: Use NIN + password (qwer1234) + OTP (otp)
 * 
 * Tenant assignment rules:
 * - Backoffice users (admin, saksbehandler, manager, aktør): get tenantId
 * - Public users (bruker): NO tenantId - they use web/minside with public hooks
 * - Superadmin/monitoring: NO tenantId - they see all tenants
 */
const TEST_USERS = [
    // ============================================================================
    // Vipps test users (phone → NIN mapping)
    // ============================================================================
    {
        email: "ola.hansen@kommune.no",
        nin: "24014005907",
        phoneNumber: "95303914",
        role: "user",
        description: "Bruker",
        demoToken: "demo-citizen-001",
        needsTenant: false, // Public user - web/minside only
    },
    {
        email: "admin@demo.kommune.no",
        nin: "19075716691",
        phoneNumber: "93279034",
        role: "admin",
        description: "Admin",
        demoToken: "demo-admin-001",
        needsTenant: true, // Backoffice user
    },
    {
        email: "staff@demo.kommune.no",
        nin: "15055200413",
        phoneNumber: "46637228",
        role: "saksbehandler",
        description: "Saksbehandler",
        demoToken: "demo-staff-001",
        needsTenant: true, // Backoffice user
    },
    {
        email: "leder@test-org.no",
        nin: "25059995475",
        phoneNumber: "40825303",
        role: "admin",
        description: "Organisasjon",
        demoToken: "org-admin-001",
        needsTenant: true, // Backoffice user
    },
    {
        email: "aktor-admin@test.saas.no",
        nin: "01028731015",
        phoneNumber: "91138813",
        role: "admin",
        description: "Aktør Admin",
        needsTenant: true, // Backoffice user
    },
    {
        email: "aktor-utleier@test.saas.no",
        nin: "21090295842",
        phoneNumber: "98393410",
        role: "manager",
        description: "Aktør Utleier",
        needsTenant: true, // Backoffice user
    },
    {
        email: "aktor-saksbehandler@test.saas.no",
        nin: "09013039841",
        phoneNumber: "47030508",
        role: "saksbehandler",
        description: "Aktør Saksbehandler",
        needsTenant: true, // Backoffice user
    },

    // ============================================================================
    // BankID-only test users (NIN mapping, password: qwer1234, OTP: otp)
    // ============================================================================
    {
        email: "bankid-bruker@test.saas.no",
        nin: "15860771346",
        role: "user",
        description: "BankID Bruker",
        needsTenant: false, // Public user - web/minside only
    },
    {
        email: "bankid-saksbehandler@test.saas.no",
        nin: "06881271913",
        role: "saksbehandler",
        description: "BankID Saksbehandler",
        needsTenant: true, // Backoffice user
    },
    {
        email: "bankid-admin@test.saas.no",
        nin: "30916326773",
        role: "admin",
        description: "BankID Admin",
        needsTenant: true, // Backoffice user
    },
    {
        email: "bankid-org@test.saas.no",
        nin: "19860324957",
        role: "admin",
        description: "BankID Organisasjon",
        needsTenant: true, // Backoffice user
    },
    {
        email: "bankid-aktor-admin@test.saas.no",
        nin: "03852358504",
        role: "admin",
        description: "BankID Aktør Admin",
        needsTenant: true, // Backoffice user
    },
    {
        email: "bankid-aktor-utleier@test.saas.no",
        nin: "13891199915",
        role: "manager",
        description: "BankID Aktør Utleier",
        needsTenant: true, // Backoffice user
    },
    {
        email: "bankid-aktor-saksbehandler@test.saas.no",
        nin: "16837147593",
        role: "saksbehandler",
        description: "BankID Aktør Saksbehandler",
        needsTenant: true, // Backoffice user
    },

    // ============================================================================
    // Demo/Password login users
    // ============================================================================
    {
        email: "demo@platform.no",
        role: "admin",
        description: "Platform Demo Admin",
        demoToken: "platform-demo-001",
        needsTenant: true, // Backoffice user
    },
    {
        email: "monitoring@platform.no",
        role: "superadmin",
        description: "Monitoring User",
        demoToken: "monitoring123",
        needsTenant: false, // Superadmin - sees all tenants
    },
    {
        email: "saas@platform.no",
        role: "superadmin",
        description: "SaaS Admin",
        demoToken: "saas-admin-001",
        needsTenant: false, // Superadmin - sees all tenants
    },
];

/**
 * Associate all users without a tenantId with the default tenant.
 * Run: npx convex run auth/seedTestUsers:associateUsersWithTenant
 */
export const associateUsersWithTenant = mutation({
    args: {},
    handler: async (ctx) => {
        // Get the default tenant
        const tenant = await ctx.db.query("tenants").filter((q) => q.eq(q.field("slug"), "demo")).first();
        if (!tenant) {
            return { success: false, error: "No tenant found with slug 'demo'. Run seedsFull:seedFromJson first." };
        }

        // Find all users without a tenantId
        const usersWithoutTenant = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("tenantId"), undefined))
            .collect();

        let updated = 0;
        for (const user of usersWithoutTenant) {
            await ctx.db.patch(user._id, { tenantId: tenant._id });
            updated++;
        }

        return { success: true, tenantId: tenant._id, tenantName: tenant.name, usersUpdated: updated };
    },
});

/**
 * Seed all test users with NIN, phone numbers, and roles.
 * Run: npx convex run auth/seedTestUsers:seedNinData
 * 
 * Tenant assignment:
 * - needsTenant=true: backoffice users (admin, saksbehandler, manager) get tenantId
 * - needsTenant=false: public users (bruker) and superadmins get NO tenantId
 */
export const seedNinData = mutation({
    args: {},
    handler: async (ctx) => {
        const results: { email: string; action: string; role: string; hasTenant: boolean }[] = [];

        // Get or create the default tenant
        const tenant = await ctx.db.query("tenants").filter((q) => q.eq(q.field("slug"), "demo")).first();
        const defaultTenantId = tenant?._id;

        // Map role strings to database roles
        const mapRole = (role: string): string => {
            switch (role) {
                case "superadmin": return "superadmin";
                case "admin": return "admin";
                case "manager": return "manager";
                case "saksbehandler": return "member"; // case handler
                case "user": return "member";
                default: return "member";
            }
        };

        for (const testUser of TEST_USERS) {
            const existing = await ctx.db
                .query("users")
                .withIndex("by_email", (q) => q.eq("email", testUser.email))
                .first();

            const dbRole = mapRole(testUser.role);
            // Only assign tenantId if user needs it (backoffice users)
            const assignTenantId = testUser.needsTenant ? defaultTenantId : undefined;

            if (existing) {
                const patch: Record<string, unknown> = {};
                if (testUser.nin) patch.nin = testUser.nin;
                if (testUser.phoneNumber) patch.phoneNumber = testUser.phoneNumber;
                patch.role = dbRole;
                
                // Set or clear tenantId based on needsTenant flag
                if (testUser.needsTenant && defaultTenantId) {
                    patch.tenantId = defaultTenantId;
                } else if (!testUser.needsTenant && existing.tenantId) {
                    // Remove tenantId for users who shouldn't have one
                    patch.tenantId = undefined;
                }
                
                // Store original role description in metadata
                patch.metadata = {
                    ...((existing.metadata as Record<string, unknown>) || {}),
                    provider: "seed",
                    description: testUser.description,
                    originalRole: testUser.role,
                    demoToken: testUser.demoToken,
                    needsTenant: testUser.needsTenant,
                };
                await ctx.db.patch(existing._id, patch);
                results.push({ email: testUser.email, action: "patched", role: dbRole, hasTenant: !!assignTenantId });
            } else {
                await ctx.db.insert("users", {
                    email: testUser.email,
                    name: testUser.description,
                    nin: testUser.nin,
                    phoneNumber: testUser.phoneNumber,
                    role: dbRole,
                    status: "active",
                    tenantId: assignTenantId,
                    metadata: {
                        provider: "seed",
                        description: testUser.description,
                        originalRole: testUser.role,
                        demoToken: testUser.demoToken,
                        needsTenant: testUser.needsTenant,
                    },
                    lastLoginAt: Date.now(),
                });
                results.push({ email: testUser.email, action: "created", role: dbRole, hasTenant: !!assignTenantId });
            }
        }

        return { success: true, users: results, total: results.length, tenantId: defaultTenantId };
    },
});
