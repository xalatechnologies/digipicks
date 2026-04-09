/**
 * Realtime Toast
 *
 * Shows toast notifications for realtime events.
 * Automatically subscribes to booking and notification events.
 * Use inside RealtimeProvider.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Paragraph, CheckCircleIcon, InfoIcon, XCircleIcon, CloseIcon } from '@digipicks/ds';
import { useRealtimeNotification, useRealtimeStatus } from '../providers/RealtimeContext';
import type { RealtimeEvent } from '@digipicks/sdk';
import styles from './RealtimeToast.module.css';

interface Toast {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
  timestamp: Date;
}

export function RealtimeToast(): React.ReactElement {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { status } = useRealtimeStatus();

  // Auto-dismiss toasts after 5 seconds
  useEffect(() => {
    if (toasts.length === 0) return;

    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 5000);

    return () => clearTimeout(timer);
  }, [toasts]);

  // Add toast
  const addToast = useCallback((toast: Omit<Toast, 'id' | 'timestamp'>) => {
    const newToast: Toast = {
      ...toast,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    setToasts((prev) => [...prev.slice(-4), newToast]); // Keep max 5 toasts
  }, []);

  // Remove toast
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Handle notification events
  const handleNotificationEvent = useCallback(
    (event: RealtimeEvent) => {
      const data = event.data as { title?: string; body?: string; type?: string } | undefined;
      const message = data?.body ?? event.message;

      addToast({
        type: (data?.type as Toast['type']) || 'info',
        title: data?.title || 'Varsel',
        ...(message && { message }),
      });
    },
    [addToast],
  );

  // Subscribe to realtime events
  useRealtimeNotification(handleNotificationEvent);

  // Show connection status toast on disconnect
  useEffect(() => {
    if (status === 'error') {
      addToast({
        type: 'error',
        title: 'Tilkobling tapt',
        message: 'Sanntidsoppdateringer er utilgjengelig',
      });
    }
  }, [status, addToast]);

  const getIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon size={20} />;
      case 'error':
        return <XCircleIcon size={20} />;
      default:
        return <InfoIcon size={20} />;
    }
  };

  if (toasts.length === 0) return <></>;

  return (
    <div role="region" aria-label="Varsler" aria-live="polite" aria-atomic="false" className={styles.container}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.type === 'error' ? 'alert' : 'status'}
          aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
          className={styles.toast}
          data-type={toast.type}
        >
          <div className={styles.icon}>{getIcon(toast.type)}</div>
          <div className={styles.content}>
            <Paragraph data-size="sm" className={styles.title}>
              {toast.title}
            </Paragraph>
            {toast.message && (
              <Paragraph data-size="xs" className={styles.message}>
                {toast.message}
              </Paragraph>
            )}
          </div>
          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            className={styles.closeButton}
            aria-label="Lukk varsel"
          >
            <CloseIcon size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default RealtimeToast;
