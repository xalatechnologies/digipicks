/**
 * Drawer / SlidePanel - Sliding panel component
 *
 * A slide-in panel that can open from left, right, top, or bottom.
 * Includes helper components for building panel content.
 *
 * @module @digilist-saas/ds/composed/Drawer
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Heading, Paragraph } from '@digdir/designsystemet-react';
import { cn } from '../utils';
import { CloseIcon } from '../primitives/icons';
import styles from './Drawer.module.css';

// =============================================================================
// TYPES
// =============================================================================

export type DrawerPosition = 'left' | 'right' | 'top' | 'bottom';
export type DrawerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface DrawerProps {
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Callback when drawer should close */
  onClose: () => void;
  /** Drawer content */
  children: React.ReactNode;
  /** Position of the drawer */
  position?: DrawerPosition;
  /** Panel title */
  title?: React.ReactNode;
  /** Icon to show next to title */
  icon?: React.ReactNode;
  /** Badge count to show */
  badge?: number;
  /** Size preset (width for left/right, height for top/bottom) */
  size?: DrawerSize;
  /** Custom width/height override */
  customSize?: string | number;
  /** Whether to show backdrop overlay */
  overlay?: boolean;
  /** Whether to close on backdrop click */
  closeOnOverlayClick?: boolean;
  /** Whether to close on Escape key */
  closeOnEscape?: boolean;
  /** Footer content */
  footer?: React.ReactNode;
  /** Additional className for the drawer panel */
  className?: string;
  /** Z-index for the drawer */
  zIndex?: number;
  /** ARIA label for accessibility */
  'aria-label'?: string;
  /** Show drag handle (for bottom/top drawers) */
  showHandle?: boolean;
  /** Position on mobile viewports (under 600px). Defaults to main position */
  mobilePosition?: DrawerPosition;
  /** Size on mobile viewports. Defaults to 'full' for bottom/top, 'lg' for left/right */
  mobileSize?: DrawerSize;
  /** Breakpoint for mobile behavior in pixels */
  mobileBreakpoint?: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

// Width sizes for left/right drawers (+10% from original)
const widthSizeMap: Record<DrawerSize, string> = {
  sm: '352px',
  md: '440px',
  lg: '550px',
  xl: '700px',
  full: '100%',
};

// Height sizes for top/bottom drawers (+10% from original)
const heightSizeMap: Record<DrawerSize, string> = {
  sm: '45vh',
  md: '60vh',
  lg: '77vh',
  xl: '90vh',
  full: '100%',
};

// ChevronDownIcon kept local (no primitive equivalent)
function ChevronDownIcon(): React.ReactElement {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// =============================================================================
// STYLES (position/size maps for CSS variable --drawer-size)
// =============================================================================

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Drawer - Sliding panel component
 *
 * @example Left filter panel
 * ```tsx
 * <Drawer
 *   isOpen={isFiltersOpen}
 *   onClose={() => setFiltersOpen(false)}
 *   title="Filtre"
 *   position="left"
 *   size="sm"
 * >
 *   <DrawerSection title="Type anlegg" collapsible>
 *     <FilterCheckboxes />
 *   </DrawerSection>
 * </Drawer>
 * ```
 *
 * @example Right cart panel
 * ```tsx
 * <Drawer
 *   isOpen={isCartOpen}
 *   onClose={() => setCartOpen(false)}
 *   title="Min bestilling"
 *   icon={<ShoppingCartIcon />}
 *   badge={3}
 *   position="right"
 *   footer={<CheckoutButton />}
 * >
 *   <CartItems />
 * </Drawer>
 * ```
 */
export function Drawer({
  isOpen,
  onClose,
  children,
  position = 'left',
  title,
  icon,
  badge,
  size = 'xl',
  customSize,
  overlay = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  footer,
  className,
  zIndex = 1000,
  'aria-label': ariaLabel,
  showHandle = false,
  mobilePosition,
  mobileSize,
  mobileBreakpoint = 600,
}: DrawerProps): React.ReactElement | null {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = (): void => {
      setIsMobile(window.innerWidth < mobileBreakpoint);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [mobileBreakpoint]);

  // Determine effective position and size based on viewport
  const effectivePosition = isMobile && mobilePosition ? mobilePosition : position;
  const effectiveSize = isMobile && mobileSize ? mobileSize : size;

  const isVertical = effectivePosition === 'top' || effectivePosition === 'bottom';

  // Use appropriate size map based on drawer orientation
  const computedSize = customSize
    ? typeof customSize === 'number' ? `${customSize}px` : customSize
    : isVertical ? heightSizeMap[effectiveSize] : widthSizeMap[effectiveSize];

  // Show handle automatically on mobile bottom drawer
  const effectiveShowHandle = showHandle || (isMobile && effectivePosition === 'bottom');

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  // Focus management and body scroll lock
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';

      // Focus first focusable element
      setTimeout(() => {
        const firstFocusable = drawerRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }, 100);
    } else {
      document.body.style.overflow = '';
      previousActiveElement.current?.focus();
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleFocusTrap = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab' || !drawerRef.current) return;

      const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!firstElement || !lastElement) return;

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleFocusTrap);
    return () => document.removeEventListener('keydown', handleFocusTrap);
  }, [isOpen]);

  const handleOverlayClick = useCallback((): void => {
    if (closeOnOverlayClick) {
      onClose();
    }
  }, [closeOnOverlayClick, onClose]);

  // SSR safety
  if (typeof document === 'undefined') return null;

  const drawerContent = (
    <>
      {/* Overlay */}
      {overlay && (
        <div
          onClick={handleOverlayClick}
          aria-hidden="true"
          className={cn(styles.overlay, isOpen ? styles.overlayVisible : styles.overlayHidden)}
          style={{ zIndex: zIndex - 1 }}
        />
      )}

      {/* Drawer panel */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? (typeof title === 'string' ? title : undefined)}
        className={cn(
          styles.panel,
          styles[`panel${effectivePosition.charAt(0).toUpperCase() + effectivePosition.slice(1)}` as keyof typeof styles],
          styles[`panel${effectivePosition.charAt(0).toUpperCase() + effectivePosition.slice(1)}${isOpen ? 'Open' : 'Closed'}` as keyof typeof styles],
          isOpen ? styles.panelOpen : styles.panelClosed,
          className
        )}
        style={{ '--drawer-size': computedSize, zIndex } as React.CSSProperties}
      >
        {effectiveShowHandle && isVertical && (
          <div className={styles.handle}>
            <div className={styles.handleBar} />
          </div>
        )}

        {title && (
          <div className={styles.header}>
            <div className={styles.headerTitleRow}>
              {icon && <span className={styles.headerIcon}>{icon}</span>}
              <Heading data-size="xs" className={styles.headerTitle}>{title}</Heading>
              {badge !== undefined && badge > 0 && (
                <span className={styles.headerBadge}>{badge > 99 ? '99+' : badge}</span>
              )}
            </div>
            <button type="button" onClick={onClose} aria-label="Lukk" className={styles.closeButton}>
              <CloseIcon />
            </button>
          </div>
        )}

        <div className={styles.content}>{children}</div>

        {footer && <div className={styles.footer}>{footer}</div>}
      </aside>
    </>
  );

  return createPortal(drawerContent, document.body);
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

