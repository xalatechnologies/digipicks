/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as calculations from "../calculations.js";
import type * as contract from "../contract.js";
import type * as discounts from "../discounts.js";
import type * as holidays from "../holidays.js";
import type * as import_ from "../import.js";
import type * as mutations from "../mutations.js";
import type * as queries from "../queries.js";
import type * as surcharges from "../surcharges.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import { anyApi, componentsGeneric } from "convex/server";

const fullApi: ApiFromModules<{
  calculations: typeof calculations;
  contract: typeof contract;
  discounts: typeof discounts;
  holidays: typeof holidays;
  import: typeof import_;
  mutations: typeof mutations;
  queries: typeof queries;
  surcharges: typeof surcharges;
}> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
> = anyApi as any;

export const components = componentsGeneric() as unknown as {};
