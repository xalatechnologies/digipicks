/**
 * DigiPicks SDK — Creator Applications Hooks
 *
 * React hooks for the creator onboarding & verification workflow.
 * Wired to Convex `api.domain.creatorApplications.*`.
 */

import { useMutation, useQuery as useConvexQuery } from 'convex/react';
import { api } from '../convex-api';
import type { Id } from '../convex-api';

// ============================================================================
// Types
// ============================================================================

export type CreatorApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'needs_more_info';

export interface CreatorApplicationLink {
  label: string;
  url: string;
}

export interface CreatorApplication {
  _id: string;
  _creationTime: number;
  tenantId: string;
  applicantUserId: string;
  status: CreatorApplicationStatus;
  fullName: string;
  country: string;
  dateOfBirth?: string;
  handle: string;
  displayName: string;
  bio: string;
  avatarStorageId?: string;
  primarySports: string[];
  nicheTags: string[];
  externalLinks: CreatorApplicationLink[];
  idDocumentStorageId?: string;
  sampleNotes?: string;
  ageConfirmed: boolean;
  rulesAccepted: boolean;
  submittedAt?: number;
  reviewedAt?: number;
  reviewedBy?: string;
  reviewNote?: string;
  applicant?: { id: string; name?: string; email?: string } | null;
}

export interface CreatorApplicationCounts {
  draft: number;
  submitted: number;
  in_review: number;
  approved: number;
  rejected: number;
  needs_more_info: number;
  total: number;
}

export interface DraftInput {
  fullName: string;
  country: string;
  dateOfBirth?: string;
  handle: string;
  displayName: string;
  bio: string;
  avatarStorageId?: string;
  primarySports: string[];
  nicheTags: string[];
  externalLinks: CreatorApplicationLink[];
  idDocumentStorageId?: string;
  sampleNotes?: string;
  ageConfirmed: boolean;
  rulesAccepted: boolean;
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch the current user's creator application for a tenant.
 * Returns null if no application exists.
 */
export function useMyCreatorApplication(
  tenantId: Id<'tenants'> | undefined,
  userId: Id<'users'> | undefined,
): CreatorApplication | null | undefined {
  const data = useConvexQuery(
    api.domain.creatorApplications.myApplication,
    tenantId && userId ? { tenantId, userId } : 'skip',
  );
  return data as CreatorApplication | null | undefined;
}

/**
 * Admin: list applications in the review queue, optionally filtered by status.
 */
export function useCreatorApplicationQueue(
  tenantId: Id<'tenants'> | undefined,
  adminUserId: Id<'users'> | undefined,
  status?: CreatorApplicationStatus,
): CreatorApplication[] | undefined {
  const data = useConvexQuery(
    api.domain.creatorApplications.listForReview,
    tenantId && adminUserId ? { tenantId, userId: adminUserId, status } : 'skip',
  );
  return data as CreatorApplication[] | undefined;
}

/**
 * Admin: counts per status for the review queue header.
 */
export function useCreatorApplicationCounts(
  tenantId: Id<'tenants'> | undefined,
  adminUserId: Id<'users'> | undefined,
): CreatorApplicationCounts | undefined {
  const data = useConvexQuery(
    api.domain.creatorApplications.reviewQueueCounts,
    tenantId && adminUserId ? { tenantId, userId: adminUserId } : 'skip',
  );
  return data as CreatorApplicationCounts | undefined;
}

/**
 * Admin: get a single application by id, with applicant enrichment.
 */
export function useCreatorApplication(id: string | undefined): CreatorApplication | null | undefined {
  const data = useConvexQuery(api.domain.creatorApplications.get, id ? { id } : 'skip');
  return data as CreatorApplication | null | undefined;
}

// ============================================================================
// Mutation Hooks
// ============================================================================

export function useUpsertCreatorDraft() {
  const mutate = useMutation(api.domain.creatorApplications.upsertDraft);
  return (tenantId: Id<'tenants'>, applicantUserId: Id<'users'>, draft: DraftInput) =>
    mutate({ tenantId, applicantUserId, ...draft });
}

export function useSubmitCreatorApplication() {
  const mutate = useMutation(api.domain.creatorApplications.submit);
  return (tenantId: Id<'tenants'>, userId: Id<'users'>, id: string) => mutate({ tenantId, userId, id });
}

export function useDiscardCreatorDraft() {
  const mutate = useMutation(api.domain.creatorApplications.discardDraft);
  return (tenantId: Id<'tenants'>, userId: Id<'users'>, id: string) => mutate({ tenantId, userId, id });
}

export function useReviewCreatorApplication() {
  const mutate = useMutation(api.domain.creatorApplications.review);
  return (params: {
    tenantId: Id<'tenants'>;
    reviewerUserId: Id<'users'>;
    id: string;
    status: 'in_review' | 'approved' | 'rejected' | 'needs_more_info';
    reviewNote?: string;
  }) => mutate(params);
}
