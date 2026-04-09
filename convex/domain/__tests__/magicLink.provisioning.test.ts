import { describe, it, expect } from 'vitest';
import { components, internal } from '../../_generated/api';
import { createDomainTest, seedTestTenant } from './testHelper.test-util';

describe('auth/magicLink provisioning', () => {
  it('creates creator role for new backoffice magic-link user', async () => {
    const t = createDomainTest(['auth', 'rbac']);
    await seedTestTenant(t);

    const result = await t.mutation(internal.auth.magicLink.findOrCreateUser, {
      email: 'new.backoffice@test.no',
      appId: 'backoffice',
    });

    expect(result.isNewUser).toBe(true);
    expect(result.user.role).toBe('creator');
    expect(result.user.tenantId).toBeDefined();

    const permission = await (t as any).query(components.rbac.queries.checkPermission, {
      userId: result.user.id,
      tenantId: result.user.tenantId,
      permission: 'resource:write',
    });
    expect(permission.hasPermission).toBe(true);
  });

  it('upgrades existing non-admin user to creator for backoffice', async () => {
    const t = createDomainTest(['auth', 'rbac']);
    await seedTestTenant(t);

    const result = await t.mutation(internal.auth.magicLink.findOrCreateUser, {
      email: 'user@test.no',
      appId: 'backoffice',
    });

    expect(result.isNewUser).toBe(false);
    expect(result.user.role).toBe('creator');
  });

  it('creates dedicated tenant and membership for existing user without tenant on backoffice login', async () => {
    const t = createDomainTest(['auth', 'rbac']);
    await seedTestTenant(t);

    const userId = await t.run(async (ctx) => {
      return ctx.db.insert('users', {
        email: 'public.user@test.no',
        role: 'subscriber',
        status: 'active',
        metadata: {},
        lastLoginAt: Date.now(),
      });
    });

    const result = await t.mutation(internal.auth.magicLink.findOrCreateUser, {
      email: 'public.user@test.no',
      appId: 'backoffice',
    });

    expect(result.isNewUser).toBe(false);
    expect(result.user.role).toBe('creator');
    expect(result.user.tenantId).toBeDefined();

    const membership = await t.run(async (ctx) => {
      return ctx.db
        .query('tenantUsers')
        .withIndex('by_tenant_user', (q) => q.eq('tenantId', result.user.tenantId as any).eq('userId', userId))
        .first();
    });
    expect(membership).not.toBeNull();
    expect(membership?.status).toBe('active');

    const permission = await (t as any).query(components.rbac.queries.checkPermission, {
      userId: result.user.id,
      tenantId: result.user.tenantId,
      permission: 'messaging:admin',
    });
    expect(permission.hasPermission).toBe(true);
  });

  it('isolates backoffice users into separate tenants', async () => {
    const t = createDomainTest(['auth', 'rbac']);
    await seedTestTenant(t);

    const userA = await t.mutation(internal.auth.magicLink.findOrCreateUser, {
      email: 'creator.a@test.no',
      appId: 'backoffice',
    });
    const userB = await t.mutation(internal.auth.magicLink.findOrCreateUser, {
      email: 'creator.b@test.no',
      appId: 'backoffice',
    });

    expect(userA.user.tenantId).toBeDefined();
    expect(userB.user.tenantId).toBeDefined();
    expect(userA.user.tenantId).not.toBe(userB.user.tenantId);
  });

  it('keeps non-backoffice magic-link users as subscriber', async () => {
    const t = createDomainTest(['auth', 'rbac']);
    await seedTestTenant(t);

    const result = await t.mutation(internal.auth.magicLink.findOrCreateUser, {
      email: 'new.web@test.no',
      appId: 'web',
    });

    expect(result.isNewUser).toBe(true);
    expect(result.user.role).toBe('subscriber');
  });
});
