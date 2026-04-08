/**
 * Database Triggers
 * 
 * Register trigger functions to run whenever data changes.
 * Triggers run in the same transaction as the mutation, atomically.
 * 
 * NOTE: Triggers can only be registered on app-level tables.
 * Tables that moved to components (bookings, resources) handle
 * their own logic within their component functions.
 * 
 * @see https://stack.convex.dev/triggers
 */

import { DataModel } from "../_generated/dataModel";
import { mutation as rawMutation, internalMutation as rawInternalMutation } from "../_generated/server";
import { Triggers } from "convex-helpers/server/triggers";
import { customMutation } from "convex-helpers/server/customFunctions";

// =============================================================================
// TRIGGER REGISTRY
// =============================================================================

export const triggers = new Triggers<DataModel>();

// =============================================================================
// NOTE: Booking and resource triggers have been removed.
//
// The `bookings` and `resources` tables are now in isolated Convex components.
// Triggers can only register on app-level tables (defined in convex/schema.ts).
//
// The following triggers were removed:
// - Booking count trigger (bookings → resources metadata.bookingCount)
// - Booking audit trigger (bookings status change → outboxEvents)
// - Resource audit trigger (resources changes → outboxEvents)
// - Resource cascade delete trigger (resources delete → cancel bookings)
//
// These are now handled by:
// - Component-level logic in convex/components/bookings/mutations.ts
// - Component-level logic in convex/components/resources/mutations.ts
// - Facade-level cascade logic in convex/domain/resources.ts (archive)
// - Event bus emissions in facade mutations
// =============================================================================

// =============================================================================
// TRIGGER-WRAPPED MUTATION
// =============================================================================

/**
 * Use this mutation wrapper in domain modules to enable triggers.
 * Replaces the raw `mutation` import.
 * 
 * Usage:
 * ```ts
 * import { mutation } from "../lib/triggers";
 * export const create = mutation({ ... });
 * ```
 */
export const mutation = customMutation(rawMutation, {
    args: {},
    input: async (ctx, _args) => {
        return { ctx: triggers.wrapDB(ctx), args: {} };
    },
});

/**
 * Internal mutation with triggers enabled.
 */
export const internalMutation = customMutation(rawInternalMutation, {
    args: {},
    input: async (ctx, _args) => {
        return { ctx: triggers.wrapDB(ctx), args: {} };
    },
});
