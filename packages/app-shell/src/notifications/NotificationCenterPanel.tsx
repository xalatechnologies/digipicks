/**
 * NotificationCenterPanel (shared)
 *
 * Connects the DS NotificationCenter modal to real notification data via SDK hooks.
 * Listens to the NotificationCenterProvider context (isOpen/close) and renders
 * the notification center modal when the bell icon is clicked.
 *
 * Works in any app that wraps with NotificationCenterProvider (minside, backoffice).
 */

import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  NotificationCenter,
  BellIcon,
  CheckCircleIcon,
} from '@digilist-saas/ds';
import {
  useMyNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from '@digilist-saas/sdk';
import type { Id } from '@digilist-saas/sdk';
import { useAuth } from '../auth/AuthProvider';
import { useNotificationCenter } from '../providers/NotificationCenterProvider';
import { transformNotificationsToDS, formatTimeAgo } from './transforms';

export interface NotificationCenterPanelProps {
  /** Optional custom navigation handler. Called with the notification id when clicked.
   *  If not provided, defaults to: mark read → navigate to actionUrl or /bookings/:bookingId. */
  onNotificationNavigate?: (notificationId: string, metadata: Record<string, unknown> | undefined) => void;
}

export function NotificationCenterPanel({ onNotificationNavigate }: NotificationCenterPanelProps = {}) {
  const { isOpen, closeNotificationCenter } = useNotificationCenter();
  const { user } = useAuth();
  const userId = (user?.id ?? '') as Id<"users">;
  const navigate = useNavigate();

  // Fetch notifications
  const { notifications, isLoading } = useMyNotifications(userId || undefined);

  // Mutations
  const markAsRead = useMarkNotificationRead();
  const markAllAsRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  // Transform SDK notifications → DS NotificationItemData
  const notificationItems = useMemo(
    () => transformNotificationsToDS(notifications ?? []),
    [notifications],
  );

  const handleNotificationClick = useCallback((id: string) => {
    // Mark as read
    markAsRead.mutate({ id: id as Id<"notifications"> });

    const notification = notificationItems.find(n => n.id === id);
    if (onNotificationNavigate) {
      onNotificationNavigate(id, notification?.metadata);
      closeNotificationCenter();
      return;
    }

    // Default navigation: actionUrl from original notification
    const original = (notifications ?? []).find(n => n.id === id);
    if (original?.actionUrl) {
      closeNotificationCenter();
      navigate(original.actionUrl);
    }
  }, [markAsRead, notificationItems, notifications, closeNotificationCenter, navigate, onNotificationNavigate]);

  const handleMarkAsRead = useCallback((id: string) => {
    markAsRead.mutate({ id: id as Id<"notifications"> });
  }, [markAsRead]);

  const handleDelete = useCallback((id: string) => {
    deleteNotification.mutate({ id: id as Id<"notifications"> });
  }, [deleteNotification]);

  const handleMarkAllAsRead = useCallback(() => {
    if (userId) {
      markAllAsRead.mutate({ userId });
    }
  }, [markAllAsRead, userId]);

  return (
    <NotificationCenter
      open={isOpen}
      onClose={closeNotificationCenter}
      notifications={notificationItems}
      loading={isLoading}
      onNotificationClick={handleNotificationClick}
      onMarkAsRead={handleMarkAsRead}
      onDelete={handleDelete}
      onMarkAllAsRead={handleMarkAllAsRead}
      markAllAsReadIcon={<CheckCircleIcon />}
      emptyIcon={<BellIcon />}
      formatTimeAgo={formatTimeAgo}
    />
  );
}
