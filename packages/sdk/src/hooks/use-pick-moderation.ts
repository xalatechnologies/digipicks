/**
 * DigilistSaaS SDK - Pick Moderation Hooks
 *
 * React hooks for admin pick moderation operations.
 * Query hooks: { data, isLoading, error }
 * Mutation hooks: { mutate, mutateAsync, isLoading, error }
 */

import { useQuery as useConvexQuery, useMutation as useConvexMutation } from 'convex/react';
import { api } from '../convex-api';
import type { Id } from '../convex-api';

// ============================================================================
// Types
// ============================================================================

export type ModerationStatus = 'clean' | 'flagged' | 'under_review' | 'approved' | 'rejected' | 'hidden';
export type ReportReason = 'fraud' | 'misleading' | 'spam' | 'inappropriate' | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed';

export interface ModerationQueuePick {
  _id: string;
  tenantId: string;
  creatorId: string;
  event: string;
  sport: string;
  league?: string;
  pickType: string;
  selection: string;
  oddsAmerican: string;
  oddsDecimal: number;
  units: number;
  confidence: string;
  result: string;
  status: string;
  moderationStatus?: ModerationStatus;
  moderatedBy?: string;
  moderatedAt?: number;
  moderationNote?: string;
  reportCount?: number;
  creator?: { id: string; name?: string; email?: string; displayName?: string };
}

export interface PickReport {
  _id: string;
  tenantId: string;
  pickId: string;
  reporterId: string;
  reason: ReportReason;
  details?: string;
  status: ReportStatus;
  reviewedBy?: string;
  reviewedAt?: number;
  reportedAt: number;
  reporter?: { id: string; name?: string; email?: string; displayName?: string };
}

export interface ModerationStats {
  flagged: number;
  underReview: number;
  rejected: number;
  hidden: number;
  approved: number;
  pendingReports: number;
}

export interface ReportPickInput {
  tenantId: Id<'tenants'>;
  reporterId: Id<'users'>;
  pickId: string;
  reason: ReportReason;
  details?: string;
}

export interface ModeratePickInput {
  id: string;
  moderatedBy: Id<'users'>;
  moderationStatus: ModerationStatus;
  moderationNote?: string;
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch the moderation queue — picks that need admin attention.
 * Requires `pick:moderate` permission.
 */
export function useModerationQueue(opts: {
  tenantId: Id<'tenants'>;
  callerId: Id<'users'>;
  moderationStatus?: string;
  creatorId?: string;
  limit?: number;
}) {
  const data = useConvexQuery(
    api.domain.picks.listModerationQueue,
    opts.tenantId && opts.callerId
      ? {
          tenantId: opts.tenantId,
          callerId: opts.callerId,
          moderationStatus: opts.moderationStatus,
          creatorId: opts.creatorId,
          limit: opts.limit,
        }
      : 'skip',
  );
  return {
    data: data as ModerationQueuePick[] | undefined,
    picks: data as ModerationQueuePick[] | undefined,
    isLoading: data === undefined,
    error: null,
  };
}

/**
 * Fetch reports for a specific pick — admin detail view.
 */
export function usePickReports(opts: { pickId: string; callerId: Id<'users'>; status?: string }) {
  const data = useConvexQuery(
    api.domain.picks.listPickReports,
    opts.pickId && opts.callerId
      ? {
          pickId: opts.pickId,
          callerId: opts.callerId,
          status: opts.status,
        }
      : 'skip',
  );
  return {
    data: data as PickReport[] | undefined,
    reports: data as PickReport[] | undefined,
    isLoading: data === undefined,
    error: null,
  };
}

/**
 * Fetch moderation stats — admin dashboard summary.
 */
export function useModerationStats(opts: { tenantId: Id<'tenants'>; callerId: Id<'users'> }) {
  const data = useConvexQuery(
    api.domain.picks.moderationStats,
    opts.tenantId && opts.callerId
      ? {
          tenantId: opts.tenantId,
          callerId: opts.callerId,
        }
      : 'skip',
  );
  return {
    data: data as ModerationStats | undefined,
    isLoading: data === undefined,
    error: null,
  };
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Report a pick — any authenticated user can report.
 */
export function useReportPick() {
  const mutation = useConvexMutation(api.domain.picks.reportPick);
  return {
    mutate: (input: ReportPickInput) => {
      void mutation(input);
    },
    mutateAsync: (input: ReportPickInput) => mutation(input),
    isLoading: false,
    error: null,
  };
}

/**
 * Moderate a pick — admin action (approve, reject, hide, flag, etc.).
 */
export function useModeratePick() {
  const mutation = useConvexMutation(api.domain.picks.moderatePick);
  return {
    mutate: (input: ModeratePickInput) => {
      void mutation(input);
    },
    mutateAsync: (input: ModeratePickInput) => mutation(input),
    isLoading: false,
    error: null,
  };
}
