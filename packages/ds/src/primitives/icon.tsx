/**
 * Icon Component
 * 
 * Simple SVG icon wrapper
 */

import React, { forwardRef } from 'react';

export interface IconProps extends React.SVGAttributes<SVGSVGElement> {
  /**
   * Icon size
   * @default 20
   */
  size?: number;
  
  /**
   * Icon color (CSS variable or color)
   */
  color?: string;
}

export const Icon = forwardRef<SVGSVGElement, IconProps>(
  ({ size = 20, color = 'currentColor', children, ...props }, ref) => {
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        {children}
      </svg>
    );
  }
);

Icon.displayName = 'Icon';
