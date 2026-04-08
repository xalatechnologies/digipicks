/**
 * MediaCarousel
 *
 * @deprecated Reserved for future use. Applications should use ImageSlider for listings.
 *
 * Full-width image carousel with navigation arrows, dots, thumbnails,
 * keyboard/touch support, fullscreen mode, and auto-play.
 * Consumer provides icons via props.
 */
'use client';

import * as React from 'react';
import { Button } from '@digdir/designsystemet-react';
import { cn } from '../utils';
import type { GalleryImage } from '../types/listing-detail';
import styles from './MediaCarousel.module.css';

// =============================================================================
// Types
// =============================================================================

export interface MediaCarouselProps {
    /** Array of images */
    images: GalleryImage[];
    /** Initial image index */
    initialIndex?: number;
    /** Height of the carousel */
    height?: number | string;
    /** Show navigation arrows */
    showArrows?: boolean;
    /** Show dot indicators */
    showDots?: boolean;
    /** Show thumbnail strip */
    showThumbnails?: boolean;
    /** Show image counter */
    showCounter?: boolean;
    /** Enable fullscreen mode on click */
    enableFullscreen?: boolean;
    /** Auto-play interval in ms (0 = disabled) */
    autoPlay?: number;
    /** Previous arrow icon (consumer provides) */
    prevIcon?: React.ReactNode;
    /** Next arrow icon (consumer provides) */
    nextIcon?: React.ReactNode;
    /** Close/exit fullscreen icon (consumer provides) */
    closeIcon?: React.ReactNode;
    /** ARIA labels */
    ariaLabels?: {
        prev?: string;
        next?: string;
        close?: string;
        dot?: (index: number) => string;
        thumbnail?: (index: number) => string;
    };
    /** Custom class name */
    className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function MediaCarousel({
    images,
    initialIndex = 0,
    height = 400,
    showArrows = true,
    showDots = false,
    showThumbnails = false,
    showCounter = true,
    enableFullscreen = false,
    autoPlay = 0,
    prevIcon,
    nextIcon,
    closeIcon,
    ariaLabels = {},
    className,
}: MediaCarouselProps): React.ReactElement {
    const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
    const [isFullscreen, setIsFullscreen] = React.useState(false);
    const [touchStart, setTouchStart] = React.useState<number | null>(null);
    const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

    const labels = {
        prev: ariaLabels.prev || 'Previous image',
        next: ariaLabels.next || 'Next image',
        close: ariaLabels.close || 'Exit fullscreen',
        dot: ariaLabels.dot || ((i: number) => `Go to image ${i + 1}`),
        thumbnail: ariaLabels.thumbnail || ((i: number) => `Show image ${i + 1}`),
    };

    const sliderHeight = typeof height === 'number' ? `${height}px` : height;

    const goToIndex = React.useCallback((index: number) => {
        setCurrentIndex((index + images.length) % images.length);
    }, [images.length]);

    const goNext = React.useCallback(() => goToIndex(currentIndex + 1), [currentIndex, goToIndex]);
    const goPrev = React.useCallback(() => goToIndex(currentIndex - 1), [currentIndex, goToIndex]);

    // Auto-play
    React.useEffect(() => {
        if (autoPlay > 0 && images.length > 1) {
            timerRef.current = setInterval(goNext, autoPlay);
            return () => {
                if (timerRef.current) clearInterval(timerRef.current);
            };
        }
    }, [autoPlay, goNext, images.length]);

    // Keyboard navigation
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') goPrev();
            else if (e.key === 'ArrowRight') goNext();
            else if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [goNext, goPrev, isFullscreen]);

    // Touch support
    const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStart === null) return;
        const diff = touchStart - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) {
            diff > 0 ? goNext() : goPrev();
        }
        setTouchStart(null);
    };

    const currentImage = images[currentIndex];
    if (!images.length) return <></>;

    const carouselContent = (
        <div
            className={cn(isFullscreen ? styles.rootFullscreen : styles.root, className)}
            style={{ height: isFullscreen ? undefined : sliderHeight }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* Main image */}
            <div
                className={styles.imageWrapper}
                onClick={() => enableFullscreen && !isFullscreen && setIsFullscreen(true)}
                data-thumbnails={showThumbnails}
                data-zoomable={enableFullscreen && !isFullscreen}
            >
                <img
                    src={currentImage?.src}
                    alt={currentImage?.alt || ''}
                    className={isFullscreen ? styles.mainImageFullscreen : styles.mainImage}
                    draggable={false}
                />
            </div>

            {/* Navigation arrows */}
            {showArrows && images.length > 1 && (
                <>
                    <Button
                        type="button"
                        variant="tertiary"
                        onClick={goPrev}
                        aria-label={labels.prev}
                        className={styles.navButtonPrev}
                    >
                        {prevIcon || '‹'}
                    </Button>
                    <Button
                        type="button"
                        variant="tertiary"
                        onClick={goNext}
                        aria-label={labels.next}
                        className={styles.navButtonNext}
                    >
                        {nextIcon || '›'}
                    </Button>
                </>
            )}

            {/* Image counter */}
            {showCounter && images.length > 1 && (
                <span
                    className={styles.counter}
                    data-has-thumbnails={showThumbnails ? 'true' : undefined}
                >
                    {currentIndex + 1} / {images.length}
                </span>
            )}

            {/* Dot indicators */}
            {showDots && images.length > 1 && (
                <div
                    className={styles.dotContainer}
                    data-has-thumbnails={showThumbnails ? 'true' : undefined}
                >
                    {images.map((_, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={() => goToIndex(index)}
                            aria-label={labels.dot(index)}
                            aria-current={index === currentIndex ? 'true' : undefined}
                            className={index === currentIndex ? styles.dotActive : styles.dot}
                        />
                    ))}
                </div>
            )}

            {/* Thumbnail strip */}
            {showThumbnails && images.length > 1 && (
                <div className={styles.thumbnailStrip}>
                    {images.map((image, index) => (
                        <button
                            key={image.id}
                            type="button"
                            onClick={() => goToIndex(index)}
                            aria-label={labels.thumbnail(index)}
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
                </div>
            )}

            {/* Close fullscreen button */}
            {isFullscreen && (
                <Button
                    type="button"
                    variant="tertiary"
                    onClick={() => setIsFullscreen(false)}
                    aria-label={labels.close}
                    className={styles.closeButton}
                >
                    {closeIcon || '✕'}
                </Button>
            )}
        </div>
    );

    if (isFullscreen) {
        return (
            <div className={styles.fullscreenBackdrop}>
                {carouselContent}
            </div>
        );
    }

    return carouselContent;
}
