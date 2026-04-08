
import { Heading, Paragraph } from '@digdir/designsystemet-react';
import styles from './ErrorState.module.css';

export interface ErrorStateProps {
    icon?: React.ReactNode;
    title: string;
    message?: string;
    action?: React.ReactNode;
    variant?: 'error' | 'warning';
}

/**
 * ErrorState - Reusable error state component
 * 
 * Displays error or warning messages with optional retry action.
 * Uses only design tokens - no custom styling allowed.
 * 
 * @example
 * ```tsx
 * <ErrorState
 *   icon={<AlertIcon />}
 *   title="Failed to load bookings"
 *   message="There was an error loading your bookings. Please try again."
 *   action={<Button onClick={retry}>Retry</Button>}
 *   variant="error"
 * />
 * ```
 */
export function ErrorState({
    icon,
    title,
    message,
    action,
    variant = 'error'
}: ErrorStateProps) {
    return (
        <div className={styles.container} data-variant={variant}>
            {icon && <div className={styles.icon}>{icon}</div>}
            <Heading data-size="2xs" className={styles.title}>{title}</Heading>
            {message && <Paragraph data-size="sm" className={styles.message}>{message}</Paragraph>}
            {action && <div className={styles.action}>{action}</div>}
        </div>
    );
}
