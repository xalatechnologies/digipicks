/**
 * Layout Grid Component
 * 
 * A responsive grid layout component for consistent spacing and alignment
 */

import React, { forwardRef } from 'react';

export interface LayoutGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Number of columns for different breakpoints
   */
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  
  /**
   * Gap between grid items
   * @default 16
   */
  gap?: number;
  
  /**
   * Whether to use auto-fit for responsive columns
   * @default false
   */
  autoFit?: boolean;
  
  /**
   * Minimum column width when using auto-fit
   * @default '300px'
   */
  minColumnWidth?: string;
}

export const LayoutGrid = forwardRef<HTMLDivElement, LayoutGridProps>(
  ({
    children,
    columns = { md: 1 },
    gap = 16,
    autoFit = false,
    minColumnWidth = '300px',
    className,
    style,
    ...props
  }, ref) => {
    const getGridTemplateColumns = () => {
      if (autoFit) {
        return `repeat(auto-fit, minmax(${minColumnWidth}, 1fr))`;
      }
      
      const breakpoints = {
        sm: columns.sm || 1,
        md: columns.md || 1,
        lg: columns.lg || columns.md || 1,
        xl: columns.xl || columns.lg || columns.md || 1
      };
      
      return `repeat(${breakpoints.md}, 1fr)`;
    };

    const gridStyle = {
      display: 'grid',
      gap: `${gap}px`,
      gridTemplateColumns: getGridTemplateColumns(),
      ...style
    };

    return (
      <div
        ref={ref}
        className={className}
        style={gridStyle}
        {...props}
      >
        {children}
      </div>
    );
  }
);

LayoutGrid.displayName = 'LayoutGrid';
