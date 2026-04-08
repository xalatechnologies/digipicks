/**
 * Grid Primitive
 *
 * Low-level grid layout component. Uses CSS module with custom properties
 * for dynamic values — no inline layout styles.
 */

import React, { forwardRef } from 'react';
import { cn } from '../utils';
import styles from './grid.module.css';

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * CSS Grid template columns
   * @default '1fr'
   */
  columns?: string;

  /**
   * CSS Grid template rows
   */
  rows?: string;

  /**
   * Gap between grid items. Defaults to --ds-size-4 via CSS.
   */
  gap?: string | number;

  /**
   * Column gap
   */
  gapX?: string | number;

  /**
   * Row gap
   */
  gapY?: string | number;
}

export const Grid = forwardRef<HTMLDivElement, GridProps>(
  ({
    children,
    columns = '1fr',
    rows,
    gap,
    gapX,
    gapY,
    className,
    style,
    ...props
  }, ref) => {
    const cssVars = {
      '--grid-columns': columns,
      ...(gap != null && { '--grid-gap': typeof gap === 'number' ? `${gap}px` : gap }),
      ...(gapX != null && { '--grid-gap-x': typeof gapX === 'number' ? `${gapX}px` : gapX }),
      ...(gapY != null && { '--grid-gap-y': typeof gapY === 'number' ? `${gapY}px` : gapY }),
      ...(rows != null && { '--grid-rows': rows }),
      ...style,
    } as React.CSSProperties;

    return (
      <div
        ref={ref}
        className={cn(styles.grid, 'ds-grid', className)}
        style={cssVars}
        {...(gapX != null && { 'data-has-gap-x': '' })}
        {...(gapY != null && { 'data-has-gap-y': '' })}
        {...(rows != null && { 'data-has-rows': '' })}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Grid.displayName = 'Grid';
