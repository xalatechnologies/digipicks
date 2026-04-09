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
      importDispute: FunctionReference<
        "mutation",
        "internal",
        {
          category: string;
          closedAt?: number;
          description: string;
          escalatedAt?: number;
          evidenceUrls?: Array<string>;
          filedByUserId: string;
          mediatorUserId?: string;
          messageCount?: number;
          priority: string;
          relatedMembershipId?: string;
          relatedPickId?: string;
          resolution?: string;
          resolutionNote?: string;
          resolvedAt?: number;
          respondentUserId: string;
          status: string;
          subject: string;
          tags?: Array<string>;
          tenantId: string;
        },
        { id: string },
        Name
      >;
      importDisputeMessage: FunctionReference<
        "mutation",
        "internal",
        {
          attachmentUrls?: Array<string>;
          authorUserId: string;
          body: string;
          disputeId: string;
          tenantId: string;
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
          disputeId: string;
          tenantId: string;
          type: string;
        },
        { id: string },
        Name
      >;
      assignMediator: FunctionReference<
        "mutation",
        "internal",
        { id: string; mediatorUserId: string },
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
      createDispute: FunctionReference<
        "mutation",
        "internal",
        {
          category: string;
          description: string;
          evidenceUrls?: Array<string>;
          filedByUserId: string;
          priority: string;
          relatedMembershipId?: string;
          relatedPickId?: string;
          respondentUserId: string;
          subject: string;
          tags?: Array<string>;
          tenantId: string;
        },
        { id: string },
        Name
      >;
      escalateDispute: FunctionReference<
        "mutation",
        "internal",
        { id: string; newMediatorUserId?: string; newPriority?: string },
        { success: boolean },
        Name
      >;
      resolveDispute: FunctionReference<
        "mutation",
        "internal",
        { id: string; resolution: string; resolutionNote?: string },
        { success: boolean },
        Name
      >;
      updateDispute: FunctionReference<
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
      getDispute: FunctionReference<
        "query",
        "internal",
        { id: string },
        any,
        Name
      >;
      getDisputeCounts: FunctionReference<
        "query",
        "internal",
        { tenantId: string },
        any,
        Name
      >;
      listDisputeMessages: FunctionReference<
        "query",
        "internal",
        { disputeId: string; limit?: number },
        Array<any>,
        Name
      >;
      listDisputes: FunctionReference<
        "query",
        "internal",
        {
          category?: string;
          filedByUserId?: string;
          limit?: number;
          mediatorUserId?: string;
          respondentUserId?: string;
          status?: string;
          tenantId: string;
        },
        Array<any>,
        Name
      >;
    };
  };
