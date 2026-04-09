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
      approve: FunctionReference<
        "mutation",
        "internal",
        { id: string; reviewNote?: string; reviewedBy: string },
        { success: boolean },
        Name
      >;
      get: FunctionReference<"query", "internal", { id: string }, any, Name>;
      getByUser: FunctionReference<
        "query",
        "internal",
        { tenantId: string; userId: string },
        any,
        Name
      >;
      list: FunctionReference<
        "query",
        "internal",
        { limit?: number; status?: string; tenantId: string },
        Array<any>,
        Name
      >;
      reject: FunctionReference<
        "mutation",
        "internal",
        { id: string; reviewNote?: string; reviewedBy: string },
        { success: boolean },
        Name
      >;
      requestMoreInfo: FunctionReference<
        "mutation",
        "internal",
        { id: string; reviewNote: string; reviewedBy: string },
        { success: boolean },
        Name
      >;
      resubmit: FunctionReference<
        "mutation",
        "internal",
        {
          bio?: string;
          displayName?: string;
          id: string;
          metadata?: any;
          niche?: string;
          performanceProof?: string;
          socialLinks?: {
            discord?: string;
            instagram?: string;
            twitter?: string;
            website?: string;
            youtube?: string;
          };
          specialties?: Array<string>;
          trackRecordUrl?: string;
          userId: string;
        },
        { success: boolean },
        Name
      >;
      submit: FunctionReference<
        "mutation",
        "internal",
        {
          bio: string;
          displayName: string;
          metadata?: any;
          niche: string;
          performanceProof?: string;
          socialLinks?: {
            discord?: string;
            instagram?: string;
            twitter?: string;
            website?: string;
            youtube?: string;
          };
          specialties?: Array<string>;
          tenantId: string;
          trackRecordUrl?: string;
          userId: string;
        },
        { id: string },
        Name
      >;
    };
  };
