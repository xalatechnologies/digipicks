
import { Heading, Paragraph } from '@digdir/designsystemet-react';
import { ArrowLeftIcon } from '../../../primitives/icons';
import { cn } from '../../../utils';
import styles from './CardHeader.module.css';

/**
 * CardHeader Component
 *
 * A standardized header for cards with optional back button, title, subtitle, and actions.
 * Commonly used in detail pages, modals, and card-based layouts.
 *
 * @example
 * ```tsx
 * <CardHeader
 *   title="User Profile"
 *   subtitle="Manage your account settings"
 *   actions={<Button>Edit</Button>}
 * />
 * ```
 *
 * @example With back button
 * ```tsx
 * <CardHeader
 *   title="Booking Details"
 *   subtitle="Booking #12345"
 *   onBack={() => navigate(-1)}
 *   actions={
 *     <>
 *       <Button variant="secondary">Cancel</Button>
 *       <Button variant="primary">Save</Button>
 *     </>
 *   }
 * />
 * ```
 */

export interface CardHeaderProps {
    /** Header title */
    title: string;
    /** Optional subtitle */
    subtitle?: string;
    /** Optional icon (rendered before the title) */
    icon?: React.ReactNode;
    /** Optional back button handler */
    onBack?: () => void;
    /** Optional action buttons */
    actions?: React.ReactNode;
    /** Show bottom divider */
    divider?: boolean;
    /**
     * Visual variant:
     * - `default` — Large page-level header (no background, generous padding)
     * - `section` — Compact section header with subtle background and bottom border
     */
    variant?: 'default' | 'section';
    /** Additional CSS class */
    className?: string;
}



export function CardHeader({
    title,
    subtitle,
    icon,
    onBack,
    actions,
    divider = false,
    variant = 'default',
    className,
}: CardHeaderProps): React.ReactElement {
    const isSection = variant === 'section';
    return (
        <div
            className={cn(
                isSection ? styles.sectionHeader : styles.cardHeader,
                !isSection && divider && styles.withDivider,
                className,
            )}
        >
            <div className={styles.leftContent}>
                {onBack && (
                    <button
                        type="button"
                        className={styles.backButton}
                        onClick={onBack}
                        aria-label="Go back"
                    >
                        <ArrowLeftIcon />
                    </button>
                )}
                {icon && <span className={styles.headerIcon}>{icon}</span>}
                <div className={styles.textContent}>
                    <Heading data-size={isSection ? '2xs' : 'xs'} className={isSection ? styles.sectionTitle : styles.title}>{title}</Heading>
                    {subtitle && <Paragraph data-size={isSection ? 'xs' : 'sm'} className={styles.subtitle}>{subtitle}</Paragraph>}
                </div>
            </div>
            {actions && <div className={styles.actions}>{actions}</div>}
        </div>
    );
}

CardHeader.displayName = 'CardHeader';
