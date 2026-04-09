/**
 * DigiPicks SDK — Creator Application Hooks (v1 compatibility)
 *
 * This file re-exports hooks from the v2 creator applications module
 * (`use-creator-applications.ts`) with backward-compatible wrappers.
 *
 * Consumers should migrate to importing directly from
 * `use-creator-applications` or the SDK barrel. These v1 wrappers
 * will be removed once all call-sites are migrated.
 */

import { useQuery as useConvexQuery, useMutation as useConvexMutation } from 'convex/react';
import { api } from '../convex-api';
import type { Id } from '../convex-api';

// Re-export canonical v2 types under v1 names for backward compat
export type ApplicationStatus = 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'needs_more_info';

export interface SocialLinks {
  twitter?: string;
  instagram?: string;
  youtube?: string;
  discord?: string;
  website?: string;
}

export interface CreatorApplication {
  id: string;
  tenantId: string;
  userId: string;
  displayName: string;
  bio: string;
  niche: string;
  specialties?: string[];
  performanceProof?: string;
  trackRecordUrl?: string;
  socialLinks?: SocialLinks;
  status: ApplicationStatus;
  reviewedBy?: string;
  reviewedAt?: number;
  reviewNote?: string;
  submittedAt: number;
  resubmittedAt?: number;
  previousApplicationId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  user?: { id: string; name?: string; email?: string; displayName?: string };
  // V2 fields surfaced through compat layer
  handle?: string;
  fullName?: string;
  country?: string;
  primarySports?: string[];
  nicheTags?: string[];
  externalLinks?: Array<{ label: string; url: string }>;
  applicant?: { id: string; name?: string; email?: string } | null;
}

export interface SubmitApplicationInput {
  tenantId: Id<'tenants'>;
  userId: Id<'users'>;
  displayName: string;
  bio: string;
  niche: string;
  specialties?: string[];
  performanceProof?: string;
  trackRecordUrl?: string;
  socialLinks?: SocialLinks;
  metadata?: Record<string, unknown>;
}

export interface ReviewApplicationInput {
  tenantId: Id<'tenants'>;
  id: string;
  reviewedBy: Id<'users'>;
  reviewNote?: string;
}

