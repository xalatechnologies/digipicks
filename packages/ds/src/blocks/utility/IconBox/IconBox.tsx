
import { cn } from '../../../utils';
import styles from './IconBox.module.css';

/**
 * IconBox Component
 *
 * A colored container for icons with consistent sizing and styling.
 * Commonly used in cards, lists, and metadata displays.
 *
 * @example
 * ```tsx
 * <IconBox
 *   icon={<CalendarIcon />}
 *   variant="accent"
 *   size="md"
 * />
 * ```
 *
 * @example With badge
 * ```tsx
 * <IconBox
 *   icon={<UserIcon />}
 *   variant="success"
 *   size="lg"
 *   badge="3"
 * />
 * ```
 */

export interface IconBoxProps {
    /** Icon element to display */
    icon: React.ReactNode;
    /** Color variant */
    variant?: 'accent' | 'success' | 'warning' | 'danger' | 'neutral';
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Shape variant */
    shape?: 'rounded' | 'square';
    /** Optional badge text (e.g., notification count) */
    badge?: string | number;
    /** Additional CSS class */
    className?: string;
    /** ARIA label for accessibility */
    'aria-label'?: string;
}

export function IconBox({
    icon,
    variant = 'accent',
    size = 'md',
    shape = 'rounded',
    badge,
    className,
    'aria-label': ariaLabel,
}: IconBoxProps): React.ReactElement {
    return (
        <div
            className={cn(
                styles.iconBox,
                styles[variant],
                styles[size],
                styles[shape],
                className,
            )}
            role="img"
            aria-label={ariaLabel}
        >
            {icon}
            {badge !== undefined && (
                <span className={styles.badge} aria-label={`${badge} notifications`}>
                    {badge}
                </span>
            )}
        </div>
    );
}

IconBox.displayName = 'IconBox';
