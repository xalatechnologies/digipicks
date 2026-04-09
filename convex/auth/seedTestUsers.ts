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
 * DigiPicks test users — 4-role model (superadmin / admin / creator / subscriber).
 *
 * Tenant assignment rules:
 * - admin + creator: get tenantId (tenant-scoped)
 * - superadmin + subscriber: NO tenantId
 *
 * NIN/phone values are reused from the Signicat test set so existing
 * BankID/Vipps test flows keep working until the OAuth swap ships.
 */
const TEST_USERS: Array<{
  email: string;
  nin?: string;
  phoneNumber?: string;
  role: 'superadmin' | 'admin' | 'creator' | 'subscriber';
  description: string;
  demoToken?: string;
  needsTenant: boolean;
}> = [
  // Superadmin (no tenant)
  {
    email: 'superadmin@digipicks.test',
    nin: '19075716691',
    phoneNumber: '93279034',
    role: 'superadmin',
    description: 'Platform Superadmin',
    demoToken: 'demo-superadmin',
    needsTenant: false,
  },
  // Admins (tenant-scoped)
  {
    email: 'admin@digipicks.test',
    nin: '25059995475',
    phoneNumber: '40825303',
    role: 'admin',
    description: 'Platform Admin',
    demoToken: 'demo-admin-001',
    needsTenant: true,
  },
  {
    email: 'moderator@digipicks.test',
    nin: '01028731015',
    phoneNumber: '91138813',
    role: 'admin',
    description: 'Platform Moderator',
    demoToken: 'demo-admin-002',
    needsTenant: true,
  },
  // Creators (tenant-scoped)
  {
    email: 'creator1@digipicks.test',
    nin: '21090295842',
    phoneNumber: '98393410',
    role: 'creator',
    description: 'Verified Creator',
    demoToken: 'demo-creator-001',
    needsTenant: true,
  },
  {
    email: 'creator2@digipicks.test',
    nin: '09013039841',
    phoneNumber: '47030508',
    role: 'creator',
    description: 'Verified Creator',
    demoToken: 'demo-creator-002',
    needsTenant: true,
  },
  {
    email: 'creator3@digipicks.test',
    nin: '15055200413',
    phoneNumber: '46637228',
    role: 'creator',
    description: 'Verified Creator',
    demoToken: 'demo-creator-003',
    needsTenant: true,
  },
  // Subscribers (no tenant)
  {
    email: 'subscriber1@digipicks.test',
    nin: '24014005907',
    phoneNumber: '95303914',
    role: 'subscriber',
    description: 'Subscriber',
    demoToken: 'demo-subscriber-001',
    needsTenant: false,
  },
  {
    email: 'subscriber2@digipicks.test',
    nin: '15860771346',
    role: 'subscriber',
    description: 'Subscriber',
    demoToken: 'demo-subscriber-002',
    needsTenant: false,
  },
  {
    email: 'subscriber3@digipicks.test',
    nin: '06881271913',
    role: 'subscriber',
    description: 'Subscriber',
    demoToken: 'demo-subscriber-003',
    needsTenant: false,
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
 * - needsTenant=true: backoffice users (admin, saksbehandler, manager) get tenantId
 * - needsTenant=false: public users (bruker) and superadmins get NO tenantId
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

    // Map any incoming legacy role string to the DigiPicks 4-role model.
    const mapRole = (role: string): string => {
      switch (role) {
        case 'superadmin':
        case 'super_admin':
          return 'superadmin';
        case 'admin':
        case 'owner':
        case 'manager':
        case 'saksbehandler':
        case 'counter':
        case 'finance':
        case 'aktør':
          return 'admin';
        case 'creator':
        case 'arranger':
          return 'creator';
        case 'subscriber':
        case 'user':
        case 'bruker':
        case 'member':
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
