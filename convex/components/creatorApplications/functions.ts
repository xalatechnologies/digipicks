/**
 * Creator Applications Component Functions
 *
 * Pure component — operates only on its own tables.
 * Status state machine:
 *   draft → submitted → in_review → approved | rejected | needs_more_info
 *   needs_more_info → submitted (resubmission)
 */

import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// =============================================================================
// CONSTANTS
// =============================================================================

export const STATUSES = ['draft', 'submitted', 'in_review', 'approved', 'rejected', 'needs_more_info'] as const;

const TERMINAL_FOR_APPLICANT = new Set(['submitted', 'in_review', 'approved']);

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ['submitted'],
  submitted: ['in_review', 'approved', 'rejected', 'needs_more_info'],
  in_review: ['approved', 'rejected', 'needs_more_info'],
  needs_more_info: ['submitted'],
  approved: [],
  rejected: ['in_review'],
};

// =============================================================================
// QUERIES
// =============================================================================

export const get = query({
  args: { id: v.id('creatorApplications') },
  returns: v.any(),
  handler: async (ctx, { id }) => {
    return ctx.db.get(id);
  },
});

export const getForApplicant = query({
  args: { tenantId: v.string(), applicantUserId: v.string() },
  returns: v.any(),
  handler: async (ctx, { tenantId, applicantUserId }) => {
    const apps = await ctx.db
      .query('creatorApplications')
      .withIndex('by_applicant', (q) => q.eq('applicantUserId', applicantUserId))
      .collect();
    // Latest for this tenant
    const forTenant = apps.filter((a) => a.tenantId === tenantId);
    forTenant.sort((a, b) => b._creationTime - a._creationTime);
    return forTenant[0] ?? null;
  },
});

export const list = query({
  args: { tenantId: v.string(), limit: v.optional(v.number()) },
  returns: v.array(v.any()),
  handler: async (ctx, { tenantId, limit }) => {
    let apps = await ctx.db
      .query('creatorApplications')
      .withIndex('by_tenant', (q) => q.eq('tenantId', tenantId))
      .collect();
    apps.sort((a, b) => b._creationTime - a._creationTime);
    if (limit) apps = apps.slice(0, limit);
    return apps;
  },
});

export const listByStatus = query({
  args: { tenantId: v.string(), status: v.string(), limit: v.optional(v.number()) },
  returns: v.array(v.any()),
  handler: async (ctx, { tenantId, status, limit }) => {
    let apps = await ctx.db
      .query('creatorApplications')
      .withIndex('by_tenant_status', (q) => q.eq('tenantId', tenantId).eq('status', status))
      .collect();
    apps.sort((a, b) => b._creationTime - a._creationTime);
    if (limit) apps = apps.slice(0, limit);
    return apps;
  },
});

export const countsByStatus = query({
  args: { tenantId: v.string() },
  returns: v.object({
    draft: v.number(),
    submitted: v.number(),
    in_review: v.number(),
    approved: v.number(),
    rejected: v.number(),
    needs_more_info: v.number(),
    total: v.number(),
  }),
  handler: async (ctx, { tenantId }) => {
    const apps = await ctx.db
      .query('creatorApplications')
      .withIndex('by_tenant', (q) => q.eq('tenantId', tenantId))
      .collect();
    const counts = {
      draft: 0,
      submitted: 0,
      in_review: 0,
      approved: 0,
      rejected: 0,
      needs_more_info: 0,
      total: apps.length,
    };
    for (const a of apps) {
      if (a.status in counts) {
        (counts as any)[a.status]++;
      }
    }
    return counts;
  },
});

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create or update a draft. If a draft already exists for this applicant
 * in this tenant, it is updated; otherwise inserted.
 */
