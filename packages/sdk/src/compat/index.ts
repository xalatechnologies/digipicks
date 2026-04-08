/**
 * Compatibility shims for @digilist/client-sdk.
 *
 * These re-exports allow code that previously imported from the digdir SDK
 * to continue working after the migration to Convex. All functions are
 * either no-ops or return static values — the real work happens through
 * Convex queries, mutations, and the reactive subscription model.
 */

export * from "./client-factory";
export * from "./realtime";
