/**
 * Creator Applications Facade
 *
 * Routes SDK calls (`api.domain.creatorApplications.*`) to the
 * `creatorApplications` component, enriches results with applicant user
 * data, audits state transitions, and on approval grants the user the
 * `creator` role via the rbac component.
 */

import { mutation, query } from '../_generated/server';
import { components } from '../_generated/api';
import { v } from 'convex/values';
import { requireAdmin, requireTenantMember } from '../lib/auth';
import { emitEvent } from '../lib/eventBus';

const CREATOR_ROLE_NAME = 'creator';
const CREATOR_ROLE_PERMISSIONS = [
  'picks.create',
  'picks.update',
  'picks.delete',
  'broadcasts.send',
  'subscriptions.manage',
];

// =============================================================================
// HELPERS
// =============================================================================

async function enrichWithApplicant(ctx: any, app: any) {
  if (!app) return null;
  const user = await ctx.db.get(app.applicantUserId as any).catch(() => null);
  return {
    ...app,
    applicant: user
      ? {
          id: user._id,
          name: user.name,
          email: user.email,
        }
      : null,
  };
}

/**
 * Find or create the platform's `creator` role for a tenant.
 */
async function ensureCreatorRole(ctx: any, tenantId: string): Promise<string> {
  const roles = await ctx.runQuery(components.rbac.queries.listRoles, {
    tenantId,
  });
  const existing = roles.find((r: any) => r.name === CREATOR_ROLE_NAME);
  if (existing) return existing._id as string;

  const created = await ctx.runMutation(components.rbac.mutations.createRole, {
    tenantId,
    name: CREATOR_ROLE_NAME,
    description: 'Verified creator who can publish picks and run subscriptions',
    permissions: CREATOR_ROLE_PERMISSIONS,
    isSystem: true,
  });
  return created.id as string;
}

// =============================================================================
// QUERIES
// =============================================================================

export const get = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const app = await ctx.runQuery(components.creatorApplications.functions.get, { id: id as any });
    return enrichWithApplicant(ctx, app);
  },
});

export const myApplication = query({
  args: { tenantId: v.id('tenants'), userId: v.id('users') },
  handler: async (ctx, { tenantId, userId }) => {
    const app = await ctx.runQuery(components.creatorApplications.functions.getForApplicant, {
      tenantId: tenantId as string,
      applicantUserId: userId as string,
    });
    return app;
  },
});

export const listForReview = query({
  args: {
    tenantId: v.id('tenants'),
    userId: v.id('users'),
    status: v.optional(v.string()),
  },
  handler: async (ctx, { tenantId, userId, status }) => {
    await requireAdmin(ctx, userId);
    await requireTenantMember(ctx, userId, tenantId);

    const apps = status
      ? await ctx.runQuery(components.creatorApplications.functions.listByStatus, {
          tenantId: tenantId as string,
          status,
        })
      : await ctx.runQuery(components.creatorApplications.functions.list, { tenantId: tenantId as string });

    const enriched = [];
    for (const app of apps) {
      enriched.push(await enrichWithApplicant(ctx, app));
    }
    return enriched;
  },
});

export const reviewQueueCounts = query({
  args: { tenantId: v.id('tenants'), userId: v.id('users') },
  handler: async (ctx, { tenantId, userId }) => {
    await requireAdmin(ctx, userId);
    await requireTenantMember(ctx, userId, tenantId);
    return ctx.runQuery(components.creatorApplications.functions.countsByStatus, { tenantId: tenantId as string });
  },
});

// =============================================================================
// MUTATIONS — Applicant
// =============================================================================

