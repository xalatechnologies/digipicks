/**
 * Page Header Component
 * 
 * A consistent header component for pages with title, subtitle, and actions
 */

import React, { forwardRef } from 'react';
import { Heading, Paragraph } from '@digdir/designsystemet-react';
import { cn } from '../utils';
import styles from './page-header.module.css';

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The page title */
  title: string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Action buttons to display on the right */
  actions?: React.ReactNode;
  /** Breadcrumb navigation */
  breadcrumb?: React.ReactNode;
  /** Whether to show a border bottom @default false */
  bordered?: boolean;
  /** Heading level for the title @default 1 */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

export const PageHeader = forwardRef<HTMLDivElement, PageHeaderProps>(
  ({
    children,
    title,
    subtitle,
    actions,
    breadcrumb,
    bordered = false,
    level = 1,
    className,
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(styles.header, className)}
        data-bordered={bordered}
        {...props}
      >
        <div className={styles.content}>
          {breadcrumb && (
            <div className={styles.breadcrumb}>{breadcrumb}</div>
          )}
          <Heading level={level} className={styles.title} data-has-subtitle={!!subtitle}>
            {title}
          </Heading>
          {subtitle && (
            <Paragraph className={styles.subtitle}>
              {subtitle}
            </Paragraph>
          )}
          {children}
        </div>

        {actions && (
          <div className={styles.actions}>
            {actions}
          </div>
        )}
      </div>
    );
  }
);

PageHeader.displayName = 'PageHeader';
