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
    functions: {
      createPost: FunctionReference<
        "mutation",
        "internal",
        {
          accessLevel?: string;
          body: string;
          contentFormat?: string;
          creatorId: string;
          metadata?: any;
          tenantId: string;
          title: string;
        },
        { id: string },
        Name
      >;
      get: FunctionReference<"query", "internal", { id: string }, any, Name>;
      listByCreator: FunctionReference<
        "query",
        "internal",
        {
          creatorId: string;
          limit?: number;
          status?: string;
          tenantId: string;
        },
        Array<any>,
        Name
      >;
      listCreatorPosts: FunctionReference<
        "query",
        "internal",
        {
          creatorId: string;
          limit?: number;
          status?: string;
          tenantId: string;
        },
        Array<any>,
        Name
      >;
      listForSubscriber: FunctionReference<
        "query",
        "internal",
        {
          limit?: number;
          tenantId: string;
          unreadOnly?: boolean;
          userId: string;
        },
        Array<any>,
        Name
      >;
      listPublishedPosts: FunctionReference<
        "query",
        "internal",
        {
          creatorId?: string;
          limit?: number;
          tenantId: string;
          userId: string;
        },
        Array<any>,
        Name
      >;
      markAsRead: FunctionReference<
        "mutation",
        "internal",
        { broadcastId: string; userId: string },
        { success: boolean },
        Name
      >;
      publishPost: FunctionReference<
        "mutation",
        "internal",
        { id: string; recipientIds: Array<string> },
        { id: string; recipientCount: number },
        Name
      >;
      remove: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      send: FunctionReference<
        "mutation",
        "internal",
        {
          body: string;
          creatorId: string;
          messageType: string;
          metadata?: any;
          pickId?: string;
          recipientIds: Array<string>;
          tenantId: string;
          title: string;
        },
        { id: string; recipientCount: number },
        Name
      >;
      unpublishPost: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      unreadCount: FunctionReference<
        "query",
        "internal",
        { tenantId: string; userId: string },
        { count: number },
        Name
      >;
      updatePost: FunctionReference<
        "mutation",
        "internal",
        {
          accessLevel?: string;
          body?: string;
          contentFormat?: string;
          id: string;
          metadata?: any;
          title?: string;
        },
        { success: boolean },
        Name
      >;
    };
  };
