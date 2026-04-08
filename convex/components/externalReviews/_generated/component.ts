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
      batchImport: FunctionReference<
        "mutation",
        "internal",
        {
          reviews: Array<{
            authorName: string;
            authorUrl?: string;
            externalCreatedAt: number;
            externalId: string;
            externalUrl?: string;
            metadata?: any;
            platform: string;
            rating: number;
            resourceId: string;
            text?: string;
            title?: string;
          }>;
          tenantId: string;
        },
        { imported: number; updated: number },
        Name
      >;
      batchStats: FunctionReference<
        "query",
        "internal",
        { resourceIds: Array<string> },
        any,
        Name
      >;
      getConfig: FunctionReference<
        "query",
        "internal",
        { platform: string; tenantId: string },
        any,
        Name
      >;
      getConfigRaw: FunctionReference<
        "query",
        "internal",
        { platform: string; tenantId: string },
        any,
        Name
      >;
      importReview: FunctionReference<
        "mutation",
        "internal",
        {
          authorName: string;
          authorUrl?: string;
          externalCreatedAt: number;
          externalId: string;
          externalUrl?: string;
          metadata?: any;
          platform: string;
          rating: number;
          resourceId: string;
          tenantId: string;
          text?: string;
          title?: string;
        },
        { id: string; isNew: boolean },
        Name
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          limit?: number;
          platform?: string;
          resourceId?: string;
          tenantId: string;
        },
        Array<any>,
        Name
      >;
      listEnabledConfigs: FunctionReference<
        "query",
        "internal",
        {},
        Array<any>,
        Name
      >;
      listForResource: FunctionReference<
        "query",
        "internal",
        { platform?: string; resourceId: string },
        Array<any>,
        Name
      >;
      stats: FunctionReference<
        "query",
        "internal",
        { resourceId: string },
        any,
        Name
      >;
      suppress: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      unsuppress: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      updateSyncStatus: FunctionReference<
        "mutation",
        "internal",
        { error?: string; platform: string; status: string; tenantId: string },
        { success: boolean },
        Name
      >;
      upsertConfig: FunctionReference<
        "mutation",
        "internal",
        {
          apiKey?: string;
          displayOnListing: boolean;
          isEnabled: boolean;
          locationId?: string;
          placeId?: string;
          platform: string;
          tenantId: string;
        },
        { id: string },
        Name
      >;
    };
  };
