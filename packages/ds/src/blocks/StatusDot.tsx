/**
 * StatusDot — Small colored indicator dot for online/offline status.
 */
import { cn } from '../utils';
import styles from './StatusDot.module.css';

export interface StatusDotProps {
  /** Color variant */
  variant?: 'success' | 'warning' | 'danger' | 'neutral';
  /** Size */
  size?: 'sm' | 'md';
  /** Custom class */
  className?: string;
}

export function StatusDot({
  variant = 'success',
  size = 'sm',
  className,
}: StatusDotProps): React.ReactElement {
  return (
    <span
      className={cn(styles.dot, className)}
      data-variant={variant}
      data-size={size}
      aria-hidden="true"
    />
  );
}

StatusDot.displayName = 'StatusDot';
