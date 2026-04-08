/**
 * PillDropdown Component
 *
 * A dropdown component styled to match PillTabs height and appearance.
 * Used for location selectors, filters, and other dropdown needs that
 * need to align visually with PillTabs.
 *
 * Supports single-select (default) and multiselect modes.
 *
 * @example Basic usage (single-select)
 * ```tsx
 * <PillDropdown
 *   icon={<MapPinIcon size={16} />}
 *   label="Oslo"
 *   suffix="50 resultater"
 *   options={[
 *     { value: '', label: 'Alle steder' },
 *     { value: 'oslo', label: 'Oslo', count: 25 },
 *     { value: 'bergen', label: 'Bergen', count: 15 },
 *   ]}
 *   value=""
 *   onChange={(value) => setLocation(value)}
 *   searchable
 *   searchPlaceholder="Søk etter sted..."
 * />
 * ```
 *
 * @example Multiselect usage
 * ```tsx
 * <PillDropdown
 *   multiselect
 *   label="Underkategori"
 *   options={[
 *     { value: 'meeting', label: 'Møte' },
 *     { value: 'conference', label: 'Konferanse' },
 *   ]}
 *   value={['meeting']}
 *   onChange={(values) => setSubcategories(values)}
 * />
 * ```
 */

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../utils';
import { SearchIcon } from '../primitives/icons';
import styles from './PillDropdown.module.css';

// =============================================================================
// Types
// =============================================================================

export interface PillDropdownOption {
  /** Value for this option */
  value: string;
  /** Display label */
  label: string;
  /** Optional count/label to show as badge */
  count?: number | string;
}

export interface PillDropdownLabels {
  /** Text shown when search yields no results */
  noResults?: string;
  /** Default search placeholder */
  searchPlaceholder?: string;
  /** Label shown when no items selected in multiselect (default: "Alle") */
  allLabel?: string;
  /** Suffix for multi-selected count (default: "valgt") */
  selectedSuffix?: string;
  /** Clear button label in multiselect (default: "Nullstill") */
  clearLabel?: string;
}

interface PillDropdownBaseProps {
  /** Icon to show before the label */
  icon?: React.ReactNode;
  /** Main label text (or selected option label) */
  label: string;
  /** Optional suffix text after the label (e.g., "50 resultater") */
  suffix?: string;
  /** Dropdown options */
  options: PillDropdownOption[];
  /** Size variant to match PillTabs */
  size?: 'sm' | 'md' | 'lg';
  /** Visual variant. "default" = bordered container, "ghost" = lightweight/transparent */
  variant?: 'default' | 'ghost';
  /** Placeholder when no value selected */
  placeholder?: string;
  /** Enable search input in dropdown */
  searchable?: boolean;
  /** Placeholder for search input (overrides labels.searchPlaceholder) */
  searchPlaceholder?: string;
  /** Localized labels for UI text */
  labels?: PillDropdownLabels;
  /** ARIA label for accessibility */
  ariaLabel?: string;
  /** Fixed width for the dropdown menu (e.g. 220 or '220px'). Defaults to auto with min 220px. */
  menuWidth?: number | string;
  /** Additional CSS class name */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
}

interface PillDropdownSingleProps extends PillDropdownBaseProps {
  /** Enable multiselect mode */
  multiselect?: false;
  /** Currently selected value */
  value: string;
  /** Callback when selection changes */
  onChange: (value: string) => void;
}

interface PillDropdownMultiProps extends PillDropdownBaseProps {
  /** Enable multiselect mode */
  multiselect: true;
  /** Currently selected values */
  value: string[];
  /** Callback when selection changes */
  onChange: (value: string[]) => void;
}

export type PillDropdownProps = PillDropdownSingleProps | PillDropdownMultiProps;

