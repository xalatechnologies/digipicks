/**
 * StatusBanner - Display important messages/alerts
 */

import * as React from 'react';
import { cn } from '../../../utils';
import styles from './StatusBanner.module.css';

export type BannerType = 'success' | 'warning' | 'error' | 'info';

export interface StatusBannerProps {
    type: BannerType;
    title: string;
    message?: string;
    dismissible?: boolean;
    onDismiss?: () => void;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

// Icons
const CloseIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M15 5L5 15M5 5l10 10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const InfoIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M10 10v4M10 6v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const SuccessIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M6 10l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const WarningIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M10 2L2 17h16L10 2z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path d="M10 8v4M10 14v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const ErrorIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M7 7l6 6M13 7l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const iconMap = {
    info: InfoIcon,
    success: SuccessIcon,
    warning: WarningIcon,
    error: ErrorIcon,
};

/**
 * StatusBanner component for displaying important messages
 */
export function StatusBanner({
    type,
    title,
    message,
    dismissible = false,
    onDismiss,
    action,
    className,
}: StatusBannerProps): React.ReactElement {
    const Icon = iconMap[type];

    return (
        <div
            className={cn(styles.banner, styles[`type-${type}`], className)}
            role="alert"
            aria-live="polite"
        >
            <div className={styles.icon}>
                <Icon size={24} />
            </div>

            <div className={styles.content}>
                <div className={styles.title}>{title}</div>
                {message && <div className={styles.message}>{message}</div>}
            </div>

            {action && (
                <button
                    type="button"
                    className={styles.actionButton}
                    onClick={action.onClick}
                >
                    {action.label}
                </button>
            )}

            {dismissible && (
                <button
                    type="button"
                    className={styles.closeButton}
                    onClick={onDismiss}
                    aria-label="Lukk melding"
                >
                    <CloseIcon size={20} />
                </button>
            )}
        </div>
    );
}

export default StatusBanner;
