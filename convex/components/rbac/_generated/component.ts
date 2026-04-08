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
    import: {
      importRole: FunctionReference<
        "mutation",
        "internal",
        {
          description?: string;
          isDefault: boolean;
          isSystem: boolean;
          name: string;
          permissions: Array<string>;
          tenantId: string;
        },
        { id: string },
        Name
      >;
      importUserRole: FunctionReference<
        "mutation",
        "internal",
        {
          assignedAt: number;
          roleId: string;
          tenantId: string;
          userId: string;
        },
        { id: string },
        Name
      >;
    };
    mutations: {
      assignRole: FunctionReference<
        "mutation",
        "internal",
        { roleId: string; tenantId: string; userId: string },
        { id: string },
        Name
      >;
      createRole: FunctionReference<
        "mutation",
        "internal",
        {
          description?: string;
          isDefault?: boolean;
          isSystem?: boolean;
          name: string;
          permissions: Array<string>;
          tenantId: string;
        },
        { id: string },
        Name
      >;
      deleteRole: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      revokeRole: FunctionReference<
        "mutation",
        "internal",
        { roleId: string; tenantId: string; userId: string },
        { success: boolean },
        Name
      >;
      updateRole: FunctionReference<
        "mutation",
        "internal",
        {
          description?: string;
          id: string;
          isDefault?: boolean;
          name?: string;
          permissions?: Array<string>;
        },
        { success: boolean },
        Name
      >;
    };
    queries: {
      checkPermission: FunctionReference<
        "query",
        "internal",
        { permission: string; tenantId: string; userId: string },
        { hasPermission: boolean },
        Name
      >;
      getRole: FunctionReference<
        "query",
        "internal",
        { id: string },
        any,
        Name
      >;
      getUserPermissions: FunctionReference<
        "query",
        "internal",
        { tenantId: string; userId: string },
        { permissions: Array<string> },
        Name
      >;
      listRoles: FunctionReference<
        "query",
        "internal",
        { limit?: number; tenantId: string },
        Array<any>,
        Name
      >;
      listUserRoles: FunctionReference<
        "query",
        "internal",
        { limit?: number; tenantId?: string; userId?: string },
        Array<any>,
        Name
      >;
    };
  };
