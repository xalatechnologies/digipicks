/**
 * Container Primitive
 * 
 * Low-level container component for consistent layouts
 */

import React, { forwardRef } from 'react';
import { cn } from '../utils';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Maximum width of the container
   * @default '1440px'
   */
  maxWidth?: string;
  
  /**
   * Whether to use fluid layout (no max-width)
   * @default false
   */
  fluid?: boolean;
  
  /**
   * Padding
   * @default 'var(--ds-size-8)'
   */
  padding?: string | number;
  
  /**
   * Horizontal padding only
   */
  px?: string | number;
  
  /**
   * Vertical padding only
   */
  py?: string | number;
}

export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({
    children,
    maxWidth = '1440px',
    fluid = false,
    padding = 'var(--ds-size-8)',
    px,
    py,
    className,
    style,
    ...props
  }, ref) => {
    const containerStyle: React.CSSProperties = {
      containerType: 'inline-size',
      containerName: 'ds-container',
      maxWidth: fluid ? 'none' : maxWidth,
      margin: '0 auto',
      padding: typeof padding === 'number' ? `${padding}px` : padding,
      paddingLeft: px ? (typeof px === 'number' ? `${px}px` : px) : undefined,
      paddingRight: px ? (typeof px === 'number' ? `${px}px` : px) : undefined,
      paddingTop: py ? (typeof py === 'number' ? `${py}px` : py) : undefined,
      paddingBottom: py ? (typeof py === 'number' ? `${py}px` : py) : undefined,
      ...style
    } as React.CSSProperties;

    return (
      <div
        ref={ref}
        className={cn('ds-container', className)}
        style={containerStyle}
        data-fluid={fluid ? 'true' : undefined}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Container.displayName = 'Container';
