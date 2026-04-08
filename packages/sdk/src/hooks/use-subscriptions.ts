/**
 * DigilistSaaS SDK — Subscription Hooks
 *
 * Wraps api.domain.subscriptions for subscription management.
 * Covers: public tiers, user subscriptions, creator subscribers, Connect accounts.
 */

import { useQuery, useAction, useMutation } from "./convex-utils";
import { api } from "../convex-api";
import { useCallback, useState } from "react";

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
    stripeProductId?: string;
    stripePriceId?: string;
}

export interface Subscription {
    _id: string;
    tenantId: string;
    userId: string;
    tierId: string;
    creatorId?: string;
    status: string;
    startDate: number;
    endDate: number;
    autoRenew: boolean;
    trialStartDate?: number;
    trialEndDate?: number;
    convertedFromTrial?: boolean;
    isTrialing?: boolean;
    trialDaysRemaining?: number;
    stripeSubscriptionId?: string;
    stripeCustomerId?: string;
    tier?: {
        name: string;
        slug: string;
        price: number;
        currency: string;
    } | null;
}

export interface TrialStatus {
    membershipId: string;
    isTrialing: boolean;
    trialStartDate: number | null;
    trialEndDate: number | null;
    trialDaysRemaining: number;
    convertedFromTrial: boolean;
    status: string;
}

export interface CreatorAccount {
    _id: string;
    tenantId: string;
    userId: string;
    stripeAccountId: string;
    status: string;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
}

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Fetch publicly visible, active membership tiers for a tenant.
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

/**
 * Get the current user's subscription to a specific creator.
 */
export function useMySubscription(userId: string | undefined, creatorId: string | undefined) {
    const data = useQuery(
        api.domain.subscriptions.getMySubscription,
        userId && creatorId ? { userId: userId as any, creatorId } : "skip"
    );

    return {
        subscription: data as Subscription | null | undefined,
        isLoading: userId !== undefined && creatorId !== undefined && data === undefined,
    };
}

/**
 * Check if user is subscribed to a creator.
 */
export function useIsSubscribed(userId: string | undefined, creatorId: string | undefined) {
    const data = useQuery(
        api.domain.subscriptions.isSubscribed,
        creatorId ? { userId, creatorId } : "skip"
    );

    return {
        isSubscribed: data === true,
        isLoading: creatorId !== undefined && data === undefined,
    };
}

/**
 * List subscribers for a creator.
 */
export function useCreatorSubscribers(
    tenantId: string | undefined,
    creatorId: string | undefined,
    status?: string
) {
    const data = useQuery(
        api.domain.subscriptions.listCreatorSubscribers,
        tenantId && creatorId
            ? { tenantId: tenantId as any, creatorId: creatorId as any, status }
            : "skip"
    );

    return {
        subscribers: (data ?? []) as any[],
        isLoading: tenantId !== undefined && creatorId !== undefined && data === undefined,
    };
}

/**
 * Get creator's Stripe Connect account status.
 */
export function useCreatorAccount(userId: string | undefined) {
    const data = useQuery(
        api.domain.subscriptions.getCreatorAccount,
        userId ? { userId: userId as any } : "skip"
    );

    return {
        account: data as CreatorAccount | null | undefined,
        isLoading: userId !== undefined && data === undefined,
    };
}

/**
 * Get trial status for a user's subscription to a creator.
 */
export function useTrialStatus(userId: string | undefined, creatorId: string | undefined) {
    const data = useQuery(
        api.domain.subscriptions.getTrialStatus,
        creatorId ? { userId, creatorId } : "skip"
    );

    return {
        trial: data as TrialStatus | null | undefined,
        isLoading: creatorId !== undefined && data === undefined,
    };
}

// =============================================================================
// Action Hooks
// =============================================================================

/**
 * Initiate a subscription checkout. Returns a redirect URL.
 */
export function useSubscribe() {
    const initiateSubscription = useAction(api.domain.subscriptions.initiateSubscription);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const subscribe = useCallback(
        async (args: {
            tenantId: string;
            userId: string;
            tierId: string;
            creatorId: string;
            customerEmail?: string;
            returnUrl: string;
            cancelUrl?: string;
        }) => {
            setIsLoading(true);
            setError(null);
            try {
                const result = await initiateSubscription({
                    tenantId: args.tenantId as any,
                    userId: args.userId as any,
                    tierId: args.tierId,
                    creatorId: args.creatorId,
                    customerEmail: args.customerEmail,
                    returnUrl: args.returnUrl,
                    cancelUrl: args.cancelUrl,
                });
                return result;
            } catch (e) {
                const message = e instanceof Error ? e.message : "Failed to initiate subscription";
                setError(message);
                throw e;
            } finally {
                setIsLoading(false);
            }
        },
        [initiateSubscription]
    );

    return { subscribe, isLoading, error };
}

/**
 * Cancel a subscription.
 */
export function useCancelSubscription() {
    const cancelSubscription = useAction(api.domain.subscriptions.cancelSubscription);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const cancel = useCallback(
        async (args: { userId: string; creatorId: string; reason?: string }) => {
            setIsLoading(true);
            setError(null);
            try {
                const result = await cancelSubscription({
                    userId: args.userId as any,
                    creatorId: args.creatorId,
                    reason: args.reason,
                });
                return result;
            } catch (e) {
                const message = e instanceof Error ? e.message : "Failed to cancel subscription";
                setError(message);
                throw e;
            } finally {
                setIsLoading(false);
            }
        },
        [cancelSubscription]
    );

    return { cancel, isLoading, error };
}

/**
 * Update trial days on a subscription tier.
 */
export function useUpdateTierTrialDays() {
    const updateTierTrialDays = useMutation(api.domain.subscriptions.updateTierTrialDays);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const update = useCallback(
        async (args: { tierId: string; trialDays: number }) => {
            setIsLoading(true);
            setError(null);
            try {
                const result = await updateTierTrialDays(args);
                return result;
            } catch (e) {
                const message = e instanceof Error ? e.message : "Failed to update trial days";
                setError(message);
                throw e;
            } finally {
                setIsLoading(false);
            }
        },
        [updateTierTrialDays]
    );

    return { update, isLoading, error };
}

/**
 * Set up Stripe Connect for creator payouts.
 */
export function useSetupCreatorPayouts() {
    const setupPayouts = useAction(api.domain.subscriptions.setupCreatorPayouts);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const setup = useCallback(
        async (args: {
            tenantId: string;
            userId: string;
            email: string;
            refreshUrl: string;
            returnUrl: string;
        }) => {
            setIsLoading(true);
            setError(null);
            try {
                const result = await setupPayouts({
                    tenantId: args.tenantId as any,
                    userId: args.userId as any,
                    email: args.email,
                    refreshUrl: args.refreshUrl,
                    returnUrl: args.returnUrl,
                });
                return result;
            } catch (e) {
                const message = e instanceof Error ? e.message : "Failed to set up payouts";
                setError(message);
                throw e;
            } finally {
                setIsLoading(false);
            }
        },
        [setupPayouts]
    );

    return { setup, isLoading, error };
}
