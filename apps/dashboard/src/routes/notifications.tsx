/**
 * NotificationsPage (Backoffice)
 *
 * Admin notification feed — flat chronological list using DS NotificationItem.
 * Filter: All / Unread tabs. Mark all read, delete actions.
 */

import { useMemo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Spinner,
  Stack,
  EmptyState,
  ErrorState,
  InboxIcon,
  BellIcon,
  CalendarIcon,
  CheckCircleIcon,
  TrashIcon,
  NotificationItem,
  DashboardPageHeader,
  PageContentLayout,
  useDialog,
} from '@digilist-saas/ds';
import type { NotificationItemData } from '@digilist-saas/ds';
import {
  useMyNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from '@digilist-saas/sdk';
import type { Id } from '@digilist-saas/sdk';
import { useT } from '@digilist-saas/i18n';
import { useAuthBridge, transformNotificationsToDS, formatTimeAgo } from '@digilist-saas/app-shell';
import styles from './notifications.module.css';

type FilterTab = 'all' | 'unread';

export function NotificationsPage() {
  const t = useT();
  const navigate = useNavigate();
  const { user } = useAuthBridge();
  const { confirm } = useDialog();
  const userId = user?.id as Id<"users"> | undefined;

  const [filter, setFilter] = useState<FilterTab>('all');

  // SDK hooks
  const { notifications, isLoading, error } = useMyNotifications(userId);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  // Transform to DS format
  const allItems = useMemo(
    () => transformNotificationsToDS(notifications),
    [notifications],
  );

  const filteredItems = useMemo(
    () => filter === 'unread' ? allItems.filter(n => !n.readAt) : allItems,
    [allItems, filter],
  );

  const unreadCount = useMemo(
    () => allItems.filter(n => !n.readAt).length,
    [allItems],
  );

  const handleClick = useCallback((id: string) => {
    markRead.mutate({ id: id as Id<"notifications"> });
    const original = notifications.find(n => n.id === id);
    if (original?.actionUrl) {
      navigate(original.actionUrl);
    }
  }, [markRead, notifications, navigate]);

  const handleMarkAsRead = useCallback((id: string) => {
    markRead.mutate({ id: id as Id<"notifications"> });
  }, [markRead]);

  const handleDelete = useCallback((id: string) => {
    deleteNotification.mutate({ id: id as Id<"notifications"> });
  }, [deleteNotification]);

  const handleMarkAllAsRead = useCallback(() => {
    if (userId) {
      markAllRead.mutate({ userId });
    }
  }, [markAllRead, userId]);

  const handleClearAll = async () => {
    const confirmed = await confirm({
      title: t('notifications.clearAllTitle'),
      description: t('notifications.clearAllConfirm'),
      confirmText: t('notifications.clear'),
      cancelText: t('common.cancel'),
      variant: 'danger',
    });
    if (confirmed) {
      for (const n of notifications) {
        deleteNotification.mutate({ id: n.id as Id<"notifications"> });
      }
    }
  };

  return (
    <PageContentLayout>
      <DashboardPageHeader
        title={t('notifications.title')}
        subtitle={t('notifications.subtitle')}
        actions={
          <Stack direction="horizontal" spacing="var(--ds-size-2)" align="center">
            {unreadCount > 0 && (
              <Button
                type="button"
                variant="tertiary"
                data-size="sm"
                onClick={handleMarkAllAsRead}
              >
                {t('notifications.markAllRead')}
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                type="button"
                variant="tertiary"
                data-size="sm"
                onClick={handleClearAll}
              >
                {t('notifications.clear')}
              </Button>
            )}
          </Stack>
        }
      />

      {/* Filter tabs */}
      <Stack direction="horizontal" spacing="var(--ds-size-2)" className={styles.filterTabs}>
        <Button
          type="button"
          variant={filter === 'all' ? 'secondary' : 'tertiary'}
          data-size="sm"
          onClick={() => setFilter('all')}
        >
          {t('common.all')} ({allItems.length})
        </Button>
        <Button
          type="button"
          variant={filter === 'unread' ? 'secondary' : 'tertiary'}
          data-size="sm"
          onClick={() => setFilter('unread')}
        >
          {t('notifications.unreadCount', { count: unreadCount })}
        </Button>
      </Stack>

      {/* Notification list */}
      {error ? (
        <ErrorState title={t('common.error')} message={t('common.errorDescription')} />
      ) : isLoading ? (
        <Stack direction="horizontal" justify="center" className={styles.loadingWrapper}>
          <Spinner aria-label={t('common.loading')} data-size="lg" />
        </Stack>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={<InboxIcon />}
          title={filter === 'unread' ? t('notifications.noUnread') : t('notifications.empty')}
          description={filter === 'unread' ? t('notifications.noMatchingFilter') : t('notifications.emptyDesc')}
        />
      ) : (
        <Card className={styles.notificationList}>
          {filteredItems.map((item: NotificationItemData) => (
            <NotificationItem
              key={item.id}
              notification={item}
              onClick={handleClick}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDelete}
              formatTimeAgo={formatTimeAgo}
              typeIcons={{
                booking_confirmed: <CalendarIcon />,
                booking_reminder_24h: <BellIcon />,
                booking_reminder_1h: <BellIcon />,
                booking_cancelled: <CalendarIcon />,
                booking_modified: <CalendarIcon />,
                booking_upcoming: <CalendarIcon />,
                booking_completed: <CalendarIcon />,
              }}
              defaultIcon={<BellIcon />}
              markAsReadIcon={<CheckCircleIcon />}
              deleteIcon={<TrashIcon />}
            />
          ))}
        </Card>
      )}
    </PageContentLayout>
  );
}
