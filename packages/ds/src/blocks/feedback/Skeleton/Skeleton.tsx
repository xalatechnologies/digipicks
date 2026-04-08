
import styles from './Skeleton.module.css';

export interface SkeletonProps {
    variant?: 'text' | 'circular' | 'rectangular' | 'card';
    width?: string | number;
    height?: string | number;
    count?: number;
    animation?: 'pulse' | 'wave' | 'none';
    className?: string;
}

/**
 * Skeleton - Loading placeholder component
 * 
 * Displays animated skeleton loaders for content that is loading.
 * Uses only design tokens - no custom styling allowed.
 * 
 * @example
 * ```tsx
 * // Text skeleton
 * <Skeleton variant="text" width="70%" />
 * 
 * // Card skeleton
 * <Skeleton variant="card" height={300} />
 * 
 * // Multiple skeletons
 * <Skeleton variant="text" count={3} />
 * ```
 */
export function Skeleton({
    variant = 'rectangular',
    width,
    height,
    count = 1,
    animation = 'pulse',
    className,
}: SkeletonProps) {
    const items = Array.from({ length: count });

    return (
        <>
            {items.map((_, index) => (
                <div
                    key={index}
                    className={`${styles.skeleton} ${styles[variant]} ${styles[animation]} ${className || ''}`}
                    style={{
                        ...(width && { width: typeof width === 'number' ? `${width}px` : width }),
                        ...(height && { height: typeof height === 'number' ? `${height}px` : height }),
                    }}
                    aria-busy="true"
                    aria-live="polite"
                />
            ))}
        </>
    );
}

export interface SkeletonCardProps {
    imageHeight?: number;
    showImage?: boolean;
    showTitle?: boolean;
    showDescription?: boolean;
    showMeta?: boolean;
    count?: number;
}

/**
 * SkeletonCard - Card-specific skeleton loader
 * 
 * Pre-configured skeleton for card layouts (e.g., listing cards).
 * Extracted from ListingsPage loading state.
 * 
 * @example
 * ```tsx
 * <SkeletonCard count={6} imageHeight={260} />
 * ```
 */
export function SkeletonCard({
    imageHeight = 260,
    showImage = true,
    showTitle = true,
    showDescription = true,
    showMeta = true,
    count = 1,
}: SkeletonCardProps) {
    const items = Array.from({ length: count });

    return (
        <>
            {items.map((_, index) => (
                <div
                    key={index}
                    className={styles.card}
                    style={{
                        animationDelay: `${index * 0.1}s`,
                    }}
                >
                    {showImage && (
                        <div
                            className={styles.cardImage}
                            style={{ height: `${imageHeight}px` }}
                        />
                    )}
                    <div className={styles.cardContent}>
                        {showTitle && (
                            <>
                                <div className={styles.cardTitle} />
                                <div className={styles.cardSubtitle} />
                            </>
                        )}
                        {showDescription && <div className={styles.cardDescription} />}
                        {showMeta && (
                            <div className={styles.cardMeta}>
                                <div className={styles.cardBadge} />
                                <div className={styles.cardBadge} />
                                <div className={styles.cardBadge} />
                            </div>
                        )}
                        <div className={styles.cardFooter}>
                            <div className={styles.cardFooterItem} />
                            <div className={styles.cardFooterPrice} />
                        </div>
                    </div>
                </div>
            ))}
        </>
    );
}
