/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    import: {
      importConversation: FunctionReference<
        "mutation",
        "internal",
        {
          assignedAt?: number;
          assigneeId?: string;
          bookingId?: string;
          conversationType?: "booking" | "general";
          lastMessageAt?: number;
          metadata?: any;
          participants: Array<string>;
          priority?: string;
          reopenedAt?: number;
          resolvedAt?: number;
          resolvedBy?: string;
          resourceId?: string;
          status: string;
          subject?: string;
          tenantId: string;
          unreadCount: number;
          userId: string;
        },
        { id: string },
        Name
      >;
      importMessage: FunctionReference<
        "mutation",
        "internal",
        {
          attachments: Array<any>;
          content: string;
          conversationId: string;
          messageType: string;
          metadata?: any;
          readAt?: number;
          senderId: string;
          senderType: string;
          sentAt: number;
          tenantId: string;
        },
        { id: string },
        Name
      >;
    };
    mutations: {
      addInternalNote: FunctionReference<
        "mutation",
        "internal",
        {
          content: string;
          conversationId: string;
          metadata?: any;
          senderId: string;
          tenantId: string;
        },
        { id: string },
        Name
      >;
      addParticipant: FunctionReference<
        "mutation",
        "internal",
        { id: string; userId: string },
        { success: boolean },
        Name
      >;
      archiveConversation: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      assignConversation: FunctionReference<
        "mutation",
        "internal",
        { assigneeId: string; id: string },
        { success: boolean },
        Name
      >;
      cleanupOld: FunctionReference<
        "mutation",
        "internal",
        { olderThanMs: number; tenantId: string },
        { purged: number },
        Name
      >;
      createConversation: FunctionReference<
        "mutation",
        "internal",
        {
          bookingId?: string;
          conversationType?: "booking" | "general";
          metadata?: any;
          participants: Array<string>;
          resourceId?: string;
          subject?: string;
          tenantId: string;
          userId: string;
        },
        { id: string },
        Name
      >;
      createMessageTemplate: FunctionReference<
        "mutation",
        "internal",
        { body: string; category?: string; name: string; tenantId: string },
        { id: string },
        Name
      >;
      getOrCreateConversationForBooking: FunctionReference<
        "mutation",
        "internal",
        {
          bookingId: string;
          resourceId?: string;
          tenantId: string;
          userId: string;
        },
        { conversationId: string },
        Name
      >;
      markMessagesAsRead: FunctionReference<
        "mutation",
        "internal",
        { conversationId: string; userId: string },
        { count: number; success: boolean },
        Name
      >;
      purgeAllForTenant: FunctionReference<
        "mutation",
        "internal",
        { tenantId: string },
        { conversations: number; messages: number; templates: number },
        Name
      >;
      reopenConversation: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      resolveConversation: FunctionReference<
        "mutation",
        "internal",
        { id: string; resolvedBy: string },
        { success: boolean },
        Name
      >;
      sendMessage: FunctionReference<
        "mutation",
        "internal",
        {
          attachments?: Array<any>;
          content: string;
          conversationId: string;
          messageType?: string;
          metadata?: any;
          senderId: string;
          senderType?: string;
          tenantId: string;
          visibility?: "public" | "internal";
        },
        { id: string },
        Name
      >;
      setConversationPriority: FunctionReference<
        "mutation",
        "internal",
        { id: string; priority: string },
        { success: boolean },
        Name
      >;
      unassignConversation: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
    };
    queries: {
      getConversation: FunctionReference<
        "query",
        "internal",
        { id: string },
        any,
        Name
      >;
      getConversationByBooking: FunctionReference<
        "query",
        "internal",
        { bookingId: string; tenantId: string },
        any | null,
        Name
      >;
      listConversations: FunctionReference<
        "query",
        "internal",
        { limit?: number; status?: string; userId: string },
        Array<any>,
        Name
      >;
      listConversationsByAssignee: FunctionReference<
        "query",
        "internal",
        { assigneeId: string; limit?: number; status?: string },
        Array<any>,
        Name
      >;
      listConversationsByTenant: FunctionReference<
        "query",
        "internal",
        { limit?: number; status?: string; tenantId: string },
        Array<any>,
        Name
      >;
      listMessages: FunctionReference<
        "query",
        "internal",
        {
          conversationId: string;
          limit?: number;
          visibilityFilter?: "all" | "public";
        },
        Array<any>,
        Name
      >;
      listMessageTemplates: FunctionReference<
        "query",
        "internal",
        { activeOnly?: boolean; tenantId: string },
        Array<any>,
        Name
      >;
      unreadMessageCount: FunctionReference<
        "query",
        "internal",
        { userId: string },
        { count: number },
        Name
      >;
    };
  };
