/**
 * Global Error Handler Component
 *
 * Catches unhandled JavaScript errors and promise rejections at the window level.
 * Provides a user-friendly error screen for global errors that aren't caught by
 * React's ErrorBoundary (e.g., async errors, event handlers).
 *
 * @example
 * // Wrap your app with GlobalErrorHandler
 * <GlobalErrorHandler>
 *   <App />
 * </GlobalErrorHandler>
 */
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { ErrorScreen } from './AuthComponents';

// =============================================================================
// Types
// =============================================================================

export interface GlobalError {
  /** Error message */
  message: string;
  /** Error source (filename, url) */
  source?: string;
  /** Line number where error occurred */
  lineno?: number;
  /** Column number where error occurred */
  colno?: number;
  /** Original error object */
  error?: Error;
  /** Type of error (window error, unhandled rejection, chunk load failure) */
  type: 'window-error' | 'unhandled-rejection' | 'chunk-load-failure';
}

export interface GlobalErrorHandlerProps {
  /** Child components to wrap */
  children: React.ReactNode;
  /** Custom fallback UI to render when an error occurs */
  fallback?: React.ReactNode;
  /** Callback when an error is caught (for error tracking services) */
  onError?: (error: GlobalError) => void;
  /** Custom title for the error screen */
  errorTitle?: string;
  /** Custom description for the error screen */
  errorDescription?: string;
  /** Show the retry button (default: true) */
  showRetryButton?: boolean;
  /** Custom retry button text */
  retryButtonText?: string;
  /** Custom retry handler (defaults to page reload) */
  onRetry?: () => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if an error is a chunk load failure (common in SPA code splitting)
 */
function isChunkLoadError(error: Error | unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('loading chunk') ||
      message.includes('loading css chunk') ||
      message.includes('failed to fetch dynamically imported module') ||
      message.includes('unable to preload css')
    );
  }
  return false;
}

/**
 * Get a user-friendly message for different error types
 */
function getErrorDescription(error: GlobalError): string {
  if (error.type === 'chunk-load-failure') {
    return 'En ny versjon av applikasjonen er tilgjengelig. Vennligst last siden på nytt.';
  }

  if (error.type === 'unhandled-rejection') {
    return 'En asynkron operasjon feilet. Vennligst prøv igjen.';
  }

  // Default message
  return 'En uventet feil har oppstått. Vennligst prøv igjen senere.';
}

// =============================================================================
// GlobalErrorHandler Component
// =============================================================================

export function GlobalErrorHandler({
  children,
  fallback,
  onError,
  errorTitle = 'Noe gikk galt',
  errorDescription,
  showRetryButton = true,
  retryButtonText = 'Last siden på nytt',
  onRetry,
}: GlobalErrorHandlerProps): React.ReactElement {
  const [error, setError] = useState<GlobalError | null>(null);

  /**
   * Handle window.onerror events
   */
  const handleWindowError = useCallback(
    (event: ErrorEvent): void => {
      // Prevent default browser error handling
      event.preventDefault();

      const globalError: GlobalError = {
        message: event.message || 'Unknown error',
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error instanceof Error ? event.error : undefined,
        type: isChunkLoadError(event.error) ? 'chunk-load-failure' : 'window-error',
      };

      console.error('GlobalErrorHandler caught a window error:', globalError);

      setError(globalError);

      // Call the onError callback if provided
      // TODO: Integrate with error tracking service (e.g., Sentry)
      if (onError) {
        onError(globalError);
      }
    },
    [onError]
  );

  /**
   * Handle unhandled promise rejection events
   */
  const handleUnhandledRejection = useCallback(
    (event: PromiseRejectionEvent): void => {
      // Prevent default browser error handling
      event.preventDefault();

      const reason = event.reason;
      const errorMessage =
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
            ? reason
            : 'Ubehandlet avvisning av løfte';

      const globalError: GlobalError = {
        message: errorMessage,
        error: reason instanceof Error ? reason : undefined,
        type: isChunkLoadError(reason) ? 'chunk-load-failure' : 'unhandled-rejection',
      };

      console.error('GlobalErrorHandler caught an unhandled rejection:', globalError);

      setError(globalError);

      // Call the onError callback if provided
      // TODO: Integrate with error tracking service (e.g., Sentry)
      if (onError) {
        onError(globalError);
      }
    },
    [onError]
  );

  /**
   * Handle retry action
   */
  const handleRetry = useCallback((): void => {
    // Reset error state
    setError(null);

    // Use custom retry handler if provided, otherwise reload the page
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  }, [onRetry]);

  /**
   * Set up global error listeners
   */
  useEffect(() => {
    // Add event listeners
    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [handleWindowError, handleUnhandledRejection]);

  // If an error occurred, show the error UI
  if (error) {
    // Use custom fallback if provided
    if (fallback) {
      return <>{fallback}</>;
    }

    // Use ErrorScreen with Norwegian text
    return (
      <ErrorScreen
        title={errorTitle}
        description={errorDescription || getErrorDescription(error)}
        showRetryButton={showRetryButton}
        retryButtonText={retryButtonText}
        onRetry={handleRetry}
      />
    );
  }

  // No error - render children
  return <>{children}</>;
}

// =============================================================================
// useGlobalError Hook
// =============================================================================

export interface UseGlobalErrorOptions {
  /** Callback when an error is caught */
  onError?: (error: GlobalError) => void;
}

/**
 * Hook to listen for global errors without rendering a fallback UI.
 * Useful for logging/tracking errors while letting them bubble up.
 *
 * @example
 * function App() {
 *   useGlobalError({
 *     onError: (error) => trackError(error),
 *   });
 *   return <MyApp />;
 * }
 */
export function useGlobalError(options: UseGlobalErrorOptions = {}): GlobalError | null {
  const [error, setError] = useState<GlobalError | null>(null);
  const { onError } = options;

  useEffect(() => {
    const handleError = (event: ErrorEvent): void => {
      const globalError: GlobalError = {
        message: event.message || 'Unknown error',
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error instanceof Error ? event.error : undefined,
        type: isChunkLoadError(event.error) ? 'chunk-load-failure' : 'window-error',
      };

      setError(globalError);

      if (onError) {
        onError(globalError);
      }
    };

    const handleRejection = (event: PromiseRejectionEvent): void => {
      const reason = event.reason;
      const errorMessage =
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
            ? reason
            : 'Ubehandlet avvisning av løfte';

      const globalError: GlobalError = {
        message: errorMessage,
        error: reason instanceof Error ? reason : undefined,
        type: isChunkLoadError(reason) ? 'chunk-load-failure' : 'unhandled-rejection',
      };

      setError(globalError);

      if (onError) {
        onError(globalError);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [onError]);

  return error;
}
