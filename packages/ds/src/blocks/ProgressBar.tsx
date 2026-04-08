/**
 * ProgressBar
 *
 * A DS block component for showing progress (0–100).
 * Uses a ref to set --progress-value CSS custom property imperatively,
 * so the parent does NOT need to use the forbidden `style` prop.
 *
 * @example
 * <ProgressBar value={75} />
 * <ProgressBar value={75} variant="success" />
 */

import * as React from 'react';
import styles from './ProgressBar.module.css';

export type ProgressBarVariant = 'default' | 'success' | 'warning' | 'danger';

export interface ProgressBarProps {
    /** Progress value from 0 to 100 */
    value: number;
    /** Color variant */
    variant?: ProgressBarVariant;
    /** Accessible label */
    'aria-label'?: string;
    className?: string;
}

const FILL_CLASS: Record<ProgressBarVariant, string> = {
    default: styles.fillDefault,
    success: styles.fillSuccess,
    warning: styles.fillWarning,
    danger: styles.fillDanger,
};

export function ProgressBar({
    value,
    variant = 'default',
    'aria-label': ariaLabel,
    className,
}: ProgressBarProps): React.ReactElement {
    const fillRef = React.useRef<HTMLDivElement>(null);

    // Apply CSS custom property imperatively so parent never needs style prop
    React.useLayoutEffect(() => {
        if (fillRef.current) {
            fillRef.current.style.setProperty('--progress-value', `${Math.min(100, Math.max(0, value))}%`);
        }
    }, [value]);

    return (
        <div
            className={`${styles.track} ${className ?? ''}`}
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={ariaLabel}
        >
            <div ref={fillRef} className={`${styles.fill} ${FILL_CLASS[variant]}`} />
        </div>
    );
}