// ChevronDownIcon kept local (no primitive equivalent)
function ChevronDownIcon({ size = 14 }: { size?: number }): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// Small checkbox indicator for multiselect
function CheckboxIcon({ checked, size = 14 }: { checked: boolean; size?: number }): React.ReactElement {
  return (
    <span
      className={cn(styles.checkbox, checked && styles.checkboxChecked)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {checked && (
        <svg width={size - 4} height={size - 4} viewBox="0 0 10 10" fill="none">
          <path d="M2 5L4.5 7.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

// =============================================================================
// Component
// =============================================================================

const DEFAULT_LABELS: Required<PillDropdownLabels> = {
  noResults: 'No results',
  searchPlaceholder: 'Search...',
  allLabel: 'Alle',
  selectedSuffix: 'valgt',
  clearLabel: 'Nullstill',
};

export function PillDropdown(props: PillDropdownProps): React.ReactElement {
  const {
    icon,
    label,
    suffix,
    options,
    size = 'md',
    variant = 'default',
    placeholder = 'Select...',
    searchable = false,
    searchPlaceholder,
    labels,
    ariaLabel = 'Dropdown',
    className,
    menuWidth,
    style,
  } = props;

  const isMulti = props.multiselect === true;
  const resolvedLabels = { ...DEFAULT_LABELS, ...labels };
  const resolvedSearchPlaceholder = searchPlaceholder ?? resolvedLabels.searchPlaceholder;
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [dropdownPosition, setDropdownPosition] = React.useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const isSmall = size === 'sm';
  const isLarge = size === 'lg';
  const isGhost = variant === 'ghost';

  // Detect if we're inside a <dialog> element (top-layer).
  // If so, portal to the dialog instead of document.body to stay visible.
  const portalTarget = React.useMemo(() => {
    if (!containerRef.current) return document.body;
    const dialog = containerRef.current.closest('dialog');
    return dialog ?? document.body;
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate dropdown position when opened
  React.useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dialog = containerRef.current.closest('dialog');
      if (dialog) {
        // Position relative to the dialog's bounding box
        const dialogRect = dialog.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom - dialogRect.top + 4,
          left: rect.left - dialogRect.left,
          width: rect.width,
        });
      } else {
        setDropdownPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
        });
      }
    }
  }, [isOpen]);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      const target = e.target as Node;
      const isInsideContainer = containerRef.current?.contains(target);
      const isInsideDropdown = dropdownRef.current?.contains(target);
      if (!isInsideContainer && !isInsideDropdown) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape key
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Close dropdown when any ancestor scrolls (fixes fixed-position drift)
  // But ignore scroll events from within the dropdown menu itself (internal list scroll)
  React.useEffect(() => {
    if (!isOpen) return;
    const handleScroll = (e: Event): void => {
      if (dropdownRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
      setSearchQuery('');
    };
    window.addEventListener('scroll', handleScroll, { capture: true });
    return () => window.removeEventListener('scroll', handleScroll, { capture: true });
  }, [isOpen]);

  // Focus search input when dropdown opens
  React.useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  // Single-select handler
  const handleSelect = (optionValue: string): void => {
    if (isMulti) return; // handled by handleMultiToggle
    (props as PillDropdownSingleProps).onChange(optionValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Multi-select toggle handler
  const handleMultiToggle = (optionValue: string): void => {
    if (!isMulti) return;
    const multiProps = props as PillDropdownMultiProps;
    const current = multiProps.value;
    const updated = current.includes(optionValue)
      ? current.filter(v => v !== optionValue)
      : [...current, optionValue];
    multiProps.onChange(updated);
    // Keep dropdown open for multiselect
  };

  // Multi-select clear handler
  const handleMultiClear = (): void => {
    if (!isMulti) return;
    (props as PillDropdownMultiProps).onChange([]);
  };

  const handleToggle = (): void => {
    setIsOpen(!isOpen);
    if (isOpen) {
      setSearchQuery('');
    }
  };

  // Filter options based on search query
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(option =>
      option.label.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  // Compute display label
  const displayLabel = React.useMemo(() => {
    if (isMulti) {
      const multiValue = (props as PillDropdownMultiProps).value;
      if (multiValue.length === 0) return label;
      if (multiValue.length === 1) {
        const opt = options.find(o => o.value === multiValue[0]);
        return opt?.label ?? label;
      }
      return `${label}: ${multiValue.length} ${resolvedLabels.selectedSuffix}`;
    }
    const singleValue = (props as PillDropdownSingleProps).value;
    const selectedOption = options.find(o => o.value === singleValue);
    return selectedOption?.label || label || placeholder;
  }, [isMulti, props, options, label, placeholder, resolvedLabels.selectedSuffix]);

  // Whether multiselect has any selections (to show clear button)
  const multiHasSelections = isMulti && (props as PillDropdownMultiProps).value.length > 0;

  return (
    <div ref={containerRef} className={cn(styles.container, isGhost && styles.containerGhost, className)} style={style}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup={isMulti ? 'true' : 'listbox'}
        aria-label={ariaLabel}
        className={cn(styles.trigger, isSmall ? styles.triggerSm : isLarge ? styles.triggerLg : styles.triggerMd)}
      >
        <span className={styles.triggerContent}>
          {icon && <span className={styles.iconWrap}>{icon}</span>}
          <span className={styles.label}>{displayLabel}</span>
          {suffix && (
            <>
              <span className={styles.suffix}>·</span>
              <span className={styles.suffix}>{suffix}</span>
            </>
          )}
          <span className={cn(styles.chevron, isOpen && styles.chevronOpen)}>
            <ChevronDownIcon size={isSmall ? 12 : isLarge ? 16 : 14} />
          </span>
        </span>
      </button>

      {isOpen && dropdownPosition && createPortal(
        <div
          ref={dropdownRef}
          className={styles.menu}
          style={{
            position: portalTarget === document.body ? 'fixed' : 'absolute',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            ...(menuWidth != null
              ? { width: typeof menuWidth === 'number' ? `${menuWidth}px` : menuWidth }
              : { minWidth: Math.max(dropdownPosition.width, 220), width: 'auto' }),
          }}
        >
          {searchable && (
            <div className={styles.searchWrap}>
              <div className={styles.searchInner}>
                <span className={styles.searchIcon}>
                  <SearchIcon size={isSmall ? 14 : 16} />
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={resolvedSearchPlaceholder}
                  className={cn(styles.searchInput, isSmall ? styles.searchInputSm : styles.searchInputMd)}
                  aria-label={resolvedSearchPlaceholder}
                />
              </div>
            </div>
          )}

          <ul
            role={isMulti ? 'group' : 'listbox'}
            aria-label={ariaLabel}
            className={cn(styles.optionsList, searchable && styles.optionsListSearchable)}
          >
            {filteredOptions.length === 0 ? (
              <li className={cn(styles.noResults, isSmall ? styles.noResultsSm : styles.noResultsMd)}>
                {resolvedLabels.noResults}
              </li>
            ) : (
              filteredOptions.map((option) => {
                if (isMulti) {
                  const isChecked = (props as PillDropdownMultiProps).value.includes(option.value);
                  return (
                    <li
                      key={option.value}
                      role="option"
                      aria-selected={isChecked}
                      onClick={() => handleMultiToggle(option.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleMultiToggle(option.value);
                        }
                      }}
                      tabIndex={0}
                      className={cn(
                        styles.optionItem,
                        styles.optionItemMulti,
                        isSmall ? styles.optionItemSm : styles.optionItemMd,
                        isChecked && styles.optionItemSelected
                      )}
                    >
                      <CheckboxIcon checked={isChecked} size={isSmall ? 12 : 14} />
                      <span>{option.label}</span>
                      {option.count !== undefined && (
                        <span className={cn(styles.optionCount, isSmall && styles.optionCountSm)}>
                          {option.count}
                        </span>
                      )}
                    </li>
                  );
                }

                const isSelected = option.value === (props as PillDropdownSingleProps).value;
                return (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(option.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelect(option.value);
                      }
                    }}
                    tabIndex={0}
                    className={cn(
                      styles.optionItem,
                      isSmall ? styles.optionItemSm : styles.optionItemMd,
                      isSelected && styles.optionItemSelected
                    )}
                  >
                    <span>{option.label}</span>
                    {option.count !== undefined && (
                      <span className={cn(styles.optionCount, isSmall && styles.optionCountSm)}>
                        {option.count}
                      </span>
                    )}
                  </li>
                );
              })
            )}
          </ul>

          {/* Clear button for multiselect */}
          {isMulti && multiHasSelections && (
            <div className={styles.clearWrap}>
              <button
                type="button"
                onClick={handleMultiClear}
                className={styles.clearOption}
              >
                {resolvedLabels.clearLabel}
              </button>
            </div>
          )}
        </div>,
        portalTarget
      )}
    </div>
  );
}

export default PillDropdown;
