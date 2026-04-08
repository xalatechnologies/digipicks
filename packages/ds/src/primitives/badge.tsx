/**
 * Badge Component
 *
 * Small status or label component
 *
 * @deprecated Use `Tag` from `@digdir/designsystemet-react` instead.
 * This component will be removed in a future version.
 */

import React, { forwardRef } from 'react';
import { cn } from '../utils';

/** @deprecated Use `Tag` from `@digdir/designsystemet-react` instead. */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Badge variant
   * @default 'neutral'
   */
  variant?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
  
  /**
   * Badge size
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
}

/** @deprecated Use `Tag` from `@digdir/designsystemet-react` instead. */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'neutral', size = 'md', className, style, ...props }, ref) => {
    const getStyles = () => {
      const base: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'var(--ds-font-weight-medium)' as unknown as number,
        borderRadius: 'var(--ds-border-radius-sm)',
        transition: 'all 0.2s',
      };

      // Size mapping using design tokens
      const sizes = {
        sm: { fontSize: 'var(--ds-font-size-xs)', padding: 'var(--ds-size-1) var(--ds-size-2)', height: 'var(--ds-size-5)' },
        md: { fontSize: 'var(--ds-font-size-sm)', padding: 'var(--ds-size-1) var(--ds-size-3)', height: 'var(--ds-size-6)' },
        lg: { fontSize: 'var(--ds-font-size-md)', padding: 'var(--ds-size-2) var(--ds-size-4)', height: 'var(--ds-size-8)' },
      };

      // Variant mapping using correct token names
      const variants = {
        neutral: {
          backgroundColor: 'var(--ds-color-neutral-surface-hover)',
          color: 'var(--ds-color-neutral-text-default)',
        },
        info: {
          backgroundColor: 'var(--ds-color-info-surface-default)',
          color: 'var(--ds-color-info-text-default)',
        },
        success: {
          backgroundColor: 'var(--ds-color-success-surface-default)',
          color: 'var(--ds-color-success-text-default)',
        },
        warning: {
          backgroundColor: 'var(--ds-color-warning-surface-default)',
          color: 'var(--ds-color-warning-text-default)',
        },
        danger: {
          backgroundColor: 'var(--ds-color-danger-surface-default)',
          color: 'var(--ds-color-danger-text-default)',
        },
      };

      return {
        ...base,
        ...sizes[size],
        ...variants[variant],
      };
    };

    return (
      <span
        ref={ref}
        className={cn('ds-badge', className)}
        style={{ ...getStyles(), ...style }}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';
