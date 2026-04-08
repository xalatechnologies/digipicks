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
      cleanupOld: FunctionReference<
        "mutation",
        "internal",
        { olderThanMs: number; tenantId: string },
        { purged: number },
        Name
      >;
      create: FunctionReference<
        "mutation",
        "internal",
        {
          action: string;
          changedFields?: Array<string>;
          details?: any;
          entityId: string;
          entityType: string;
          ipAddress?: string;
          metadata?: any;
          newState?: any;
          previousState?: any;
          reason?: string;
          sourceComponent?: string;
          tenantId: string;
          userEmail?: string;
          userId?: string;
          userName?: string;
        },
        { id: string },
        Name
      >;
      get: FunctionReference<"query", "internal", { id: string }, any, Name>;
      getSummary: FunctionReference<
        "query",
        "internal",
        { periodEnd?: number; periodStart?: number; tenantId: string },
        any,
        Name
      >;
      importRecord: FunctionReference<
        "mutation",
        "internal",
        {
          action: string;
          entityId: string;
          entityType: string;
          metadata?: any;
          newState?: any;
          previousState?: any;
          reason?: string;
          sourceComponent?: string;
          tenantId: string;
          timestamp: number;
          userId?: string;
        },
        { id: string },
        Name
      >;
      listByAction: FunctionReference<
        "query",
        "internal",
        { action: string; limit?: number; tenantId: string },
        Array<any>,
        Name
      >;
      listByEntity: FunctionReference<
        "query",
        "internal",
        { entityId: string; entityType: string; limit?: number },
        Array<any>,
        Name
      >;
      listByUser: FunctionReference<
        "query",
        "internal",
        { limit?: number; userId: string },
        Array<any>,
        Name
      >;
      listForTenant: FunctionReference<
        "query",
        "internal",
        { entityType?: string; limit?: number; tenantId: string },
        Array<any>,
        Name
      >;
      listForTenantPaginated: FunctionReference<
        "query",
        "internal",
        {
          cursor?: string;
          entityType?: string;
          pageSize?: number;
          tenantId: string;
        },
        { cursor: string | null; entries: Array<any>; hasMore: boolean },
        Name
      >;
    };
    lifecycle: {
      onDisable: FunctionReference<
        "mutation",
        "internal",
        { tenantId: string },
        { success: boolean },
        Name
      >;
      onEnable: FunctionReference<
        "mutation",
        "internal",
        { tenantId: string },
        { success: boolean },
        Name
      >;
      onInstall: FunctionReference<
        "mutation",
        "internal",
        { tenantId: string },
        { success: boolean },
        Name
      >;
      onUninstall: FunctionReference<
        "mutation",
        "internal",
        { tenantId: string },
        { success: boolean },
        Name
      >;
    };
  };
