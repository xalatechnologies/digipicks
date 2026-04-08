
import { Heading, Paragraph } from '@digdir/designsystemet-react';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
}

/**
 * EmptyState - Reusable empty state component
 * 
 * Displays a friendly message when there's no data to show.
 * Uses only design tokens - no custom styling allowed.
 * 
 * @example
 * ```tsx
 * <EmptyState
 *   icon={<InboxIcon />}
 *   title="No bookings yet"
 *   description="Your bookings will appear here once guests start booking."
 *   action={<Button>Create Listing</Button>}
 * />
 * ```
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <div className={styles.container}>
            {icon && <div className={styles.icon}>{icon}</div>}
            <Heading data-size="2xs" className={styles.title}>{title}</Heading>
            {description && <Paragraph data-size="sm" className={styles.description}>{description}</Paragraph>}
            {action && <div className={styles.action}>{action}</div>}
        </div>
    );
}
