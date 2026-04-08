/**
 * FilterDrawer - Pre-composed drawer scaffold for filter panels
 *
 * Wraps Drawer with standard filter UI: header (optional reset in header),
 * scrollable sections, and footer with Apply + Reset actions.
 * Reduces boilerplate across 5+ filter drawer implementations.
 *
 * @module @digilist-saas/ds/composed/FilterDrawer
 */

import React from 'react';
import { Button, Paragraph } from '@digdir/designsystemet-react';
import { Drawer, DrawerSection } from '../Drawer';
import type { DrawerProps, DrawerPosition, DrawerSize } from '../Drawer';
import styles from './FilterDrawer.module.css';

// =============================================================================
// TYPES
// =============================================================================

export interface FilterDrawerSection {
  /** Section title */
  title: React.ReactNode;
  /** Optional section description */
  description?: string;
  /** Section content */
  children: React.ReactNode;
  /** Whether section is collapsible */
  collapsible?: boolean;
  /** Whether section is initially collapsed */
  defaultCollapsed?: boolean;
}

export interface FilterDrawerLabels {
  /** Apply button label (e.g. "Bruk filter") */
  applyLabel: string;
  /** Reset button label (e.g. "Nullstill") */
  resetLabel: string;
  /** Optional title for drawer header */
  title?: string;
}

export interface FilterDrawerProps
  extends Omit<DrawerProps, 'footer' | 'title' | 'children'> {
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Callback when drawer closes */
  onClose: () => void;
  /** Callback when Apply is clicked */
  onApply: () => void;
  /** Callback when Reset is clicked */
  onReset?: () => void;
  /** Labels for apply/reset buttons and optional title */
  labels: FilterDrawerLabels;
  /** Number of active filters; when > 0, Reset button is shown in footer */
  activeFilterCount?: number;
  /** Optional footer info text (e.g. "Viser 42 bookinger") */
  footerInfo?: React.ReactNode;
  /** Section configurations, or use children for custom sections */
  sections?: FilterDrawerSection[];
  /** Custom content; if provided, sections are ignored */
  children?: React.ReactNode;
  /** Drawer position */
  position?: DrawerPosition;
  /** Drawer size */
  size?: DrawerSize;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * FilterDrawer - Filter panel scaffold with Apply/Reset footer
 *
 * @example
 * ```tsx
 * <FilterDrawer
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onApply={handleApply}
 *   onReset={handleReset}
 *   labels={{ applyLabel: 'Bruk filter', resetLabel: 'Nullstill' }}
 *   activeFilterCount={3}
 *   title="Filtre"
 * >
 *   <DrawerSection title="Datoperiode" collapsible>
 *     <DateRangeInputs />
 *   </DrawerSection>
 *   <DrawerSection title="Status" collapsible>
 *     <StatusFilters />
 *   </DrawerSection>
 * </FilterDrawer>
 * ```
 */
export function FilterDrawer({
  isOpen,
  onClose,
  onApply,
  onReset,
  labels,
  activeFilterCount = 0,
  footerInfo,
  sections,
  children,
  position = 'right',
  size = 'md',
  ...drawerProps
}: FilterDrawerProps): React.ReactElement {
  const hasActiveFilters = activeFilterCount > 0;
  const showReset = hasActiveFilters && onReset;

  const handleApply = (): void => {
    onApply();
    onClose();
  };

  const handleReset = (): void => {
    onReset?.();
    onClose();
  };

  const footer = (
    <div className={styles.footer}>
      {footerInfo && <Paragraph data-size="sm" className={styles.footerInfo}>{footerInfo}</Paragraph>}
      <div className={styles.actions}>
        {showReset && (
          <Button
            type="button"
            variant="secondary"
            onClick={handleReset}
            className={styles.actionBtn}
          >
            {labels.resetLabel}
          </Button>
        )}
        <Button
          type="button"
          variant="primary"
          onClick={handleApply}
          className={styles.actionBtn}
        >
          {labels.applyLabel}
        </Button>
      </div>
    </div>
  );

  const content = children ?? (
    <>
      {sections?.map((section, idx) => (
        <DrawerSection
          key={idx}
          title={section.title}
          description={section.description}
          collapsible={section.collapsible}
          defaultCollapsed={section.defaultCollapsed}
        >
          {section.children}
        </DrawerSection>
      ))}
    </>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={labels.title ?? undefined}
      position={position}
      size={size}
      footer={footer}
      {...drawerProps}
    >
      {content}
    </Drawer>
  );
}

export default FilterDrawer;
