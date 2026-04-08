
import { cn } from '../../../utils';
import styles from './MetadataRow.module.css';

/**
 * MetadataRow Component
 *
 * A standardized row for displaying metadata with icon, label, and value.
 * Commonly used in detail pages, cards, and info sections.
 *
 * @example
 * ```tsx
 * <MetadataRow
 *   icon={<CalendarIcon />}
 *   label="Period"
 *   value="Jan 1 - Dec 31, 2024"
 * />
 * ```
 *
 * @example With badge
 * ```tsx
 * <MetadataRow
 *   icon={<UserIcon />}
 *   label="Status"
 *   value="Active"
 *   badge={<Badge variant="success">Verified</Badge>}
 * />
 * ```
 */

export interface MetadataRowProps {
    /** Optional icon element */
    icon?: React.ReactNode;
    /** Label text (subtle color) */
    label: string;
    /** Value text or element (bold) */
    value: string | React.ReactNode;
    /** Optional badge or tag */
    badge?: React.ReactNode;
    /** Size variant */
    size?: 'sm' | 'md';
    /** Additional CSS class */
    className?: string;
}

export function MetadataRow({
    icon,
    label,
    value,
    badge,
    size = 'md',
    className,
}: MetadataRowProps): React.ReactElement {
    return (
        <div className={cn(styles.metadataRow, styles[size], className)}>
            {icon && <div className={styles.icon}>{icon}</div>}
            <div className={styles.content}>
                <div className={styles.label}>{label}</div>
                <div className={styles.valueContainer}>
                    <div className={styles.value}>{value}</div>
                    {badge && <div className={styles.badge}>{badge}</div>}
                </div>
            </div>
        </div>
    );
}

MetadataRow.displayName = 'MetadataRow';
