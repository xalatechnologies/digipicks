/**
 * DigilistSaaS SDK - Conversation & Messaging Hooks (Tier 2)
 *
 * React hooks for user-to-user or user-to-support conversations.
 * Connected to Convex messaging functions.
 *
 * Queries:  { data, isLoading, error }
 * Mutations: { mutate, mutateAsync, isLoading, error, isSuccess }
 */

import { useQuery as useConvexQuery, useMutation as useConvexMutation } from "convex/react";
import { api } from "../convex-api";
import type { Id } from "../convex-api";
import { transformConversation, transformConversationEnriched, transformMessage, type ConvexConversation } from "../transforms/conversation";

// =============================================================================
// Query Key Factory (for future React Query migration)
// =============================================================================

export const conversationKeys = {
  all: ["conversations"] as const,
  list: (params?: Record<string, unknown>) => [...conversationKeys.all, "list", params] as const,
  detail: (id: string) => [...conversationKeys.all, "detail", id] as const,
  messages: (id: string) => [...conversationKeys.all, id, "messages"] as const,
  unread: () => [...conversationKeys.all, "unread"] as const,
};

// =============================================================================
// Types
// =============================================================================

export interface Conversation {
  id: string;
  tenantId: string;
  userId: string;
  participants: string[];
  subject?: string;
  status: string;
  unreadCount: number;
  lastMessageAt?: string;
  bookingId?: string;
  resourceId?: string;
  createdAt: string;
  /** Assigned saksbehandler (from assigneeId) */
  assignedTo?: string;
  /** Enriched by listConversationsByTenant */
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  /** Resource/listing name for booking conversations */
  listingName?: string;
  /** Short booking reference (e.g. last 8 chars) */
  bookingRef?: string;
  /** Resolved subject (e.g. "Booking – Kultursal B") for display */
  displaySubject?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  senderType: string;
  visibility?: "public" | "internal";
  content: string;
  messageType: string;
  attachments: unknown[];
  readAt?: string;
  sentAt: string;
  editedAt?: string;
  deletedAt?: string;
}

// =============================================================================
// Conversation Query Hooks (Wired to Convex)
// =============================================================================

/**
 * List conversations for a user.
 * Connected to Convex: api.domain.messaging.listConversations
 */
export function useConversations(
  userId: Id<"users"> | undefined,
  params?: { status?: string; limit?: number }
) {
  const data = useConvexQuery(
    api.domain.messaging.listConversations,
    userId ? { userId, status: params?.status, limit: params?.limit } : "skip"
  );

  const isLoading = userId !== undefined && data === undefined;

  // Transform to SDK format
  const conversations: Conversation[] = (data ?? []).map((c) => transformConversation(c as unknown as ConvexConversation));

  return {
    data: { data: conversations },
    conversations,
    isLoading,
    error: null,
  };
}

/**
 * Get a single conversation with details.
 * Connected to Convex: api.domain.messaging.getConversation
 */
export function useConversation(id: Id<"conversations"> | undefined) {
  const data = useConvexQuery(
    api.domain.messaging.getConversation,
    id ? { id } : "skip"
  );

  const isLoading = id !== undefined && data === undefined;

  const conversation: Conversation | null = data
    ? transformConversation(data as unknown as ConvexConversation)
    : null;

  return {
    data: { data: conversation },
    conversation,
    isLoading,
    error: null,
  };
}

/**
 * Get messages in a conversation.
 * Connected to Convex: api.domain.messaging.listMessages
 * @param visibilityFilter - "public" for requester (exclude internal notes); "all" for admin
 */
export function useMessages(
  conversationId: Id<"conversations"> | string | undefined,
  params?: { limit?: number; visibilityFilter?: "all" | "public" }
) {
  const data = useConvexQuery(
    api.domain.messaging.listMessages,
    conversationId
      ? {
          conversationId: typeof conversationId === "string" ? conversationId : conversationId,
          limit: params?.limit,
          visibilityFilter: params?.visibilityFilter ?? "all",
        }
      : "skip"
  );

  const isLoading = conversationId !== undefined && data === undefined;

  const messages: Message[] = (data ?? []).map((m: any) => transformMessage(m));

  return {
    data: { data: messages },
    messages,
    isLoading,
    error: null,
  };
}

/**
 * Get total unread message count for a user.
 * Connected to Convex: api.domain.messaging.unreadMessageCount
 */
export function useUnreadMessageCount(userId: Id<"users"> | undefined) {
  const data = useConvexQuery(
    api.domain.messaging.unreadMessageCount,
    userId ? { userId } : "skip"
  );

  const isLoading = userId !== undefined && data === undefined;

  return {
    data: { data: data ?? { count: 0 } },
    isLoading,
    error: null,
  };
}