export const upsertDraft = mutation({
  args: {
    tenantId: v.id('tenants'),
    applicantUserId: v.id('users'),
    fullName: v.string(),
    country: v.string(),
    dateOfBirth: v.optional(v.string()),
    handle: v.string(),
    displayName: v.string(),
    bio: v.string(),
    avatarStorageId: v.optional(v.string()),
    primarySports: v.array(v.string()),
    nicheTags: v.array(v.string()),
    externalLinks: v.array(v.object({ label: v.string(), url: v.string() })),
    idDocumentStorageId: v.optional(v.string()),
    sampleNotes: v.optional(v.string()),
    ageConfirmed: v.boolean(),
    rulesAccepted: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireTenantMember(ctx, args.applicantUserId, args.tenantId);

    const { tenantId, applicantUserId, ...rest } = args;
    return ctx.runMutation(components.creatorApplications.functions.upsertDraft, {
      tenantId: tenantId as string,
      applicantUserId: applicantUserId as string,
      ...rest,
    });
  },
});

export const submit = mutation({
  args: {
    tenantId: v.id('tenants'),
    userId: v.id('users'),
    id: v.string(),
  },
  handler: async (ctx, { tenantId, userId, id }) => {
    await requireTenantMember(ctx, userId, tenantId);

    const result = await ctx.runMutation(components.creatorApplications.functions.submit, { id: id as any });

    await ctx.runMutation(components.audit.functions.create, {
      tenantId: tenantId as string,
      userId: userId as string,
      entityType: 'creatorApplication',
      entityId: id,
      action: 'creator_application.submitted',
      sourceComponent: 'creatorApplications',
    });

    await emitEvent(ctx, 'creator-applications.application.submitted', tenantId as string, 'creatorApplications', {
      applicationId: id,
      applicantUserId: userId as string,
    });

    return result;
  },
});

export const discardDraft = mutation({
  args: {
    tenantId: v.id('tenants'),
    userId: v.id('users'),
    id: v.string(),
  },
  handler: async (ctx, { tenantId, userId, id }) => {
    await requireTenantMember(ctx, userId, tenantId);
    return ctx.runMutation(components.creatorApplications.functions.deleteDraft, { id: id as any });
  },
});

// =============================================================================
// MUTATIONS — Admin review
// =============================================================================

export const review = mutation({
  args: {
    tenantId: v.id('tenants'),
    reviewerUserId: v.id('users'),
    id: v.string(),
    status: v.union(v.literal('in_review'), v.literal('approved'), v.literal('rejected'), v.literal('needs_more_info')),
    reviewNote: v.optional(v.string()),
  },
  handler: async (ctx, { tenantId, reviewerUserId, id, status, reviewNote }) => {
    await requireAdmin(ctx, reviewerUserId);
    await requireTenantMember(ctx, reviewerUserId, tenantId);

    const result = await ctx.runMutation(components.creatorApplications.functions.updateStatus, {
      id: id as any,
      status,
      reviewedBy: reviewerUserId as string,
      reviewNote,
    });

    // Audit
    await ctx.runMutation(components.audit.functions.create, {
      tenantId: tenantId as string,
      userId: reviewerUserId as string,
      entityType: 'creatorApplication',
      entityId: id,
      action: `creator_application.${status}`,
      previousState: { status: result.previousStatus },
      newState: { status },
      reason: reviewNote,
      sourceComponent: 'creatorApplications',
    });

    // On approval, grant the creator role to the applicant
    if (status === 'approved') {
      const app = await ctx.runQuery(components.creatorApplications.functions.get, { id: id as any });
      if (app) {
        const roleId = await ensureCreatorRole(ctx, tenantId as string);
        await ctx.runMutation(components.rbac.mutations.assignRole, {
          tenantId: tenantId as string,
          userId: app.applicantUserId,
          roleId,
        });
      }
    }

    // Emit event
    const topicMap: Record<string, string> = {
      approved: 'creator-applications.application.approved',
      rejected: 'creator-applications.application.rejected',
      needs_more_info: 'creator-applications.application.info-requested',
      in_review: 'creator-applications.application.submitted',
    };
    await emitEvent(ctx, topicMap[status], tenantId as string, 'creatorApplications', { applicationId: id, status });

    return result;
  },
});
