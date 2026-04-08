/**
 * Auth-related UI components
 *
 * Reusable components for loading states, access denied screens,
 * and other auth-related UI patterns.
 */
import * as React from 'react';
import { Spinner, Heading, Paragraph, Button } from '@digdir/designsystemet-react';
import { Stack } from '../primitives';
import { cn } from '../utils';
import styles from './AuthComponents.module.css';

// =============================================================================
// LoadingScreen - Full page loading state
// =============================================================================

export interface LoadingScreenProps {
  /** Loading message */
  message?: string;
  /** Screen height (default: 100vh) — dynamic, kept as inline style */
  height?: string;
  /** Custom class name */
  className?: string;
}

export function LoadingScreen({
  message = 'Laster...',
  height = '100vh',
  className,
}: LoadingScreenProps): React.ReactElement {
  return (
    <Stack
      align="center"
      justify="center"
      spacing="var(--ds-size-4)"
      className={cn(styles.loadingScreen, className)}
      style={{ height }}
    >
      <Spinner aria-label={message} data-size="lg" />
      {message && (
        <Paragraph data-size="sm" className={styles.loadingMessage}>
          {message}
        </Paragraph>
      )}
    </Stack>
  );
}

// =============================================================================
// AccessDeniedScreen - No permission error screen
// =============================================================================

export interface AccessDeniedScreenProps {
  /** Title text */
  title?: string;
  /** Description text */
  description?: string;
  /** Show back button */
  showBackButton?: boolean;
  /** Back button text */
  backButtonText?: string;
  /** Back button click handler */
  onBack?: () => void;
  /** Optional icon (consumer provides, defaults to none) */
  icon?: React.ReactNode;
  /** Custom class name */
  className?: string;
}

export function AccessDeniedScreen({
  title = 'Ingen tilgang',
  description = 'Du har ikke tilgang til denne siden. Kontakt administrator hvis du mener dette er feil.',
  showBackButton = false,
  backButtonText = 'Gå tilbake',
  onBack,
  icon,
  className,
}: AccessDeniedScreenProps): React.ReactElement {
  return (
    <Stack
      align="center"
      justify="center"
      spacing="var(--ds-size-4)"
      className={cn(styles.centeredScreen, className)}
    >
      {icon && (
        <div className={styles.iconCircleDanger}>
          {icon}
        </div>
      )}

      <Heading level={1} data-size="lg" className={styles.dangerTitle}>
        {title}
      </Heading>

      <Paragraph className={styles.screenDescription}>
        {description}
      </Paragraph>

      {showBackButton && onBack && (
        <Button
          type="button"
          variant="secondary"
          onClick={onBack}
          className={styles.screenAction}
        >
          {backButtonText}
        </Button>
      )}
    </Stack>
  );
}

// =============================================================================
// NotFoundScreen - 404 error screen
// =============================================================================

export interface NotFoundScreenProps {
  /** Title text */
  title?: string;
  /** Description text */
  description?: string;
  /** Show home button */
  showHomeButton?: boolean;
  /** Home button text */
  homeButtonText?: string;
  /** Home button click handler */
  onHome?: () => void;
  /** Custom class name */
  className?: string;
}

export function NotFoundScreen({
  title = 'Siden finnes ikke',
  description = 'Beklager, vi kunne ikke finne siden du leter etter.',
  showHomeButton = false,
  homeButtonText = 'Gå til forsiden',
  onHome,
  className,
}: NotFoundScreenProps): React.ReactElement {
  return (
    <Stack
      align="center"
      justify="center"
      spacing="var(--ds-size-4)"
      className={cn(styles.centeredScreen, className)}
    >
      <Heading level={1} data-size="2xl" className={styles.notFoundCode}>
        404
      </Heading>

      <Heading level={2} data-size="lg" className={styles.screenTitle}>
        {title}
      </Heading>

      <Paragraph className={styles.screenDescription}>
        {description}
      </Paragraph>

      {showHomeButton && onHome && (
        <Button
          type="button"
          variant="primary"
          onClick={onHome}
          className={styles.screenAction}
        >
          {homeButtonText}
        </Button>
      )}
    </Stack>
  );
}

// =============================================================================
// ErrorScreen - Generic error screen
// =============================================================================

export interface ErrorScreenProps {
  /** Title text */
  title?: string;
  /** Description text */
  description?: string;
  /** Error details (optional) */
  errorDetails?: string;
  /** Show retry button */
  showRetryButton?: boolean;
  /** Retry button text */
  retryButtonText?: string;
  /** Retry button click handler */
  onRetry?: () => void;
  /** Optional icon (consumer provides, defaults to none) */
  icon?: React.ReactNode;
  /** Custom class name */
  className?: string;
}

export function ErrorScreen({
  title = 'Noe gikk galt',
  description = 'Beklager, det oppstod en feil. Prøv igjen senere.',
  errorDetails,
  showRetryButton = false,
  retryButtonText = 'Prøv igjen',
  onRetry,
  icon,
  className,
}: ErrorScreenProps): React.ReactElement {
  return (
    <Stack
      align="center"
      justify="center"
      spacing="var(--ds-size-4)"
      className={cn(styles.centeredScreen, className)}
    >
      {icon && (
        <div className={styles.iconCircleWarning}>
          {icon}
        </div>
      )}

      <Heading level={1} data-size="lg" className={styles.screenTitle}>
        {title}
      </Heading>

      <Paragraph className={styles.screenDescription}>
        {description}
      </Paragraph>

      {errorDetails && (
        <code className={styles.errorDetails}>
          {errorDetails}
        </code>
      )}

      {showRetryButton && onRetry && (
        <Button
          type="button"
          variant="primary"
          onClick={onRetry}
          className={styles.screenAction}
        >
          {retryButtonText}
        </Button>
      )}
    </Stack>
  );
}

// =============================================================================
// PermissionGate - Render children only if condition is met
// =============================================================================

export interface PermissionGateProps {
  /** Whether the user has permission */
  allowed: boolean;
  /** Content to render when allowed */
  children: React.ReactNode;
  /** Content to render when not allowed (defaults to AccessDeniedScreen) */
  fallback?: React.ReactNode;
}

export function PermissionGate({
  allowed,
  children,
  fallback,
}: PermissionGateProps): React.ReactElement | null {
  if (allowed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return <AccessDeniedScreen />;
}
