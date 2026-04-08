/**
 * QRCodeDialog.test.tsx
 *
 * Component tests for the DS QRCodeDialog block.
 * Note: jsdom does not fully support `<dialog>` showModal()/close(),
 * so we mock them and test rendering + aria attributes.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QRCodeDialog } from '../blocks/QRCodeDialog';

// Mock dialog methods not supported by jsdom
beforeAll(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
        this.removeAttribute('open');
    });
});

const defaultProps = {
    open: true,
    onClose: vi.fn(),
    title: 'QR-kode',
    qrContent: <div data-testid="qr-content">QR Code Here</div>,
};

describe('QRCodeDialog', () => {
    describe('Rendering', () => {
        it('renders the dialog element', () => {
            render(<QRCodeDialog {...defaultProps} />);
            const dialog = document.querySelector('dialog');
            expect(dialog).not.toBeNull();
        });

        it('renders the title', () => {
            render(<QRCodeDialog {...defaultProps} />);
            expect(screen.getByText('QR-kode')).toBeInTheDocument();
        });

        it('renders the description when provided', () => {
            render(
                <QRCodeDialog
                    {...defaultProps}
                    description="Vis denne QR-koden ved inngangen"
                />
            );
            expect(screen.getByText('Vis denne QR-koden ved inngangen')).toBeInTheDocument();
        });

        it('does not render description when not provided', () => {
            render(<QRCodeDialog {...defaultProps} />);
            expect(screen.queryByText('Vis denne')).not.toBeInTheDocument();
        });

        it('renders the qrContent slot', () => {
            render(<QRCodeDialog {...defaultProps} />);
            expect(screen.getByTestId('qr-content')).toBeInTheDocument();
            expect(screen.getByText('QR Code Here')).toBeInTheDocument();
        });

        it('renders footer when provided', () => {
            render(
                <QRCodeDialog
                    {...defaultProps}
                    footer={<button type="button">Lukk</button>}
                />
            );
            expect(screen.getByText('Lukk')).toBeInTheDocument();
        });

        it('does not render footer when not provided', () => {
            render(<QRCodeDialog {...defaultProps} />);
            expect(screen.queryByText('Lukk')).not.toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('has aria-label matching the title by default', () => {
            render(<QRCodeDialog {...defaultProps} />);
            const dialog = document.querySelector('dialog');
            expect(dialog).toHaveAttribute('aria-label', 'QR-kode');
        });

        it('uses custom ariaLabel when provided', () => {
            render(
                <QRCodeDialog
                    {...defaultProps}
                    ariaLabel="Billett QR-kode"
                />
            );
            const dialog = document.querySelector('dialog');
            expect(dialog).toHaveAttribute('aria-label', 'Billett QR-kode');
        });
    });

    describe('Dialog lifecycle', () => {
        it('calls showModal when open=true', () => {
            render(<QRCodeDialog {...defaultProps} open={true} />);
            expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
        });

        it('calls close when open=false', () => {
            render(<QRCodeDialog {...defaultProps} open={false} />);
            expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
        });
    });
});
