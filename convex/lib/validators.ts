/**
 * Branded String Types for Type-Safe IDs
 * 
 * Uses convex-helpers/validators brandedString for compile-time ID safety.
 * These types ensure you can't accidentally pass a BookingId where a ResourceId is expected.
 */

import { brandedString } from "convex-helpers/validators";
import { Infer } from "convex/values";

// =============================================================================
// BRANDED ID VALIDATORS
// =============================================================================

/** Tenant identifier validator */
export const tenantIdValidator = brandedString("tenantId");
export type TenantId = Infer<typeof tenantIdValidator>;

/** Resource identifier validator */
export const resourceIdValidator = brandedString("resourceId");
export type ResourceId = Infer<typeof resourceIdValidator>;

/** Booking identifier validator */
export const bookingIdValidator = brandedString("bookingId");
export type BookingId = Infer<typeof bookingIdValidator>;

/** User identifier validator */
export const userIdValidator = brandedString("userId");
export type UserId = Infer<typeof userIdValidator>;

/** Organization identifier validator */
export const organizationIdValidator = brandedString("organizationId");
export type OrganizationId = Infer<typeof organizationIdValidator>;

// =============================================================================
// COMMON VALIDATORS
// =============================================================================

import { nullable, literals } from "convex-helpers/validators";
import { v } from "convex/values";

/** Status field for resources */
export const resourceStatusValidator = literals("draft", "published", "archived", "maintenance");

/** Status field for bookings */
export const bookingStatusValidator = literals(
    "pending",
    "confirmed",
    "cancelled",
    "completed",
    "rejected",
    "no_show"
);

/** Nullable string (for optional text fields) */
export const nullableString = nullable(v.string());

/** Nullable number (for optional numeric fields) */
export const nullableNumber = nullable(v.number());
