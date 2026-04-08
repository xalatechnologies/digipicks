/**
 * DigilistSaaS SDK — Messaging Hooks
 *
 * React hooks for conversation management.
 * Connected to Convex domain/messaging.ts.
 * Uses `as any` casts for APIs that may have differing signatures.
 */

import { useQuery as useConvexQuery, useMutation } from "convex/react";
import { api } from "../convex-api";
import type { Id } from "../convex-api";

export function useMessagingConversations(userId: string | undefined) {
    const data = useConvexQuery(api.domain.messaging.listConversations, userId ? { userId: userId as Id<"users"> } : "skip");
    return { data: (data ?? []) as any[], isLoading: userId !== undefined && data === undefined, error: null };
}

export function useMessagingConversation(conversationId: string | undefined) {
    const data = useConvexQuery(api.domain.messaging.getConversation, conversationId ? { id: conversationId } : "skip");
    return { data: data ?? null, isLoading: conversationId !== undefined && data === undefined, error: null };
}

export function useMessagingMessages(conversationId: string | undefined) {
    const data = useConvexQuery(api.domain.messaging.listMessages, conversationId ? { conversationId } : "skip");
    return { data: (data ?? []) as any[], isLoading: conversationId !== undefined && data === undefined, error: null };
}

export function useMessagingSendMessage() { return useMutation(api.domain.messaging.sendMessage); }
export function useMessagingMarkRead() { return useMutation((api.domain.messaging as any).markRead ?? api.domain.messaging.markMessagesAsRead); }
