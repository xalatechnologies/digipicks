/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from 'convex/server';

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
export type ComponentApi<Name extends string | undefined = string | undefined> = {
  functions: {
    get: FunctionReference<'query', 'internal', { id: string }, any, Name>;
    listByCreator: FunctionReference<
      'query',
      'internal',
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
      'query',
      'internal',
      {
        limit?: number;
        tenantId: string;
        unreadOnly?: boolean;
        userId: string;
      },
      Array<any>,
      Name
    >;
    markAsRead: FunctionReference<
      'mutation',
      'internal',
      { broadcastId: string; userId: string },
      { success: boolean },
      Name
    >;
    remove: FunctionReference<'mutation', 'internal', { id: string }, { success: boolean }, Name>;
    send: FunctionReference<
      'mutation',
      'internal',
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
    unreadCount: FunctionReference<'query', 'internal', { tenantId: string; userId: string }, { count: number }, Name>;
  };
};
