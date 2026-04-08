/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree
 * and displays a user-friendly error screen with recovery options.
 *
 * This is a class component as required by React's error boundary API.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorScreen } from './AuthComponents';

// =============================================================================
// ErrorBoundary - React Error Boundary Class Component
// =============================================================================

export interface ErrorBoundaryProps {
  /** Child components to wrap and catch errors for */
  children: ReactNode;
  /** Custom fallback UI to render when an error occurs */
  fallback?: ReactNode;
  /** Callback when an error is caught (for error tracking services) */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
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

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console for development debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call the onError callback if provided (for error tracking services)
    // TODO: Integrate with error tracking service (e.g., Sentry)
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = (): void => {
    // Reset error state
    this.setState({ hasError: false, error: null });

    // Use custom retry handler if provided, otherwise reload the page
    if (this.props.onRetry) {
      this.props.onRetry();
    } else {
      window.location.reload();
    }
  };

  render(): ReactNode {
    const {
      children,
      fallback,
      errorTitle = 'Noe gikk galt',
      errorDescription,
      showRetryButton = true,
      retryButtonText = 'Last siden på nytt',
    } = this.props;

    if (this.state.hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Use ErrorScreen with Norwegian text
      return (
        <ErrorScreen
          title={errorTitle}
          description={
            errorDescription ||
            this.state.error?.message ||
            'En uventet feil har oppstått. Vennligst prøv igjen.'
          }
          showRetryButton={showRetryButton}
          retryButtonText={retryButtonText}
          onRetry={this.handleRetry}
        />
      );
    }

    return children;
  }
}

// =============================================================================
// withErrorBoundary - Higher-Order Component wrapper
// =============================================================================

export interface WithErrorBoundaryOptions {
  /** Custom fallback UI to render when an error occurs */
  fallback?: ReactNode;
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Custom title for the error screen */
  errorTitle?: string;
  /** Custom description for the error screen */
  errorDescription?: string;
}

/**
 * Higher-order component that wraps a component with an ErrorBoundary
 *
 * @example
 * const SafeComponent = withErrorBoundary(UnsafeComponent, {
 *   errorTitle: 'Komponent feil',
 *   onError: (error) => logToService(error),
 * });
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
): React.FC<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const ComponentWithErrorBoundary: React.FC<P> = (props) => {
    // Build props object only with defined values to satisfy exactOptionalPropertyTypes
    const boundaryProps: Partial<ErrorBoundaryProps> & { children: ReactNode } = {
      children: <WrappedComponent {...props} />,
    };

    if (options.fallback !== undefined) {
      boundaryProps.fallback = options.fallback;
    }
    if (options.onError !== undefined) {
      boundaryProps.onError = options.onError;
    }
    if (options.errorTitle !== undefined) {
      boundaryProps.errorTitle = options.errorTitle;
    }
    if (options.errorDescription !== undefined) {
      boundaryProps.errorDescription = options.errorDescription;
    }

    return <ErrorBoundary {...(boundaryProps as ErrorBoundaryProps)} />;
  };

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return ComponentWithErrorBoundary;
}
