import type { MutationCtx, QueryCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';

/**
 * Validate that a userId refers to an active user in the core users table.
 * Use in facade mutations that accept a userId arg.
 *
 * This replaces the broken `ctx.auth.getUserIdentity()` pattern which always
 * returns null because the app uses a custom session system (not Convex built-in auth).
 */
export async function requireActiveUser(
  ctx: MutationCtx | QueryCtx,
  userId: Id<'users'>,
): Promise<{ userId: Id<'users'>; email: string }> {
  const user = await ctx.db.get(userId);
  if (!user || user.status !== 'active') {
    throw new Error('User not found or inactive');
  }
  return { userId: user._id, email: user.email };
}

/**
 * Validate that a user is an active member of the given tenant.
 * Use in facade queries and mutations to prevent cross-tenant data access.
 *
 * @throws Error if user is not an active member of the tenant.
 */
export async function requireTenantMember(
  ctx: MutationCtx | QueryCtx,
  userId: Id<'users'> | string,
  tenantId: Id<'tenants'> | string,
): Promise<void> {
  const membership = await ctx.db
    .query('tenantUsers')
    .withIndex('by_tenant', (q) => q.eq('tenantId', tenantId as Id<'tenants'>))
    .filter((q) => q.eq(q.field('userId'), userId))
    .first();

  if (!membership || membership.status !== 'active') {
    throw new Error('User is not an active member of this tenant');
  }
}

/**
 * Validate that a userId refers to a user with admin or superadmin role.
 * Use in facade mutations that require elevated privileges (e.g. financial operations).
 *
 * @throws Error if user is not found, inactive, or lacks admin privileges.
 */
export async function requireAdmin(
  ctx: MutationCtx | QueryCtx,
  userId: Id<'users'>,
): Promise<{ userId: Id<'users'>; email: string; role: string }> {
  const user = await ctx.db.get(userId);
  if (!user || user.status !== 'active') {
    throw new Error('User not found or inactive');
  }
  const adminRoles = ['admin', 'superadmin', 'super_admin'];
  if (!adminRoles.includes(user.role)) {
    throw new Error('Insufficient permissions: admin role required');
  }
  return { userId: user._id, email: user.email, role: user.role };
}

/**
 * Look up the calling user's name and email for audit log enrichment.
 * Returns name and email if the user exists; falls back to empty strings.
 */
export async function resolveUserForAudit(
  ctx: MutationCtx | QueryCtx,
  userId: Id<'users'> | string,
): Promise<{ userName: string; userEmail: string }> {
  const user = await ctx.db.get(userId as Id<'users'>).catch(() => null);
  return {
    userName: user?.name ?? '',
    userEmail: user?.email ?? '',
  };
}
