/**
 * Dialog Components
 * 
 * Reusable dialog components for confirmations and alerts.
 * Uses native dialog element with design system styling.
 */

import { type ReactNode, useState, useCallback, createContext, useContext, useEffect, useRef } from 'react';
import { Button, Heading, Paragraph } from '@digdir/designsystemet-react';
import { InfoIcon, CheckCircleIcon, AlertTriangleIcon, XCircleIcon } from '../primitives';
import styles from './dialogs.module.css';

// =============================================================================
// Types
// =============================================================================

export type DialogVariant = 'info' | 'success' | 'warning' | 'danger';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
  isLoading?: boolean;
}

export interface AlertDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  closeText?: string;
  variant?: DialogVariant;
}

// =============================================================================
// Icon Mapping
// =============================================================================

function getVariantIcon(variant: DialogVariant): ReactNode {
  switch (variant) {
    case 'success':
      return <CheckCircleIcon size={24} />;
    case 'warning':
      return <AlertTriangleIcon size={24} />;
    case 'danger':
      return <XCircleIcon size={24} />;
    default:
      return <InfoIcon size={24} />;
  }
}

// =============================================================================
// Dialog Base
// =============================================================================

interface DialogBaseProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Internal modal for ConfirmDialog/AlertDialog.
 * For custom content, use DigDir Dialog (exported from @digilist-saas/ds) with Dialog.Block.
 */
function ModalDialog({ open, onClose, children }: DialogBaseProps) {
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

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClick = (e: MouseEvent) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog = (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      );
      if (!isInDialog) {
        onClose();
      }
    };

    dialog.addEventListener('click', handleClick);
    return () => dialog.removeEventListener('click', handleClick);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className={styles.dialog}
    >
      <div className={styles.dialogInner} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </dialog>
  );
}

// =============================================================================
// ConfirmDialog Component
// =============================================================================

/**
 * Confirmation dialog for destructive or important actions.
 * 
 * @example
 * ```tsx
 * <ConfirmDialog
 *   open={showDelete}
 *   onClose={() => setShowDelete(false)}
 *   onConfirm={handleDelete}
 *   title="Slett booking?"
 *   description="Er du sikker på at du vil slette denne bookingen?"
 *   confirmText="Slett"
 *   cancelText="Avbryt"
 *   variant="danger"
 * />
 * ```
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Bekreft',
  cancelText = 'Avbryt',
  variant = 'info',
  isLoading = false,
}: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Confirm action failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const isProcessing = loading || isLoading;

  return (
    <ModalDialog open={open} onClose={onClose}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.iconCircle} data-variant={variant}>
          {getVariantIcon(variant)}
        </div>
        <Heading level={2} data-size="sm" className={styles.title}>
          {title}
        </Heading>
      </div>

      {/* Body */}
      {description && (
        <div className={styles.body}>
          <Paragraph className={styles.description}>
            {description}
          </Paragraph>
        </div>
      )}

      {/* Footer */}
      <div className={styles.footer}>
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={isProcessing}
        >
          {cancelText}
        </Button>
        <Button
          type="button"
          variant="primary"
          {...(variant === 'danger' ? { 'data-color': 'danger' } : {})}
          onClick={handleConfirm}
          disabled={isProcessing}
        >
          {isProcessing ? 'Vennligst vent...' : confirmText}
        </Button>
      </div>
    </ModalDialog>
  );
}

// =============================================================================
// AlertDialog Component
// =============================================================================

/**
 * Alert dialog for displaying important information.
 * 
 * @example
 * ```tsx
 * <AlertDialog
 *   open={showSuccess}
 *   onClose={() => setShowSuccess(false)}
 *   title="Booking bekreftet!"
 *   description="Du vil motta en bekreftelse på e-post."
 *   variant="success"
 * />
 * ```
 */
export function AlertDialog({
  open,
  onClose,
  title,
  description,
  closeText = 'Lukk',
  variant = 'info',
}: AlertDialogProps) {
  return (
    <ModalDialog open={open} onClose={onClose}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.iconCircle} data-variant={variant}>
          {getVariantIcon(variant)}
        </div>
        <Heading level={2} data-size="sm" className={styles.title}>
          {title}
        </Heading>
      </div>

      {/* Body */}
      {description && (
        <div className={styles.body}>
          <Paragraph className={styles.description}>
            {description}
          </Paragraph>
        </div>
      )}

      {/* Footer */}
      <div className={styles.footer}>
        <Button type="button" variant="primary" onClick={onClose}>
          {closeText}
        </Button>
      </div>
    </ModalDialog>
  );
}

// =============================================================================
// Dialog Context & Hook
// =============================================================================

interface DialogContextValue {
  confirm: (options: Omit<ConfirmDialogProps, 'open' | 'onClose' | 'onConfirm'> & { onConfirm?: () => void | Promise<void> }) => Promise<boolean>;
  alert: (options: Omit<AlertDialogProps, 'open' | 'onClose'>) => Promise<void>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

interface DialogState {
  type: 'confirm' | 'alert';
  props: ConfirmDialogProps | AlertDialogProps;
  resolve: (value: boolean) => void;
}

/**
 * Provider for imperative dialog access via useDialog hook.
 */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const confirm = useCallback((options: Omit<ConfirmDialogProps, 'open' | 'onClose' | 'onConfirm'> & { onConfirm?: () => void | Promise<void> }): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({
        type: 'confirm',
        props: {
          ...options,
          open: true,
          onClose: () => {
            setDialog(null);
            resolve(false);
          },
          onConfirm: async () => {
            await options.onConfirm?.();
            setDialog(null);
            resolve(true);
          },
        } as ConfirmDialogProps,
        resolve,
      });
    });
  }, []);

  const alert = useCallback((options: Omit<AlertDialogProps, 'open' | 'onClose'>): Promise<void> => {
    return new Promise((resolve) => {
      setDialog({
        type: 'alert',
        props: {
          ...options,
          open: true,
          onClose: () => {
            setDialog(null);
            resolve();
          },
        } as AlertDialogProps,
        resolve: () => resolve(),
      });
    });
  }, []);

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      {dialog?.type === 'confirm' && (
        <ConfirmDialog {...(dialog.props as ConfirmDialogProps)} />
      )}
      {dialog?.type === 'alert' && (
        <AlertDialog {...(dialog.props as AlertDialogProps)} />
      )}
    </DialogContext.Provider>
  );
}

/**
 * Hook for imperative dialog access.
 * 
 * @example
 * ```tsx
 * const { confirm, alert } = useDialog();
 * 
 * const handleDelete = async () => {
 *   const confirmed = await confirm({
 *     title: 'Slett booking?',
 *     description: 'Handlingen kan ikke angres.',
 *     variant: 'danger',
 *   });
 *   if (confirmed) {
 *     await deleteBooking();
 *   }
 * };
 * ```
 */
export function useDialog(): DialogContextValue {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}
