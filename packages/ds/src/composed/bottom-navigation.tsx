/**
 * BottomNavigation Component
 *
 * Mobile-first bottom navigation with 44px+ touch targets
 * Following DIGILIST design patterns - thumb-friendly navigation
 * Uses design system tokens for styling
 */

import React, { forwardRef } from 'react';
import { cn } from '../utils';
import styles from './bottom-navigation.module.css';

export interface BottomNavigationItem {
  /** Unique identifier for the nav item */
  id: string;
  /** Display label */
  label: string;
  /** Icon element */
  icon: React.ReactNode;
  /** Navigation href */
  href: string;
  /** Is this item active? @default false */
  active?: boolean;
  /** Badge count (optional) */
  badge?: number;
  /** Click handler (if not using href) */
  onClick?: (e: React.MouseEvent) => void;
}

export interface BottomNavigationProps extends React.HTMLAttributes<HTMLElement> {
  /** Navigation items (3-5 recommended for optimal UX) */
  items: BottomNavigationItem[];
  /** Whether navigation is fixed to bottom @default true */
  fixed?: boolean;
  /** Background variant @default 'surface' */
  variant?: 'surface' | 'background';
  /** Show labels @default true */
  showLabels?: boolean;
  /** Safe area inset bottom (for iPhone notches) @default true */
  safeArea?: boolean;
}

export const BottomNavigation = forwardRef<HTMLElement, BottomNavigationProps>(
  ({
    items,
    fixed = true,
    variant = 'surface',
    showLabels = true,
    safeArea = true,
    className,
    ...props
  }, ref) => {
    return (
      <nav
        ref={ref}
        className={cn(styles.nav, className)}
        data-fixed={fixed}
        data-variant={variant}
        data-safe-area={safeArea}
        role="navigation"
        aria-label="Bottom navigation"
        {...props}
      >
        <div className={styles.inner}>
          {items.map((item) => {
            const isActive = item.active ?? false;
            const ItemWrapper = item.href ? 'a' : 'button';

            return (
              <ItemWrapper
                key={item.id}
                href={item.href ? item.href : undefined}
                onClick={item.onClick}
                className={styles.item}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className={styles.iconWrap}>
                  {item.icon}

                  {item.badge && item.badge > 0 && (
                    <span
                      className={styles.badge}
                      aria-label={`${item.badge} notifications`}
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>

                {showLabels && (
                  <span className={styles.label}>
                    {item.label}
                  </span>
                )}

                {isActive && (
                  <div className={styles.indicator} aria-hidden="true" />
                )}
              </ItemWrapper>
            );
          })}
        </div>
      </nav>
    );
  }
);

BottomNavigation.displayName = 'BottomNavigation';
