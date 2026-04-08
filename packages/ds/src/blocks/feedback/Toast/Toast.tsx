import { createContext, useContext, useState, useCallback } from 'react';
import { Paragraph } from '@digdir/designsystemet-react';
import { CloseIcon } from '../../../primitives/icons';
import styles from './Toast.module.css';

export interface ToastMessage {
    id: string;
    title: string;
    description?: string;
    variant: 'info' | 'success' | 'warning' | 'error';
    duration?: number;
}

export type ToastVariant = ToastMessage['variant'];

interface ToastContextValue {
    toasts: ToastMessage[];
    showToast: (toast: Omit<ToastMessage, 'id'>) => void;
    dismissToast: (id: string) => void;
    /** Shorthand: show success toast */
    success: (title: string, description?: string) => void;
    /** Shorthand: show error toast */
    error: (title: string, description?: string) => void;
    /** Shorthand: show warning toast */
    warning: (title: string, description?: string) => void;
    /** Shorthand: show info toast */
    info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}

/**
 * ToastProvider - Toast notification system provider
 * 
 * Provides toast notification functionality to the app.
 * Uses only design tokens - no custom styling allowed.
 * 
 * @example
 * ```tsx
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 * 
 * // In component:
 * const { showToast } = useToast();
 * showToast({
 *   title: 'Success!',
 *   description: 'Your changes have been saved',
 *   variant: 'success'
 * });
 * ```
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
        const id = crypto.randomUUID();
        const duration = toast.duration ?? 5000;

        setToasts((prev) => [...prev, { ...toast, id }]);

        // Auto-dismiss after duration
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const success = useCallback((title: string, description?: string) => {
        showToast({ title, description, variant: 'success' });
    }, [showToast]);

    const error = useCallback((title: string, description?: string) => {
        showToast({ title, description, variant: 'error' });
    }, [showToast]);

    const warning = useCallback((title: string, description?: string) => {
        showToast({ title, description, variant: 'warning' });
    }, [showToast]);

    const info = useCallback((title: string, description?: string) => {
        showToast({ title, description, variant: 'info' });
    }, [showToast]);

    return (
        <ToastContext.Provider value={{ toasts, showToast, dismissToast, success, error, warning, info }}>
            {children}
            {toasts.length > 0 && (
                <div className={styles.container} role="region" aria-label="Notifications" aria-live="polite">
                    {toasts.map((toast) => (
                        <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
                    ))}
                </div>
            )}
        </ToastContext.Provider>
    );
}

interface ToastProps {
    toast: ToastMessage;
    onDismiss: (id: string) => void;
}

function Toast({ toast, onDismiss }: ToastProps) {
    return (
        <div className={styles.toast} data-variant={toast.variant} role="status">
            <div className={styles.icon}>
                {toast.variant === 'success' && <SuccessIcon />}
                {toast.variant === 'error' && <ErrorIcon />}
                {toast.variant === 'warning' && <WarningIcon />}
                {toast.variant === 'info' && <InfoIcon />}
            </div>
            <div className={styles.content}>
                <Paragraph data-size="sm" className={styles.title}>{toast.title}</Paragraph>
                {toast.description && <Paragraph data-size="xs" className={styles.description}>{toast.description}</Paragraph>}
            </div>
            <button
                type="button"
                className={styles.closeButton}
                onClick={() => onDismiss(toast.id)}
                aria-label="Close notification"
            >
                <CloseIcon />
            </button>
        </div>
    );
}

// Simple icon components
function InfoIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm1 15H9V9h2v6zm0-8H9V5h2v2z" />
        </svg>
    );
}

function SuccessIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm-2 15l-5-5 1.41-1.41L8 12.17l7.59-7.59L17 6l-9 9z" />
        </svg>
    );
}

function ErrorIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm1 15H9v-2h2v2zm0-4H9V5h2v6z" />
        </svg>
    );
}

function WarningIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M1 17h18L10 1 1 17zm10-2H9v-2h2v2zm0-4H9V7h2v4z" />
        </svg>
    );
}
