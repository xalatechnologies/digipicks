/**
 * ShareButton
 *
 * @deprecated Prefer domain-specific share components for listing context (ShareSheet, UTM, audit).
 * This generic version remains for non-listing use cases.
 *
 * Generic share button with native Web Share API support,
 * clipboard copy, and customizable share platforms.
 * Consumer provides platform icons.
 */
'use client';

import * as React from 'react';
import { Button, Heading, Paragraph, Dialog } from '@digdir/designsystemet-react';
import { Stack } from '../primitives';
import { cn } from '../utils';
import styles from './ShareButton.module.css';

// =============================================================================
// Types
// =============================================================================

export interface ShareData {
    /** URL to share */
    url: string;
    /** Title text */
    title: string;
    /** Optional description */
    description?: string;
}

export interface SharePlatformConfig {
    /** Unique identifier for the platform */
    id: string;
    /** Display label */
    label: string;
    /** Icon element (consumer provides) */
    icon: React.ReactNode;
    /** URL template function — receives share data, returns share URL. If omitted, treated as 'copy' action. */
    urlTemplate?: (data: ShareData) => string;
}

export interface ShareButtonProps {
    /** Data to share */
    shareData: ShareData;
    /** Button label (for button variant) */
    buttonLabel?: string;
    /** Icon for the trigger button (consumer provides) */
    buttonIcon?: React.ReactNode;
    /** Share platforms configuration */
    platforms: SharePlatformConfig[];
    /** Enable native Web Share API when available */
    useNativeShare?: boolean;
    /** Callback after sharing */
    onShare?: (platformId: string) => void;
    /** Visual variant */
    variant?: 'icon' | 'button';
    /** Size */
    size?: 'sm' | 'md' | 'lg';
    /** Dialog title */
    dialogTitle?: string;
    /** Label shown after copying link */
    copiedLabel?: string;
    /** Copy link button label */
    copyLabel?: string;
    /** Custom class name */
    className?: string;
    /** Disabled state */
    disabled?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function ShareButton({
    shareData,
    buttonLabel = 'Share',
    buttonIcon,
    platforms,
    useNativeShare = true,
    onShare,
    variant = 'icon',
    size = 'md',
    dialogTitle = 'Share',
    copiedLabel = 'Copied!',
    copyLabel = 'Copy link',
    className,
    disabled = false,
}: ShareButtonProps): React.ReactElement {
    const [isOpen, setIsOpen] = React.useState(false);
    const [copied, setCopied] = React.useState(false);

    const handleClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;

        if (useNativeShare && typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({
                    title: shareData.title,
                    text: shareData.description,
                    url: shareData.url,
                });
                onShare?.('native');
                return;
            } catch {
                // Fall through to dialog
            }
        }
        setIsOpen(true);
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareData.url);
            setCopied(true);
            onShare?.('copy');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback
        }
    };

    const handlePlatformShare = (platform: SharePlatformConfig) => {
        if (!platform.urlTemplate) {
            handleCopy();
            return;
        }
        window.open(platform.urlTemplate(shareData), '_blank', 'noopener,noreferrer');
        onShare?.(platform.id);
        setIsOpen(false);
    };

    return (
        <>
            {variant === 'icon' ? (
                <Button
                    type="button"
                    variant="tertiary"
                    onClick={handleClick}
                    aria-label={buttonLabel}
                    disabled={disabled}
                    className={cn('share-button', className)}
                    data-size={size}
                >
                    {buttonIcon}
                </Button>
            ) : (
                <Button
                    type="button"
                    variant="secondary"
                    onClick={handleClick}
                    disabled={disabled}
                    className={cn('share-button', className)}
                    data-size={size}
                >
                    {buttonIcon}
                    {buttonLabel}
                </Button>
            )}

            {/* Share Sheet Dialog */}
            <Dialog open={isOpen} onClose={() => setIsOpen(false)}>
                <Heading level={2} data-size="sm" className={styles.dialogTitle}>
                    {dialogTitle}
                </Heading>

                {/* Copy Link */}
                <Stack direction="horizontal" spacing="var(--ds-size-2)" align="center" className={styles.urlBar}>
                    <Paragraph data-size="sm" className={styles.urlText}>
                        {shareData.url}
                    </Paragraph>
                    <Button type="button" variant="secondary" data-size="sm" onClick={handleCopy}>
                        {copied ? copiedLabel : copyLabel}
                    </Button>
                </Stack>

                {/* Platform buttons */}
                <div className={styles.platformGrid}>
                    {platforms.filter(p => p.urlTemplate).map((platform) => (
                        <Button
                            key={platform.id}
                            type="button"
                            variant="tertiary"
                            onClick={() => handlePlatformShare(platform)}
                            className={styles.platformButton}
                        >
                            {platform.icon}
                            <Paragraph data-size="xs" className={styles.platformLabel}>
                                {platform.label}
                            </Paragraph>
                        </Button>
                    ))}
                </div>
            </Dialog>
        </>
    );
}
