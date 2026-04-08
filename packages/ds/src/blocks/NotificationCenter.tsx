/**
 * NotificationCenter Component
 *
 * Slide-in drawer from the right for notification history.
 * Shows notifications with filter tabs, mark-as-read, and delete actions.
 */

import * as React from 'react';
import { createPortal } from 'react-dom';
import {
  Heading,
  Paragraph,
  Button,
  Spinner,
} from '@digdir/designsystemet-react';
import { Stack } from '../primitives';
import { cn } from '../utils';
import { CloseIcon } from '../primitives/icons';
import { NotificationItem, type NotificationItemData } from './NotificationItem';
import styles from './NotificationCenter.module.css';

// =============================================================================
// Types
// =============================================================================

export type NotificationFilter = 'all' | 'unread' | 'read';

export interface NotificationCenterProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Callback when drawer should close */
  onClose: () => void;
  /** List of notifications to display */
  notifications: NotificationItemData[];
  /** Whether notifications are loading */
  loading?: boolean;
  /** Current filter */
  filter?: NotificationFilter;
  /** Callback when filter changes */
  onFilterChange?: (filter: NotificationFilter) => void;
  /** Callback when a notification is clicked */
  onNotificationClick?: (id: string) => void;
  /** Callback when mark as read is clicked */
  onMarkAsRead?: (id: string) => void;
  /** Callback when delete is clicked */
  onDelete?: (id: string) => void;
  /** Callback when mark all as read is clicked */
  onMarkAllAsRead?: () => void;
  /** Mark all as read icon (consumer provides) */
  markAllAsReadIcon?: React.ReactNode;
  /** Empty state icon (consumer provides) */
  emptyIcon?: React.ReactNode;
  /** Custom time formatting function */
  formatTimeAgo?: (date: string) => string;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// Filter Tabs Component
// =============================================================================

interface FilterTabsProps {
  activeFilter: NotificationFilter;
  onFilterChange: (filter: NotificationFilter) => void;
  counts: {
    all: number;
    unread: number;
    read: number;
  };
}

function FilterTabs({ activeFilter, onFilterChange, counts }: FilterTabsProps) {
  const filters: Array<{ value: NotificationFilter; label: string; count: number }> = [
    { value: 'all', label: 'Alle', count: counts.all },
    { value: 'unread', label: 'Uleste', count: counts.unread },
    { value: 'read', label: 'Leste', count: counts.read },
  ];

  return (
    <div className={styles.filterTabs}>
      {filters.map((filter) => {
        const isActive = activeFilter === filter.value;
        return (
          <button
            key={filter.value}
            type="button"
            onClick={() => onFilterChange(filter.value)}
            className={isActive ? styles.filterTabActive : styles.filterTab}
            aria-current={isActive ? 'page' : undefined}
          >
            {filter.label}
            {filter.count > 0 && (
              <span className={isActive ? styles.filterCountActive : styles.filterCount}>
                {filter.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// Empty State Component
// =============================================================================

interface EmptyStateProps {
  filter: NotificationFilter;
  icon?: React.ReactNode;
}

function EmptyState({ filter, icon }: EmptyStateProps) {
  const messages = {
    all: {
      title: 'Ingen varsler',
      description: 'Du har ingen varsler ennå. Når du får nye varsler, vil de vises her.',
    },
    unread: {
      title: 'Ingen uleste varsler',
      description: 'Du har lest alle varslene dine. Godt jobbet!',
    },
    read: {
      title: 'Ingen leste varsler',
      description: 'Du har ingen leste varsler ennå.',
    },
  };

  const message = messages[filter];

  return (
    <Stack align="center" justify="center" spacing="var(--ds-size-4)" className={styles.emptyState}>
      {icon && (
        <div className={styles.emptyStateIcon}>
          {icon}
        </div>
      )}
      <Heading data-size="xs" className={styles.emptyStateTitle}>
        {message.title}
      </Heading>
      <Paragraph data-size="sm" className={styles.emptyStateDescription}>
        {message.description}
      </Paragraph>
    </Stack>
  );
}

// =============================================================================
// NotificationCenter Component
// =============================================================================

export function NotificationCenter({
  open,
  onClose,
  notifications,
  loading = false,
  filter = 'all',
  onFilterChange,
  onNotificationClick,
  onMarkAsRead,
  onDelete,
  onMarkAllAsRead,
  markAllAsReadIcon,
  emptyIcon,
  formatTimeAgo,
  className = '',
}: NotificationCenterProps): React.ReactElement | null {
  // Close on Escape key
  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Lock body scroll when open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Filter notifications based on active filter
  const filteredNotifications = React.useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((n) => !n.readAt);
    }
    if (filter === 'read') {
      return notifications.filter((n) => n.readAt);
    }
    return notifications;
  }, [notifications, filter]);

  // Calculate counts for filter tabs
  const counts = React.useMemo(() => {
    return {
      all: notifications.length,
      unread: notifications.filter((n) => !n.readAt).length,
      read: notifications.filter((n) => n.readAt).length,
    };
  }, [notifications]);

  const hasUnreadNotifications = counts.unread > 0;

  if (!open) return null;

  const drawer = (
    <>
      {/* Backdrop */}
      <div
        className={styles.backdrop}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Varsler"
        className={cn(styles.drawer, className)}
      >
        {/* ─── Header ─── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Heading data-size="xs" className={styles.headerTitle}>
              Varsler
            </Heading>
            {hasUnreadNotifications && (
              <span className={styles.unreadBadge}>
                {counts.unread}
              </span>
            )}
          </div>
          <div className={styles.headerActions}>
            {hasUnreadNotifications && onMarkAllAsRead && (
              <Button
                data-size="sm"
                variant="tertiary"
                onClick={onMarkAllAsRead}
              >
                {markAllAsReadIcon}
                Merk alle som lest
              </Button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Lukk varsler"
              className={styles.closeButton}
            >
              <CloseIcon size={20} />
            </button>
          </div>
        </div>

        {/* ─── Filter Tabs ─── */}
        {onFilterChange && (
          <FilterTabs activeFilter={filter} onFilterChange={onFilterChange} counts={counts} />
        )}

        {/* ─── Content ─── */}
        <div className={styles.content}>
          {loading ? (
            <div className={styles.loadingWrap}>
              <Spinner aria-label="Laster varsler..." />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <EmptyState filter={filter} icon={emptyIcon} />
          ) : (
            <div>
              {filteredNotifications.map((notification) => {
                const itemProps: {
                  notification: NotificationItemData;
                  showActions: boolean;
                  onClick?: (id: string) => void;
                  onMarkAsRead?: (id: string) => void;
                  onDelete?: (id: string) => void;
                  formatTimeAgo?: (date: string) => string;
                } = {
                  notification,
                  showActions: true,
                };

                if (onNotificationClick) itemProps.onClick = onNotificationClick;
                if (onMarkAsRead) itemProps.onMarkAsRead = onMarkAsRead;
                if (onDelete) itemProps.onDelete = onDelete;
                if (formatTimeAgo) itemProps.formatTimeAgo = formatTimeAgo;

                return <NotificationItem key={notification.id} {...itemProps} />;
              })}
            </div>
          )}
        </div>
      </aside>
    </>
  );

  return createPortal(drawer, document.body);
}