export const upsertDraft = mutation({
  args: {
    tenantId: v.string(),
    applicantUserId: v.string(),
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
  returns: v.object({ id: v.string() }),
  handler: async (ctx, args) => {
    const { tenantId, applicantUserId, ...rest } = args;
    const existing = await ctx.db
      .query('creatorApplications')
      .withIndex('by_applicant', (q) => q.eq('applicantUserId', applicantUserId))
      .collect();
    const draft = existing.find((a) => a.tenantId === tenantId && a.status === 'draft');

    if (draft) {
      await ctx.db.patch(draft._id, rest);
      return { id: draft._id as string };
    }

    // Block creating a new draft if applicant already has an active or
    // approved application in this tenant.
    const blocking = existing.find((a) => a.tenantId === tenantId && TERMINAL_FOR_APPLICANT.has(a.status));
    if (blocking) {
      throw new Error(`Applicant already has an application in status "${blocking.status}"`);
    }

    const id = await ctx.db.insert('creatorApplications', {
      tenantId,
      applicantUserId,
      status: 'draft',
      ...rest,
    });
    return { id: id as string };
  },
});

/**
 * Submit a draft (or resubmit a needs_more_info app) for review.
 */
export const submit = mutation({
  args: { id: v.id('creatorApplications') },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, { id }) => {
    const app = await ctx.db.get(id);
    if (!app) throw new Error('Application not found');

    if (!ALLOWED_TRANSITIONS[app.status]?.includes('submitted')) {
      throw new Error(`Cannot submit application in status "${app.status}"`);
    }
    if (!app.ageConfirmed || !app.rulesAccepted) {
      throw new Error('Age confirmation and rules acceptance are required');
    }
    if (app.handle.trim().length === 0) {
      throw new Error('Handle is required');
    }
    if (app.displayName.trim().length === 0) {
      throw new Error('Display name is required');
    }
    if (app.bio.trim().length < 20) {
      throw new Error('Bio must be at least 20 characters');
    }
    if (app.primarySports.length === 0) {
      throw new Error('Select at least one primary sport');
    }

    // Handle uniqueness in tenant (excluding self)
    const sameHandle = await ctx.db
      .query('creatorApplications')
      .withIndex('by_tenant_handle', (q) => q.eq('tenantId', app.tenantId).eq('handle', app.handle))
      .collect();
    const conflict = sameHandle.find((a) => a._id !== id && a.status !== 'rejected' && a.status !== 'draft');
    if (conflict) {
      throw new Error('Handle is already taken');
    }

    await ctx.db.patch(id, {
      status: 'submitted',
      submittedAt: Date.now(),
      reviewNote: undefined,
    });
    return { success: true };
  },
});

/**
 * Admin transitions: in_review / approved / rejected / needs_more_info.
 * Caller is responsible for permission checks.
 */
export const updateStatus = mutation({
  args: {
    id: v.id('creatorApplications'),
    status: v.string(),
    reviewedBy: v.string(),
    reviewNote: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean(), previousStatus: v.string() }),
  handler: async (ctx, { id, status, reviewedBy, reviewNote }) => {
    const app = await ctx.db.get(id);
    if (!app) throw new Error('Application not found');

    const allowed = ALLOWED_TRANSITIONS[app.status] ?? [];
    if (!allowed.includes(status)) {
      throw new Error(`Cannot transition from "${app.status}" to "${status}"`);
    }

    if ((status === 'rejected' || status === 'needs_more_info') && !reviewNote) {
      throw new Error('A review note is required when rejecting or requesting info');
    }

    await ctx.db.patch(id, {
      status,
      reviewedAt: Date.now(),
      reviewedBy,
      reviewNote: reviewNote ?? app.reviewNote,
    });
    return { success: true, previousStatus: app.status };
  },
});

/**
 * Hard delete a draft (applicant can discard their own draft).
 */
export const deleteDraft = mutation({
  args: { id: v.id('creatorApplications') },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, { id }) => {
    const app = await ctx.db.get(id);
    if (!app) throw new Error('Application not found');
    if (app.status !== 'draft') {
      throw new Error('Only drafts can be deleted');
    }
    await ctx.db.delete(id);
    return { success: true };
  },
});
