/**
 * DigilistSaaS SDK - Type Bridge Utilities
 *
 * Typed helpers for converting between Convex branded IDs and plain strings.
 * These replace scattered `as any` / `as unknown as Id<T>` casts with a
 * single, auditable conversion point.
 *
 * Usage:
 *   import { asId, asString } from '../utils/type-bridge';
 *   const tenantId = asId<"tenants">(rawString);
 *   const plain = asString(typedId);
 */

import type { Id } from '../convex-api';

/**
 * Cast a plain string to a Convex branded `Id<T>`.
 *
 * This is the official SDK bridge for the Convex ID type system.
 * Convex IDs are string-branded types at the TypeScript level but
 * plain strings at runtime.
 */
export function asId<T extends string>(value: string): Id<T> {
    return value as unknown as Id<T>;
}

/**
 * Cast a Convex branded `Id<T>` to a plain string.
 *
 * Useful when passing IDs to component functions that accept `v.string()`.
 */
export function asString<T extends string>(value: Id<T>): string {
    return value as unknown as string;
}

/**
 * Safely cast a value that may be a Convex document field to a specific type.
 * Returns undefined if the value is null or undefined.
 */
export function asField<T>(value: unknown): T | undefined {
    if (value == null) return undefined;
    return value as T;
}
