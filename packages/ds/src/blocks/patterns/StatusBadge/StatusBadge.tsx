/**
 * StatusBadge - Display status indicators with color coding
 */

import * as React from 'react';
import { cn } from '../../../utils';
import styles from './StatusBadge.module.css';

export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral';
export type BadgeSize = 'sm' | 'md' | 'lg';
export type BadgeVariant = 'solid' | 'outlined' | 'subtle';

export interface StatusBadgeProps {
    status: StatusType;
    label: string;
    size?: BadgeSize;
    variant?: BadgeVariant;
    icon?: React.ReactNode;
    className?: string;
    ariaLabel?: string;
}

/**
 * StatusBadge component for displaying status indicators
 */
export function StatusBadge({
    status,
    label,
    size = 'md',
    variant = 'solid',
    icon,
    className,
    ariaLabel,
}: StatusBadgeProps): React.ReactElement {
    return (
        <span
            className={cn(
                styles.badge,
                styles[`status-${status}`],
                styles[`size-${size}`],
                styles[`variant-${variant}`],
                className
            )}
            role="status"
            aria-label={ariaLabel || `Status: ${label}`}
        >
            {icon && <span className={styles.icon}>{icon}</span>}
            <span className={styles.label}>{label}</span>
        </span>
    );
}

export default StatusBadge;
