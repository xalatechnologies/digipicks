import { mutation } from '../_generated/server';

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
 * DigiPicks role model:
 * - superadmin: Platform ops, sees all tenants (NO tenantId)
 * - admin: Tenant-level admin, manages creators/settings (gets tenantId)
 * - creator: Publishes betting picks, manages subscribers (gets tenantId)
 * - subscriber: Subscribes to creators, consumes picks (NO tenantId)
 */
const TEST_USERS = [
  // ============================================================================
  // Vipps test users (phone → NIN mapping)
  // ============================================================================
  {
    email: 'subscriber1@digipicks.test',
    nin: '24014005907',
    phoneNumber: '95303914',
    role: 'subscriber',
    description: 'Subscriber (Vipps)',
    demoToken: 'demo-subscriber-001',
    needsTenant: false, // Subscriber - web app only
  },
  {
    email: 'admin@digipicks.test',
    nin: '19075716691',
    phoneNumber: '93279034',
    role: 'admin',
    description: 'Admin',
    demoToken: 'demo-admin-001',
    needsTenant: true, // Dashboard user
  },
  {
    email: 'creator1@digipicks.test',
    nin: '15055200413',
    phoneNumber: '46637228',
    role: 'creator',
    description: 'Creator (Vipps)',
    demoToken: 'demo-creator-001',
    needsTenant: true, // Dashboard user
  },
  {
    email: 'admin2@digipicks.test',
    nin: '25059995475',
    phoneNumber: '40825303',
    role: 'admin',
    description: 'Admin 2',
    demoToken: 'org-admin-001',
    needsTenant: true, // Dashboard user
  },
  {
    email: 'creator2@digipicks.test',
    nin: '01028731015',
    phoneNumber: '91138813',
    role: 'creator',
    description: 'Creator 2',
    needsTenant: true, // Dashboard user
  },
  {
    email: 'creator3@digipicks.test',
    nin: '21090295842',
    phoneNumber: '98393410',
    role: 'creator',
    description: 'Creator 3',
    needsTenant: true, // Dashboard user
  },
  {
    email: 'subscriber2@digipicks.test',
    nin: '09013039841',
    phoneNumber: '47030508',
    role: 'subscriber',
    description: 'Subscriber 2 (Vipps)',
    needsTenant: false, // Subscriber - web app only
  },

  // ============================================================================
  // BankID-only test users (NIN mapping, password: qwer1234, OTP: otp)
  // ============================================================================
  {
    email: 'subscriber3@digipicks.test',
    nin: '15860771346',
    role: 'subscriber',
    description: 'Subscriber (BankID)',
    needsTenant: false, // Subscriber - web app only
  },
  {
    email: 'bankid-creator@digipicks.test',
    nin: '06881271913',
    role: 'creator',
    description: 'Creator (BankID)',
    needsTenant: true, // Dashboard user
  },
  {
    email: 'bankid-admin@digipicks.test',
    nin: '30916326773',
    role: 'admin',
    description: 'Admin (BankID)',
    needsTenant: true, // Dashboard user
  },
  {
    email: 'bankid-admin2@digipicks.test',
    nin: '19860324957',
    role: 'admin',
    description: 'Admin 2 (BankID)',
    needsTenant: true, // Dashboard user
  },
  {
    email: 'bankid-creator2@digipicks.test',
    nin: '03852358504',
    role: 'creator',
    description: 'Creator 2 (BankID)',
    needsTenant: true, // Dashboard user
  },
  {
    email: 'bankid-creator3@digipicks.test',
    nin: '13891199915',
    role: 'creator',
    description: 'Creator 3 (BankID)',
    needsTenant: true, // Dashboard user
  },
  {
    email: 'bankid-subscriber@digipicks.test',
    nin: '16837147593',
    role: 'subscriber',
    description: 'Subscriber 2 (BankID)',
    needsTenant: false, // Subscriber - web app only
  },

  // ============================================================================
  // Demo/Password login users
  // ============================================================================
  {
    email: 'demo@digipicks.test',
    role: 'admin',
    description: 'Platform Demo Admin',
    demoToken: 'platform-demo-001',
    needsTenant: true, // Dashboard user
  },
  {
    email: 'monitoring@digipicks.test',
    role: 'superadmin',
    description: 'Monitoring User',
    demoToken: 'monitoring123',
    needsTenant: false, // Superadmin - sees all tenants
  },
  {
    email: 'saas@digipicks.test',
    role: 'superadmin',
    description: 'SaaS Admin',
    demoToken: 'saas-admin-001',
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
    const tenant = await ctx.db
      .query('tenants')
      .filter((q) => q.eq(q.field('slug'), 'demo'))
      .first();
    if (!tenant) {
      return { success: false, error: "No tenant found with slug 'demo'. Run seedsFull:seedFromJson first." };
    }

    // Find all users without a tenantId
    const usersWithoutTenant = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('tenantId'), undefined))
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
 * - needsTenant=true: dashboard users (admin, creator) get tenantId
 * - needsTenant=false: subscribers and superadmins get NO tenantId
 */
export const seedNinData = mutation({
  args: {},
  handler: async (ctx) => {
    const results: { email: string; action: string; role: string; hasTenant: boolean }[] = [];

    // Get or create the default tenant
    const tenant = await ctx.db
      .query('tenants')
      .filter((q) => q.eq(q.field('slug'), 'demo'))
      .first();
    const defaultTenantId = tenant?._id;

    // Map role strings to database roles
    const mapRole = (role: string): string => {
      switch (role) {
        case 'superadmin':
          return 'superadmin';
        case 'admin':
          return 'admin';
        case 'creator':
          return 'creator';
        case 'subscriber':
          return 'subscriber';
        default:
          return 'subscriber';
      }
    };

    for (const testUser of TEST_USERS) {
      const existing = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', testUser.email))
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
          provider: 'seed',
          description: testUser.description,
          originalRole: testUser.role,
          demoToken: testUser.demoToken,
          needsTenant: testUser.needsTenant,
        };
        await ctx.db.patch(existing._id, patch);
        results.push({ email: testUser.email, action: 'patched', role: dbRole, hasTenant: !!assignTenantId });
      } else {
        await ctx.db.insert('users', {
          email: testUser.email,
          name: testUser.description,
          nin: testUser.nin,
          phoneNumber: testUser.phoneNumber,
          role: dbRole,
          status: 'active',
          tenantId: assignTenantId,
          metadata: {
            provider: 'seed',
            description: testUser.description,
            originalRole: testUser.role,
            demoToken: testUser.demoToken,
            needsTenant: testUser.needsTenant,
          },
          lastLoginAt: Date.now(),
        });
        results.push({ email: testUser.email, action: 'created', role: dbRole, hasTenant: !!assignTenantId });
      }
    }

    return { success: true, users: results, total: results.length, tenantId: defaultTenantId };
  },
});
