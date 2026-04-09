import { mutation, query } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { verifyPassword } from '../lib/passwordHash';

/**
 * Sign in with email and password.
 * Creates a real session in the sessions table.
 *
 * Authentication strategy:
 * 1. If user has `passwordHash` → verify with PBKDF2
 * 2. If user has no `passwordHash` (legacy/demo) → accept "demo123" for dev compat
 */
export const signInWithPassword = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    appId: v.optional(v.string()),
  },
  handler: async (ctx, { email, password, appId }) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', email))
      .first();

    if (!user) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Production path: verify against stored PBKDF2 hash
    if ((user as any).passwordHash) {
      const isValid = await verifyPassword(password, (user as any).passwordHash);
      if (!isValid) {
        return { success: false, error: 'Invalid email or password' };
      }
    } else {
      // Legacy/demo path: accept "demo123" for users without passwordHash
      // This maintains backward compat with seeded demo users
      if (password !== 'demo123') {
        return { success: false, error: 'Invalid email or password' };
      }
    }

    const tenant = user.tenantId ? await ctx.db.get(user.tenantId) : null;

    // Update last login
    await ctx.db.patch(user._id, { lastLoginAt: Date.now() });

    // Create a real session
    const sessionToken: string = await ctx.runMutation(internal.auth.sessions.createSession, {
      userId: user._id,
      provider: 'password',
      appId,
    });

    return {
      success: true as const,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        displayName: user.displayName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      tenant: tenant
        ? {
            id: tenant._id,
            name: tenant.name,
            slug: tenant.slug,
          }
        : null,
      sessionToken,
    };
  },
});

/**
 * Get a random demo user for quick login.
 */
export const getRandomDemoUser = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect();

    if (users.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * users.length);
    const user = users[randomIndex];

    return {
      email: user.email,
      name: user.name || user.displayName || user.email,
      role: user.role,
    };
  },
});

/**
 * Get available demo users for a tenant.
 * Used by the login page to display selectable demo user cards.
 */
export const getDemoUsers = query({
  args: {
    tenantId: v.optional(v.string()),
  },
  handler: async (ctx, { tenantId }) => {
    let users;
    if (tenantId) {
      users = await ctx.db
        .query('users')
        .withIndex('by_tenant', (q) => q.eq('tenantId', tenantId as any))
        .filter((q) => q.eq(q.field('status'), 'active'))
        .collect();
    } else {
      users = await ctx.db
        .query('users')
        .filter((q) => q.eq(q.field('status'), 'active'))
        .collect();
    }

    return users.map((u) => ({
      email: u.email,
      name: u.name || u.displayName || u.email,
      displayName: u.displayName,
      role: u.role,
      avatarUrl: u.avatarUrl,
    }));
  },
});

/**
 * Sign in as a demo user.
 * Supports optional role selection for deterministic login.
 * Creates a real session in the sessions table.
 */
export const signInAsDemo = mutation({
  args: {
    appId: v.optional(v.string()),
    role: v.optional(v.string()),
    tenantId: v.optional(v.string()),
  },
  handler: async (ctx, { appId, role, tenantId }) => {
    let users;
    if (tenantId) {
      users = await ctx.db
        .query('users')
        .withIndex('by_tenant', (q) => q.eq('tenantId', tenantId as any))
        .filter((q) => q.eq(q.field('status'), 'active'))
        .collect();
    } else {
      users = await ctx.db
        .query('users')
        .filter((q) => q.eq(q.field('status'), 'active'))
        .collect();
    }

    if (users.length === 0) {
      return { success: false, error: 'No demo users available' };
    }

    // Role alias mapping: simplified 3-role system → legacy DB roles
    const ROLE_ALIASES: Record<string, string[]> = {
      subscriber: ['subscriber', 'user', 'bruker', 'member'],
      creator: ['creator', 'arranger'],
      admin: ['admin', 'owner', 'manager', 'saksbehandler', 'counter', 'finance', 'aktør'],
      superadmin: ['superadmin', 'super_admin', 'platform_admin'],
      // Back-compat alias so callers passing "user" still resolve
      user: ['subscriber', 'user', 'bruker', 'member'],
    };

    // Pick user by role if specified, otherwise random
    let user;
    if (role) {
      const aliases = ROLE_ALIASES[role] ?? [role];
      user = users.find((u) => aliases.includes(u.role));
      if (!user) {
        // Exact match fallback
        user = users.find((u) => u.role === role);
      }
      if (!user) {
        user = users[0];
      }
    } else {
      const randomIndex = Math.floor(Math.random() * users.length);
      user = users[randomIndex];
    }

    const tenant = user.tenantId ? await ctx.db.get(user.tenantId) : null;

    // Update last login
    await ctx.db.patch(user._id, { lastLoginAt: Date.now() });

    // Create a real session
    const sessionToken: string = await ctx.runMutation(internal.auth.sessions.createSession, {
      userId: user._id,
      provider: 'demo',
      appId,
    });

    return {
      success: true as const,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        displayName: user.displayName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      tenant: tenant
        ? {
            id: tenant._id,
            name: tenant.name,
            slug: tenant.slug,
          }
        : null,
      sessionToken,
    };
  },
});
