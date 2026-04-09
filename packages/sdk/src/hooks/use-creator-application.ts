/**
 * DigilistSaaS SDK - Creator Application Hooks
 *
 * React hooks for creator application & verification workflow.
 * Query hooks: { data, application(s), isLoading, error }
 * Mutation hooks: { mutate, mutateAsync, isLoading, error }
 */

import { useQuery as useConvexQuery, useMutation as useConvexMutation } from 'convex/react';
import { api } from '../convex-api';
import type { Id } from '../convex-api';

// ============================================================================
// Types
// ============================================================================

export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'more_info_requested';

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
  // Enriched from facade
  user?: { id: string; name?: string; email?: string; displayName?: string };
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
// Transform
// ============================================================================

function transformApplication(raw: any): CreatorApplication {
  return {
    id: raw._id as string,
    tenantId: raw.tenantId,
    userId: raw.userId,
    displayName: raw.displayName,
    bio: raw.bio,
    niche: raw.niche,
    specialties: raw.specialties,
    performanceProof: raw.performanceProof,
    trackRecordUrl: raw.trackRecordUrl,
    socialLinks: raw.socialLinks,
    status: raw.status,
    reviewedBy: raw.reviewedBy,
    reviewedAt: raw.reviewedAt,
    reviewNote: raw.reviewNote,
    submittedAt: raw.submittedAt,
    resubmittedAt: raw.resubmittedAt,
    previousApplicationId: raw.previousApplicationId,
    metadata: raw.metadata,
    createdAt: new Date(raw._creationTime).toISOString(),
    user: raw.user,
  };
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch creator applications for a tenant (admin review queue).
 * Connected to: api.domain.creatorApplication.list
 */
export function useCreatorApplications(
  tenantId: Id<'tenants'> | undefined,
  params?: {
    status?: ApplicationStatus;
    limit?: number;
  },
) {
  const data = useConvexQuery(api.domain.creatorApplication.list, tenantId ? { tenantId, ...params } : 'skip');

  const isLoading = tenantId !== undefined && data === undefined;
  const applications: CreatorApplication[] = (data ?? []).map(transformApplication);

  return { data: applications, applications, isLoading, error: null };
}

/**
 * Fetch a single creator application by ID.
 * Connected to: api.domain.creatorApplication.get
 */
export function useCreatorApplication(id: string | undefined) {
  const data = useConvexQuery(api.domain.creatorApplication.get, id ? { id } : 'skip');

  const isLoading = id !== undefined && data === undefined;
  const application: CreatorApplication | null = data ? transformApplication(data) : null;

  return { data: application, application, isLoading, error: null };
}

/**
 * Fetch the current user's latest application for a tenant.
 * Connected to: api.domain.creatorApplication.getMyApplication
 */
export function useMyCreatorApplication(tenantId: Id<'tenants'> | undefined, userId: Id<'users'> | undefined) {
  const data = useConvexQuery(
    api.domain.creatorApplication.getMyApplication,
    tenantId && userId ? { tenantId, userId } : 'skip',
  );

  const isLoading = tenantId !== undefined && userId !== undefined && data === undefined;
  const application: CreatorApplication | null = data ? transformApplication(data) : null;

  return { data: application, application, isLoading, error: null };
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Submit a new creator application.
 * Connected to: api.domain.creatorApplication.submit
 */
export function useSubmitCreatorApplication() {
  const mutationFn = useConvexMutation(api.domain.creatorApplication.submit);
  return {
    mutate: mutationFn,
    mutateAsync: mutationFn,
    isLoading: false,
    error: null,
  };
}

/**
 * Approve a creator application (admin).
 * Connected to: api.domain.creatorApplication.approve
 */
export function useApproveCreatorApplication() {
  const mutationFn = useConvexMutation(api.domain.creatorApplication.approve);
  return {
    mutate: mutationFn,
    mutateAsync: mutationFn,
    isLoading: false,
    error: null,
  };
}

/**
 * Reject a creator application (admin).
 * Connected to: api.domain.creatorApplication.reject
 */
export function useRejectCreatorApplication() {
  const mutationFn = useConvexMutation(api.domain.creatorApplication.reject);
  return {
    mutate: mutationFn,
    mutateAsync: mutationFn,
    isLoading: false,
    error: null,
  };
}

/**
 * Request more info on an application (admin).
 * Connected to: api.domain.creatorApplication.requestMoreInfo
 */
export function useRequestMoreInfoCreatorApplication() {
  const mutationFn = useConvexMutation(api.domain.creatorApplication.requestMoreInfo);
  return {
    mutate: mutationFn,
    mutateAsync: mutationFn,
    isLoading: false,
    error: null,
  };
}

/**
 * Resubmit an application after more-info request or rejection.
 * Connected to: api.domain.creatorApplication.resubmit
 */
export function useResubmitCreatorApplication() {
  const mutationFn = useConvexMutation(api.domain.creatorApplication.resubmit);
  return {
    mutate: mutationFn,
    mutateAsync: mutationFn,
    isLoading: false,
    error: null,
  };
}
