/**
 * PageContentLayout
 *
 * Standard vertical stack for dashboard page content. Replaces repeated
 * div style={{ display: 'flex', flexDirection: 'column', gap: '...' }}.
 * Uses .module.css and design tokens only.
 */

import { cn } from '../../../utils';
import styles from './PageContentLayout.module.css';

export interface PageContentLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Padding variant */
  padding?: 'none' | 'default' | 'lg';
  /** Gap between sections */
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  /** Additional class name */
  className?: string;
}

export function PageContentLayout({
  children,
  padding = 'none',
  gap = 'md',
  className,
  ...props
}: PageContentLayoutProps): React.ReactElement {
  return (
    <div
      className={cn(styles.root, className)}
      data-padding={padding}
      data-gap={gap}
      {...props}
    >
      {children}
    </div>
  );
}

PageContentLayout.displayName = 'PageContentLayout';