// =============================================================================
// Conversation Mutation Hooks (Wired to Convex)
// =============================================================================

/**
 * Create a new conversation.
 * Connected to Convex: api.domain.messaging.createConversation
 */
export function useCreateConversation() {
  const mutation = useConvexMutation(api.domain.messaging.createConversation);

  return {
    mutate: (args: {
      tenantId: Id<"tenants">;
      userId: Id<"users">;
      participants: Id<"users">[];
      subject?: string;
      bookingId?: Id<"bookings">;
      resourceId?: Id<"resources">;
    }) => {
      mutation(args);
    },
    mutateAsync: async (args: {
      tenantId: Id<"tenants">;
      userId: Id<"users">;
      participants: Id<"users">[];
      subject?: string;
      bookingId?: Id<"bookings">;
      resourceId?: Id<"resources">;
    }) => {
      const result = await mutation(args);
      return result;
    },
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

/**
 * Send a message in a conversation.
 * Connected to Convex: api.domain.messaging.sendMessage
 * @param visibility - "public" (default, customer-visible) or "internal" (admin-only note)
 */
export function useSendMessage() {
  const mutation = useConvexMutation(api.domain.messaging.sendMessage);

  return {
    mutate: (args: {
      tenantId: Id<"tenants">;
      conversationId: Id<"conversations"> | string;
      senderId: Id<"users">;
      content: string;
      visibility?: "public" | "internal";
      senderType?: string;
      messageType?: string;
      attachments?: unknown[];
    }) => {
      mutation(args);
    },
    mutateAsync: async (args: {
      tenantId: Id<"tenants">;
      conversationId: Id<"conversations"> | string;
      senderId: Id<"users">;
      content: string;
      visibility?: "public" | "internal";
      senderType?: string;
      messageType?: string;
      attachments?: unknown[];
    }) => {
      const result = await mutation(args);
      return result;
    },
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

/**
 * List message templates for admin quick-replies.
 * Connected to Convex: api.domain.messaging.listMessageTemplates
 */
export function useListMessageTemplates(
  tenantId: Id<"tenants"> | undefined,
  userId: Id<"users"> | undefined,
  options?: { activeOnly?: boolean }
) {
  const data = useConvexQuery(
    api.domain.messaging.listMessageTemplates,
    tenantId && userId
      ? {
          tenantId,
          userId,
          activeOnly: options?.activeOnly ?? true,
        }
      : "skip"
  );

  return {
    data: data ?? [],
    templates: data ?? [],
    isLoading: !!(tenantId && userId) && data === undefined,
    error: null,
  };
}

/**
 * Create a message template (admin quick-reply).
 * Connected to Convex: api.domain.messaging.createMessageTemplate
 */
export function useCreateMessageTemplate() {
  const mutation = useConvexMutation(api.domain.messaging.createMessageTemplate);

  return {
    mutate: (args: {
      tenantId: Id<"tenants">;
      userId: Id<"users">;
      name: string;
      body: string;
      category?: string;
    }) => mutation(args),
    mutateAsync: async (args: {
      tenantId: Id<"tenants">;
      userId: Id<"users">;
      name: string;
      body: string;
      category?: string;
    }) => mutation(args),
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

/**
 * Add internal note (admin-only, not visible to requester).
 * Connected to Convex: api.domain.messaging.addInternalNote
 */
export function useAddInternalNote() {
  const mutation = useConvexMutation(api.domain.messaging.addInternalNote);

  return {
    mutate: (args: {
      tenantId: Id<"tenants">;
      conversationId: string;
      senderId: Id<"users">;
      content: string;
      metadata?: Record<string, unknown>;
    }) => mutation(args),
    mutateAsync: async (args: {
      tenantId: Id<"tenants">;
      conversationId: string;
      senderId: Id<"users">;
      content: string;
      metadata?: Record<string, unknown>;
    }) => mutation(args),
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

/**
 * Mark messages as read in a conversation.
 * Connected to Convex: api.domain.messaging.markMessagesAsRead
 */
export function useMarkMessagesAsRead() {
  const mutation = useConvexMutation(api.domain.messaging.markMessagesAsRead);

  return {
    mutate: (args: { conversationId: Id<"conversations">; userId: Id<"users"> }) => {
      mutation(args);
    },
    mutateAsync: async (args: { conversationId: Id<"conversations">; userId: Id<"users"> }) => {
      await mutation(args);
      return { success: true };
    },
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

/**
 * Archive a conversation.
 * Connected to Convex: api.domain.messaging.archiveConversation
 */
export function useArchiveConversation() {
  const mutation = useConvexMutation(api.domain.messaging.archiveConversation);

  return {
    mutate: (args: { id: Id<"conversations"> }) => {
      mutation(args);
    },
    mutateAsync: async (args: { id: Id<"conversations"> }) => {
      await mutation(args);
      return { success: true };
    },
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

// =============================================================================
// Conversation Management Hooks (Wired to Convex)
// =============================================================================

/**
 * Resolve/close a conversation.
 * Connected to Convex: api.domain.messaging.resolveConversation
 */
export function useResolveConversation() {
  const mutation = useConvexMutation(api.domain.messaging.resolveConversation);

  return {
    mutate: (args: { id: Id<"conversations">; resolvedBy: Id<"users"> }) => {
      mutation(args);
    },
    mutateAsync: async (args: { id: Id<"conversations">; resolvedBy: Id<"users"> }) => {
      await mutation(args);
      return { success: true };
    },
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

/**
 * Reopen a resolved conversation.
 * Connected to Convex: api.domain.messaging.reopenConversation
 */
export function useReopenConversation() {
  const mutation = useConvexMutation(api.domain.messaging.reopenConversation);

  return {
    mutate: (args: { id: Id<"conversations"> }) => {
      mutation(args);
    },
    mutateAsync: async (args: { id: Id<"conversations"> }) => {
      await mutation(args);
      return { success: true };
    },
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

/**
 * Assign a conversation to a user/agent.
 * Connected to Convex: api.domain.messaging.assignConversation
 */
export function useAssignConversation() {
  const mutation = useConvexMutation(api.domain.messaging.assignConversation);

  return {
    mutate: (args: { id: Id<"conversations">; assigneeId: Id<"users"> }) => {
      mutation(args);
    },
    mutateAsync: async (args: { id: Id<"conversations">; assigneeId: Id<"users"> }) => {
      await mutation(args);
      return { success: true };
    },
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

/**
 * Unassign a conversation.
 * Connected to Convex: api.domain.messaging.unassignConversation
 */
export function useUnassignConversation() {
  const mutation = useConvexMutation(api.domain.messaging.unassignConversation);

  return {
    mutate: (args: { id: Id<"conversations"> }) => {
      mutation(args);
    },
    mutateAsync: async (args: { id: Id<"conversations"> }) => {
      await mutation(args);
      return { success: true };
    },
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

/**
 * Set conversation priority.
 * Connected to Convex: api.domain.messaging.setConversationPriority
 */
export function useSetConversationPriority() {
  const mutation = useConvexMutation(api.domain.messaging.setConversationPriority);

  return {
    mutate: (args: { id: Id<"conversations">; priority: string }) => {
      mutation(args);
    },
    mutateAsync: async (args: { id: Id<"conversations">; priority: string }) => {
      await mutation(args);
      return { success: true };
    },
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

/**
 * List conversations assigned to a user/agent.
 * Connected to Convex: api.domain.messaging.listConversationsByAssignee
 */
export function useConversationsByAssignee(
  assigneeId: Id<"users"> | undefined,
  params?: { status?: string; limit?: number }
) {
  const data = useConvexQuery(
    api.domain.messaging.listConversationsByAssignee,
    assigneeId ? { assigneeId, status: params?.status, limit: params?.limit } : "skip"
  );

  const isLoading = assigneeId !== undefined && data === undefined;

  const conversations: Conversation[] = (data ?? []).map((c) => transformConversation(c as unknown as ConvexConversation));

  return {
    data: { data: conversations },
    conversations,
    isLoading,
    error: null,
  };
}

/**
 * List all conversations for a tenant (backoffice inbox).
 * Includes assigned conversations AND unassigned booking threads.
 * Connected to Convex: api.domain.messaging.listConversationsByTenant
 */
export function useConversationsForTenant(
  tenantId: Id<"tenants"> | undefined,
  userId: Id<"users"> | undefined,
  params?: { status?: string; limit?: number }
) {
  const data = useConvexQuery(
    api.domain.messaging.listConversationsByTenant,
    tenantId && userId ? { tenantId, userId, status: params?.status, limit: params?.limit } : "skip"
  );

  const isLoading = (tenantId !== undefined && userId !== undefined) && data === undefined;

  const conversations: Conversation[] = (data ?? []).map((c: any) => transformConversationEnriched(c));

  return {
    data: { data: conversations },
    conversations,
    isLoading,
    error: null,
  };
}

// =============================================================================
// Input Types for backwards compatibility
// =============================================================================

export interface CreateConversationInput {
  tenantId: string;
  userId: string;
  participants: string[];
  subject?: string;
  bookingId?: string;
  resourceId?: string;
}

export interface SendMessageInput {
  tenantId: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType?: string;
  attachments?: unknown[];
}
