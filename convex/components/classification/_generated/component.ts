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
      createAttributeDefinition: FunctionReference<
        "mutation",
        "internal",
        {
          categoryId: string;
          isRequired?: boolean;
          key: string;
          metadata?: any;
          name: string;
          options?: Array<string>;
          sortOrder?: number;
          tenantId: string;
          type: string;
        },
        { id: string },
        Name
      >;
      createCategory: FunctionReference<
        "mutation",
        "internal",
        {
          color?: string;
          description?: string;
          icon?: string;
          isActive?: boolean;
          metadata?: any;
          name: string;
          parentId?: string;
          slug: string;
          sortOrder?: number;
          tenantId: string;
        },
        { id: string },
        Name
      >;
      createTag: FunctionReference<
        "mutation",
        "internal",
        {
          color?: string;
          isActive?: boolean;
          metadata?: any;
          name: string;
          slug: string;
          tenantId: string;
        },
        { id: string },
        Name
      >;
      deleteAttributeDefinition: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      deleteCategory: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      deleteTag: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      reorderCategories: FunctionReference<
        "mutation",
        "internal",
        { ids: Array<string> },
        { success: boolean },
        Name
      >;
      updateAttributeDefinition: FunctionReference<
        "mutation",
        "internal",
        {
          id: string;
          isRequired?: boolean;
          key?: string;
          metadata?: any;
          name?: string;
          options?: Array<string>;
          sortOrder?: number;
          type?: string;
        },
        { success: boolean },
        Name
      >;
      updateCategory: FunctionReference<
        "mutation",
        "internal",
        {
          color?: string;
          description?: string;
          icon?: string;
          id: string;
          isActive?: boolean;
          metadata?: any;
          name?: string;
          slug?: string;
          sortOrder?: number;
        },
        { success: boolean },
        Name
      >;
      updateTag: FunctionReference<
        "mutation",
        "internal",
        {
          color?: string;
          id: string;
          isActive?: boolean;
          metadata?: any;
          name?: string;
          slug?: string;
        },
        { success: boolean },
        Name
      >;
    };
    queries: {
      getAttributeDefinition: FunctionReference<
        "query",
        "internal",
        { key: string; tenantId: string },
        any,
        Name
      >;
      getCategory: FunctionReference<
        "query",
        "internal",
        { slug: string; tenantId: string },
        any,
        Name
      >;
      getCategoryById: FunctionReference<
        "query",
        "internal",
        { id: string },
        any,
        Name
      >;
      getCategoryTree: FunctionReference<
        "query",
        "internal",
        { tenantId: string },
        any,
        Name
      >;
      getTag: FunctionReference<
        "query",
        "internal",
        { slug: string; tenantId: string },
        any,
        Name
      >;
      listAttributeDefinitions: FunctionReference<
        "query",
        "internal",
        { categoryId?: string; tenantId: string },
        Array<any>,
        Name
      >;
      listCategories: FunctionReference<
        "query",
        "internal",
        { parentId?: string; tenantId: string },
        Array<any>,
        Name
      >;
      listTags: FunctionReference<
        "query",
        "internal",
        { tenantId: string },
        Array<any>,
        Name
      >;
    };
  };
