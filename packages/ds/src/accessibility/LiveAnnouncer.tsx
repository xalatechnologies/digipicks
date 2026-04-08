/**
 * LiveAnnouncer — ARIA Live Region Utility
 *
 * Provides programmatic announcements for screen readers.
 * WCAG 4.1.3: Status Messages — users must be notified of
 * content changes without receiving focus.
 *
 * Usage:
 *   const { announce } = useLiveAnnouncer();
 *   announce('2 billetter lagt til', 'polite');
 *
 *   // Or as a component:
 *   <LiveAnnouncer message={statusMessage} />
 */

import { useState, useCallback, useEffect, useRef } from 'react';

// =============================================================================
// COMPONENT
// =============================================================================

interface LiveAnnouncerProps {
    /** Message to announce. Changes trigger announcements. */
    message?: string;
    /** Politeness level: 'polite' waits, 'assertive' interrupts. */
    politeness?: 'polite' | 'assertive';
}

/**
 * Renders an invisible ARIA live region that announces content changes.
 * Place once in your app layout — messages auto-clear after announcement.
 */
export function LiveAnnouncer({
    message,
    politeness = 'polite',
}: LiveAnnouncerProps) {
    const [announcement, setAnnouncement] = useState('');

    useEffect(() => {
        if (message) {
            // Clear first to ensure re-announcement of same message
            setAnnouncement('');
            const timer = setTimeout(() => setAnnouncement(message), 100);
            return () => clearTimeout(timer);
        }
    }, [message]);

    return (
        <div
            role="status"
            aria-live={politeness}
            aria-atomic="true"
            className="sr-only"
            style={{
                position: 'absolute',
                width: '1px',
                height: '1px',
                padding: 0,
                margin: '-1px',
                overflow: 'hidden',
                clip: 'rect(0, 0, 0, 0)',
                whiteSpace: 'nowrap',
                border: 0,
            }}
        >
            {announcement}
        </div>
    );
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for programmatic screen reader announcements.
 * Returns an `announce` function that triggers live region updates.
 *
 * @example
 *   const { announce } = useLiveAnnouncer();
 *   announce('Bestilling fullført');
 */
export function useLiveAnnouncer() {
    const regionRef = useRef<HTMLElement | null>(null);

    // Create a singleton live region in the DOM
    useEffect(() => {
        if (typeof document === 'undefined') return;

        let region = document.getElementById('__live-announcer');
        if (!region) {
            region = document.createElement('div');
            region.id = '__live-announcer';
            region.setAttribute('role', 'status');
            region.setAttribute('aria-live', 'polite');
            region.setAttribute('aria-atomic', 'true');
            region.className = 'sr-only';
            Object.assign(region.style, {
                position: 'absolute',
                width: '1px',
                height: '1px',
                padding: '0',
                margin: '-1px',
                overflow: 'hidden',
                clip: 'rect(0, 0, 0, 0)',
                whiteSpace: 'nowrap',
                border: '0',
            });
            document.body.appendChild(region);
        }
        regionRef.current = region;

        return () => {
            // Don't remove — singleton shared across hook instances
        };
    }, []);

    const announce = useCallback(
        (message: string, politeness: 'polite' | 'assertive' = 'polite') => {
            const region = regionRef.current;
            if (!region) return;

            region.setAttribute('aria-live', politeness);
            region.textContent = '';

            // Delay to ensure AT picks up the change
            requestAnimationFrame(() => {
                region.textContent = message;
            });
        },
        []
    );

    return { announce };
}
