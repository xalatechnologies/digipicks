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
    mutations: {
      completeSyncLog: FunctionReference<
        "mutation",
        "internal",
        {
          error?: string;
          id: string;
          metadata?: any;
          recordsFailed?: number;
          recordsProcessed?: number;
          status: string;
        },
        { success: boolean },
        Name
      >;
      configure: FunctionReference<
        "mutation",
        "internal",
        {
          apiKey?: string;
          config: any;
          environment?: string;
          integrationType: string;
          metadata?: any;
          name: string;
          secretKey?: string;
          tenantId: string;
          webhookSecret?: string;
        },
        { id: string },
        Name
      >;
      deleteWebhook: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      disableIntegration: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      enableIntegration: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      registerWebhook: FunctionReference<
        "mutation",
        "internal",
        {
          callbackUrl: string;
          events: Array<string>;
          integrationId: string;
          metadata?: any;
          secret?: string;
          tenantId: string;
        },
        { id: string },
        Name
      >;
      removeIntegration: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      startSync: FunctionReference<
        "mutation",
        "internal",
        { integrationId: string; syncType: string; tenantId: string },
        { id: string },
        Name
      >;
      testConnection: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { status: string; success: boolean },
        Name
      >;
      updateConfig: FunctionReference<
        "mutation",
        "internal",
        {
          apiKey?: string;
          config?: any;
          environment?: string;
          id: string;
          metadata?: any;
          name?: string;
          secretKey?: string;
          webhookSecret?: string;
        },
        { success: boolean },
        Name
      >;
      updateWebhook: FunctionReference<
        "mutation",
        "internal",
        {
          callbackUrl?: string;
          events?: Array<string>;
          id: string;
          isActive?: boolean;
          metadata?: any;
          secret?: string;
        },
        { success: boolean },
        Name
      >;
    };
    queries: {
      getById: FunctionReference<
        "query",
        "internal",
        { id: string },
        any,
        Name
      >;
      getConfig: FunctionReference<
        "query",
        "internal",
        { integrationType: string; tenantId: string },
        any,
        Name
      >;
      getConfigInternal: FunctionReference<
        "query",
        "internal",
        { integrationType: string; tenantId: string },
        any,
        Name
      >;
      getSyncLog: FunctionReference<
        "query",
        "internal",
        { id: string },
        any,
        Name
      >;
      listConfigs: FunctionReference<
        "query",
        "internal",
        { limit?: number; tenantId: string },
        Array<any>,
        Name
      >;
      listSyncLogs: FunctionReference<
        "query",
        "internal",
        { integrationId?: string; limit?: number; tenantId: string },
        Array<any>,
        Name
      >;
      listWebhooks: FunctionReference<
        "query",
        "internal",
        { integrationId?: string; limit?: number; tenantId: string },
        Array<any>,
        Name
      >;
    };
  };
