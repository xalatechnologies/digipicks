/**
 * QRCodeDialog — Reusable QR code dialog block.
 *
 * Uses native <dialog> for modal. Accepts QR content as a React node slot
 * so consumers render their own QR implementation (e.g. `qrcode.react`),
 * keeping 3rd-party dependencies out of the DS.
 *
 * @example
 * <QRCodeDialog
 *   open={showQR}
 *   onClose={() => setShowQR(false)}
 *   title="QR-kode"
 *   description="Vis denne QR-koden ved inngangen"
 *   qrContent={<QRCodeSVG value={ticket.barcode} size={200} />}
 *   footer={<Button onClick={handleClose}>Lukk</Button>}
 * />
 */
import * as React from 'react';
import { useEffect, useRef, useCallback } from 'react';
import { Heading, Paragraph, Stack } from '../index';
import styles from './QRCodeDialog.module.css';

// =============================================================================
// Types
// =============================================================================

export interface QRCodeDialogProps {
    /** Whether the dialog is open */
    open: boolean;
    /** Close handler */
    onClose: () => void;
    /** Dialog title */
    title: string;
    /** Optional description below the title */
    description?: string;
    /** Slot for the QR code content — consumer renders their own QR library here */
    qrContent: React.ReactNode;
    /** Optional footer content (close button, ticket details, etc.) */
    footer?: React.ReactNode;
    /** Accessible label for the dialog */
    ariaLabel?: string;
}

// =============================================================================
// Component
// =============================================================================

export function QRCodeDialog({
    open,
    onClose,
    title,
    description,
    qrContent,
    footer,
    ariaLabel,
}: QRCodeDialogProps): React.ReactElement | null {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (open) {
            dialog.showModal();
        } else {
            dialog.close();
        }
    }, [open]);

    const handleBackdropClick = useCallback(
        (e: MouseEvent) => {
            const dialog = dialogRef.current;
            if (!dialog) return;
            const rect = dialog.getBoundingClientRect();
            const isInDialog =
                e.clientX >= rect.left &&
                e.clientX <= rect.right &&
                e.clientY >= rect.top &&
                e.clientY <= rect.bottom;
            if (!isInDialog) {
                onClose();
            }
        },
        [onClose],
    );

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        dialog.addEventListener('click', handleBackdropClick);
        return () => dialog.removeEventListener('click', handleBackdropClick);
    }, [handleBackdropClick]);

    return (
        <dialog
            ref={dialogRef}
            onClose={onClose}
            className={styles.qrDialog}
            aria-label={ariaLabel ?? title}
        >
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
            <div className={styles.qrDialogInner} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <Stack direction="vertical" spacing="var(--ds-size-4)">
                    {/* Header */}
                    <Stack direction="vertical" spacing="var(--ds-size-1)">
                        <Heading level={2} data-size="sm" style={{ margin: 0 }}>
                            {title}
                        </Heading>
                        {description && (
                            <Paragraph data-size="sm" style={{ margin: 0, color: 'var(--ds-color-neutral-text-subtle)' }}>
                                {description}
                            </Paragraph>
                        )}
                    </Stack>

                    {/* QR Content */}
                    <div className={styles.qrCodeWrapper}>
                        {qrContent}
                    </div>

                    {/* Footer */}
                    {footer && (
                        <div className={styles.qrFooter}>
                            {footer}
                        </div>
                    )}
                </Stack>
            </div>
        </dialog>
    );
}

QRCodeDialog.displayName = 'QRCodeDialog';
