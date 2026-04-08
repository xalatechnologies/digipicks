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
      publishPolicy: FunctionReference<
        "mutation",
        "internal",
        {
          content: string;
          metadata?: any;
          policyType: string;
          publishedBy: string;
          tenantId: string;
          title: string;
          version: string;
        },
        { id: string },
        Name
      >;
      rollbackPolicy: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      submitDSAR: FunctionReference<
        "mutation",
        "internal",
        {
          details?: string;
          metadata?: any;
          requestType: string;
          tenantId: string;
          userId: string;
        },
        { id: string },
        Name
      >;
      updateConsent: FunctionReference<
        "mutation",
        "internal",
        {
          category: string;
          ipAddress?: string;
          isConsented: boolean;
          metadata?: any;
          tenantId: string;
          userAgent?: string;
          userId: string;
          version: string;
        },
        { id: string },
        Name
      >;
      updateDSARStatus: FunctionReference<
        "mutation",
        "internal",
        { id: string; processedBy: string; responseData?: any; status: string },
        { success: boolean },
        Name
      >;
    };
    queries: {
      getConsent: FunctionReference<
        "query",
        "internal",
        { category: string; limit?: number; userId: string },
        any,
        Name
      >;
      getConsentSummary: FunctionReference<
        "query",
        "internal",
        { userId: string },
        {
          analytics: boolean;
          marketing: boolean;
          necessary: boolean;
          thirdParty: boolean;
        },
        Name
      >;
      getDSAR: FunctionReference<
        "query",
        "internal",
        { id: string },
        any,
        Name
      >;
      getPolicy: FunctionReference<
        "query",
        "internal",
        { policyType: string; tenantId: string },
        any,
        Name
      >;
      getPolicyHistory: FunctionReference<
        "query",
        "internal",
        { limit?: number; policyType: string; tenantId: string },
        Array<any>,
        Name
      >;
      listConsent: FunctionReference<
        "query",
        "internal",
        { limit?: number; userId: string },
        Array<any>,
        Name
      >;
      listDSARRequests: FunctionReference<
        "query",
        "internal",
        { limit?: number; status?: string; tenantId: string; userId?: string },
        Array<any>,
        Name
      >;
      listPolicies: FunctionReference<
        "query",
        "internal",
        { limit?: number; tenantId: string },
        Array<any>,
        Name
      >;
    };
  };
