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
      createFlag: FunctionReference<
        "mutation",
        "internal",
        {
          defaultValue: any;
          description?: string;
          key: string;
          metadata?: any;
          name: string;
          tenantId: string;
          type: string;
        },
        { id: string },
        Name
      >;
      createFlagRule: FunctionReference<
        "mutation",
        "internal",
        {
          flagId: string;
          priority: number;
          targetId: string;
          targetType: string;
          tenantId: string;
          value: any;
        },
        { id: string },
        Name
      >;
      deleteFlag: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      deleteFlagRule: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      removeBrandAsset: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      removeThemeOverride: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      setThemeOverride: FunctionReference<
        "mutation",
        "internal",
        {
          componentKey: string;
          property: string;
          tenantId: string;
          value: string;
        },
        { id: string },
        Name
      >;
      updateBranding: FunctionReference<
        "mutation",
        "internal",
        {
          accentColor?: string;
          borderRadius?: string;
          customCSS?: string;
          darkMode?: boolean;
          fontFamily?: string;
          metadata?: any;
          primaryColor?: string;
          secondaryColor?: string;
          tenantId: string;
        },
        { id: string },
        Name
      >;
      updateFlag: FunctionReference<
        "mutation",
        "internal",
        {
          defaultValue?: any;
          description?: string;
          id: string;
          isActive?: boolean;
          metadata?: any;
          name?: string;
        },
        { success: boolean },
        Name
      >;
      uploadBrandAsset: FunctionReference<
        "mutation",
        "internal",
        {
          alt?: string;
          assetType: string;
          metadata?: any;
          storageId?: string;
          tenantId: string;
          url: string;
        },
        { id: string },
        Name
      >;
    };
    queries: {
      evaluateAllFlags: FunctionReference<
        "query",
        "internal",
        { targetId?: string; targetType?: string; tenantId: string },
        any,
        Name
      >;
      evaluateFlag: FunctionReference<
        "query",
        "internal",
        {
          key: string;
          targetId?: string;
          targetType?: string;
          tenantId: string;
        },
        any,
        Name
      >;
      getBranding: FunctionReference<
        "query",
        "internal",
        { tenantId: string },
        any,
        Name
      >;
      getFlag: FunctionReference<
        "query",
        "internal",
        { key: string; tenantId: string },
        any,
        Name
      >;
      getThemeCSS: FunctionReference<
        "query",
        "internal",
        { tenantId: string },
        string,
        Name
      >;
      listBrandAssets: FunctionReference<
        "query",
        "internal",
        { limit?: number; tenantId: string },
        Array<any>,
        Name
      >;
      listFlags: FunctionReference<
        "query",
        "internal",
        { limit?: number; tenantId: string },
        Array<any>,
        Name
      >;
      listThemeOverrides: FunctionReference<
        "query",
        "internal",
        { limit?: number; tenantId: string },
        Array<any>,
        Name
      >;
    };
  };
