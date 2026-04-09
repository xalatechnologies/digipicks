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
    addRecipients: FunctionReference<
      'mutation',
      'internal',
      {
        campaignId: string;
        recipients: Array<{ email: string; userId: string }>;
        tenantId: string;
      },
      { added: number },
      Name
    >;
    cancel: FunctionReference<'mutation', 'internal', { id: string }, { success: boolean }, Name>;
    create: FunctionReference<
      'mutation',
      'internal',
      {
        body: string;
        campaignType: string;
        creatorId: string;
        metadata?: any;
        name: string;
        preheader?: string;
        segment: {
          activeSinceDays?: number;
          inactiveSinceDays?: number;
          tags?: Array<string>;
          tierId?: string;
          type: string;
        };
        subject: string;
        templateCategory?: string;
        tenantId: string;
      },
      { id: string },
      Name
    >;
    get: FunctionReference<'query', 'internal', { id: string }, any, Name>;
    getAnalytics: FunctionReference<'query', 'internal', { campaignId: string }, any, Name>;
    isUnsubscribed: FunctionReference<'query', 'internal', { email: string; tenantId: string }, boolean, Name>;
    list: FunctionReference<
      'query',
      'internal',
      {
        campaignType?: string;
        limit?: number;
        status?: string;
        tenantId: string;
      },
      Array<any>,
      Name
    >;
    listRecipients: FunctionReference<
      'query',
      'internal',
      { campaignId: string; limit?: number; status?: string },
      Array<any>,
      Name
    >;
    listScheduledReady: FunctionReference<'query', 'internal', { now: number }, Array<any>, Name>;
    markSending: FunctionReference<'mutation', 'internal', { id: string }, { success: boolean }, Name>;
    markSent: FunctionReference<'mutation', 'internal', { id: string }, { success: boolean }, Name>;
    resubscribe: FunctionReference<
      'mutation',
      'internal',
      { email: string; tenantId: string },
      { success: boolean },
      Name
    >;
    schedule: FunctionReference<
      'mutation',
      'internal',
      { id: string; scheduledAt: number },
      { success: boolean },
      Name
    >;
    unsubscribe: FunctionReference<
      'mutation',
      'internal',
      { email: string; reason?: string; tenantId: string; userId: string },
      { success: boolean },
      Name
    >;
    update: FunctionReference<
      'mutation',
      'internal',
      {
        body?: string;
        campaignType?: string;
        id: string;
        metadata?: any;
        name?: string;
        preheader?: string;
        segment?: {
          activeSinceDays?: number;
          inactiveSinceDays?: number;
          tags?: Array<string>;
          tierId?: string;
          type: string;
        };
        subject?: string;
      },
      { success: boolean },
      Name
    >;
    updateRecipientStatus: FunctionReference<
      'mutation',
      'internal',
      {
        bounceReason?: string;
        id: string;
        resendId?: string;
        status: string;
      },
      { success: boolean },
      Name
    >;
  };
};
