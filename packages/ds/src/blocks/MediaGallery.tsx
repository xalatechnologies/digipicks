/**
 * MediaGallery
 *
 * @deprecated Prefer digilist ImageGallery for listing imagery. Reserved for future platform-generic use.
 *
 * Hero image with vertical thumbnail sidebar.
 * Generic gallery component — no hardcoded strings or icons.
 */
import * as React from 'react';
import { Paragraph } from '@digdir/designsystemet-react';
import { Stack } from '../primitives';
import { cn } from '../utils';
import type { GalleryImage } from '../types/listing-detail';
import styles from './MediaGallery.module.css';

// =============================================================================
// Types
// =============================================================================

export interface MediaGalleryProps {
    /** Array of images to display */
    images: GalleryImage[];
    /** Initial image index to display */
    initialIndex?: number;
    /** Show image counter badge (e.g., "1 / 3") */
    showCounter?: boolean;
    /** Callback when hero image is clicked */
    onImageClick?: (index: number) => void;
    /** Height of the gallery */
    height?: number | string;
    /** Maximum number of thumbnails to show */
    maxThumbnails?: number;
    /** Label shown when empty */
    emptyLabel?: string;
    /** Thumbnail ARIA label template */
    thumbnailAriaLabel?: (index: number) => string;
    /** Custom class name */
    className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function MediaGallery({
    images,
    initialIndex = 0,
    showCounter = true,
    onImageClick,
    height = 500,
    maxThumbnails = 3,
    emptyLabel = 'No images available',
    thumbnailAriaLabel = (index) => `Show image ${index + 1}`,
    className,
}: MediaGalleryProps): React.ReactElement {
    const [currentIndex, setCurrentIndex] = React.useState(initialIndex);

    const currentImage = images[currentIndex];
    const displayedThumbnails = images.slice(0, maxThumbnails);
    const galleryHeight = typeof height === 'number' ? `${height}px` : height;

    if (!images.length) {
        return (
            <div className={cn(styles.empty, className)} style={{ height: galleryHeight }}>
                <Paragraph data-size="sm" data-color="subtle" className={styles.emptyLabel}>
                    {emptyLabel}
                </Paragraph>
            </div>
        );
    }

    return (
        <Stack
            direction="horizontal"
            spacing="var(--ds-size-3)"
            className={cn(styles.root, className)}
            style={{ height: galleryHeight }}
        >
            {/* Main/Hero Image */}
            <div
                className={styles.heroWrapper}
                onClick={() => onImageClick?.(currentIndex)}
                role={onImageClick ? 'button' : undefined}
                tabIndex={onImageClick ? 0 : undefined}
                data-clickable={!!onImageClick}
            >
                <div className={styles.heroContainer}>
                    <img
                        src={currentImage?.src}
                        alt={currentImage?.alt || ''}
                        className={styles.heroImage}
                    />

                    {showCounter && images.length > 1 && (
                        <span className={styles.counter}>
                            {currentIndex + 1} / {images.length}
                        </span>
                    )}
                </div>
            </div>

            {/* Vertical Thumbnails */}
            {images.length > 1 && (
                <Stack spacing="var(--ds-size-3)" className={styles.thumbnailsColumn}>
                    {displayedThumbnails.map((image, index) => (
                        <button
                            key={image.id}
                            type="button"
                            onClick={() => setCurrentIndex(index)}
                            aria-label={thumbnailAriaLabel(index)}
                            aria-current={index === currentIndex ? 'true' : undefined}
                            className={index === currentIndex ? styles.thumbnailButtonActive : styles.thumbnailButton}
                        >
                            <img
                                src={image.thumbnail || image.src}
                                alt={image.alt || `Thumbnail ${index + 1}`}
                                loading="lazy"
                                className={styles.thumbnailImage}
                            />
                        </button>
                    ))}
                </Stack>
            )}
        </Stack>
    );
}
