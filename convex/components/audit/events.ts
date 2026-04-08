/**
 * Audit Component Events
 *
 * Declares the events this component emits and subscribes to.
 * Used by the event bus for routing.
 */

/** Events emitted by the audit component */
export const EMITTED_EVENTS = [
    "audit.entry.created",
] as const;

/** Events the audit component subscribes to */
export const SUBSCRIBED_EVENTS = [] as const;

/** Event payload types */
export interface AuditEntryCreatedPayload {
    auditLogId: string;
    tenantId: string;
    entityType: string;
    entityId: string;
    action: string;
    userId?: string;
}
