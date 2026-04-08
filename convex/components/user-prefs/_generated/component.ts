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
      addFavorite: FunctionReference<
        "mutation",
        "internal",
        {
          metadata?: any;
          notes?: string;
          resourceId: string;
          tags?: Array<string>;
          tenantId: string;
          userId: string;
        },
        { id: string },
        Name
      >;
      createFilter: FunctionReference<
        "mutation",
        "internal",
        {
          filters: any;
          isDefault?: boolean;
          name: string;
          tenantId: string;
          type: string;
          userId: string;
        },
        { id: string },
        Name
      >;
      importFavorite: FunctionReference<
        "mutation",
        "internal",
        {
          metadata?: any;
          notes?: string;
          resourceId: string;
          tags: Array<string>;
          tenantId: string;
          userId: string;
        },
        { id: string },
        Name
      >;
      importSavedFilter: FunctionReference<
        "mutation",
        "internal",
        {
          filters?: any;
          isDefault?: boolean;
          name: string;
          tenantId: string;
          type: string;
          userId: string;
        },
        { id: string },
        Name
      >;
      isFavorite: FunctionReference<
        "query",
        "internal",
        { resourceId: string; userId: string },
        { favorite: any; isFavorite: boolean },
        Name
      >;
      listFavorites: FunctionReference<
        "query",
        "internal",
        { tags?: Array<string>; userId: string },
        Array<any>,
        Name
      >;
      listFilters: FunctionReference<
        "query",
        "internal",
        { type?: string; userId: string },
        Array<any>,
        Name
      >;
      removeFavorite: FunctionReference<
        "mutation",
        "internal",
        { resourceId: string; userId: string },
        { success: boolean },
        Name
      >;
      removeFilter: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      toggleFavorite: FunctionReference<
        "mutation",
        "internal",
        { resourceId: string; tenantId: string; userId: string },
        { isFavorite: boolean },
        Name
      >;
      updateFavorite: FunctionReference<
        "mutation",
        "internal",
        { id: string; metadata?: any; notes?: string; tags?: Array<string> },
        { success: boolean },
        Name
      >;
      updateFilter: FunctionReference<
        "mutation",
        "internal",
        { filters?: any; id: string; isDefault?: boolean; name?: string },
        { success: boolean },
        Name
      >;
    };
  };
