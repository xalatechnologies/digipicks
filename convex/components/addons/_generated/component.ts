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
      importAddon: FunctionReference<
        "mutation",
        "internal",
        {
          category?: string;
          currency: string;
          description?: string;
          displayOrder: number;
          icon?: string;
          images: Array<any>;
          isActive: boolean;
          leadTimeHours?: number;
          maxQuantity?: number;
          metadata?: any;
          name: string;
          price: number;
          priceType: string;
          requiresApproval: boolean;
          slug: string;
          tenantId: string;
        },
        { id: string },
        Name
      >;
      importBookingAddon: FunctionReference<
        "mutation",
        "internal",
        {
          addonId: string;
          bookingId: string;
          currency: string;
          metadata?: any;
          notes?: string;
          quantity: number;
          status: string;
          tenantId: string;
          totalPrice: number;
          unitPrice: number;
        },
        { id: string },
        Name
      >;
      importResourceAddon: FunctionReference<
        "mutation",
        "internal",
        {
          addonId: string;
          customPrice?: number;
          displayOrder: number;
          isActive: boolean;
          isRecommended: boolean;
          isRequired: boolean;
          metadata?: any;
          resourceId: string;
          tenantId: string;
        },
        { id: string },
        Name
      >;
    };
    mutations: {
      addToBooking: FunctionReference<
        "mutation",
        "internal",
        {
          addonId: string;
          bookingId: string;
          metadata?: any;
          notes?: string;
          quantity: number;
          tenantId: string;
        },
        { id: string },
        Name
      >;
      addToResource: FunctionReference<
        "mutation",
        "internal",
        {
          addonId: string;
          customPrice?: number;
          displayOrder?: number;
          isRecommended?: boolean;
          isRequired?: boolean;
          metadata?: any;
          resourceId: string;
          tenantId: string;
        },
        { id: string },
        Name
      >;
      approve: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      create: FunctionReference<
        "mutation",
        "internal",
        {
          category?: string;
          currency: string;
          description?: string;
          displayOrder?: number;
          icon?: string;
          images?: Array<any>;
          leadTimeHours?: number;
          maxQuantity?: number;
          metadata?: any;
          name: string;
          price: number;
          priceType: string;
          requiresApproval?: boolean;
          slug: string;
          tenantId: string;
        },
        { id: string },
        Name
      >;
      reject: FunctionReference<
        "mutation",
        "internal",
        { id: string; reason?: string },
        { success: boolean },
        Name
      >;
      remove: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      removeFromBooking: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      removeFromResource: FunctionReference<
        "mutation",
        "internal",
        { addonId: string; resourceId: string },
        { success: boolean },
        Name
      >;
      update: FunctionReference<
        "mutation",
        "internal",
        {
          category?: string;
          currency?: string;
          description?: string;
          displayOrder?: number;
          icon?: string;
          id: string;
          images?: Array<any>;
          isActive?: boolean;
          leadTimeHours?: number;
          maxQuantity?: number;
          metadata?: any;
          name?: string;
          price?: number;
          priceType?: string;
          requiresApproval?: boolean;
        },
        { success: boolean },
        Name
      >;
      updateBookingAddon: FunctionReference<
        "mutation",
        "internal",
        { id: string; metadata?: any; notes?: string; quantity?: number },
        { success: boolean },
        Name
      >;
    };
    queries: {
      get: FunctionReference<"query", "internal", { id: string }, any, Name>;
      list: FunctionReference<
        "query",
        "internal",
        {
          category?: string;
          isActive?: boolean;
          limit?: number;
          tenantId: string;
        },
        Array<any>,
        Name
      >;
      listForBooking: FunctionReference<
        "query",
        "internal",
        { bookingId: string; limit?: number },
        Array<any>,
        Name
      >;
      listForResource: FunctionReference<
        "query",
        "internal",
        { limit?: number; resourceId: string },
        Array<any>,
        Name
      >;
    };
  };
