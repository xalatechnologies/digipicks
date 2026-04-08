/**
 * FilterToolbar — Reusable toolbar card for table/list filter bars.
 *
 * Provides a bordered card container with start / center / end slot areas
 * plus optional dividers and spacers. Designed for search inputs, dropdowns,
 * pill tabs, and action buttons above data tables.
 *
 * @example
 * // Horizontal (default) — search, filters, actions in a row
 * <FilterToolbar>
 *   <FilterToolbar.Start>
 *     <PillTabs ... />
 *   </FilterToolbar.Start>
 *   <FilterToolbar.Center>
 *     <HeaderSearch ... />
 *     <PillDropdown ... />
 *   </FilterToolbar.Center>
 *   <FilterToolbar.End>
 *     <Button>Create</Button>
 *   </FilterToolbar.End>
 * </FilterToolbar>
 *
 * @example
 * // Vertical — stacked rows (e.g. calendar navigation + legend)
 * <FilterToolbar direction="vertical">
 *   <CalendarNavigation ... />
 *   <CalendarLegend ... />
 * </FilterToolbar>
 *
 * @example
 * // Flat — no border/background, just layout
 * <FilterToolbar variant="flat">
 *   ...
 * </FilterToolbar>
 */

import * as React from 'react';
import styles from './FilterToolbar.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilterToolbarProps {
  children: React.ReactNode;
  /** Visual variant: "default" has border, "elevated" adds shadow, "flat" has no border/bg */
  variant?: 'default' | 'elevated' | 'flat';
  /** Size preset affecting padding and gap */
  size?: 'sm' | 'md' | 'lg';
  /** Layout direction: "horizontal" (default) or "vertical" for stacked rows */
  direction?: 'horizontal' | 'vertical';
  /** Additional class name */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
  /** Accessible label for the toolbar */
  'aria-label'?: string;
}

export interface FilterToolbarSlotProps {
  children: React.ReactNode;
  className?: string;
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function Start({ children, className }: FilterToolbarSlotProps) {
  return (
    <div className={`${styles.start}${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}
Start.displayName = 'FilterToolbar.Start';

function Center({ children, className }: FilterToolbarSlotProps) {
  return (
    <div className={`${styles.center}${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}
Center.displayName = 'FilterToolbar.Center';

function End({ children, className }: FilterToolbarSlotProps) {
  return (
    <div className={`${styles.end}${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}
End.displayName = 'FilterToolbar.End';

function Divider() {
  return <div className={styles.divider} role="separator" />;
}
Divider.displayName = 'FilterToolbar.Divider';

function Spacer() {
  return <div className={styles.spacer} />;
}
Spacer.displayName = 'FilterToolbar.Spacer';

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface FilterToolbarComponent extends React.FC<FilterToolbarProps> {
  Start: typeof Start;
  Center: typeof Center;
  End: typeof End;
  Divider: typeof Divider;
  Spacer: typeof Spacer;
}

export const FilterToolbar: FilterToolbarComponent = function FilterToolbar({
  children,
  variant = 'default',
  size = 'md',
  direction = 'horizontal',
  className,
  style,
  'aria-label': ariaLabel = 'Filter toolbar',
}: FilterToolbarProps): React.ReactElement {
  return (
    <div
      className={`${styles.toolbar}${className ? ` ${className}` : ''}`}
      data-variant={variant}
      data-size={size}
      data-direction={direction}
      role="toolbar"
      aria-label={ariaLabel}
      style={style}
    >
      {children}
    </div>
  );
}

// Attach subcomponents
FilterToolbar.Start = Start;
FilterToolbar.Center = Center;
FilterToolbar.End = End;
FilterToolbar.Divider = Divider;
FilterToolbar.Spacer = Spacer;
