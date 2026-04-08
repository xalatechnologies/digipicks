/**
 * NotificationBell Component
 *
 * A notification bell button with badge support for the header.
 * Wraps HeaderIconButton with a bell icon to indicate notification count.
 */

import { forwardRef } from 'react';
import { HeaderIconButton } from '../composed/header-parts';
import type { HeaderIconButtonProps } from '../composed/header-parts';
import { BellIcon } from '../primitives';

// =============================================================================
// Types
// =============================================================================

export interface NotificationBellProps extends Omit<HeaderIconButtonProps, 'icon'> {
  /**
   * Number of unread notifications (shows badge if > 0)
   */
  count?: number;

  /**
   * Callback when bell is clicked
   */
  onClick?: () => void;

  /**
   * Aria label for accessibility
   * @default 'Varsler'
   */
  'aria-label'?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * NotificationBell - A bell icon button with badge support
 *
 * @example
 * ```tsx
 * <NotificationBell count={5} onClick={() => setShowNotifications(true)} />
 * ```
 */
export const NotificationBell = forwardRef<HTMLButtonElement, NotificationBellProps>(
  ({ count = 0, onClick, 'aria-label': ariaLabel = 'Varsler', ...props }, ref) => {
    return (
      <HeaderIconButton
        ref={ref}
        icon={<BellIcon size={22} aria-hidden />}
        badge={count}
        onClick={onClick}
        aria-label={ariaLabel}
        {...props}
      />
    );
  }
);

NotificationBell.displayName = 'NotificationBell';
