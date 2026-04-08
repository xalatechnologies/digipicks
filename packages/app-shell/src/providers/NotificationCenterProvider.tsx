/**
 * NotificationCenterProvider
 *
 * Context for notification bell click - opens notification center modal/panel.
 * Used by DashboardHeaderSlots when variant=minside.
 */

import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';

export interface NotificationCenterContextValue {
  openNotificationCenter: () => void;
  closeNotificationCenter: () => void;
  isOpen: boolean;
}

const NotificationCenterContext = createContext<NotificationCenterContextValue | null>(null);

export function useNotificationCenter(): NotificationCenterContextValue {
  const context = useContext(NotificationCenterContext);
  if (!context) {
    throw new Error('useNotificationCenter must be used within NotificationCenterProvider');
  }
  return context;
}

export function useNotificationCenterOptional(): NotificationCenterContextValue | null {
  return useContext(NotificationCenterContext);
}

export interface NotificationCenterProviderProps {
  children: ReactNode;
}

export function NotificationCenterProvider({ children }: NotificationCenterProviderProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const openNotificationCenter = useCallback(() => setIsOpen(true), []);
  const closeNotificationCenter = useCallback(() => setIsOpen(false), []);
  const value = useMemo(
    () => ({ openNotificationCenter, closeNotificationCenter, isOpen }),
    [openNotificationCenter, closeNotificationCenter, isOpen]
  );
  return (
    <NotificationCenterContext.Provider value={value}>
      {children}
    </NotificationCenterContext.Provider>
  );
}
