/**
 * Tenant Onboarding — Domain Facade
 *
 * Self-service tenant creation flow. When a user creates a tenant,
 * they become a creator (additive role — creator IS a user with dashboard perms).
 *
 * Flow:
 *   1. User calls `createTenantForCreator` → creates tenant + tenantUser + assigns creator role
 *   2. Creator manages their tenant via dashboard (same routes as admin, scoped to tenant)
 *   3. Super admin can list all tenants for platform oversight
 */

import { mutation, query } from '../_generated/server';
import { components } from '../_generated/api';
import { v } from 'convex/values';

// =============================================================================
// CREATOR: Create Tenant
// =============================================================================

/**
 * Create a new tenant and assign the calling user as creator.
 * This is the "become a creator" flow — user → creator promotion.
 */
export const createTenantForOwner = mutation({
  args: {
    userId: v.id('users'),
    name: v.string(),
    slug: v.string(),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    plan: v.optional(v.string()),
    enabledCategories: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Verify the user exists and is active
    const user = await ctx.db.get(args.userId);
    if (!user || user.status !== 'active') {
      return { success: false, error: 'User not found or inactive' };
    }

    // Validate slug uniqueness
    const existingTenant = await ctx.db
      .query('tenants')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first();
    if (existingTenant) {
      return { success: false, error: 'Slug already taken' };
    }

    // Normalize slug
    const normalizedSlug = args.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Create tenant
    const tenantId = await ctx.db.insert('tenants', {
      name: args.name,
      slug: normalizedSlug,
      status: 'active',
      settings: {},
      seatLimits: { admin: 3, user: 50 },
      featureFlags: {},
      enabledCategories: args.enabledCategories || ['lokale', 'arrangement'],
      ownerId: args.userId,
      contactEmail: args.contactEmail || user.email,
      contactPhone: args.contactPhone || user.phoneNumber,
      onboardingStep: 'tenant_created',
      plan: args.plan || 'starter',
    });

    // Create tenantUser join record
    await ctx.db.insert('tenantUsers', {
      tenantId,
      userId: args.userId,
      status: 'active',
      joinedAt: Date.now(),
    });

    // Update user to link to their first tenant (if they don't have one)
    if (!user.tenantId) {
      await ctx.db.patch(args.userId, {
        tenantId,
        role: 'creator',
      });
    }

    // Seed default data for the new tenant
    const tid = tenantId as string;
    try {
      // Default pricing group
      await ctx.runMutation(components.pricing.import.importPricingGroup, {
        tenantId: tid,
        name: 'Standard',
        priority: 0,
        isActive: true,
        isDefault: true,
      });
    } catch (e) {
      // Non-critical: tenant works without seed data, owner can configure later
      console.error('[tenantOnboarding] Failed to seed defaults:', e);
    }

    return {
      success: true as const,
      tenantId,
      slug: normalizedSlug,
    };
  },
});

// =============================================================================
// CREATOR: My Tenants
// =============================================================================

/**
 * List all tenants owned by the current user.
 */
export const listMyTenants = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, { userId }) => {
    const tenantUsers = await ctx.db
      .query('tenantUsers')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect();

    const tenants = await Promise.all(
      tenantUsers.map(async (tu) => {
        const tenant = await ctx.db.get(tu.tenantId);
        return tenant;
      }),
    );

    return tenants.filter(Boolean).map((t) => ({
      id: t!._id,
      name: t!.name,
      slug: t!.slug,
      status: t!.status,
      plan: (t as any)?.plan,
      isOwner: (t as any)?.ownerId === userId,
    }));
  },
});

// =============================================================================
// CREATOR: Onboarding Progress
// =============================================================================

/**
 * Update onboarding step for a tenant.
 */
export const updateOnboardingStep = mutation({
  args: {
    tenantId: v.id('tenants'),
    step: v.string(),
  },
  handler: async (ctx, { tenantId, step }) => {
    await ctx.db.patch(tenantId, { onboardingStep: step } as any);
    return { success: true };
  },
});

// =============================================================================
// SUPER ADMIN: List All Tenants
// =============================================================================

/**
 * List all tenants on the platform (super admin view).
 */
export const listAllTenants = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, { status }) => {
    let tenants;
    if (status) {
      tenants = await ctx.db
        .query('tenants')
        .withIndex('by_status', (q) => q.eq('status', status as any))
        .collect();
    } else {
      tenants = await ctx.db.query('tenants').collect();
    }

    return Promise.all(
      tenants.map(async (t) => {
        const ownerId = (t as any).ownerId;
        let ownerName: string | null = null;
        let ownerEmail: string | null = null;

        if (ownerId) {
          const owner = await ctx.db.get(ownerId);
          if (owner && 'email' in owner) {
            ownerName = (owner as any).name || (owner as any).email || null;
            ownerEmail = (owner as any).email || null;
          }
        }

        // Count users for this tenant
        const tenantUsers = await ctx.db
          .query('tenantUsers')
          .withIndex('by_tenant', (q) => q.eq('tenantId', t._id))
          .collect();

        // Count resources (listings) for this tenant via component
        let listingCount = 0;
        try {
          const resources = await ctx.runQuery(components.resources.queries.list, {
            tenantId: t._id as string,
          });
          listingCount = Array.isArray(resources) ? resources.length : 0;
        } catch {
          // Component may not be available
        }

        return {
          id: t._id,
          name: t.name,
          slug: t.slug,
          status: t.status,
          plan: (t as any)?.plan,
          onboardingStep: (t as any)?.onboardingStep,
          ownerName,
          ownerEmail,
          userCount: tenantUsers.length,
          listingCount,
          enabledCategories: (t as any)?.enabledCategories as string[] | undefined,
          contactEmail: (t as any)?.contactEmail as string | undefined,
          contactPhone: (t as any)?.contactPhone as string | undefined,
          orgNumber: (t as any)?.orgNumber as string | undefined,
          description: (t as any)?.description as string | undefined,
          createdAt: t._creationTime,
        };
      }),
    );
  },
});

// =============================================================================
// CHECK: Slug Availability
// =============================================================================

/**
 * Check if a tenant slug is available.
 */
export const checkSlugAvailable = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, { slug }) => {
    const normalized = slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-');

    const existing = await ctx.db
      .query('tenants')
      .withIndex('by_slug', (q) => q.eq('slug', normalized))
      .first();

    return { available: !existing, normalizedSlug: normalized };
  },
});

// =============================================================================
// PUBLIC: Tenant Profile
// =============================================================================

/**
 * Get public-safe tenant profile by slug.
 * Used on the /utleier/:slug page.
 */
export const getPublicProfile = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, { slug }) => {
    const normalized = slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-');

    const tenant = await ctx.db
      .query('tenants')
      .withIndex('by_slug', (q) => q.eq('slug', normalized))
      .first();

    if (!tenant || tenant.status !== 'active') {
      return null;
    }

    // Return only public-safe fields
    return {
      id: tenant._id,
      name: tenant.name,
      slug: tenant.slug,
      description: (tenant as any).description ?? null,
      logo: (tenant as any).logo ?? null,
      contactEmail: (tenant as any).contactEmail ?? null,
      enabledCategories: (tenant as any).enabledCategories ?? [],
    };
  },
});
