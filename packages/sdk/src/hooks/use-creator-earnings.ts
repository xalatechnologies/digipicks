/**
 * DigilistSaaS SDK — Creator Earnings Hooks
 *
 * Wraps api.domain.creatorEarnings for the creator earnings dashboard.
 * Covers: earnings summary, per-period history, payout history.
 */

import { useQuery } from './convex-utils';
import { api } from '../convex-api';

// =============================================================================
// Types
// =============================================================================

export interface EarningsSummary {
  totalGrossRevenue: number;
  totalPlatformFees: number;
  totalNetEarnings: number;
  totalPaidOut: number;
  pendingPayout: number;
  subscriberCount: number;
  mrr: number;
  currency: string;
  periodCount: number;
}

export interface EarningsPeriod {
  _id: string;
  tenantId: string;
  creatorId: string;
  period: string;
  grossRevenue: number;
  platformFees: number;
  netEarnings: number;
  subscriberCount: number;
  paidOutAmount: number;
  currency: string;
  updatedAt: number;
}

export interface CreatorPayout {
  _id: string;
  tenantId: string;
  creatorId: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  currency: string;
  stripeAccountId: string;
  stripeTransferId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: number;
  processedAt?: number;
  failureReason?: string;
  notes?: string;
}

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Fetch the creator's aggregated earnings summary.
 */
export function useMyEarningsSummary(tenantId: string | undefined, userId: string | undefined) {
  const data = useQuery(
    api.domain.creatorEarnings.getMyEarningsSummary,
    tenantId && userId ? { tenantId: tenantId as any, userId: userId as any } : 'skip',
  );

  return {
    summary: data as EarningsSummary | null | undefined,
    isLoading: tenantId !== undefined && userId !== undefined && data === undefined,
  };
}

/**
 * Fetch per-period earnings history for the creator.
 */
export function useMyEarningsHistory(tenantId: string | undefined, userId: string | undefined, limit?: number) {
  const data = useQuery(
    api.domain.creatorEarnings.getMyEarningsHistory,
    tenantId && userId ? { tenantId: tenantId as any, userId: userId as any, limit } : 'skip',
  );

  return {
    history: (data ?? []) as EarningsPeriod[],
    isLoading: tenantId !== undefined && userId !== undefined && data === undefined,
  };
}

/**
 * Fetch payout history for the creator.
 */
export function useMyPayouts(
  tenantId: string | undefined,
  userId: string | undefined,
  status?: string,
  limit?: number,
) {
  const data = useQuery(
    api.domain.creatorEarnings.getMyPayouts,
    tenantId && userId ? { tenantId: tenantId as any, userId: userId as any, status, limit } : 'skip',
  );

  return {
    payouts: (data ?? []) as CreatorPayout[],
    isLoading: tenantId !== undefined && userId !== undefined && data === undefined,
  };
}
