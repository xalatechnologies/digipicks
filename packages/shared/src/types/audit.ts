/**
 * Audit Types
 *
 * Audit event types and provider interface for listing/booking audit logging.
 */

// =============================================================================
// Audit Event Types
// =============================================================================

export type AuditEventType =
    | 'LISTING_VIEWED'
    | 'FAVORITE_ADDED'
    | 'FAVORITE_REMOVED'
    | 'LISTING_SHARED'
    | 'BOOKING_STARTED'
    | 'CONTACT_CLICKED';

export interface AuditEvent {
    type: AuditEventType;
    tenantId: string;
    listingId: string;
    userId?: string;
    correlationId: string;
    metadata?: Record<string, unknown>;
    timestamp: string;
}

// =============================================================================
// Audit Provider Interface
// =============================================================================

export interface AuditProvider {
    log(event: Omit<AuditEvent, 'timestamp' | 'correlationId'>): Promise<void>;
    generateCorrelationId(): string;
}
