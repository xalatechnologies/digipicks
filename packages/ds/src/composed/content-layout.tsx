/**
 * Content Layout Component
 * 
 * High-level layout component for page content
 */

import React, { forwardRef } from 'react';
import { Container, Grid } from '../primitives';
import { cn } from '../utils';
import styles from './content-layout.module.css';

export interface ContentLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Maximum width of the content @default '1440px' */
  maxWidth?: string;
  /** Padding of the container @default '32px' */
  padding?: string | number;
  /** Whether to use fluid layout @default false */
  fluid?: boolean;
  /** Header offset to account for fixed headers @default 'none' */
  headerOffset?: 'none' | 'sm' | 'md' | 'lg';
  /** Grid configuration for content */
  grid?: {
    columns?: string;
    gap?: string | number;
  };
}

export const ContentLayout = forwardRef<HTMLDivElement, ContentLayoutProps>(
  ({
    children,
    maxWidth = '1440px',
    padding = '32px',
    fluid = false,
    headerOffset = 'none',
    grid,
    className,
    ...props
  }, ref) => {
    const content = grid ? (
      <Grid
        columns={grid.columns || '1fr'}
        gap={grid.gap || 0}
      >
        {children}
      </Grid>
    ) : children;

    return (
      <Container
        ref={ref}
        maxWidth={maxWidth}
        padding={padding}
        fluid={fluid}
        className={cn(styles.layout, className)}
        data-header-offset={headerOffset !== 'none' ? headerOffset : undefined}
        id="main"
        {...props}
      >
        {content}
      </Container>
    );
  }
);

ContentLayout.displayName = 'ContentLayout';
