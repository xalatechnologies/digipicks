/**
 * Audit utilities for listing-level events.
 * Uses auditService (stub or wired implementation).
 */

import { auditService } from './compat/client-factory';

export type ListingAuditEventType =
  | 'LISTING_SHARED'
  | 'LISTING_VIEWED'
  | 'FAVORITE_ADDED'
  | 'FAVORITE_REMOVED';

/**
 * Log a listing-related audit event.
 * Uses auditService.create; when wired to Convex, events will be persisted.
 */
export async function logListingAuditEvent(
  type: ListingAuditEventType,
  _tenantId: string,
  listingId: string,
  userId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await auditService.create(type, {
      resource: 'listing',
      resourceId: listingId,
      severity: 'info',
      userId,
      ...metadata,
    });
  } catch {
    // Silently fail audit logging to not disrupt user experience
  }
}
