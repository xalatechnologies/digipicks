/**
 * PillTabs Component
 *
 * A reusable pill-style tab navigation component for wizards, step indicators,
 * and tab navigation. Works in both light and dark themes.
 *
 * @example Basic tabs
 * ```tsx
 * <PillTabs
 *   tabs={[
 *     { id: 'overview', label: 'Overview' },
 *     { id: 'details', label: 'Details' },
 *     { id: 'settings', label: 'Settings' },
 *   ]}
 *   activeTab="overview"
 *   onTabChange={(id) => setActiveTab(id)}
 * />
 * ```
 *
 * @example Wizard steps with numbers
 * ```tsx
 * <PillTabs
 *   tabs={[
 *     { id: 'select', label: 'Select time' },
 *     { id: 'details', label: 'Details' },
 *     { id: 'confirm', label: 'Confirm' },
 *   ]}
 *   activeTab="details"
 *   variant="wizard"
 *   onTabChange={(id) => goToStep(id)}
 * />
 * ```
 */

import * as React from 'react';
import { cn } from '../utils';
import styles from './PillTabs.module.css';

// =============================================================================
// Types
// =============================================================================

export interface PillTab {
  /** Unique identifier for the tab */
  id: string;
  /** Display label for the tab */
  label: string;
  /** Whether this tab is disabled */
  disabled?: boolean;
  /** Optional icon element to show before the label */
  icon?: React.ReactNode;
  /** Optional badge text (e.g., count) to show after the label */
  badge?: string;
  /** Optional color for this tab when active (CSS color value, light mode) */
  color?: string;
  /** Optional color for this tab when active in dark mode */
  colorDark?: string;
}

export interface PillTabsProps {
  /** Array of tab configurations */
  tabs: PillTab[];
  /** ID of the currently active tab */
  activeTab: string;
  /** Callback when a tab is clicked */
  onTabChange: (tabId: string) => void;
  /** Visual variant - 'tabs' for simple tabs, 'wizard' for step indicators with numbers */
  variant?: 'tabs' | 'wizard';
  /** Size variant */
  size?: 'sm' | 'md';
  /** Whether to use compact mobile styling */
  compact?: boolean;
  /** Whether tabs should expand to fill container width */
  fullWidth?: boolean;
  /** Allow clicking active tab to deselect (pass empty string to onTabChange) */
  allowDeselect?: boolean;
  /** ARIA label for the tablist */
  ariaLabel?: string;
  /** Additional CSS class name */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

// =============================================================================
// Component
// =============================================================================

export function PillTabs({
  tabs,
  activeTab,
  onTabChange,
  variant = 'tabs',
  size = 'md',
  compact = false,
  fullWidth = true,
  allowDeselect = false,
  ariaLabel = 'Navigation tabs',
  className,
  style,
}: PillTabsProps): React.ReactElement {
  const isSmall = size === 'sm' || compact;
  const isWizard = variant === 'wizard';
  const shouldExpand = fullWidth || isWizard;
  const sizeAttr = isSmall ? 'sm' : 'md';

  const handleTabClick = (tab: PillTab) => {
    if (tab.disabled) return;

    if (allowDeselect && tab.id === activeTab) {
      onTabChange('');
    } else {
      onTabChange(tab.id);
    }
  };

  return (
    <div className={cn(styles.container, className)} style={style}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={styles.tablist}
      >
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTab;
          const isClickable = !tab.disabled;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`pill-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`pill-panel-${tab.id}`}
              disabled={!isClickable}
              onClick={() => isClickable && handleTabClick(tab)}
              className={styles.tab}
              data-expand={shouldExpand}
              data-size={sizeAttr}
              style={tab.color ? { '--pill-tab-color': tab.color, ...(tab.colorDark ? { '--pill-tab-color-dark': tab.colorDark } : {}) } as React.CSSProperties : undefined}
            >
              {/* Wizard step number badge */}
              {isWizard && (
                <span
                  className={styles.stepBadge}
                  data-size={sizeAttr}
                  data-active={isActive || undefined}
                >
                  {index + 1}
                </span>
              )}

              {/* Optional icon */}
              {tab.icon && !isWizard && (
                <span className={styles.icon}>
                  {tab.icon}
                </span>
              )}

              {/* Label - can be hidden on compact mobile */}
              {(!compact || !isWizard) && <span>{tab.label}</span>}

              {/* Optional badge (e.g., count) */}
              {tab.badge && (
                <span
                  className={styles.badge}
                  data-size={sizeAttr}
                  data-active={isActive || undefined}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default PillTabs;
