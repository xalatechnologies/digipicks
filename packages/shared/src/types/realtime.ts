/**
 * Canonical Realtime Event Types
 *
 * Single source of truth for realtime event contracts across SDK, app-shell, and consumers.
 * Aligns with Convex outbox events (domain.entity.action) and client subscription categories.
 *
 * @see docs/guide/realtime.md
 * @see docs/REALTIME_LAYER_VERIFICATION_REPORT.md
 */

// =============================================================================
// Event Types (canonical)
// =============================================================================

/** Granular event types (align with outbox domain.entity.action) */
export type RealtimeEventTypeGranular =
  | 'booking.created'
  | 'booking.updated'
  | 'booking.cancelled'
  | 'booking.confirmed'
  | 'resource.updated'
  | 'resource.published'
  | 'resource.unpublished'
  | 'block.created'
  | 'block.deleted'
  | 'notification'
  | 'system'
  | 'listing.updated'
  | 'availability.changed'
  | 'favorite.count.changed';

/** Category-level types for subscription filtering (subscribe to all events of a category) */
export type RealtimeEventTypeCategory = 'booking' | 'listing' | 'audit' | 'message';

/** Full union — use granular for specific events, category for broad subscribe */
export type RealtimeEventType = RealtimeEventTypeGranular | RealtimeEventTypeCategory;

/** Legacy aliases (deprecated: use RealtimeEventType) — kept for backwards compat */
export type RealtimeEventTypeLegacy =
  | 'LISTING_UPDATED'
  | 'AVAILABILITY_CHANGED'
  | 'BOOKING_CREATED'
  | 'FAVORITE_COUNT_CHANGED';

// =============================================================================
// Event Payload
// =============================================================================

export interface RealtimeEvent {
  type: RealtimeEventType | RealtimeEventTypeLegacy | string;
  /** Primary payload; use data for legacy compat */
  payload?: unknown;
  /** Alias used by some consumers (event.data) */
  data?: unknown;
  timestamp?: number | string;
  /** Human-readable message */
  message?: string;
  /** Schema version for future evolution (optional) */
  version?: number;
  /** Entity IDs for filtering (e.g. listingId) */
  listingId?: string;
}

export type RealtimeEventHandler = (event: RealtimeEvent) => void;