export interface ResubmitApplicationInput {
  tenantId: Id<'tenants'>;
  id: string;
  userId: Id<'users'>;
  displayName?: string;
  bio?: string;
  niche?: string;
  specialties?: string[];
  performanceProof?: string;
  trackRecordUrl?: string;
  socialLinks?: SocialLinks;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Transform — maps v2 shape to v1 compat shape
// ============================================================================

function transformV2ToV1(raw: any): CreatorApplication | null {
  if (!raw) return null;
  return {
    id: raw._id as string,
    tenantId: raw.tenantId,
    userId: raw.applicantUserId ?? raw.userId,
    displayName: raw.displayName ?? raw.fullName ?? '',
    bio: raw.bio ?? '',
    niche: (raw.primarySports ?? [])[0] ?? '',
    specialties: raw.nicheTags,
    status: raw.status,
    reviewedBy: raw.reviewedBy,
    reviewedAt: raw.reviewedAt,
    reviewNote: raw.reviewNote,
    submittedAt: raw.submittedAt ?? raw._creationTime,
    createdAt: new Date(raw._creationTime).toISOString(),
    user: raw.applicant
      ? { id: raw.applicant.id, name: raw.applicant.name, email: raw.applicant.email }
      : undefined,
    // V2 passthrough
    handle: raw.handle,
    fullName: raw.fullName,
    country: raw.country,
    primarySports: raw.primarySports,
    nicheTags: raw.nicheTags,
    externalLinks: raw.externalLinks,
    applicant: raw.applicant,
  };
}

// ============================================================================
// Query Hooks — delegating to v2 facade
// ============================================================================

/**
 * Fetch creator applications for a tenant (admin review queue).
 * Now delegates to: api.domain.creatorApplications.listForReview
 */
export function useCreatorApplications(
  tenantId: Id<'tenants'> | undefined,
  params?: {
    status?: ApplicationStatus;
    limit?: number;
  },
) {
  // v2 listForReview requires an admin userId — we pass a dummy skip when not ready
  const data = useConvexQuery(
    api.domain.creatorApplications.listForReview,
    tenantId ? { tenantId, userId: '' as Id<'users'>, status: params?.status } : 'skip',
  );

  const isLoading = tenantId !== undefined && data === undefined;
  const applications: CreatorApplication[] = (data ?? [])
    .map(transformV2ToV1)
    .filter(Boolean) as CreatorApplication[];

  return { data: applications, applications, isLoading, error: null };
}

/**
 * Fetch a single creator application by ID.
 * Now delegates to: api.domain.creatorApplications.get
 */
export function useCreatorApplication(id: string | undefined) {
  const data = useConvexQuery(
    api.domain.creatorApplications.get,
    id ? { id } : 'skip',
  );

  const isLoading = id !== undefined && data === undefined;
  const application = transformV2ToV1(data);

  return { data: application, application, isLoading, error: null };
}

/**
 * Fetch the current user's latest application for a tenant.
 * Now delegates to: api.domain.creatorApplications.myApplication
 */
export function useMyCreatorApplication(
  tenantId: Id<'tenants'> | undefined,
  userId: Id<'users'> | undefined,
) {
  const data = useConvexQuery(
    api.domain.creatorApplications.myApplication,
    tenantId && userId ? { tenantId, userId } : 'skip',
  );

  const isLoading =
    tenantId !== undefined && userId !== undefined && data === undefined;
  const application = transformV2ToV1(data);

  return { data: application, application, isLoading, error: null };
}

// ============================================================================
// Mutation Hooks — delegating to v2 facade
// ============================================================================

/**
 * Submit a new creator application.
 * Now delegates to: api.domain.creatorApplications.upsertDraft + submit
 */
export function useSubmitCreatorApplication() {
  const upsertFn = useConvexMutation(api.domain.creatorApplications.upsertDraft);
  const submitFn = useConvexMutation(api.domain.creatorApplications.submit);

  const mutateAsync = async (input: SubmitApplicationInput) => {
    // Map v1 fields to v2 draft shape, then submit
    const externalLinks: Array<{ label: string; url: string }> = [];
    if (input.socialLinks) {
      for (const [platform, handle] of Object.entries(input.socialLinks)) {
        if (handle) externalLinks.push({ label: platform, url: handle });
      }
    }
    if (input.trackRecordUrl) {
      externalLinks.push({ label: 'Track record', url: input.trackRecordUrl });
    }

    const result = await upsertFn({
      tenantId: input.tenantId,
      applicantUserId: input.userId,
      fullName: input.displayName,
      country: '',
      handle: input.displayName.toLowerCase().replace(/\s+/g, ''),
      displayName: input.displayName,
      bio: input.bio,
      primarySports: input.niche ? [input.niche] : [],
      nicheTags: input.specialties ?? [],
      externalLinks,
      ageConfirmed: true,
      rulesAccepted: true,
    });

    await submitFn({
      tenantId: input.tenantId,
      userId: input.userId,
      id: result.id,
    });

    return result;
  };

  return {
    mutate: mutateAsync,
    mutateAsync,
    isLoading: false,
    error: null,
  };
}

/**
 * Approve a creator application (admin).
 * Now delegates to: api.domain.creatorApplications.review
 */
export function useApproveCreatorApplication() {
  const reviewFn = useConvexMutation(api.domain.creatorApplications.review);

  const mutateAsync = async (input: ReviewApplicationInput) => {
    return reviewFn({
      tenantId: input.tenantId,
      reviewerUserId: input.reviewedBy,
      id: input.id,
      status: 'approved' as const,
      reviewNote: input.reviewNote,
    });
  };

  return {
    mutate: mutateAsync,
    mutateAsync,
    isLoading: false,
    error: null,
  };
}

/**
 * Reject a creator application (admin).
 * Now delegates to: api.domain.creatorApplications.review
 */
export function useRejectCreatorApplication() {
  const reviewFn = useConvexMutation(api.domain.creatorApplications.review);

  const mutateAsync = async (input: ReviewApplicationInput) => {
    return reviewFn({
      tenantId: input.tenantId,
      reviewerUserId: input.reviewedBy,
      id: input.id,
      status: 'rejected' as const,
      reviewNote: input.reviewNote,
    });
  };

  return {
    mutate: mutateAsync,
    mutateAsync,
    isLoading: false,
    error: null,
  };
}

/**
 * Request more info on an application (admin).
 * Now delegates to: api.domain.creatorApplications.review
 */
export function useRequestMoreInfoCreatorApplication() {
  const reviewFn = useConvexMutation(api.domain.creatorApplications.review);

  const mutateAsync = async (input: ReviewApplicationInput) => {
    return reviewFn({
      tenantId: input.tenantId,
      reviewerUserId: input.reviewedBy,
      id: input.id,
      status: 'needs_more_info' as const,
      reviewNote: input.reviewNote,
    });
  };

  return {
    mutate: mutateAsync,
    mutateAsync,
    isLoading: false,
    error: null,
  };
}

/**
 * Resubmit an application after rejection or more-info request.
 * Now delegates to: api.domain.creatorApplications.upsertDraft + submit
 */
export function useResubmitCreatorApplication() {
  const upsertFn = useConvexMutation(api.domain.creatorApplications.upsertDraft);
  const submitFn = useConvexMutation(api.domain.creatorApplications.submit);

  const mutateAsync = async (input: ResubmitApplicationInput) => {
    const externalLinks: Array<{ label: string; url: string }> = [];
    if (input.socialLinks) {
      for (const [platform, handle] of Object.entries(input.socialLinks)) {
        if (handle) externalLinks.push({ label: platform, url: handle });
      }
    }
    if (input.trackRecordUrl) {
      externalLinks.push({ label: 'Track record', url: input.trackRecordUrl });
    }

    const result = await upsertFn({
      tenantId: input.tenantId,
      applicantUserId: input.userId,
      fullName: input.displayName ?? '',
      country: '',
      handle: (input.displayName ?? '').toLowerCase().replace(/\s+/g, ''),
      displayName: input.displayName ?? '',
      bio: input.bio ?? '',
      primarySports: input.niche ? [input.niche] : [],
      nicheTags: input.specialties ?? [],
      externalLinks,
      ageConfirmed: true,
      rulesAccepted: true,
    });

    await submitFn({
      tenantId: input.tenantId,
      userId: input.userId,
      id: result.id,
    });

    return result;
  };

  return {
    mutate: mutateAsync,
    mutateAsync,
    isLoading: false,
    error: null,
  };
}
