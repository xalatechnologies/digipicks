/**
 * DigilistSaaS SDK - Convex API Types
 *
 * Re-exports the generated Convex API for type-safe function references.
 * This allows SDK hooks to use proper Convex React hooks with typed functions.
 *
 * NOTE: This is a source-only package. The relative path resolves at each
 * app's compile time via Vite.
 */

import { api as generatedApi } from "../../../convex/_generated/api";
import type { GenericId } from "convex/values";

export const api = generatedApi;

// Re-export Id type using GenericId (accepts any table name string).
// Exported from main index for use in app code.
// The generated Id<T> constrains T to core TableNames, but component tables
// (resources, reviews, etc.) moved to isolated components and are no longer
// in the core schema. GenericId<T extends string> is structurally identical
// but without the constraint.
export type Id<T extends string> = GenericId<T>;

// Convenience aliases for common table IDs
export type TenantId = Id<"tenants">;
export type ResourceId = Id<"resources">;
export type UserId = Id<"users">;
export type OrganizationId = Id<"organizations">;