export interface DrawerSectionProps {
  /** Section title */
  title?: React.ReactNode;
  /** Section description */
  description?: string;
  /** Section content */
  children: React.ReactNode;
  /** Whether section is collapsible */
  collapsible?: boolean;
  /** Whether section is initially collapsed */
  defaultCollapsed?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * DrawerSection - Collapsible section within a drawer
 */
export function DrawerSection({
  title,
  description,
  children,
  collapsible = false,
  defaultCollapsed = false,
  className,
}: DrawerSectionProps): React.ReactElement {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const handleToggle = (): void => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <div className={cn(styles.section, className)}>
      {title && (
        <div
          onClick={handleToggle}
          onKeyDown={collapsible ? (e) => e.key === 'Enter' && handleToggle() : undefined}
          role={collapsible ? 'button' : undefined}
          tabIndex={collapsible ? 0 : undefined}
          className={cn(styles.sectionHeader, collapsible && styles.sectionHeaderCollapsible)}
        >
          <div>
            <span className={styles.sectionTitle}>{title}</span>
            {description && <Paragraph data-size="sm" className={styles.sectionDescription}>{description}</Paragraph>}
          </div>
          {collapsible && (
            <span className={cn(styles.sectionChevron, isCollapsed && styles.sectionChevronCollapsed)}>
              <ChevronDownIcon />
            </span>
          )}
        </div>
      )}
      {(!collapsible || !isCollapsed) && (
        <div className={title ? styles.sectionBody : styles.sectionBodyNoTitle}>
          {children}
        </div>
      )}
    </div>
  );
}

export interface DrawerItemProps {
  /** Item content */
  children: React.ReactNode;
  /** Left slot (icon, checkbox) */
  left?: React.ReactNode;
  /** Right slot (badge, count) */
  right?: React.ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** Whether item is selected */
  selected?: boolean;
  /** Whether item is disabled */
  disabled?: boolean;
}

/**
 * DrawerItem - List item within a drawer
 */
export function DrawerItem({
  children,
  left,
  right,
  onClick,
  selected = false,
  disabled = false,
}: DrawerItemProps): React.ReactElement {
  const isInteractive = onClick && !disabled;

  const content = (
    <>
      {left && <span className={styles.itemLeft}>{left}</span>}
      <span className={styles.itemContent}>{children}</span>
      {right && <span className={styles.itemRight}>{right}</span>}
    </>
  );

  const itemClasses = cn(
    styles.item,
    isInteractive && styles.itemInteractive,
    selected && styles.itemSelected,
    disabled && styles.itemDisabled
  );

  if (isInteractive) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(itemClasses, styles.itemButton)}
      >
        {content}
      </button>
    );
  }

  return <div className={itemClasses}>{content}</div>;
}

export interface DrawerEmptyStateProps {
  /** Icon to display */
  icon?: React.ReactNode;
  /** Empty state title */
  title: string;
  /** Empty state description */
  description?: string;
  /** Action button */
  action?: React.ReactNode;
}

/**
 * DrawerEmptyState - Empty state for drawers
 */
export function DrawerEmptyState({
  icon,
  title,
  description,
  action,
}: DrawerEmptyStateProps): React.ReactElement {
  return (
    <div className={styles.emptyState}>
      {icon && <div className={styles.emptyStateIcon}>{icon}</div>}
      <span className={styles.emptyStateTitle}>{title}</span>
      {description && <Paragraph data-size="sm" className={styles.emptyStateDescription}>{description}</Paragraph>}
      {action}
    </div>
  );
}

export default Drawer;
