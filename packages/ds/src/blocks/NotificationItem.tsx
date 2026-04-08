/**
 * NotificationItem Component
 * Reusable component for displaying individual notifications in notification center
 */

import * as React from 'react';
import { Paragraph } from '@digdir/designsystemet-react';
import { Stack } from '../primitives';
import { cn } from '../utils';
import { StatusTag } from './StatusBadges';
import styles from './NotificationItem.module.css';

// =============================================================================
// Types
// =============================================================================

export type NotificationType =
  | 'booking_confirmed'
  | 'booking_reminder_24h'
  | 'booking_reminder_1h'
  | 'booking_cancelled'
  | 'booking_modified'
  | 'booking_upcoming'
  | 'booking_completed';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationItemData {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  createdAt: string;
  readAt?: string | null;
  relatedBookingId?: string;
  relatedListingId?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationItemProps {
  /** Notification data */
  notification: NotificationItemData;
  /** Click handler for the notification */
  onClick?: (id: string) => void;
  /** Click handler for mark as read */
  onMarkAsRead?: (id: string) => void;
  /** Click handler for delete */
  onDelete?: (id: string) => void;
  /** Whether to show action buttons */
  showActions?: boolean;
  /** Custom time formatting function */
  formatTimeAgo?: (date: string) => string;
  /** Icon mapping per notification type (consumer provides) */
  typeIcons?: Partial<Record<NotificationType, React.ReactNode>>;
  /** Default icon for unknown types */
  defaultIcon?: React.ReactNode;
  /** Mark as read icon (consumer provides) */
  markAsReadIcon?: React.ReactNode;
  /** Delete icon (consumer provides) */
  deleteIcon?: React.ReactNode;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// Notification Type Configuration
// =============================================================================

interface NotificationTypeConfig {
  color: string;
  backgroundColor: string;
  label: string;
}

const notificationTypeConfig: Record<NotificationType, NotificationTypeConfig> = {
  booking_confirmed: {
    color: 'var(--ds-color-success-text-default)',
    backgroundColor: 'var(--ds-color-success-surface-default)',
    label: 'Bekreftet',
  },
  booking_reminder_24h: {
    color: 'var(--ds-color-warning-text-default)',
    backgroundColor: 'var(--ds-color-warning-surface-default)',
    label: 'Påminnelse',
  },
  booking_reminder_1h: {
    color: 'var(--ds-color-warning-text-default)',
    backgroundColor: 'var(--ds-color-warning-surface-default)',
    label: 'Påminnelse',
  },
  booking_cancelled: {
    color: 'var(--ds-color-danger-text-default)',
    backgroundColor: 'var(--ds-color-danger-surface-default)',
    label: 'Kansellert',
  },
  booking_modified: {
    color: 'var(--ds-color-info-text-default)',
    backgroundColor: 'var(--ds-color-info-surface-default)',
    label: 'Endret',
  },
  booking_upcoming: {
    color: 'var(--ds-color-accent-text-default)',
    backgroundColor: 'var(--ds-color-accent-surface-default)',
    label: 'Kommende',
  },
  booking_completed: {
    color: 'var(--ds-color-neutral-text-subtle)',
    backgroundColor: 'var(--ds-color-neutral-surface-default)',
    label: 'Fullført',
  },
};

/**
 * Default configuration for unknown notification types
 */
const defaultNotificationConfig: NotificationTypeConfig = {
  color: 'var(--ds-color-neutral-text-default)',
  backgroundColor: 'var(--ds-color-neutral-surface-default)',
  label: 'Varsel',
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Default time formatting function
 */
function defaultFormatTimeAgo(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return 'Akkurat nå';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min siden`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} timer siden`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} dager siden`;

  return then.toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'short',
    year: now.getFullYear() !== then.getFullYear() ? 'numeric' : undefined
  });
}

// =============================================================================
// NotificationItem Component
// =============================================================================

/**
 * Displays a single notification item with icon, content, and actions
 */
export function NotificationItem({
  notification,
  onClick,
  onMarkAsRead,
  onDelete,
  showActions = true,
  formatTimeAgo = defaultFormatTimeAgo,
  typeIcons,
  defaultIcon,
  markAsReadIcon,
  deleteIcon,
  className = '',
}: NotificationItemProps): React.ReactElement {
  const isUnread = !notification.readAt;
  const config = notificationTypeConfig[notification.type] || defaultNotificationConfig;
  const typeIcon = typeIcons?.[notification.type] ?? defaultIcon;

  const handleClick = () => {
    onClick?.(notification.id);
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkAsRead?.(notification.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(notification.id);
  };

  return (
    <div
      className={cn(
        isUnread ? styles.itemUnread : styles.item,
        onClick && styles.itemClickable,
        className,
      )}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Unread indicator dot */}
      {isUnread && (
        <div className={styles.unreadDot} aria-label="Ulest varsel" />
      )}

      {/* Icon */}
      {typeIcon && (
        <div
          className={isUnread ? styles.iconWrapUnread : styles.iconWrap}
          style={{ backgroundColor: config.backgroundColor, color: config.color }}
        >
          {typeIcon}
        </div>
      )}

      {/* Content */}
      <Stack spacing="0" className={styles.content}>
        {/* Header with type tag and time */}
        <div className={styles.header}>
          <StatusTag size="sm" color="neutral">
            {config.label}
          </StatusTag>
          <span className={styles.timeText}>
            {formatTimeAgo(notification.createdAt)}
          </span>
          {notification.priority === 'urgent' && (
            <StatusTag size="sm" color="danger">
              Viktig
            </StatusTag>
          )}
          {notification.priority === 'high' && (
            <StatusTag size="sm" color="warning">
              Høy
            </StatusTag>
          )}
        </div>

        {/* Title */}
        <div className={isUnread ? styles.titleUnread : styles.titleRead}>
          {notification.title}
        </div>

        {/* Message */}
        <Paragraph data-size="sm" className={styles.message}>
          {notification.message}
        </Paragraph>
      </Stack>

      {/* Actions */}
      {showActions && (
        <Stack spacing="var(--ds-size-1)" className={styles.actions}>
          {isUnread && onMarkAsRead && markAsReadIcon && (
            <button
              type="button"
              onClick={handleMarkAsRead}
              className={styles.actionButton}
              aria-label="Marker som lest"
            >
              {markAsReadIcon}
            </button>
          )}
          {onDelete && deleteIcon && (
            <button
              type="button"
              onClick={handleDelete}
              className={styles.deleteButton}
              aria-label="Slett varsel"
            >
              {deleteIcon}
            </button>
          )}
        </Stack>
      )}
    </div>
  );
}
