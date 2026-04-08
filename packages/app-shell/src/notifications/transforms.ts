/**
 * Notification transforms
 *
 * Maps SDK Notification → DS NotificationItemData.
 * Single source of truth used by both the NotificationCenterPanel (modal)
 * and any full-page notification feed.
 */

import type { NotificationItemData, NotificationType, NotificationPriority } from '@digilist-saas/ds';
import type { Notification } from '@digilist-saas/sdk';

function stringFromMetadata(metadata: Record<string, unknown> | undefined, key: string): string | undefined {
  const v = metadata?.[key];
  return typeof v === 'string' ? v : undefined;
}

/** Map SDK notification type → DS NotificationType (safe fallback) */
export function mapNotificationType(type: string): NotificationType {
  return (type as NotificationType) || 'info';
}

/** Map SDK priority → DS NotificationPriority (safe fallback) */
export function mapPriority(priority: string | undefined): NotificationPriority {
  const known: NotificationPriority[] = ['low', 'normal', 'high', 'urgent'];
  return known.includes(priority as NotificationPriority) ? (priority as NotificationPriority) : 'normal';
}

/** Simple relative time formatting (Norwegian) */
export function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 1) return 'Akkurat nå';
  if (minutes < 60) return `${minutes} min siden`;
  if (hours < 24) return `${hours} t siden`;
  if (days < 7) return `${days} d siden`;
  return new Date(dateStr).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
}

/** Transform a single SDK Notification → DS NotificationItemData */
export function transformNotificationToDS(n: Notification): NotificationItemData {
  return {
    id: n.id,
    type: mapNotificationType(n.type),
    title: n.title,
    message: n.body || '',
    priority: mapPriority(stringFromMetadata(n.metadata, 'priority')),
    createdAt: n.createdAt,
    readAt: n.readAt ?? null,
    metadata: n.metadata as Record<string, unknown>,
  };
}

/** Transform an array of SDK Notifications → DS NotificationItemData[] */
export function transformNotificationsToDS(notifications: Notification[]): NotificationItemData[] {
  return notifications.map(transformNotificationToDS);
}
