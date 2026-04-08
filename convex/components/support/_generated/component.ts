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
      importTicket: FunctionReference<
        "mutation",
        "internal",
        {
          assigneeUserId?: string;
          attachmentUrls?: Array<string>;
          category: string;
          closedAt?: number;
          description: string;
          firstResponseAt?: number;
          messageCount?: number;
          priority: string;
          reporterUserId: string;
          resolvedAt?: number;
          slaDeadline?: number;
          status: string;
          subject: string;
          tags?: Array<string>;
          tenantId: string;
        },
        { id: string },
        Name
      >;
      importTicketMessage: FunctionReference<
        "mutation",
        "internal",
        {
          attachmentUrls?: Array<string>;
          authorUserId: string;
          body: string;
          tenantId: string;
          ticketId: string;
          type: string;
        },
        { id: string },
        Name
      >;
    };
    mutations: {
      addMessage: FunctionReference<
        "mutation",
        "internal",
        {
          attachmentUrls?: Array<string>;
          authorUserId: string;
          body: string;
          tenantId: string;
          ticketId: string;
          type: string;
        },
        { id: string },
        Name
      >;
      assignTicket: FunctionReference<
        "mutation",
        "internal",
        { assigneeUserId: string; id: string },
        { success: boolean },
        Name
      >;
      changeStatus: FunctionReference<
        "mutation",
        "internal",
        { id: string; status: string },
        { success: boolean },
        Name
      >;
      createTicket: FunctionReference<
        "mutation",
        "internal",
        {
          attachmentUrls?: Array<string>;
          category: string;
          description: string;
          priority: string;
          reporterUserId: string;
          subject: string;
          tags?: Array<string>;
          tenantId: string;
        },
        { id: string },
        Name
      >;
      escalateTicket: FunctionReference<
        "mutation",
        "internal",
        { id: string; newAssigneeUserId?: string; newPriority?: string },
        { success: boolean },
        Name
      >;
      updateTicket: FunctionReference<
        "mutation",
        "internal",
        {
          category?: string;
          description?: string;
          id: string;
          priority?: string;
          subject?: string;
          tags?: Array<string>;
        },
        { success: boolean },
        Name
      >;
    };
    queries: {
      getTicket: FunctionReference<
        "query",
        "internal",
        { id: string },
        any,
        Name
      >;
      getTicketCounts: FunctionReference<
        "query",
        "internal",
        { tenantId: string },
        any,
        Name
      >;
      listTicketMessages: FunctionReference<
        "query",
        "internal",
        { limit?: number; ticketId: string },
        Array<any>,
        Name
      >;
      listTickets: FunctionReference<
        "query",
        "internal",
        {
          assigneeUserId?: string;
          category?: string;
          limit?: number;
          status?: string;
          tenantId: string;
        },
        Array<any>,
        Name
      >;
    };
  };
