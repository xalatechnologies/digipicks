/**
 * DigilistSaaS SDK — Webhook Subscription Hooks
 *
 * React hooks for managing outbound webhook subscriptions (CRM / Make).
 */

import { useQuery as useConvexQuery, useMutation as useConvexMutation } from "convex/react";
import type { Id } from "../convex-api";
import { api } from "../convex-api";

// ============================================================================
// Types
// ============================================================================

export interface WebhookSubscription {
    _id: string;
    tenantId: string;
    url: string;
    events: string[];
    secret: string;
    isActive: boolean;
    description?: string;
    lastDeliveredAt?: number;
    lastDeliveryStatus?: string;
    failureCount: number;
    createdBy: string;
    createdAt: number;
}

// ============================================================================
// Query Hooks
// ============================================================================

export function useWebhookSubscriptions(tenantId: Id<"tenants"> | undefined) {
    const data = useConvexQuery(
        api.domain.webhookSubscriptions.listSubscriptions,
        tenantId ? { tenantId } : "skip"
    );

    const isLoading = tenantId !== undefined && data === undefined;
    const subscriptions: WebhookSubscription[] = (data ?? []) as WebhookSubscription[];

    return { subscriptions, isLoading, error: null };
}

// ============================================================================
// Mutation Hooks
// ============================================================================

export function useCreateWebhookSubscription() {
    const mutation = useConvexMutation(api.domain.webhookSubscriptions.createSubscription);

    return {
        mutateAsync: async (args: {
            tenantId: Id<"tenants">;
            url: string;
            events: string[];
            description?: string;
            createdBy: Id<"users">;
        }) => mutation(args as any),
        isLoading: false,
        error: null,
    };
}

export function useDeleteWebhookSubscription() {
    const mutation = useConvexMutation(api.domain.webhookSubscriptions.deleteSubscription);

    return {
        mutateAsync: async (args: {
            tenantId: Id<"tenants">;
            subscriptionId: Id<"webhookSubscriptions">;
            deletedBy: Id<"users">;
        }) => mutation(args as any),
        isLoading: false,
        error: null,
    };
}

export function useToggleWebhookSubscription() {
    const mutation = useConvexMutation(api.domain.webhookSubscriptions.toggleSubscription);

    return {
        mutateAsync: async (args: {
            tenantId: Id<"tenants">;
            subscriptionId: Id<"webhookSubscriptions">;
            isActive: boolean;
            updatedBy: Id<"users">;
        }) => mutation(args as any),
        isLoading: false,
        error: null,
    };
}
