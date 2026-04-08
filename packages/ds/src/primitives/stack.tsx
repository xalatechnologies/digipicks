/**
 * Stack Primitive
 *
 * Low-level stack component for vertical/horizontal layouts.
 * Uses CSS module with custom properties — no inline layout styles.
 */

import React, { forwardRef } from 'react';
import { cn } from '../utils';
import styles from './stack.module.css';

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Direction of the stack
   * @default 'vertical'
   */
  direction?: 'vertical' | 'horizontal';

  /**
   * Spacing between items
   * @default '0'
   */
  spacing?: string | number;

  /**
   * Align items
   */
  align?: 'start' | 'center' | 'end' | 'stretch';

  /**
   * Justify items
   */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

  /**
   * Whether to wrap items
   * @default false
   */
  wrap?: boolean;
}

export const Stack = forwardRef<HTMLDivElement, StackProps>(
  ({
    children,
    direction = 'vertical',
    spacing = 0,
    align,
    justify,
    wrap = false,
    className,
    style,
    ...props
  }, ref) => {
    const cssVars = {
      '--stack-direction': direction === 'vertical' ? 'column' : 'row',
      '--stack-gap': typeof spacing === 'number' ? `${spacing}px` : spacing,
      '--stack-wrap': wrap ? 'wrap' : 'nowrap',
      ...style,
    } as React.CSSProperties;

    return (
      <div
        ref={ref}
        className={cn(styles.stack, `ds-stack`, `ds-stack--${direction}`, className)}
        style={cssVars}
        {...(align && { 'data-align': align })}
        {...(justify && { 'data-justify': justify })}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Stack.displayName = 'Stack';
