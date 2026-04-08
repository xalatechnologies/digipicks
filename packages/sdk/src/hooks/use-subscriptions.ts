/**
 * DigilistSaaS SDK — Subscription Hooks
 *
 * Wraps api.domain.subscriptions for the web pricing page.
 */

import { useQuery } from "./convex-utils";
import { api } from "../convex-api";

// =============================================================================
// Types
// =============================================================================

export interface SubscriptionBenefit {
    id: string;
    type: string;
    label: string;
    config: unknown;
}

export interface SubscriptionTier {
    _id: string;
    tenantId: string;
    name: string;
    slug: string;
    description?: string;
    shortDescription?: string;
    price: number;
    currency: string;
    billingInterval: string;
    trialDays?: number;
    benefits: SubscriptionBenefit[];
    earlyAccessDays?: number;
    maxMembers?: number;
    currentMemberCount: number;
    isWaitlistEnabled: boolean;
    color?: string;
    sortOrder: number;
    isActive: boolean;
    isPublic: boolean;
}

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Fetch publicly visible, active membership tiers for a tenant.
 * Returns an empty array while loading or if tenantId is undefined.
 */
export function usePublicTiers(tenantId: string | undefined) {
    const data = useQuery(
        api.domain.subscriptions.listPublicTiers,
        tenantId ? { tenantId } : "skip"
    );

    return {
        tiers: (data ?? []) as SubscriptionTier[],
        isLoading: tenantId !== undefined && data === undefined,
    };
}
