/**
 * DigilistSaaS SDK - Broadcasts Hooks
 *
 * React hooks for creator broadcast operations, wired to Convex backend.
 * Query hooks: { data, broadcasts, isLoading, error }
 * Mutation hooks: { mutate, mutateAsync, isLoading, error }
 */

import { useQuery as useConvexQuery, useMutation as useConvexMutation } from "convex/react";
import { api } from "../convex-api";
import type { Id } from "../convex-api";

// ============================================================================
// Types
// ============================================================================

export type BroadcastMessageType = "text_update" | "pick_alert" | "announcement";

export interface Broadcast {
    id: string;
    tenantId: string;
    creatorId: string;
    title: string;
    body: string;
    messageType: BroadcastMessageType;
    recipientCount: number;
    status: "draft" | "sent";
    sentAt?: number;
    pickId?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    // Enriched from facade
    creator?: { id: string; name?: string; displayName?: string };
    // Subscriber inbox fields
    receiptId?: string;
    readAt?: number;
}

export interface SendBroadcastInput {
    tenantId: Id<"tenants">;
    creatorId: Id<"users">;
    title: string;
    body: string;
    messageType: BroadcastMessageType;
    pickId?: string;
    metadata?: Record<string, unknown>;
}

// ============================================================================
// Transform
// ============================================================================

function transformBroadcast(raw: any): Broadcast {
    return {
        id: raw._id as string,
        tenantId: raw.tenantId,
        creatorId: raw.creatorId,
        title: raw.title,
        body: raw.body,
        messageType: raw.messageType,
        recipientCount: raw.recipientCount,
        status: raw.status,
        sentAt: raw.sentAt,
        pickId: raw.pickId,
        metadata: raw.metadata,
        createdAt: new Date(raw._creationTime).toISOString(),
        creator: raw.creator,
        receiptId: raw.receiptId,
        readAt: raw.readAt,
    };
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch broadcasts sent by a creator (sent messages view).
 * Connected to: api.domain.broadcasts.listByCreator
 */
export function useCreatorBroadcasts(
    tenantId: Id<"tenants"> | undefined,
    creatorId: string | undefined,
    params?: { status?: string; limit?: number }
) {
    const data = useConvexQuery(
        api.domain.broadcasts.listByCreator,
        tenantId && creatorId ? { tenantId, creatorId, ...params } : "skip"
    );

    const isLoading = (tenantId !== undefined && creatorId !== undefined) && data === undefined;
    const broadcasts: Broadcast[] = (data ?? []).map(transformBroadcast);

    return { data: broadcasts, broadcasts, isLoading, error: null };
}

/**
 * Fetch broadcasts received by a subscriber (inbox).
 * Connected to: api.domain.broadcasts.listForSubscriber
 */
export function useSubscriberBroadcasts(
    tenantId: Id<"tenants"> | undefined,
    userId: string | undefined,
    params?: { unreadOnly?: boolean; limit?: number }
) {
    const data = useConvexQuery(
        api.domain.broadcasts.listForSubscriber,
        tenantId && userId ? { tenantId, userId, ...params } : "skip"
    );

    const isLoading = (tenantId !== undefined && userId !== undefined) && data === undefined;
    const broadcasts: Broadcast[] = (data ?? []).map(transformBroadcast);

    return { data: broadcasts, broadcasts, isLoading, error: null };
}

/**
 * Count unread broadcasts for a subscriber.
 * Connected to: api.domain.broadcasts.unreadCount
 */
export function useBroadcastUnreadCount(
    tenantId: Id<"tenants"> | undefined,
    userId: string | undefined
) {
    const data = useConvexQuery(
        api.domain.broadcasts.unreadCount,
        tenantId && userId ? { tenantId, userId } : "skip"
    );

    const isLoading = (tenantId !== undefined && userId !== undefined) && data === undefined;

    return { data: data ?? { count: 0 }, count: data?.count ?? 0, isLoading, error: null };
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Send a broadcast to all active subscribers.
 * Connected to: api.domain.broadcasts.send
 */
export function useSendBroadcast() {
    const mutation = useConvexMutation(api.domain.broadcasts.send);

    return {
        mutate: (input: SendBroadcastInput) => mutation(input),
        mutateAsync: async (input: SendBroadcastInput) => mutation(input),
        isLoading: false,
        error: null,
    };
}

/**
 * Mark a broadcast as read.
 * Connected to: api.domain.broadcasts.markAsRead
 */
export function useMarkBroadcastRead() {
    const mutation = useConvexMutation(api.domain.broadcasts.markAsRead);

    return {
        mutate: (args: { userId: Id<"users">; broadcastId: string }) => mutation(args),
        mutateAsync: async (args: { userId: Id<"users">; broadcastId: string }) => mutation(args),
        isLoading: false,
        error: null,
    };
}

/**
 * Remove a broadcast.
 * Connected to: api.domain.broadcasts.remove
 */
export function useDeleteBroadcast() {
    const mutation = useConvexMutation(api.domain.broadcasts.remove);

    return {
        mutate: (id: string) => mutation({ id }),
        mutateAsync: async (id: string) => mutation({ id }),
        isLoading: false,
        error: null,
    };
}
