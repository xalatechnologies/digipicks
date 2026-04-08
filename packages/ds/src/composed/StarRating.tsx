/**
 * StarRating Component
 *
 * Displays a star rating (1-5 stars) with optional label.
 * SSR-safe, pure presentational component.
 *
 * @example
 * ```tsx
 * import { StarRating } from '@digilist-saas/ds';
 *
 * <StarRating rating={4.5} />
 * <StarRating rating={3} showLabel size="sm" />
 * <StarRating rating={5} variant="filled" />
 * ```
 */

import * as React from 'react';
import { StarIcon } from '../primitives';
import { cn } from '../utils';
import styles from './StarRating.module.css';

export interface StarRatingProps {
    /** Rating value (0-5) */
    rating: number;
    /** Maximum rating (default: 5) */
    maxRating?: number;
    /** Show numeric label */
    showLabel?: boolean;
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Visual style */
    variant?: 'outline' | 'filled';
    /** Custom class name */
    className?: string;
}

const sizeToPixels = { sm: 14, md: 16, lg: 20 };

/**
 * StarRating - SSR-safe rating display component
 */
export function StarRating({
    rating,
    maxRating = 5,
    showLabel = true,
    size = 'md',
    variant = 'filled',
    className,
}: StarRatingProps): React.ReactElement {
    const clampedRating = Math.min(Math.max(rating, 0), maxRating);
    const stars = Array.from({ length: maxRating }, (_, i) => i + 1);

    return (
        <div
            className={cn(styles.container, className)}
            role="img"
            aria-label={`Rating: ${clampedRating} out of ${maxRating} stars`}
            data-size={size}
        >
            <div className={styles.stars} data-size={size}>
                {stars.map((star) => {
                    const isFilled = star <= clampedRating;
                    return (
                        <StarIcon
                            key={star}
                            size={sizeToPixels[size]}
                            aria-hidden="true"
                            className={isFilled ? styles.starFilled : styles.starEmpty}
                            fill={variant === 'filled' && isFilled ? 'currentColor' : 'none'}
                        />
                    );
                })}
            </div>

            {showLabel && (
                <span className={styles.label} data-size={size}>
                    {clampedRating.toFixed(1)}/{maxRating}
                </span>
            )}
        </div>
    );
}

export default StarRating;
