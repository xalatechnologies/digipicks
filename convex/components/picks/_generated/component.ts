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
      create: FunctionReference<
        "mutation",
        "internal",
        {
          analysis?: string;
          confidence: string;
          creatorId: string;
          event: string;
          eventDate?: number;
          league?: string;
          metadata?: any;
          oddsAmerican: string;
          oddsDecimal: number;
          pickType: string;
          selection: string;
          sport: string;
          status?: string;
          tenantId: string;
          units: number;
        },
        { id: string },
        Name
      >;
      creatorStats: FunctionReference<
        "query",
        "internal",
        { creatorId: string; tenantId: string },
        {
          losses: number;
          netUnits: number;
          pending: number;
          pushes: number;
          roi: number;
          totalPicks: number;
          voids: number;
          winRate: number;
          wins: number;
        },
        Name
      >;
      get: FunctionReference<"query", "internal", { id: string }, any, Name>;
      grade: FunctionReference<
        "mutation",
        "internal",
        { gradedBy: string; id: string; result: "lost" | "push" | "void" | "won" },
        { success: boolean },
        Name
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          creatorId?: string;
          limit?: number;
          result?: string;
          sport?: string;
          status?: string;
          tenantId: string;
        },
        Array<any>,
        Name
      >;
      remove: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      update: FunctionReference<
        "mutation",
        "internal",
        {
          analysis?: string;
          confidence?: string;
          event?: string;
          eventDate?: number;
          id: string;
          league?: string;
          metadata?: any;
          oddsAmerican?: string;
          oddsDecimal?: number;
          pickType?: string;
          selection?: string;
          sport?: string;
          status?: string;
          units?: number;
        },
        { success: boolean },
        Name
      >;
    };
  };
