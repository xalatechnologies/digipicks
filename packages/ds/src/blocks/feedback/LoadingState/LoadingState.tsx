
import { Paragraph } from '@digdir/designsystemet-react';
import styles from './LoadingState.module.css';

export interface LoadingStateProps {
    message?: string;
    size?: 'sm' | 'md' | 'lg';
}

/**
 * LoadingState - Reusable loading state component
 * 
 * Displays a loading spinner with optional message.
 * Uses only design tokens - no custom styling allowed.
 * 
 * @example
 * ```tsx
 * <LoadingState message="Loading bookings..." size="lg" />
 * ```
 */
export function LoadingState({ message = 'Loading...', size = 'md' }: LoadingStateProps) {
    return (
        <div className={styles.container}>
            <div className={styles.spinner} data-size={size} />
            {message && <Paragraph data-size="sm" className={styles.message}>{message}</Paragraph>}
        </div>
    );
}
